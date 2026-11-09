import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(file = process.env.DB_PATH || 'data/nextepisode.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'ES',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY,
      tmdb_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      original_title TEXT,
      title_key TEXT NOT NULL,
      year INTEGER,
      overview TEXT,
      poster_url TEXT,
      genres TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL CHECK (source IN ('tmdb','user')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shows_key ON shows(title_key, year);
    CREATE TABLE IF NOT EXISTS show_providers (
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      country TEXT NOT NULL,
      provider TEXT NOT NULL,
      logo_url TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (show_id, country, provider)
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, show_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_show ON reviews(show_id);
  `);
  // Migración para BDs creadas antes de existir original_title.
  if (!db.prepare('PRAGMA table_info(shows)').all().some((c) => c.name === 'original_title')) {
    db.exec('ALTER TABLE shows ADD COLUMN original_title TEXT');
  }
  return db;
}

// Normaliza títulos para deduplicar: sin acentos, minúsculas, solo alfanumérico.
export const titleKey = (t) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
