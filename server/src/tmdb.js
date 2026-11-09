// Cliente mínimo de TMDB. La API key vive solo en el servidor.
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

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
  });
  return {
    enabled,
    async search(q) {
      if (!enabled) return [];
      const data = await get('/search/tv', { query: q });
      return data.results.slice(0, 10).map(mapShow);
    },
    async details(tmdbId) {
      const r = await get(`/tv/${tmdbId}`);
      return { ...mapShow(r), genres: (r.genres || []).map((g) => g.name).join(', ') };
    },
    // Plataformas de streaming por país (datos de JustWatch vía TMDB).
    async providers(tmdbId, country) {
      const data = await get(`/tv/${tmdbId}/watch/providers`);
      const flat = data.results?.[country]?.flatrate || [];
      return flat.map((p) => ({ provider: p.provider_name, logo_url: p.logo_path ? `${IMG}/w92${p.logo_path}` : null }));
    },
  };
}
