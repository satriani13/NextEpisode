import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

async function setup() {
  const app = createApp({ db: openDb(':memory:'), tmdb: { async search() { return []; } }, jwtSecret: 'test-secret' });
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
  const reg = async (n) => (await call('POST', '/api/auth/register', { email: `${n}@x.es`, username: n, password: 'password1' })).body.token;
  return { call, reg, close: () => server.close() };
}

test('quiero ver: añadir, listar, repetir sin duplicar y quitar', async () => {
  const { call, reg, close } = await setup();
  const t = await reg('ana');
  const a = (await call('POST', '/api/shows', { title: 'Andor', year: 2022 }, t)).body.id;
  const b = (await call('POST', '/api/shows', { title: 'Shogun', year: 2024 }, t)).body.id;
  assert.equal((await call('PUT', `/api/me/watchlist/${a}`, null, t)).status, 200);
  assert.equal((await call('PUT', `/api/me/watchlist/${a}`, null, t)).status, 200); // idempotente
  await call('PUT', `/api/me/watchlist/${b}`, null, t);
  const list = (await call('GET', '/api/me/watchlist', null, t)).body;
  assert.deepEqual(list.map((s) => s.title).sort(), ['Andor', 'Shogun']);
  assert.equal(list.length, 2);
  assert.equal((await call('GET', `/api/shows/${a}`, null, t)).body.in_watchlist, true);
  await call('DELETE', `/api/me/watchlist/${a}`, null, t);
  assert.equal((await call('GET', `/api/shows/${a}`, null, t)).body.in_watchlist, false);
  assert.deepEqual((await call('GET', '/api/me/watchlist', null, t)).body.map((s) => s.title), ['Shogun']);
  close();
});

test('quiero ver: es privada por usuario, exige sesión y valida la serie', async () => {
  const { call, reg, close } = await setup();
  const [ana, bob] = [await reg('ana'), await reg('bob')];
  const id = (await call('POST', '/api/shows', { title: 'Andor', year: 2022 }, ana)).body.id;
  await call('PUT', `/api/me/watchlist/${id}`, null, ana);
  assert.deepEqual((await call('GET', '/api/me/watchlist', null, bob)).body, []);
  assert.equal((await call('GET', `/api/shows/${id}`, null, bob)).body.in_watchlist, false);
  assert.equal((await call('GET', '/api/me/watchlist')).status, 401);
  assert.equal((await call('PUT', '/api/me/watchlist/999', null, ana)).status, 404);
  close();
});

test('quiero ver: puntuar una serie la saca de la lista y ya no se puede guardar', async () => {
  const { call, reg, close } = await setup();
  const t = await reg('ana');
  const id = (await call('POST', '/api/shows', { title: 'Andor', year: 2022 }, t)).body.id;
  await call('PUT', `/api/me/watchlist/${id}`, null, t);
  await call('POST', `/api/shows/${id}/reviews`, { rating: 5 }, t);
  assert.deepEqual((await call('GET', '/api/me/watchlist', null, t)).body, []);
  assert.equal((await call('PUT', `/api/me/watchlist/${id}`, null, t)).status, 409);
  close();
});
