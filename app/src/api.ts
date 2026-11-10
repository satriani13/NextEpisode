import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore no existe en web: allí usamos localStorage (solo para desarrollo/pruebas).
const store = Platform.OS === 'web'
  ? {
      getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
      setItemAsync: async (k: string, v: string) => { globalThis.localStorage?.setItem(k, v); },
      deleteItemAsync: async (k: string) => { globalThis.localStorage?.removeItem(k); },
    }
  : SecureStore;

// Desarrollo: servidor local. Build de producción: VPS. Se puede forzar con EXPO_PUBLIC_API_URL.
// En la web publicada la ruta es relativa (mismo origen, vale para cualquier dominio del portal).
export const API_URL = process.env.EXPO_PUBLIC_API_URL
  ?? (__DEV__
    ? 'http://localhost:3025/api'
    : Platform.OS === 'web'
      ? '/proyectos/nextepisode/api'
      : 'https://jpchost.ddns.net/proyectos/nextepisode/api');
const TOKEN_KEY = 'ne_token';

let token: string | null = null;
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function loadToken() {
  token = await store.getItemAsync(TOKEN_KEY);
  return token;
}
export async function setToken(t: string | null) {
  token = t;
  if (t) await store.setItemAsync(TOKEN_KEY, t);
  else await store.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export type Show = {
  id: number; title: string; year: number | null; overview: string | null; poster_url: string | null; backdrop_url: string | null;
  genres: string; avg_rating: number | null; ratings_count: number;
};
export type TmdbShow = { tmdb_id: number; title: string; year: number | null; overview: string; poster_url: string | null; backdrop_url: string | null; genres: string; genre_ids: number[] };
export type Genre = { id: number; name: string };
export type ProviderOpt = { id: number; name: string; logo_url: string | null };
export type Meta = { country: string; genres: Genre[]; providers: ProviderOpt[] };
export type Prefs = { genres: number[]; providers: number[] };
export type Found = { catalog: Show[]; tmdb: TmdbShow[] };
export type Provider = { provider: string; logo_url: string | null };
export type ShowDetail = Show & { providers: Provider[]; country: string; my_review: { rating: number; body: string } | null; in_watchlist: boolean };
export type Review = { id: number; rating: number; body: string; updated_at: string; username: string };
export type MyReview = { show_id: number; title: string; year: number | null; poster_url: string | null; rating: number; body: string };
export type WatchItem = { show_id: number; title: string; year: number | null; poster_url: string | null; genres: string; added_at: string; avg_rating: number | null };
export type AuthResult = { token: string; user: { id: number; username: string; country: string; admin: boolean } };
export type AdminUser = { id: number; email: string; username: string; country: string; created_at: string; reviews_count: number; admin: boolean };

export const api = {
  register: (b: { email: string; username: string; password: string; country: string }) => request<AuthResult>('POST', '/auth/register', b),
  login: (b: { email: string; password: string }) => request<AuthResult>('POST', '/auth/login', b),
  forgot: (email: string) => request<{ ok: true; message: string }>('POST', '/auth/forgot', { email }),
  reset: (b: { email: string; code: string; password: string }) => request<{ ok: true }>('POST', '/auth/reset', b),
  adminUsers: () => request<AdminUser[]>('GET', '/admin/users'),
  adminSetPassword: (id: number, password: string) => request<{ ok: true; token?: string }>('POST', `/admin/users/${id}/password`, { password }),
  search: (q: string, genres: number[] = []) => request<Found>('GET', `/shows/search?q=${encodeURIComponent(q)}${genres.length ? `&genres=${genres.join(',')}` : ''}`),
  discover: (genres: number[], providers: number[]) => request<Found>('GET', `/discover?genres=${genres.join(',')}&providers=${providers.join(',')}`),
  meta: () => request<Meta>('GET', '/meta'),
  prefs: () => request<Prefs>('GET', '/me/prefs'),
  savePrefs: (p: Prefs) => request<{ ok: true }>('PUT', '/me/prefs', p),
  addShow: (b: { tmdb_id: number } | { title: string; year?: number | null; overview?: string; genres?: string }) =>
    request<{ id: number; created: boolean }>('POST', '/shows', b),
  show: (id: number) => request<ShowDetail>('GET', `/shows/${id}`),
  reviews: (id: number) => request<Review[]>('GET', `/shows/${id}/reviews`),
  rate: (id: number, rating: number, body: string) => request<{ ok: true }>('POST', `/shows/${id}/reviews`, { rating, body }),
  watchlist: () => request<WatchItem[]>('GET', '/me/watchlist'),
  addWatch: (id: number) => request<{ ok: true }>('PUT', `/me/watchlist/${id}`),
  removeWatch: (id: number) => request<{ ok: true }>('DELETE', `/me/watchlist/${id}`),
  myReviews: () => request<MyReview[]>('GET', '/me/reviews'),
  recommendations: () => request<{ kind: 'personalized' | 'top'; shows: Show[] }>('GET', '/recommendations'),
};
