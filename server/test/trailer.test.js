import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createTmdb } from '../src/tmdb.js';

process.env.NODE_ENV = 'test';

const detailsWith = (results) => createTmdb({ apiKey: 'k', fetchImpl: async (u) => ({ ok: true, json: async () => ({ id: 5, name: 'S', videos: { results }, _u: String(u) }) }) }).details(5);
const v = (key, o = {}) => ({ site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en', key, ...o });

test('tmdb.details: elige el mejor tráiler de YouTube (oficial, español) y pide los vídeos', async () => {
  let url;
  const tmdb = createTmdb({ apiKey: 'k', fetchImpl: async (u) => { url = String(u); return { ok: true, json: async () => ({ id: 5, name: 'S', videos: { results: [v('en1'), v('es1', { iso_639_1: 'es' })] } }) }; } });
  assert.equal((await tmdb.details(5)).trailer, 'es1');
  assert.match(url, /append_to_response=aggregate_credits%2Cvideos/);
  assert.equal((await detailsWith([v('vimeo', { site: 'Vimeo' }), v('feat', { type: 'Featurette' }), v('teaser', { type: 'Teaser' }), v('noof', { official: false })])).trailer, 'noof', 'Trailer no oficial gana a Teaser');
  assert.equal((await detailsWith([v('x', { site: 'Vimeo' })])).trailer, null);
  assert.equal((await detailsWith([])).trailer, null);
});

test('API: la ficha incluye el tráiler, se guarda y se rellena en series antiguas', async () => {
  let calls = 0;
  const tmdb = { async search() { return []; }, async details(id) { calls++; return { tmdb_id: id, title: 'Andor', original_title: 'Andor', year: 2022, overview: '', genres: 'Drama', seasons: 2, episodes: 24, status: 'Ended', cast: [], trailer: 'abc123' }; } };
  const db = openDb(':memory:');
  const app = createApp({ db, tmdb, jwtSecret: 's' });
  const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (m, p, b, t) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };
  const token = (await call('POST', '/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' })).body.token;
  const { body: { id } } = await call('POST', '/api/shows', { tmdb_id: 1 }, token);
  let r = await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(r.body.trailer, 'abc123');
  assert.equal(r.body.trailer_key, undefined);
  assert.equal(calls, 1);
  db.prepare('UPDATE shows SET trailer_key = NULL WHERE id = ?').run(id);
  await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(calls, 2, 'serie antigua: se pide una vez');
  await call('GET', `/api/shows/${id}`, null, token);
  assert.equal(calls, 2);
  const m = await call('POST', '/api/shows', { title: 'Hecha a mano', year: 2020 }, token);
  assert.equal((await call('GET', `/api/shows/${m.body.id}`, null, token)).body.trailer, null);
  server.close();
});
