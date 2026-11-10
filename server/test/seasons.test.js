import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

async function setup() {
  const state = { offset: 0, detailsCalls: 0, seasons: 3, discoverCalls: [] };
  const tmdb = {
    async search() { return []; },
    async details(id) {
      state.detailsCalls++;
      return { tmdb_id: id, title: 'Severance', original_title: 'Severance', year: 2022, overview: '', poster_url: null, backdrop_url: null, genres: 'Drama',
        seasons: state.seasons, episodes: state.seasons * 9, status: 'Returning Series' };
    },
    async providers() { return []; },
    async providerList() { return []; },
    async discover(opts) {
      state.discoverCalls.push(opts);
      return [
        { tmdb_id: 11, title: 'Nueva', year: 2026, overview: '', poster_url: null, backdrop_url: null, genre_ids: [35], genres: 'Comedia', first_air_date: '2026-11-06' },
        { tmdb_id: 22, title: 'Ya importada', year: 2026, overview: '', poster_url: null, backdrop_url: null, genre_ids: [35], genres: 'Comedia', first_air_date: '2026-10-20' },
      ];
    },
  };
  const app = createApp({ db: openDb(':memory:'), tmdb, jwtSecret: 'test-secret', now: () => Date.now() + state.offset });
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
  return { call, token, state, close: () => server.close() };
}

test('temporadas: se guardan al importar y se refrescan como mucho cada 7 días', async () => {
  const { call, token, state, close } = await setup();
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 1 }, token);
  assert.equal(state.detailsCalls, 1);
  const a = (await call('GET', `/api/shows/${id}`, null, token)).body;
  assert.deepEqual([a.seasons, a.episodes, a.status], [3, 27, 'Returning Series']);
  assert.equal(state.detailsCalls, 1, 'recién importada: no vuelve a pedirlo');
  state.seasons = 4; // sale una temporada nueva
  await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(state.detailsCalls, 1, 'dentro de la semana se queda igual');
  state.offset = 8 * 24 * 3600 * 1000;
  const b = (await call('GET', `/api/shows/${id}`, null, token)).body;
  assert.equal(state.detailsCalls, 2);
  assert.equal(b.seasons, 4);
  close();
});

test('temporadas: series de antes sin datos se rellenan al abrir la ficha; manuales aceptan temporadas', async () => {
  const { call, token, state, close } = await setup();
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 1 }, token);
  state.offset = 8 * 24 * 3600 * 1000; // caducado: equivale a una fila antigua sin details_at
  const f = (await call('GET', `/api/shows/${id}`, null, token)).body;
  assert.equal(f.seasons, 3);
  const m = await call('POST', '/api/shows', { title: 'Manual', year: 2020, seasons: 2 }, token);
  assert.equal((await call('GET', `/api/shows/${m.body.id}`, null, token)).body.seasons, 2);
  assert.equal((await call('POST', '/api/shows', { title: 'Mala', year: 2020, seasons: 0 }, token)).status, 400);
  assert.equal((await call('POST', '/api/shows', { title: 'Mala2', year: 2020, seasons: 'x' }, token)).status, 400);
  close();
});

test('novedades: discover?sort=new pasa el orden a TMDB y marca lo ya importado con su show_id', async () => {
  const { call, token, state, close } = await setup();
  const imp = await call('POST', '/api/shows', { tmdb_id: 22 }, token); // ya está en el catálogo (mismo tmdb_id que devuelve discover)
  assert.equal(imp.status, 201);
  await call('POST', `/api/shows/${imp.body.id}/reviews`, { rating: 4 }, token);
  const d = await call('GET', '/api/discover?genres=35&providers=8&sort=new', null, token);
  assert.equal(state.discoverCalls.at(-1).sort, 'new');
  assert.deepEqual(d.body.catalog, []);
  assert.deepEqual(d.body.tmdb.map((s) => s.title), ['Nueva', 'Ya importada'], 'mantiene el orden por fecha de estreno');
  assert.equal(d.body.tmdb[0].show_id, undefined, 'la nueva no está en el catálogo');
  assert.equal(d.body.tmdb[1].show_id, imp.body.id, 'la ya importada enlaza con su ficha');
  assert.equal(d.body.tmdb[1].avg_rating, 4);
  const pop = await call('GET', '/api/discover?genres=35', null, token);
  assert.equal(state.discoverCalls.at(-1).sort, 'popular', 'por defecto sigue siendo popular');
  assert.ok(Array.isArray(pop.body.catalog));
  close();
});
