#!/usr/bin/env bash
# Ejecutar EN EL VPS: actualiza y reinicia la API.
set -euo pipefail
# npm con Node 22 (la app); pm2 vive en el Node 20 por defecto de nvm.
export PATH=/root/.nvm/versions/node/v22.23.2/bin:/root/.nvm/versions/node/v20.20.2/bin:$PATH
cd /var/www/proyectos-src/nextepisode
git pull --ff-only
cd server && npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save
