#!/usr/bin/env bash
# Ejecutar EN EL MAC (no hace falta Xcode): compila la web de la app y la publica en el VPS.
# Ojo: la build se hace fuera de OneDrive (node_modules cuelga el I/O); usa un clon en /tmp.
set -euo pipefail
cd "$(dirname "$0")/../app"
npm install --no-audit --no-fund
rm -rf dist && npx expo export -p web
rsync -az --delete -e "ssh -i $HOME/.ssh/vps_tga" dist/ root@46.224.63.213:/var/www/proyectos-src/nextepisode/app-web/
echo "Publicada en https://jpchost.ddns.net/proyectos/nextepisode/ (requiere login del portal)"
