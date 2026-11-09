// PM2 en el VPS. Secretos en server/.env (fuera del repo): JWT_SECRET, TMDB_API_KEY.
module.exports = {
  apps: [{
    name: 'nextepisode-api',
    script: 'src/index.js',
    cwd: __dirname,
    interpreter: '/root/.nvm/versions/node/v22.23.2/bin/node', // node:sqlite requiere ≥22.5
    node_args: '--env-file=.env --disable-warning=ExperimentalWarning',
    env: { PORT: 3025, TRUST_PROXY: 1, NODE_ENV: 'production' },
    max_memory_restart: '300M',
  }],
};
