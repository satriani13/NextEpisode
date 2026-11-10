# NextEpisode

App móvil de recomendación de series de streaming (Netflix, Prime Video, Disney+, Apple TV+…).
Buscas una serie que has visto, la puntúas y dejas tu opinión. Si la serie no está en el catálogo, la añades
y otros usuarios pueden opinar sobre ella. Las recomendaciones salen de usuarios con gustos parecidos.

## Estado
MVP funcional. **API y versión web desplegadas en el VPS**: API en `https://jpchost.ddns.net/proyectos/nextepisode/api`; web de la app en `https://jpchost.ddns.net/proyectos/nextepisode/` (visible en el Portal de Demos, requiere login). La app móvil aún no está publicada en tiendas.
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
`reviews` (1–5 estrellas + texto, única por usuario/serie; reeditable) · `user_prefs` (géneros y plataformas elegidos) · `watchlist` (usuario + serie: «Quiero ver») · `shows.seasons/episodes/status/details_at` (de TMDB; se refrescan al abrir la ficha como mucho cada 7 días; en series manuales, temporadas opcionales) · `shows.backdrop_url` (imagen ancha para las fichas).

### API (`/api`, todo con `Authorization: Bearer` salvo auth y `/health`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Cuenta y sesión (JWT 30 d, rate-limit). La respuesta incluye `user.admin` |
| POST | `/auth/forgot` `{email}` | Envía por correo un código de recuperación (8 caracteres, 1 h, 1 activo por usuario, cooldown 60 s). Respuesta idéntica exista o no el email |
| POST | `/auth/reset` `{email, code, password}` | Cambia la contraseña con el código (máx. 5 intentos, un solo uso) |
| GET | `/admin/users` | **Solo admin.** Lista usuarios (email, país, nº de opiniones, alta). Nunca devuelve hashes |
| POST | `/admin/users/:id/password` `{password}` | **Solo admin.** Fija una contraseña nueva; cierra las sesiones abiertas de ese usuario |
| GET | `/shows/search?q=&genres=` | Catálogo local + resultados TMDB aún no importados. Con `genres` (ids separados por comas) suben los que encajan; nada se filtra |
| GET | `/meta` | Géneros que ofrece la app y plataformas principales del país del usuario (logos de TMDB; caché 24 h) |
| GET | `/discover?genres=&providers=&sort=` | Explorar sin texto: por género(s) y/o plataforma(s) (varios = «o»). `sort=new` (lo usa la app): estrenos más recientes de lo que hay en streaming en el país (primer estreno ≤ hoy, ≥5 votos), en un único orden por fecha; lo ya importado lleva `show_id` y su nota. `sort=popular` (por defecto en la API): más populares; lo ya importado sale como `catalog` |
| GET/PUT | `/me/prefs` | Géneros y plataformas favoritos del usuario (se recuerdan entre sesiones y dispositivos) |
| POST | `/shows` | Importa de TMDB (`tmdb_id`) o crea manualmente (`title`, `year`…) |
| GET | `/shows/:id` | Ficha, media, plataformas del país, tu reseña |
| GET/POST | `/shows/:id/reviews` | Listar / crear-editar tu reseña |
| GET | `/me/reviews` | Tus series puntuadas |
| GET | `/me/watchlist` | Tu lista «Quiero ver» (más reciente primero) |
| PUT/DELETE | `/me/watchlist/:id` | Guardar / quitar una serie de «Quiero ver». PUT es idempotente; 409 si ya la has puntuado |
| GET | `/recommendations` | Afinidad entre usuarios (±1 punto en series en común) → series que ellos puntúan ≥4 y tú no has visto; si no hay datos, top global |

## Interfaz (rediseño 0.4.0)
- **Formato:** web app con aspecto de móvil. En pantallas anchas se muestra dentro de un marco de móvil centrado; en un móvil o ventana estrecha ocupa toda la pantalla (`src/components/PhoneFrame.tsx`).
- **Novedades / Populares:** selector en el inicio (por defecto Novedades): los estrenos más recientes de tus plataformas y géneros, con su fecha. Limitación: ordena por *primer estreno*; una temporada nueva de una serie antigua no aparece como novedad.
- **Temporadas:** la ficha muestra temporadas, episodios y estado (en emisión, finalizada…); las tarjetas, «N temp.» cuando se conoce.
- **Quiero ver:** botón en la ficha de cada serie (cambio instantáneo, se deshace si falla) y pestaña «Quiero ver» en «Mis series» con contador y «Quitar de la lista». La lista es privada y, al puntuar una serie, sale sola de ella (ya la has visto).
- **Inicio = Explorar:** ya no está en blanco. Sugiere **plataformas** (con logo) y **géneros** como chips multi-selección, recordados por usuario; con ellos descubre series (destacada + rejilla). Si escribes un título, manda el título y los géneros elegidos suben lo que encaja.
- **Sistema visual:** «cine nocturno» — fondo con tinte (no `#000`), un solo acento (ember `#FF6B3D`), superficies de cristal con doble bisel, Outfit (titulares) + Geist (texto), iconos Phosphor de trazo fino. Tokens en `src/theme.ts`, componentes en `src/components/ui.tsx`.
- **Movimiento** (`src/motion.tsx`): entradas escalonadas, pulsación con muelle, brillo de carga (*shimmer*) y aurora de fondo; solo `transform`/`opacity`; se desactiva con «reducir movimiento» del sistema.
- **Accesibilidad:** contrastes AA comprobados (texto 6,2–18:1), objetivos táctiles ≥44 px, etiquetas en todos los controles, foco de teclado visible solo al usar teclado, zoom permitido.
- **Rendimiento:** iconos importados uno a uno (`src/icons.ts`) y fuentes por peso: el bundle JS pasó de 6,5 MB a ~1 MB (271 KB comprimido).

## Usuarios, administración y recuperación de contraseña
- **Administrador** = email incluido en `ADMIN_EMAILS` (se comprueba en el servidor en cada petición). Ve la pestaña **Usuarios**: lista y cambio de contraseña. Las contraseñas están cifradas con bcrypt: **no se pueden ver**, solo fijar una nueva.
- **Sesiones:** cada usuario tiene `token_version`; al cambiarse su contraseña (por el admin o por recuperación) sus tokens anteriores dejan de valer.
- **Recuperar contraseña:** «¿Has olvidado tu contraseña?» en el login → código por correo → código + contraseña nueva. Solo se guarda el hash SHA-256 del código.

## Despliegue (VPS)
- Código en `/var/www/proyectos-src/nextepisode/` (clon HTTPS del repo público). PM2 `nextepisode-api`, **puerto 3025**, solo `127.0.0.1`,
  Node 22 por `interpreter` (`server/ecosystem.config.cjs`; PM2 en sí vive en el Node 20 de nvm).
- Secretos en `server/.env` (chmod 600, fuera del repo): `JWT_SECRET`, `TMDB_API_KEY`. BD SQLite en `server/data/` (gitignored).
- nginx (`/etc/nginx/sites-enabled/portal`): `location /proyectos/nextepisode/api/` → `127.0.0.1:3025/api/` (más `= /proyectos/nextepisode/health`), **sin `auth_request` del portal**:
  la app móvil usa su propio JWT. Misma URL en `jpchost.ddns.net`, `jpctools.es` y `apps.esfacilsisabes.es`. `TRUST_PROXY=1` para que el rate-limit vea la IP real.
- **Portal de Demos:** registrada como proyecto id 34 (`nextepisode`, type `app`, hosting `vps`, `public=0`). Muestra la **versión web** de la app (Expo `-p web`, `output: single`, `experiments.baseUrl=/proyectos/nextepisode`), estática en `app-web/` (gitignored), symlink `/var/www/proyectos/nextepisode`, servida por la location genérica `/proyectos/` con `auth_request`. En web la app llama a la API con ruta relativa (mismo origen, vale para cualquier dominio del portal); el token va en `localStorage`.
- Publicar la web: `./scripts/deploy-web.sh` (desde el Mac; compila y hace rsync a `app-web/`).
- Actualizar: en el VPS, `cd /var/www/proyectos-src/nextepisode && ./deploy.sh` (git pull + `npm ci` + `pm2 startOrReload`).
- Copia de seguridad de la BD: `server/data/nextepisode.db` (usar `sqlite3 .backup`; está en modo WAL).

## Desarrollo
```bash
# Backend (puerto 3025, solo 127.0.0.1)
cd server && npm install
JWT_SECRET=dev TMDB_API_KEY=<tu-clave> npm start     # sin TMDB_API_KEY solo funciona el catálogo manual
npm test                                              # 5 tests con TMDB simulado

# App
cd app && npm install && npx expo start --ios        # en desarrollo usa http://localhost:3025/api; en build de producción, la URL del VPS (o EXPO_PUBLIC_API_URL)
# Sin Xcode: npx expo start --web (arranca el servidor con CORS_ORIGIN=http://localhost:8081, o el puerto que uses)
```
Variables del servidor: `JWT_SECRET` (obligatoria), `TMDB_API_KEY`, `ADMIN_EMAILS` (emails separados por comas; quien se registre con uno de ellos es administrador; no hay forma de ascender desde la app), `SMTP_USER` + `SMTP_PASS` (+ `SMTP_HOST`=smtp.gmail.com, `SMTP_PORT`=587 con STARTTLS (el VPS bloquea los puertos de salida 25 y 465), `MAIL_FROM`) para el correo de recuperación (Gmail con *contraseña de aplicación*; sin ellos no se envía nada y en desarrollo el código sale por consola), `PORT` (3025), `DB_PATH` (`data/nextepisode.db`), `CORS_ORIGIN` (opcional; solo para probar la app web, no hace falta en móvil ni en producción).

## Limitaciones conocidas / pendiente
- App sin publicar (TestFlight/Play Store); la API pública no tiene aún copias de seguridad automáticas de la BD.
- Sin watchlist, notificaciones, perfiles sociales ni moderación/“reportar” de reseñas.
- Búsqueda local por `LIKE` (suficiente para el MVP; FTS5 más adelante).
- Al buscar por título, las plataformas elegidas no filtran (TMDB no las admite en `search`); solo los géneros reordenan. Las series añadidas a mano no tienen plataformas.
- No probada en simulador/dispositivo iOS (este Mac no tiene Xcode completo); probada en web. En web el token va en `localStorage` (solo para desarrollo; en móvil usa SecureStore).

## Changelog
- **0.6.0** — Novedades (estrenos recientes por plataforma/género) con selector Populares; temporadas, episodios y estado en la ficha con refresco semanal; temporadas opcionales al añadir una serie; 22 tests.
- **0.5.0** — lista «Quiero ver» (guardar desde la ficha, pestaña en «Mis series», sale sola al puntuar); 19 tests.
- **0.4.0** — rediseño completo (marco de móvil, tema oscuro, animaciones), inicio Explorar con sugerencias de géneros y plataformas y búsqueda combinada, preferencias por usuario, imágenes anchas en las fichas, bundle 6× más ligero, 16 tests (5 nuevos de explorar/plataformas/preferencias).
- **0.3.1** — correo por el puerto 587 (STARTTLS): el VPS bloquea el 465 y el envío fallaba por timeout; timeouts explícitos en el mailer.
- **0.3.0** — gestión de usuarios para administradores (lista + cambio de contraseña), recuperación de contraseña por correo (código, caducidad, límite de intentos), invalidación de sesiones al cambiar la contraseña, 6 tests nuevos (11 en total).
- **0.2.2** — botón «Salir» (con el usuario activo) en la cabecera de todas las pestañas para cerrar sesión y entrar con otra cuenta.
- **0.2.1** — versión web publicada y registrada en el Portal de Demos; la API queda solo bajo `/api/` en nginx.
- **0.2.0** — API desplegada en el VPS (PM2 + nginx + HTTPS), búsqueda también por título original, probado con TMDB real.
- **0.1.1** — soporte web para pruebas (fallback de almacenamiento) y CORS opcional.
- **0.1.0** — MVP: auth, catálogo TMDB + alta manual, reseñas, plataformas por país, recomendaciones.
