# NextEpisode

App móvil de recomendación de series de streaming (Netflix, Prime Video, Disney+, Apple TV+…).
Buscas una serie que has visto, la puntúas y dejas tu opinión. Si la serie no está en el catálogo, la añades
y otros usuarios pueden opinar sobre ella. Las recomendaciones salen de usuarios con gustos parecidos.

## Estado
MVP funcional en local (backend con tests, app Expo tipada). **Sin desplegar todavía** en el VPS.
Flujo probado de extremo a extremo en la versión web de la app (registro → buscar → añadir serie → puntuar).

## Arquitectura
```
app/     Expo SDK 58 · React Native · TypeScript · React Navigation
server/  Node ≥22.13 · Express · node:sqlite (builtin) · JWT + bcryptjs
```
- **Catálogo:** TMDB (series, pósters, sinopsis) y *watch providers* (datos JustWatch) por país. La API key de TMDB
  vive solo en el servidor (proxy); la app nunca la ve. Si TMDB falla, se sigue con el catálogo local.
- **Series añadidas por usuarios** (`source='user'`) se deduplican por título normalizado (sin acentos/mayúsculas) + año.

### Modelo de datos (SQLite)
`users` · `shows` (tmdb_id único opcional, `source` tmdb|user) · `show_providers` (caché 24 h por país) ·
`reviews` (1–5 estrellas + texto, única por usuario/serie; reeditable).

### API (`/api`, todo con `Authorization: Bearer` salvo auth y `/health`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Cuenta y sesión (JWT 30 d, rate-limit) |
| GET | `/shows/search?q=` | Catálogo local + resultados TMDB aún no importados |
| POST | `/shows` | Importa de TMDB (`tmdb_id`) o crea manualmente (`title`, `year`…) |
| GET | `/shows/:id` | Ficha, media, plataformas del país, tu reseña |
| GET/POST | `/shows/:id/reviews` | Listar / crear-editar tu reseña |
| GET | `/me/reviews` | Tus series puntuadas |
| GET | `/recommendations` | Afinidad entre usuarios (±1 punto en series en común) → series que ellos puntúan ≥4 y tú no has visto; si no hay datos, top global |

## Desarrollo
```bash
# Backend (puerto 3025, solo 127.0.0.1)
cd server && npm install
JWT_SECRET=dev TMDB_API_KEY=<tu-clave> npm start     # sin TMDB_API_KEY solo funciona el catálogo manual
npm test                                              # 5 tests con TMDB simulado

# App
cd app && npm install && npx expo start --ios        # EXPO_PUBLIC_API_URL por defecto http://localhost:3025/api
# Sin Xcode: npx expo start --web (arranca el servidor con CORS_ORIGIN=http://localhost:8081, o el puerto que uses)
```
Variables del servidor: `JWT_SECRET` (obligatoria), `TMDB_API_KEY`, `PORT` (3025), `DB_PATH` (`data/nextepisode.db`), `CORS_ORIGIN` (opcional; solo para probar la app web, no hace falta en móvil ni en producción).

## Limitaciones conocidas / pendiente
- Sin desplegar: PM2 `nextepisode-api` en el VPS (puerto 3025) + nginx + HTTPS; fijar `EXPO_PUBLIC_API_URL`.
- Sin watchlist, notificaciones, perfiles sociales ni moderación/“reportar” de reseñas.
- Búsqueda local por `LIKE` (suficiente para el MVP; FTS5 más adelante).
- No probada en simulador/dispositivo iOS (este Mac no tiene Xcode completo); probada en web. En web el token va en `localStorage` (solo para desarrollo; en móvil usa SecureStore).
- Sin probar la integración real con TMDB (falta la API key): solo con TMDB simulado en los tests.

## Changelog
- **0.1.1** — soporte web para pruebas (fallback de almacenamiento) y CORS opcional.
- **0.1.0** — MVP: auth, catálogo TMDB + alta manual, reseñas, plataformas por país, recomendaciones.
