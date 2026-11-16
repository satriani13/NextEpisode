import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createTmdb } from '../src/tmdb.js';

process.env.NODE_ENV = 'test';

test('tmdb.details: devuelve los 12 primeros del reparto con foto y personaje', async () => {
  const people = Array.from({ length: 20 }, (_, i) => ({
    name: `Actor ${i}`, profile_path: i === 1 ? null : `/p${i}.jpg`, roles: i === 2 ? [] : [{ character: `Papel ${i}`, episode_count: 20 - i }],
  }));
  let url;
  const tmdb = createTmdb({ apiKey: 'k', fetchImpl: async (u) => { url = String(u); return { ok: true, json: async () => ({ id: 5, name: 'Serie', aggregate_credits: { cast: people } }) }; } });
  const d = await tmdb.details(5);
  assert.match(url, /append_to_response=aggregate_credits/);
  assert.equal(d.cast.length, 12);
  assert.deepEqual(d.cast[0], { name: 'Actor 0', character: 'Papel 0', photo_url: 'https://image.tmdb.org/t/p/w185/p0.jpg' });
  assert.equal(d.cast[1].photo_url, null, 'sin foto: null');
  assert.equal(d.cast[2].character, null, 'sin personaje: null');
});

test('API: la ficha incluye el reparto, se guarda y se rellena en series antiguas', async () => {
  const state = { calls: 0 };
  const tmdb = {
    async search() { return []; }, async providers() { return []; }, async providerList() { return []; }, async discover() { return []; },
    async details(id) {
      state.calls++;
      return { tmdb_id: id, title: 'Severance', original_title: 'Severance', year: 2022, overview: '', poster_url: null, backdrop_url: null, genres: 'Drama', seasons: 2, episodes: 19, status: 'Returning Series',
        cast: [{ name: 'Adam Scott', character: 'Mark', photo_url: 'https://x/a.jpg' }] };
    },
  };
  const db = openDb(':memory:');
  const app = createApp({ db, tmdb, jwtSecret: 's' });
  const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (m, p, b, t) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };
  const token = (await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' })).body.token;
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 1 }, token);
  let r = await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(r.body.cast[0].name, 'Adam Scott');
  assert.equal(r.body.cast_json, undefined, 'no se expone el JSON interno');
  assert.equal(state.calls, 1, 'recién importada: reparto ya guardado');
  // Serie anterior a esta función: sin reparto guardado -> se pide una vez y queda guardado.
  db.prepare('UPDATE shows SET cast_json = NULL WHERE id = ?').run(id);
  r = await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(state.calls, 2);
  assert.equal(r.body.cast.length, 1);
  await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(state.calls, 2, 'no vuelve a pedirlo');
  // Serie manual: reparto vacío.
  const m = await call('POST', '/api/shows', { title: 'Hecha a mano', year: 2020 }, token);
  r = await call('GET', `/api/shows/${m.body.id}`, null, token);
  assert.deepEqual(r.body.cast, []);
  server.close();
});
