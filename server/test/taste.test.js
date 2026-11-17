import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

// Catálogo de TMDB simulado: g = nombre del género tal como lo devuelve la API (genres en español).
const T = (tmdb_id, title, genres, genre_ids) => ({ tmdb_id, title, original_title: title, year: 2024, overview: '', poster_url: null, backdrop_url: null, genres, genre_ids, first_air_date: '2024-01-01' });
const POOL = [
  T(1, 'Drama A', 'Drama', [18]), T(2, 'Comedia A', 'Comedia', [35]), T(3, 'Terror B', 'Misterio', [9648]),
  T(4, 'Drama B', 'Drama', [18]), T(5, 'Comedia B', 'Comedia', [35]), T(6, 'Crimen A', 'Crimen, Drama', [80, 18]),
];

async function setup() {
  const calls = [];
  const tmdb = {
    async search() { return []; },
    async details(id) { return POOL.find((s) => s.tmdb_id === id); },
    async discover(opts) { calls.push(opts); return POOL.filter((s) => !opts.genres.length || s.genre_ids.some((g) => opts.genres.includes(g))); },
  };
  const app = createApp({ db: openDb(':memory:'), tmdb, jwtSecret: 's' });
  const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (m, p, b, t) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };
  const token = (await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' })).body.token;
  const rate = async (tmdb_id, rating) => { const { body } = await call('POST', '/api/shows', { tmdb_id }, token); await call('POST', `/api/shows/${body.id}/reviews`, { rating, body: '' }, token); };
  return { call, token, calls, rate, close: () => server.close() };
}

test('portada personalizada: sin historial no cambia nada', async () => {
  const { call, token, calls, close } = await setup();
  const r = await call('GET', '/api/discover?sort=popular&personal=1', null, token);
  assert.equal(r.body.taste, null);
  assert.equal(r.body.tmdb.length, POOL.length);
  assert.deepEqual(calls.at(-1).genres, []);
  close();
});

test('portada personalizada: aprende los géneros que puntúas alto, oculta lo ya visto y evita los que puntúas bajo', async () => {
  const { call, token, calls, rate, close } = await setup();
  await rate(1, 5); await rate(6, 4); // Drama (y Crimen) gustan
  await rate(2, 1); // Comedia no
  const r = await call('GET', '/api/discover?sort=popular&personal=1', null, token);
  assert.deepEqual(r.body.taste.genres.sort(), ['Crimen', 'Drama']);
  assert.equal(r.body.taste.signals, 3);
  assert.deepEqual(calls.at(-1).genres.sort((a, b) => a - b), [18, 80], 'pide a TMDB solo los géneros favoritos');
  const titles = r.body.tmdb.map((s) => s.title).concat(r.body.catalog.map((s) => s.title));
  assert.ok(!titles.includes('Drama A') && !titles.includes('Crimen A') && !titles.includes('Comedia A'), 'las ya puntuadas no salen');
  assert.ok(titles.includes('Drama B'));
  assert.ok(!titles.includes('Comedia B'));
  close();
});

test('portada personalizada: «Quiero ver» también cuenta y los géneros elegidos a mano mandan sobre los deducidos', async () => {
  const { call, token, calls, close } = await setup();
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 3 }, token);
  await call('PUT', `/api/me/watchlist/${id}`, null, token);
  let r = await call('GET', '/api/discover?sort=new&personal=1', null, token);
  assert.deepEqual(r.body.taste.genres, ['Misterio']);
  r = await call('GET', '/api/discover?sort=new&personal=1&genres=35', null, token);
  assert.equal(r.body.taste, null, 'con géneros elegidos no se anuncia como deducido');
  assert.deepEqual(calls.at(-1).genres, [35]);
  close();
});

test('portada personalizada: en Populares sube lo que más encaja dentro de lo elegido', async () => {
  const { call, token, rate, close } = await setup();
  await rate(1, 5); // Drama +2,25
  await rate(2, 1); // Comedia −1,75
  const r = await call('GET', '/api/discover?sort=popular&personal=1&genres=35,18', null, token);
  const order = r.body.tmdb.map((s) => s.title);
  assert.deepEqual(order, ['Drama B', 'Crimen A', 'Comedia B'], 'Drama primero (empate: orden original), Comedia al final');
  close();
});
