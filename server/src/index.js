import { openDb } from './db.js';
import { createTmdb } from './tmdb.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3025);
const app = createApp({ db: openDb(), tmdb: createTmdb() });
// Solo local: nginx hace de proxy inverso.
app.listen(port, '127.0.0.1', () => console.log(`NextEpisode API en 127.0.0.1:${port}`));
