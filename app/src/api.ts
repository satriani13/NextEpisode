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
export const API_URL = process.env.EXPO_PUBLIC_API_URL
  ?? (__DEV__ ? 'http://localhost:3025/api' : 'https://jpchost.ddns.net/proyectos/nextepisode/api');
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
  id: number; title: string; year: number | null; overview: string | null; poster_url: string | null;
  genres: string; avg_rating: number | null; ratings_count: number;
};
export type TmdbShow = { tmdb_id: number; title: string; year: number | null; overview: string; poster_url: string | null };
export type Provider = { provider: string; logo_url: string | null };
export type ShowDetail = Show & { providers: Provider[]; country: string; my_review: { rating: number; body: string } | null };
export type Review = { id: number; rating: number; body: string; updated_at: string; username: string };
export type MyReview = { show_id: number; title: string; year: number | null; poster_url: string | null; rating: number; body: string };
export type AuthResult = { token: string; user: { id: number; username: string; country: string } };

export const api = {
  register: (b: { email: string; username: string; password: string; country: string }) => request<AuthResult>('POST', '/auth/register', b),
  login: (b: { email: string; password: string }) => request<AuthResult>('POST', '/auth/login', b),
  search: (q: string) => request<{ catalog: Show[]; tmdb: TmdbShow[] }>('GET', `/shows/search?q=${encodeURIComponent(q)}`),
  addShow: (b: { tmdb_id: number } | { title: string; year?: number | null; overview?: string; genres?: string }) =>
    request<{ id: number; created: boolean }>('POST', '/shows', b),
  show: (id: number) => request<ShowDetail>('GET', `/shows/${id}`),
  reviews: (id: number) => request<Review[]>('GET', `/shows/${id}/reviews`),
  rate: (id: number, rating: number, body: string) => request<{ ok: true }>('POST', `/shows/${id}/reviews`, { rating, body }),
  myReviews: () => request<MyReview[]>('GET', '/me/reviews'),
  recommendations: () => request<{ kind: 'personalized' | 'top'; shows: Show[] }>('GET', '/recommendations'),
};
