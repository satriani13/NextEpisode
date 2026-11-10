// Cliente mínimo de TMDB. La API key vive solo en el servidor.
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

// Géneros que ofrece la app (ids de TMDB para series). `match` sirve para encontrarlos en el texto libre
// de `shows.genres` (series importadas y añadidas a mano).
export const GENRES = [
  { id: 10759, name: 'Acción y aventura', match: ['Acción', 'Action', 'Aventura', 'Adventure'] },
  { id: 35, name: 'Comedia', match: ['Comedia', 'Comedy'] },
  { id: 18, name: 'Drama', match: ['Drama'] },
  { id: 10765, name: 'Sci-Fi y fantasía', match: ['Sci-Fi', 'Fantas', 'Ciencia'] },
  { id: 9648, name: 'Misterio', match: ['Misterio', 'Mystery', 'Thriller'] },
  { id: 80, name: 'Crimen', match: ['Crimen', 'Crime'] },
  { id: 16, name: 'Animación', match: ['Animaci', 'Animation', 'Anime'] },
  { id: 99, name: 'Documental', match: ['Documental', 'Documentary'] },
  { id: 10751, name: 'Familia', match: ['Familia', 'Family'] },
  { id: 10764, name: 'Reality', match: ['Reality'] },
  { id: 10768, name: 'Bélico y política', match: ['Bélic', 'War', 'Polític', 'Politics'] },
  { id: 10762, name: 'Infantil', match: ['Infantil', 'Kids'] },
];
const NAMES = Object.fromEntries(GENRES.map((g) => [g.id, g.name]));
const genreText = (ids = []) => ids.map((id) => NAMES[id]).filter(Boolean).join(', ');

export function createTmdb({ apiKey = process.env.TMDB_API_KEY, fetchImpl = fetch, language = 'es-ES' } = {}) {
  const enabled = Boolean(apiKey);
  async function get(path, params = {}) {
    const url = new URL(BASE + path);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', language);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return res.json();
  }
  const mapShow = (r) => ({
    tmdb_id: r.id,
    title: r.name,
    original_title: r.original_name || null,
    year: r.first_air_date ? Number(r.first_air_date.slice(0, 4)) : null,
    overview: r.overview || '',
    poster_url: r.poster_path ? `${IMG}/w342${r.poster_path}` : null,
    backdrop_url: r.backdrop_path ? `${IMG}/w780${r.backdrop_path}` : null,
    first_air_date: r.first_air_date || null,
    // Solo vienen en la ficha (/tv/:id), no en búsqueda ni discover.
    seasons: r.number_of_seasons > 0 ? r.number_of_seasons : null,
    episodes: r.number_of_episodes > 0 ? r.number_of_episodes : null,
    status: r.status || null,
    genre_ids: r.genre_ids || (r.genres || []).map((g) => g.id),
    genres: genreText(r.genre_ids || (r.genres || []).map((g) => g.id)) || (r.genres || []).map((g) => g.name).join(', '),
  });
  return {
    enabled,
    async search(q) {
      if (!enabled) return [];
      const data = await get('/search/tv', { query: q });
      return data.results.slice(0, 12).map(mapShow);
    },
    async details(tmdbId) {
      return mapShow(await get(`/tv/${tmdbId}`));
    },
    // Descubrir por género(s) y plataforma(s): varios géneros/plataformas = "o" (separados por |).
    // `sort`: 'new' = estrenos más recientes de lo que se puede ver en streaming en el país; 'popular' = más populares.
    async discover({ genres = [], providers = [], country = 'ES', sort = 'popular' } = {}) {
      if (!enabled) return [];
      const params = sort === 'new'
        ? {
          sort_by: 'first_air_date.desc', 'first_air_date.lte': new Date().toISOString().slice(0, 10),
          'vote_count.gte': 5, watch_region: country, with_watch_monetization_types: 'flatrate', // ≥5 votos: sin series fantasma
        }
        : { sort_by: 'popularity.desc', 'vote_count.gte': 50 };
      if (genres.length) params.with_genres = genres.join('|');
      if (providers.length) {
        params.with_watch_providers = providers.join('|');
        params.watch_region = country;
        params.with_watch_monetization_types = 'flatrate';
      }
      const data = await get('/discover/tv', params);
      return data.results.slice(0, 20).map(mapShow);
    },
    // Plataformas de streaming principales del país, por prioridad (sin variantes "con anuncios"/canales).
    async providerList(country) {
      if (!enabled) return [];
      const data = await get('/watch/providers/tv', { watch_region: country });
      return data.results
        .filter((p) => p.display_priorities?.[country] != null && !/ads|channel|standard|justwatch|fubo|ficci.n total|free/i.test(p.provider_name))
        .sort((a, b) => a.display_priorities[country] - b.display_priorities[country])
        .slice(0, 12)
        .map((p) => ({ id: p.provider_id, name: p.provider_name, logo_url: p.logo_path ? `${IMG}/w92${p.logo_path}` : null }));
    },
    // Plataformas de streaming por país (datos de JustWatch vía TMDB).
    async providers(tmdbId, country) {
      const data = await get(`/tv/${tmdbId}/watch/providers`);
      const flat = data.results?.[country]?.flatrate || [];
      return flat.map((p) => ({ provider: p.provider_name, logo_url: p.logo_path ? `${IMG}/w92${p.logo_path}` : null }));
    },
  };
}
