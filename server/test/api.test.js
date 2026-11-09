import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

const fakeTmdb = {
  async search(q) { return [{ tmdb_id: 1, title: 'Dark', year: 2017, overview: '', poster_url: null }]; },
  async details(id) { if (id !== 1) throw new Error('404'); return { tmdb_id: 1, title: 'Dark', year: 2017, overview: 'x', poster_url: null, genres: 'Drama' }; },
  async providers() { return [{ provider: 'Netflix', logo_url: null }]; },
};

async function setup() {
  const app = createApp({ db: openDb(':memory:'), tmdb: fakeTmdb, jwtSecret: 'test-secret' });
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
  const register = async (n) => (await call('POST', '/api/auth/register', { email: `${n}@x.es`, username: n, password: 'password1' })).body.token;
  return { call, register, close: () => server.close() };
}

test('auth: registro, duplicado y login', async () => {
  const { call, close } = await setup();
  const r = await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' });
  assert.equal(r.status, 201);
  assert.equal((await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana2', password: 'password1' })).status, 409);
  assert.equal((await call('POST', '/api/auth/register', { email: 'b@x.es', username: 'bob', password: 'corta' })).status, 400);
  assert.equal((await call('POST', '/api/auth/login', { email: 'a@x.es', password: 'mala' })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { email: 'a@x.es', password: 'password1' })).status, 200);
  assert.equal((await call('GET', '/api/me/reviews')).status, 401);
  close();
});

test('series: búsqueda TMDB, importación y dedupe', async () => {
  const { call, register, close } = await setup();
  const t = await register('ana');
  const s = await call('GET', '/api/shows/search?q=dark', null, t);
  assert.equal(s.body.tmdb.length, 1);
  const add = await call('POST', '/api/shows', { tmdb_id: 1 }, t);
  assert.equal(add.status, 201);
  assert.equal((await call('POST', '/api/shows', { tmdb_id: 1 }, t)).body.created, false);
  // Tras importar, ya no sale como "solo TMDB"
  const s2 = await call('GET', '/api/shows/search?q=dark', null, t);
  assert.equal(s2.body.catalog.length, 1);
  assert.equal(s2.body.tmdb.length, 0);
  const d = await call('GET', `/api/shows/${add.body.id}`, null, t);
  assert.equal(d.body.providers[0].provider, 'Netflix');
  close();
});

test('series: alta manual y deduplicación por título normalizado', async () => {
  const { call, register, close } = await setup();
  const t = await register('ana');
  const a = await call('POST', '/api/shows', { title: 'La Casa de Papel', year: 2017 }, t);
  assert.equal(a.status, 201);
  const b = await call('POST', '/api/shows', { title: 'la casa de papél', year: 2017 }, t);
  assert.equal(b.body.created, false);
  assert.equal(b.body.id, a.body.id);
  assert.equal((await call('POST', '/api/shows', { title: 'x' }, t)).status, 400);
  close();
});

test('reseñas: crear, editar, media y validación', async () => {
  const { call, register, close } = await setup();
  const [t1, t2] = [await register('ana'), await register('bob')];
  const { body: { id } } = await call('POST', '/api/shows', { title: 'Severance', year: 2022 }, t1);
  assert.equal((await call('POST', `/api/shows/${id}/reviews`, { rating: 6 }, t1)).status, 400);
  await call('POST', `/api/shows/${id}/reviews`, { rating: 5, body: 'Genial' }, t1);
  await call('POST', `/api/shows/${id}/reviews`, { rating: 3 }, t2);
  await call('POST', `/api/shows/${id}/reviews`, { rating: 4, body: 'Mejor aún' }, t1); // edita
  const d = await call('GET', `/api/shows/${id}`, null, t1);
  assert.equal(d.body.ratings_count, 2);
  assert.equal(d.body.avg_rating, 3.5);
  assert.equal(d.body.my_review.rating, 4);
  assert.equal((await call('GET', `/api/shows/${id}/reviews`, null, t1)).body.length, 2);
  assert.equal((await call('POST', '/api/shows/999/reviews', { rating: 3 }, t1)).status, 404);
  close();
});

test('recomendaciones: personalizadas por afinidad y fallback top', async () => {
  const { call, register, close } = await setup();
  const [ana, bob, cat] = [await register('ana'), await register('bob'), await register('cat')];
  const mk = async (title) => (await call('POST', '/api/shows', { title, year: 2020 }, ana)).body.id;
  const [a, b, c] = [await mk('Alfa'), await mk('Beta'), await mk('Gamma')];
  const rate = (t, id, rating) => call('POST', `/api/shows/${id}/reviews`, { rating }, t);
  await rate(ana, a, 5);
  await rate(bob, a, 5); await rate(bob, b, 5);   // bob afín a ana → Beta
  await rate(cat, c, 5);
  const rec = await call('GET', '/api/recommendations', null, ana);
  assert.equal(rec.body.kind, 'personalized');
  assert.deepEqual(rec.body.shows.map((s) => s.title), ['Beta']);
  const top = await call('GET', '/api/recommendations', null, cat); // sin afines → top global
  assert.equal(top.body.kind, 'top');
  assert.ok(top.body.shows.length >= 1);
  close();
});
