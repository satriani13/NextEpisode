import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { MagnifyingGlass, SlidersHorizontal, X } from '../icons';
import { api, Found, Meta, TmdbShow } from '../api';
import { useAuth } from '../auth';
import { FadeUp } from '../motion';
import { Button, Card, Chip, Empty, ErrorBanner, FeaturedCard, ResultsSkeleton, Screen, ScreenHeader, SectionLabel, ShowCard, T } from '../components/ui';
import { colors, font, radius, TAB_SPACE, web } from '../theme';

// Pantalla de inicio: ya no está en blanco. Sugiere géneros y plataformas (se recuerdan por usuario) y busca
// con ellos; si además escribes un título, ese manda y los géneros elegidos suben lo que encaja.
export default function DiscoverScreen({ navigation }: any) {
  const { user } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [genres, setGenres] = useState<number[]>([]);
  const [providers, setProviders] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Found | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dirty = useRef(false);

  // Preferencias guardadas + catálogo de géneros/plataformas.
  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.meta(), api.prefs()]).then(([m, p]) => {
      if (!alive) return;
      if (m.status === 'fulfilled') setMeta(m.value);
      if (p.status === 'fulfilled') { setGenres(p.value.genres); setProviders(p.value.providers); }
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Guardar preferencias (solo si el usuario las ha tocado), con pausa para no saturar.
  useEffect(() => {
    if (!dirty.current) return;
    const h = setTimeout(() => { api.savePrefs({ genres, providers }).catch(() => {}); }, 700);
    return () => clearTimeout(h);
  }, [genres, providers]);

  // Buscar: con texto → por título (géneros suben coincidencias); sin texto → descubrir por géneros/plataformas.
  const term = q.trim();
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true); setError('');
    const h = setTimeout(() => {
      (term.length >= 2 ? api.search(term, genres) : api.discover(genres, providers))
        .then((r) => alive && setRes(r))
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, term ? 320 : 120);
    return () => { alive = false; clearTimeout(h); };
  }, [ready, term, genres, providers, retry]);

  const toggle = (list: number[], set: (n: number[]) => void, id: number) => {
    dirty.current = true;
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const open = useCallback(async (t: TmdbShow) => {
    try {
      const { id } = await api.addShow({ tmdb_id: t.tmdb_id });
      navigation.navigate('Show', { id });
    } catch (e: any) { setError(e.message); }
  }, [navigation]);

  const cards: Card[] = useMemo(() => {
    if (!res) return [];
    const inApp = res.catalog.map((s): Card => ({
      key: `c${s.id}`, title: s.title, year: s.year, genres: s.genres, rating: s.avg_rating, count: s.ratings_count,
      poster: s.poster_url, backdrop: s.backdrop_url, onPress: () => navigation.navigate('Show', { id: s.id }),
    }));
    const outside = res.tmdb.map((t): Card => ({
      key: `t${t.tmdb_id}`, title: t.title, year: t.year, genres: t.genres, poster: t.poster_url, backdrop: t.backdrop_url,
      isNew: true, onPress: () => open(t),
    }));
    return [...inApp, ...outside];
  }, [res, navigation, open]);

  const name = (list: number[], src?: { id: number; name: string }[]) => list.map((id) => src?.find((x) => x.id === id)?.name).filter(Boolean) as string[];
  const gNames = name(genres, meta?.genres);
  const pNames = name(providers, meta?.providers);
  const mix = [pNames.join(', '), gNames.join(', ')].filter(Boolean).join(' · ');
  const heading = term.length >= 2 ? `Resultados para “${term}”` : mix ? 'Para tu mezcla' : 'Lo más visto ahora';
  const sub = term.length >= 2
    ? (gNames.length ? `Primero lo que encaja con ${gNames.join(', ')}` : 'Elige géneros para que suban los que más te apetecen')
    : mix || 'Elige plataformas y géneros para afinar';
  const hasFilters = genres.length + providers.length > 0;
  const [hero, ...rest] = cards;
  const left = rest.filter((_, i) => i % 2 === 0);
  const right = rest.filter((_, i) => i % 2 === 1);

  const clearFilters = () => { dirty.current = true; setGenres([]); setProviders([]); };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow={`Hola, ${user?.username}`} title="¿Qué vemos hoy?" />

        <FadeUp delay={60} style={{ paddingHorizontal: 20, marginBottom: 22 }}>
          <View style={{ minHeight: 56, borderRadius: radius.pill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.glassHi, borderWidth: 1, borderColor: colors.hairline }}>
            <MagnifyingGlass size={22} weight="light" color={colors.textDim} />
            <TextInput
              value={q} onChangeText={setQ} placeholder="Busca una serie que hayas visto" placeholderTextColor={colors.muted} autoCorrect={false}
              returnKeyType="search" accessibilityLabel="Buscar series por título" inputMode="search"
              style={[{ flex: 1, color: colors.text, fontFamily: font.body, fontSize: 16, paddingVertical: 14 }, web({ outlineStyle: 'none' })]}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Borrar búsqueda"><X size={20} color={colors.textDim} /></Pressable>
            ) : null}
          </View>
        </FadeUp>

        {!!meta?.providers.length && (
          <FadeUp delay={110} style={{ marginBottom: 20 }}>
            <SectionLabel right={providers.length ? <Clear onPress={() => { dirty.current = true; setProviders([]); }} /> : undefined}>Tus plataformas</SectionLabel>
            <ChipRow>
              {meta.providers.map((p) => (
                <Chip key={p.id} label={p.name} logo={p.logo_url} selected={providers.includes(p.id)} onPress={() => toggle(providers, setProviders, p.id)} />
              ))}
            </ChipRow>
          </FadeUp>
        )}

        <FadeUp delay={160} style={{ marginBottom: 28 }}>
          <SectionLabel right={genres.length ? <Clear onPress={() => { dirty.current = true; setGenres([]); }} /> : undefined}>Qué te apetece</SectionLabel>
          <ChipRow>
            {(meta?.genres ?? []).map((g) => (
              <Chip key={g.id} label={g.name} selected={genres.includes(g.id)} onPress={() => toggle(genres, setGenres, g.id)} />
            ))}
          </ChipRow>
        </FadeUp>

        <View style={{ paddingHorizontal: 20, marginBottom: 16 }} accessibilityLiveRegion="polite">
          <T v="heading" accessibilityRole="header">{heading}</T>
          <T v="small" color={colors.muted} style={{ marginTop: 2 }}>{sub}</T>
        </View>

        {loading ? <ResultsSkeleton /> : error ? <ErrorBanner text={error} onRetry={() => setRetry((r) => r + 1)} /> : cards.length ? (
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            <FeaturedCard card={hero} label={hasFilters ? 'Encaja contigo' : 'Lo más visto'} />
            {rest.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1, gap: 20 }}>{left.map((c, i) => <FadeUp key={c.key} delay={i * 60}><ShowCard card={c} /></FadeUp>)}</View>
                <View style={{ flex: 1, gap: 20, paddingTop: 30 }}>{right.map((c, i) => <FadeUp key={c.key} delay={i * 60 + 30}><ShowCard card={c} /></FadeUp>)}</View>
              </View>
            )}
          </View>
        ) : (
          <Empty
            icon={<SlidersHorizontal size={30} weight="light" color={colors.textDim} />}
            title={hasFilters || term ? 'Nada con esa combinación' : 'Aún no hay series'}
            body={hasFilters ? 'Prueba con menos géneros o con otra plataforma.' : 'Añade la primera serie que hayas visto.'}
            action={hasFilters ? <Button variant="glass" title="Quitar filtros" onPress={clearFilters} /> : undefined}
          />
        )}

        {!loading && (
          <FadeUp delay={200} style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <View style={{ padding: 18, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline, gap: 12 }}>
              <T v="bodyMed" style={{ fontFamily: font.bodySemi }}>¿No encuentras una serie?</T>
              <T v="small" color={colors.textDim}>Añádela al catálogo y los demás podrán opinar sobre ella.</T>
              <Button variant="glass" title="Añadir una serie" onPress={() => navigation.navigate('AddShow', { title: term })} />
            </View>
          </FadeUp>
        )}
      </ScrollView>
    </Screen>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: 8 }}>
      {children}
    </ScrollView>
  );
}

function Clear({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel="Quitar selección" style={web({ cursor: 'pointer' })}>
      <T v="caption" color={colors.accent}>Quitar</T>
    </Pressable>
  );
}
