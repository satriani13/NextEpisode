import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { titleKey } from './db.js';

const PROVIDER_TTL_HOURS = 24;

export function createApp({ db, tmdb, jwtSecret = process.env.JWT_SECRET }) {
  if (!jwtSecret) throw new Error('JWT_SECRET requerido');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '50kb' }));

  // CORS solo si se configura (p. ej. pruebas con la app web en desarrollo). La app nativa no lo necesita.
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.use((req, res, next) => {
      res.set({
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'content-type, authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

  const auth = (req, res, next) => {
    const h = req.get('authorization') || '';
    try {
      req.user = jwt.verify(h.replace(/^Bearer /, ''), jwtSecret);
      next();
    } catch {
      bad(res, 'No autenticado', 401);
    }
  };
  const sign = (u) => jwt.sign({ id: u.id, username: u.username, country: u.country }, jwtSecret, { expiresIn: '30d' });

  const showSelect = `
    SELECT s.*, ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(r.id) AS ratings_count
    FROM shows s LEFT JOIN reviews r ON r.show_id = s.id`;

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // ---- Auth ----
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skip: () => process.env.NODE_ENV === 'test' });
  const DUMMY_HASH = bcrypt.hashSync('dummy', 10);

  app.post('/api/auth/register', loginLimiter, wrap((req, res) => {
    const { email, username, password, country = 'ES' } = req.body || {};
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return bad(res, 'Email no válido');
    if (!/^[\w.-]{3,24}$/.test(username || '')) return bad(res, 'Usuario: 3-24 caracteres (letras, números, . _ -)');
    if (typeof password !== 'string' || password.length < 8) return bad(res, 'La contraseña necesita al menos 8 caracteres');
    if (!/^[A-Za-z]{2}$/.test(country)) return bad(res, 'País no válido');
    try {
      const r = db.prepare('INSERT INTO users (email, username, password_hash, country) VALUES (?,?,?,?)')
        .run(email, username, bcrypt.hashSync(password, 10), country.toUpperCase());
      const user = { id: Number(r.lastInsertRowid), username, country: country.toUpperCase() };
      res.status(201).json({ token: sign(user), user });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return bad(res, 'Email o usuario ya registrado', 409);
      throw e;
    }
  }));

  app.post('/api/auth/login', loginLimiter, wrap((req, res) => {
    const { email, password } = req.body || {};
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || ''));
    const ok = bcrypt.compareSync(String(password || ''), u ? u.password_hash : DUMMY_HASH);
    if (!u || !ok) return bad(res, 'Credenciales incorrectas', 401);
    res.json({ token: sign(u), user: { id: u.id, username: u.username, country: u.country } });
  }));

  // ---- Series ----
  app.get('/api/shows/search', auth, wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return bad(res, 'Escribe al menos 2 caracteres');
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const local = db.prepare(`${showSelect} WHERE s.title LIKE ? ESCAPE '\\' GROUP BY s.id ORDER BY ratings_count DESC LIMIT 20`).all(like);
    const known = new Set(local.map((s) => s.tmdb_id).filter(Boolean));
    let remote = [];
    try {
      remote = (await tmdb.search(q)).filter((s) => !known.has(s.tmdb_id));
    } catch {
      // TMDB caído: seguimos con el catálogo local.
    }
    res.json({ catalog: local, tmdb: remote });
  }));

  app.post('/api/shows', auth, wrap(async (req, res) => {
    const { tmdb_id, title, year, overview = '', genres = '' } = req.body || {};
    if (tmdb_id) {
      const existing = db.prepare('SELECT id FROM shows WHERE tmdb_id = ?').get(tmdb_id);
      if (existing) return res.json({ id: existing.id, created: false });
      let d;
      try { d = await tmdb.details(tmdb_id); } catch { return bad(res, 'Serie no encontrada en TMDB', 404); }
      const r = db.prepare(`INSERT INTO shows (tmdb_id,title,title_key,year,overview,poster_url,genres,source,created_by)
        VALUES (?,?,?,?,?,?,?,'tmdb',?)`)
        .run(d.tmdb_id, d.title, titleKey(d.title), d.year, d.overview, d.poster_url, d.genres, req.user.id);
      return res.status(201).json({ id: Number(r.lastInsertRowid), created: true });
    }
    if (typeof title !== 'string' || title.trim().length < 2 || title.length > 120) return bad(res, 'Título no válido');
    const y = year == null || year === '' ? null : Number(year);
    if (y !== null && !(Number.isInteger(y) && y >= 1930 && y <= new Date().getFullYear() + 2)) return bad(res, 'Año no válido');
    const key = titleKey(title);
    const dup = db.prepare('SELECT id FROM shows WHERE title_key = ? AND (year IS ? OR year IS NULL OR ? IS NULL)').get(key, y, y);
    if (dup) return res.json({ id: dup.id, created: false });
    const r = db.prepare(`INSERT INTO shows (title,title_key,year,overview,genres,source,created_by) VALUES (?,?,?,?,?,'user',?)`)
      .run(title.trim(), key, y, String(overview).slice(0, 1000), String(genres).slice(0, 200), req.user.id);
    res.status(201).json({ id: Number(r.lastInsertRowid), created: true });
  }));

  app.get('/api/shows/:id', auth, wrap(async (req, res) => {
    const show = db.prepare(`${showSelect} WHERE s.id = ? GROUP BY s.id`).get(req.params.id);
    if (!show || show.id == null) return bad(res, 'Serie no encontrada', 404);
    const country = String(req.query.country || req.user.country).toUpperCase();
    let providers = db.prepare(`SELECT provider, logo_url FROM show_providers WHERE show_id=? AND country=?
      AND fetched_at > datetime('now', ?)`).all(show.id, country, `-${PROVIDER_TTL_HOURS} hours`);
    if (!providers.length && show.tmdb_id) {
      try {
        providers = await tmdb.providers(show.tmdb_id, country);
        db.prepare('DELETE FROM show_providers WHERE show_id=? AND country=?').run(show.id, country);
        const ins = db.prepare('INSERT OR REPLACE INTO show_providers (show_id,country,provider,logo_url) VALUES (?,?,?,?)');
        for (const p of providers) ins.run(show.id, country, p.provider, p.logo_url);
      } catch { /* sin plataformas si TMDB falla */ }
    }
    const mine = db.prepare('SELECT rating, body FROM reviews WHERE show_id=? AND user_id=?').get(show.id, req.user.id) || null;
    res.json({ ...show, providers, country, my_review: mine });
  }));

  // ---- Reseñas ----
  app.get('/api/shows/:id/reviews', auth, (req, res) => {
    const rows = db.prepare(`SELECT r.id, r.rating, r.body, r.updated_at, u.username
      FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.show_id = ? ORDER BY r.updated_at DESC LIMIT 100`).all(req.params.id);
    res.json(rows);
  });

  app.post('/api/shows/:id/reviews', auth, (req, res) => {
    const { rating, body = '' } = req.body || {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, 'La puntuación debe ser de 1 a 5');
    if (typeof body !== 'string' || body.length > 2000) return bad(res, 'Opinión demasiado larga (máx. 2000)');
    if (!db.prepare('SELECT 1 FROM shows WHERE id=?').get(req.params.id)) return bad(res, 'Serie no encontrada', 404);
    db.prepare(`INSERT INTO reviews (user_id, show_id, rating, body) VALUES (?,?,?,?)
      ON CONFLICT(user_id, show_id) DO UPDATE SET rating=excluded.rating, body=excluded.body, updated_at=datetime('now')`)
      .run(req.user.id, req.params.id, rating, body.trim());
    res.status(201).json({ ok: true });
  });

  app.get('/api/me/reviews', auth, (req, res) => {
    res.json(db.prepare(`SELECT s.id AS show_id, s.title, s.year, s.poster_url, r.rating, r.body, r.updated_at
      FROM reviews r JOIN shows s ON s.id = r.show_id WHERE r.user_id = ? ORDER BY r.updated_at DESC`).all(req.user.id));
  });

  // ---- Recomendaciones ----
  // Usuarios afines = los que puntúan igual (±1) series que yo he puntuado; recomendamos lo que ellos
  // valoran ≥4 y yo no he visto. Si no hay datos suficientes, top global.
  app.get('/api/recommendations', auth, (req, res) => {
    const me = req.user.id;
    const personal = db.prepare(`
      WITH peers AS (
        SELECT r2.user_id, COUNT(*) AS common
        FROM reviews r1 JOIN reviews r2 ON r2.show_id = r1.show_id AND r2.user_id <> r1.user_id
        WHERE r1.user_id = ? AND ABS(r1.rating - r2.rating) <= 1
        GROUP BY r2.user_id
      )
      SELECT s.id, s.title, s.year, s.poster_url, s.genres,
             ROUND(AVG(r.rating),2) AS avg_rating, COUNT(*) AS ratings_count, SUM(p.common) AS score
      FROM peers p JOIN reviews r ON r.user_id = p.user_id AND r.rating >= 4
      JOIN shows s ON s.id = r.show_id
      WHERE s.id NOT IN (SELECT show_id FROM reviews WHERE user_id = ?)
      GROUP BY s.id ORDER BY score DESC, avg_rating DESC LIMIT 20`).all(me, me);
    if (personal.length) return res.json({ kind: 'personalized', shows: personal });
    const top = db.prepare(`${showSelect}
      WHERE s.id NOT IN (SELECT show_id FROM reviews WHERE user_id = ?)
      GROUP BY s.id HAVING ratings_count > 0 ORDER BY avg_rating DESC, ratings_count DESC LIMIT 20`).all(me);
    res.json({ kind: 'top', shows: top });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });
  return app;
}
