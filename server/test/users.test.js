import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';

async function setup() {
  const sent = [];
  let clock = 1_000_000;
  const mailer = { async sendResetCode(m) { sent.push(m); } };
  const app = createApp({
    db: openDb(':memory:'), tmdb: { async search() { return []; } }, jwtSecret: 'test-secret',
    mailer, adminEmails: ['Admin@X.es'], now: () => clock,
  });
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
  const register = async (name, email = `${name}@x.es`) =>
    (await call('POST', '/api/auth/register', { email, username: name, password: 'password1' })).body;
  return { call, register, sent, advance: (ms) => { clock += ms; }, close: () => server.close() };
}

test('admin: solo ADMIN_EMAILS (sin distinguir mayúsculas) ve y lista usuarios', async () => {
  const { call, register, close } = await setup();
  const admin = await register('root', 'admin@x.es');
  const user = await register('ana');
  assert.equal(admin.user.admin, true);
  assert.equal(user.user.admin, false);
  assert.equal((await call('GET', '/api/admin/users', null, user.token)).status, 403);
  assert.equal((await call('GET', '/api/admin/users')).status, 401);
  const list = await call('GET', '/api/admin/users', null, admin.token);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((u) => u.username), ['ana', 'root']);
  assert.ok(!JSON.stringify(list.body).includes('password'), 'no se expone ningún hash');
  assert.equal(list.body.find((u) => u.username === 'root').admin, true);
  close();
});

test('admin: cambia la contraseña de otro; sus sesiones viejas caducan', async () => {
  const { call, register, close } = await setup();
  const admin = await register('root', 'admin@x.es');
  const ana = await register('ana');
  const r = await call('POST', `/api/admin/users/${ana.user.id}/password`, { password: 'nuevaClave9' }, admin.token);
  assert.equal(r.status, 200);
  assert.equal(r.body.token, undefined);
  assert.equal((await call('GET', '/api/me/reviews', null, ana.token)).status, 401); // token viejo
  assert.equal((await call('POST', '/api/auth/login', { email: 'ana@x.es', password: 'password1' })).status, 401);
  const login = await call('POST', '/api/auth/login', { email: 'ana@x.es', password: 'nuevaClave9' });
  assert.equal(login.status, 200);
  assert.equal((await call('GET', '/api/me/reviews', null, login.body.token)).status, 200);
  // validaciones y permisos
  assert.equal((await call('POST', `/api/admin/users/${ana.user.id}/password`, { password: 'corta' }, admin.token)).status, 400);
  assert.equal((await call('POST', '/api/admin/users/999/password', { password: 'nuevaClave9' }, admin.token)).status, 404);
  assert.equal((await call('POST', `/api/admin/users/${admin.user.id}/password`, { password: 'nuevaClave9' }, login.body.token)).status, 403);
  close();
});

test('admin: si se cambia su propia contraseña recibe un token válido', async () => {
  const { call, register, close } = await setup();
  const admin = await register('root', 'admin@x.es');
  const r = await call('POST', `/api/admin/users/${admin.user.id}/password`, { password: 'otraClave99' }, admin.token);
  assert.ok(r.body.token);
  assert.equal((await call('GET', '/api/admin/users', null, r.body.token)).status, 200);
  assert.equal((await call('GET', '/api/admin/users', null, admin.token)).status, 401);
  close();
});

test('recuperación: código por correo, cambio de contraseña y un solo uso', async () => {
  const { call, register, sent, close } = await setup();
  const ana = await register('ana');
  const f = await call('POST', '/api/auth/forgot', { email: 'ANA@x.es' });
  assert.equal(f.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'ana@x.es');
  assert.match(sent[0].code, /^[A-Z2-9]{8}$/);
  const code = sent[0].code;
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: 'AAAAAAAA', password: 'nuevaClave9' })).status, 400);
  // el formato con guion y minúsculas, como lo escribe una persona, también vale
  const pretty = `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase();
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: pretty, password: 'nuevaClave9' })).status, 200);
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code, password: 'otraMas123' })).status, 400); // un solo uso
  assert.equal((await call('POST', '/api/auth/login', { email: 'ana@x.es', password: 'nuevaClave9' })).status, 200);
  assert.equal((await call('GET', '/api/me/reviews', null, ana.token)).status, 401);
  close();
});

test('recuperación: email inexistente da la misma respuesta y no envía nada', async () => {
  const { call, register, sent, close } = await setup();
  await register('ana');
  const a = await call('POST', '/api/auth/forgot', { email: 'ana@x.es' });
  const b = await call('POST', '/api/auth/forgot', { email: 'nadie@x.es' });
  assert.deepEqual(a.body, b.body);
  assert.equal(sent.length, 1);
  assert.equal((await call('POST', '/api/auth/forgot', { email: 'no-es-email' })).status, 400);
  close();
});

test('recuperación: caduca a la hora, se agota a los 5 intentos y respeta el cooldown', async () => {
  const { call, register, sent, advance, close } = await setup();
  await register('ana');
  await call('POST', '/api/auth/forgot', { email: 'ana@x.es' });
  await call('POST', '/api/auth/forgot', { email: 'ana@x.es' }); // dentro del cooldown: no reenvía
  assert.equal(sent.length, 1);
  advance(61 * 60 * 1000);
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: sent[0].code, password: 'nuevaClave9' })).status, 400); // caducado
  await call('POST', '/api/auth/forgot', { email: 'ana@x.es' });
  assert.equal(sent.length, 2);
  for (let i = 0; i < 5; i++) await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: 'AAAAAAAA', password: 'nuevaClave9' });
  // agotados los intentos, ni el código correcto sirve
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: sent[1].code, password: 'nuevaClave9' })).status, 400);
  advance(2 * 60 * 1000);
  await call('POST', '/api/auth/forgot', { email: 'ana@x.es' }); // pedir otro código reinicia los intentos
  assert.equal(sent.length, 3);
  assert.equal((await call('POST', '/api/auth/reset', { email: 'ana@x.es', code: sent[2].code, password: 'nuevaClave9' })).status, 200);
  close();
});
