#!/usr/bin/env bash
# Copia diaria consistente de la BD SQLite (modo WAL → .backup, nunca cp). Ejecutar en el VPS.
set -euo pipefail
DB=/var/www/proyectos-src/nextepisode/server/data/nextepisode.db
DEST=/root/backups/nextepisode
KEEP_DAYS=14
[ -f "$DB" ] || { echo "BD no existe todavía, nada que copiar"; exit 0; }
umask 077
mkdir -p "$DEST"
OUT="$DEST/nextepisode-$(date +%Y%m%d-%H%M).db"
sqlite3 "$DB" ".backup '$OUT'"
[ "$(sqlite3 "$OUT" 'PRAGMA integrity_check;')" = "ok" ] || { echo "Copia corrupta: $OUT" >&2; rm -f "$OUT"; exit 1; }
gzip -f "$OUT"
find "$DEST" -name 'nextepisode-*.db.gz' -mtime +"$KEEP_DAYS" -delete
echo "OK $OUT.gz"
