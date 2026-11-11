import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

// Sin NODE_ENV=test: aquí los límites de intentos están activos.
async function setup() {
  const app = createApp({ db: openDb(':memory:'), tmdb: {}, jwtSecret: 'x', mailer: { async sendResetCode() {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => {
    const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, type: res.headers.get('content-type'), body: await res.json() };
  };
  return { post, close: () => server.close() };
}

test('login: al pasarse de intentos fallidos sale un mensaje claro en español, no "429"', async () => {
  const { post, close } = await setup();
  await post('/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' });
  let last;
  for (let i = 0; i < 21; i++) last = await post('/api/auth/login', { email: 'a@x.es', password: 'mala' });
  assert.equal(last.status, 429);
  assert.match(last.type, /application\/json/);
  assert.match(last.body.error, /Demasiados intentos fallidos/);
  assert.match(last.body.error, /Espera \d+ minutos? y vuelve a intentarlo/);
  assert.ok(last.body.retry_after_minutes >= 1 && last.body.retry_after_minutes <= 15);
  close();
});

test('login: los accesos correctos no cuentan para el límite', async () => {
  const { post, close } = await setup();
  await post('/api/auth/register', { email: 'a@x.es', username: 'ana', password: 'password1' });
  for (let i = 0; i < 30; i++) assert.equal((await post('/api/auth/login', { email: 'a@x.es', password: 'password1' })).status, 200);
  close();
});

test('registro y recuperación tienen su propio mensaje claro', async () => {
  const { post, close } = await setup();
  let reg;
  for (let i = 0; i < 11; i++) reg = await post('/api/auth/register', { email: `u${i}@x.es`, username: `user${i}`, password: 'password1' });
  assert.equal(reg.status, 429);
  assert.match(reg.body.error, /Demasiados registros desde esta conexión\. Espera \d+ minutos?/);
  let rec;
  for (let i = 0; i < 11; i++) rec = await post('/api/auth/forgot', { email: 'u0@x.es' });
  assert.equal(rec.status, 429);
  assert.match(rec.body.error, /Demasiadas solicitudes de recuperación de contraseña\. Espera \d+ minutos?/);
  close();
});
