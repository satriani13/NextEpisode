import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { suggestionEmail } from '../src/mailer.js';

process.env.NODE_ENV = 'test';

async function setup(mailer) {
  const db = openDb(':memory:');
  const app = createApp({ db, tmdb: { async search() { return []; } }, jwtSecret: 'test-secret', mailer });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  };
  const reg = async (n) => (await call('POST', '/api/auth/register', { email: `${n}@x.es`, username: n, password: 'password1' })).body.token;
  return { db, call, reg, close: () => server.close() };
}

test('sugerencias: exige sesión y valida la longitud', async () => {
  const { call, reg, close } = await setup({ async sendResetCode() {}, async sendSuggestion() { return true; } });
  assert.equal((await call('POST', '/api/suggestions', { body: 'Una idea larga' })).status, 401);
  const t = await reg('ana');
  assert.equal((await call('POST', '/api/suggestions', { body: 'corta' }, t)).status, 400);
  assert.equal((await call('POST', '/api/suggestions', { body: 'x'.repeat(2001) }, t)).status, 400);
  assert.equal((await call('POST', '/api/suggestions', {}, t)).status, 400);
  close();
});

test('sugerencias: se guarda y se envía por correo con usuario, email y fecha', async () => {
  const sent = [];
  const { db, call, reg, close } = await setup({ async sendResetCode() {}, async sendSuggestion(m) { sent.push(m); return true; } });
  const t = await reg('ana');
  const r = await call('POST', '/api/suggestions', { body: '  Añadir modo claro a la app  ' }, t);
  assert.equal(r.status, 201);
  await new Promise((r2) => setTimeout(r2, 20));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].username, 'ana');
  assert.equal(sent[0].email, 'ana@x.es');
  assert.equal(sent[0].body, 'Añadir modo claro a la app');
  assert.match(sent[0].createdAt, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
  assert.equal(db.prepare('SELECT emailed FROM suggestions').get().emailed, 1);
  close();
});

test('sugerencias: si el correo falla, la sugerencia queda guardada y el usuario no ve error', async () => {
  const { db, call, reg, close } = await setup({ async sendResetCode() {}, async sendSuggestion() { throw new Error('smtp caído'); } });
  const t = await reg('ana');
  const errLog = console.error; console.error = () => {};
  const r = await call('POST', '/api/suggestions', { body: 'Notificaciones de estrenos' }, t);
  await new Promise((r2) => setTimeout(r2, 20)); console.error = errLog;
  assert.equal(r.status, 201);
  const row = db.prepare('SELECT body, emailed FROM suggestions').get();
  assert.deepEqual({ ...row }, { body: 'Notificaciones de estrenos', emailed: 0 });
  close();
});

test('correo de sugerencia: usuario, fecha y texto, con el HTML escapado y el diseño de la app', () => {
  const m = suggestionEmail({ username: 'Ana<b>', email: 'ana@x.es', body: 'Línea 1\n<script>alert(1)</script>', createdAt: '2026-11-17 21:05:00' });
  assert.match(m.subject, /Sugerencia de Ana<b>/);
  assert.match(m.text, /Usuario: Ana<b> <ana@x\.es>/);
  assert.match(m.html, /17 de noviembre de 2026/);
  assert.match(m.html, /22:05/, 'hora de Madrid (UTC+1)');
  assert.ok(!m.html.includes('<script>'));
  assert.match(m.html, /Línea 1<br>&lt;script&gt;/);
  assert.match(m.html, /#0B0B10/);
  assert.match(m.html, /#FF6B3D/);
});
