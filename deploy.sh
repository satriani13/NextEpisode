#!/usr/bin/env bash
# Ejecutar EN EL VPS: actualiza y reinicia la API.
set -euo pipefail
export PATH=/root/.nvm/versions/node/v22.23.2/bin:$PATH
cd /var/www/proyectos-src/nextepisode
git pull --ff-only
cd server && npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save
