import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

const show = (id, title, genre_ids, genres) => ({
  tmdb_id: id, title, original_title: title, year: 2020, overview: '', poster_url: null, backdrop_url: null, genre_ids, genres,
});
const SHOWS = [
  show(1, 'Dark', [18, 9648], 'Drama, Misterio'),
  show(2, 'Ted Lasso', [35, 18], 'Comedia, Drama'),
  show(3, 'The Boys', [10759, 10765], 'Acción y aventura, Sci-Fi y fantasía'),
];

function makeTmdb(calls) {
  return {
    async search(q) { return SHOWS.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()) || q === 'aa'); },
    async details(id) { return SHOWS.find((s) => s.tmdb_id === id); },
    async providers() { return []; },
    async providerList(country) { calls.push(['providerList', country]); return [{ id: 8, name: 'Netflix', logo_url: null }, { id: 119, name: 'Amazon Prime Video', logo_url: null }]; },
    async discover(opts) {
      calls.push(['discover', opts]);
      return SHOWS.filter((s) => !opts.genres.length || s.genre_ids.some((g) => opts.genres.includes(g)));
    },
  };
}

async function setup() {
  const calls = [];
  const app = createApp({ db: openDb(':memory:'), tmdb: makeTmdb(calls), jwtSecret: 'test-secret' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };
  const token = (await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' })).body.token;
  return { call, token, calls, close: () => server.close() };
}

test('meta: géneros fijos y plataformas del país del usuario (cacheadas)', async () => {
  const { call, token, calls, close } = await setup();
  const m = await call('GET', '/api/meta', null, token);
  assert.equal(m.status, 200);
  assert.equal(m.body.country, 'ES');
  assert.ok(m.body.genres.some((g) => g.id === 35 && g.name === 'Comedia'));
  assert.ok(!JSON.stringify(m.body.genres).includes('match'), 'no se filtran los patrones internos');
  assert.deepEqual(m.body.providers.map((p) => p.name), ['Netflix', 'Amazon Prime Video']);
  await call('GET', '/api/meta', null, token);
  assert.equal(calls.filter((c) => c[0] === 'providerList').length, 1, 'segunda llamada sale de la caché');
  assert.equal((await call('GET', '/api/meta')).status, 401);
  close();
});

test('preferencias: se guardan por usuario y se validan', async () => {
  const { call, token, close } = await setup();
  assert.deepEqual((await call('GET', '/api/me/prefs', null, token)).body, { genres: [], providers: [] });
  assert.equal((await call('PUT', '/api/me/prefs', { genres: [35, 18], providers: [8] }, token)).status, 200);
  assert.deepEqual((await call('GET', '/api/me/prefs', null, token)).body, { genres: [35, 18], providers: [8] });
  assert.equal((await call('PUT', '/api/me/prefs', { genres: ['x'], providers: [] }, token)).status, 400);
  assert.equal((await call('PUT', '/api/me/prefs', { genres: [], providers: 'no' }, token)).status, 400);
  const other = (await call('POST', '/api/auth/register', { email: 'b@x.es', username: 'bob', password: 'password1' })).body.token;
  assert.deepEqual((await call('GET', '/api/me/prefs', null, other)).body, { genres: [], providers: [] });
  close();
});

test('discover: filtra por género y pasa plataformas y país a TMDB', async () => {
  const { call, token, calls, close } = await setup();
  const d = await call('GET', '/api/discover?genres=35&providers=8,119', null, token);
  assert.equal(d.status, 200);
  assert.deepEqual(d.body.tmdb.map((s) => s.title), ['Ted Lasso']);
  const last = calls.filter((c) => c[0] === 'discover').at(-1)[1];
  assert.deepEqual(last, { genres: [35], providers: [8, 119], country: 'ES', sort: 'popular' });
  assert.equal((await call('GET', '/api/discover?genres=abc,35;drop', null, token)).status, 200); // basura ignorada
  close();
});

test('discover: lo ya importado sale como catálogo con su nota; sin plataformas también cuenta el catálogo propio', async () => {
  const { call, token, close } = await setup();
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 2 }, token);
  await call('POST', `/api/shows/${id}/reviews`, { rating: 5 }, token);
  await call('POST', '/api/shows', { title: 'Serie manual', year: 2021, genres: 'Comedia, Familia' }, token);
  const withProv = await call('GET', '/api/discover?genres=35&providers=8', null, token);
  assert.deepEqual(withProv.body.catalog.map((s) => s.title), ['Ted Lasso']);
  assert.equal(withProv.body.catalog[0].avg_rating, 5);
  assert.equal(withProv.body.tmdb.length, 0);
  const noProv = await call('GET', '/api/discover?genres=35', null, token);
  assert.deepEqual(noProv.body.catalog.map((s) => s.title).sort(), ['Serie manual', 'Ted Lasso']);
  const top = await call('GET', '/api/discover', null, token); // sin filtros: lo mejor valorado + populares
  assert.equal(top.body.catalog[0].title, 'Ted Lasso');
  close();
});

test('búsqueda: los géneros elegidos suben los resultados que coinciden, sin filtrar', async () => {
  const { call, token, close } = await setup();
  const plain = await call('GET', '/api/shows/search?q=aa', null, token);
  assert.equal(plain.body.tmdb.length, 3);
  const boosted = await call('GET', '/api/shows/search?q=aa&genres=10759', null, token);
  assert.equal(boosted.body.tmdb.length, 3);
  assert.equal(boosted.body.tmdb[0].title, 'The Boys');
  close();
});
