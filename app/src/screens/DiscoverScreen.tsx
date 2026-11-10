import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { MagnifyingGlass, SlidersHorizontal, X } from '../icons';
import { api, Found, Meta, Origin, TmdbShow } from '../api';
import { useAuth } from '../auth';
import { FadeUp, PressScale } from '../motion';
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
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [origin, setOrigin] = useState<Origin>('country'); // por defecto: solo producciones de mi país
  const dirty = useRef(false);

  // Preferencias guardadas + catálogo de géneros/plataformas.
  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.meta(), api.prefs()]).then(([m, p]) => {
      if (!alive) return;
      if (m.status === 'fulfilled') setMeta(m.value);
      if (p.status === 'fulfilled') { setGenres(p.value.genres); setProviders(p.value.providers); setOrigin(p.value.origin ?? 'country'); }
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Guardar preferencias (solo si el usuario las ha tocado), con pausa para no saturar.
  useEffect(() => {
    if (!dirty.current) return;
    const h = setTimeout(() => { api.savePrefs({ genres, providers, origin }).catch(() => {}); }, 700);
    return () => clearTimeout(h);
  }, [genres, providers, origin]);

  // Buscar: con texto → por título (géneros suben coincidencias); sin texto → descubrir por géneros/plataformas.
  const term = q.trim();
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true); setError('');
    const h = setTimeout(() => {
      (term.length >= 2 ? api.search(term, genres) : api.discover(genres, providers, sort, origin))
        .then((r) => alive && setRes(r))
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, term ? 320 : 120);
    return () => { alive = false; clearTimeout(h); };
  }, [ready, term, genres, providers, sort, origin, retry]);

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
      poster: s.poster_url, backdrop: s.backdrop_url, seasons: s.seasons, onPress: () => navigation.navigate('Show', { id: s.id }),
    }));
    const showDate = sort === 'new' && term.length < 2; // en Novedades se muestra la fecha de estreno
    const outside = res.tmdb.map((t): Card => ({
      key: `t${t.tmdb_id}`, title: t.title, year: t.year, genres: t.genres, poster: t.poster_url, backdrop: t.backdrop_url,
      released: showDate ? t.first_air_date : null,
      // Si ya está en el catálogo (show_id) se abre directamente y enseña su nota; si no, se importa al abrirla.
      rating: t.avg_rating, count: t.ratings_count, isNew: !t.show_id,
      onPress: () => (t.show_id ? navigation.navigate('Show', { id: t.show_id }) : open(t)),
    }));
    return [...inApp, ...outside];
  }, [res, navigation, open, sort, term]);

  const name = (list: number[], src?: { id: number; name: string }[]) => list.map((id) => src?.find((x) => x.id === id)?.name).filter(Boolean) as string[];
  const gNames = name(genres, meta?.genres);
  const pNames = name(providers, meta?.providers);
  const countryName = (() => { try { return new Intl.DisplayNames(['es'], { type: 'region' }).of(meta?.country ?? 'ES') ?? 'tu país'; } catch { return 'tu país'; } })();
  const originOn = origin === 'country';
  const mix = [originOn ? `Series de ${countryName}` : '', pNames.join(', '), gNames.join(', ')].filter(Boolean).join(' · ');
  const novelty = sort === 'new' && term.length < 2;
  const picked = genres.length + providers.length > 0; // el país es un ajuste aparte: no cuenta como «mezcla»
  const heading = term.length >= 2 ? `Resultados para “${term}”` : novelty ? (picked ? 'Novedades para tu mezcla' : 'Últimos estrenos') : picked ? 'Para tu mezcla' : 'Lo más visto ahora';
  const sub = term.length >= 2
    ? (gNames.length ? `Primero lo que encaja con ${gNames.join(', ')}` : 'Elige géneros para que suban los que más te apetecen')
    : mix || (novelty ? 'Lo más reciente en streaming en tu país' : 'Elige plataformas y géneros para afinar');
  const hasFilters = genres.length + providers.length > 0;
  const [hero, ...rest] = cards;
  const left = rest.filter((_, i) => i % 2 === 0);
  const right = rest.filter((_, i) => i % 2 === 1);

  const clearFilters = () => { dirty.current = true; setGenres([]); setProviders([]); };
  const toggleOrigin = () => { dirty.current = true; setOrigin((o) => (o === 'country' ? 'all' : 'country')); };

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

        <View style={{ paddingHorizontal: 20, marginBottom: 14 }} accessibilityLiveRegion="polite">
          <T v="heading" accessibilityRole="header">{heading}</T>
          <T v="small" color={colors.muted} style={{ marginTop: 2 }}>{sub}</T>
        </View>

        {term.length < 2 && (
          <View style={{ marginHorizontal: 20, marginBottom: 18, flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline }} accessibilityRole="tablist">
            {([['new', 'Novedades'], ['popular', 'Populares']] as const).map(([k, label]) => (
              <PressScale key={k} onPress={() => setSort(k)} accessibilityRole="tab" accessibilityState={{ selected: sort === k }} accessibilityLabel={label} containerStyle={{ flex: 1 }} scale={0.97}
                style={{ minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: sort === k ? colors.glassHi : 'transparent' }}>
                <T v="small" color={sort === k ? colors.text : colors.muted} style={{ fontFamily: font.bodySemi }}>{label}</T>
              </PressScale>
            ))}
          </View>
        )}

        {term.length < 2 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            <Chip label={`Solo series de ${countryName}`} selected={originOn} onPress={toggleOrigin} />
          </View>
        )}

        {loading ? <ResultsSkeleton /> : error ? <ErrorBanner text={error} onRetry={() => setRetry((r) => r + 1)} /> : cards.length ? (
          <View style={{ paddingHorizontal: 20, gap: 20 }}>
            <FeaturedCard card={hero} label={novelty ? 'Último estreno' : hasFilters ? 'Encaja contigo' : 'Lo más visto'} />
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
            body={originOn ? `Prueba con menos filtros o incluye series de otros países (ahora solo salen las de ${countryName}).` : hasFilters ? 'Prueba con menos géneros o con otra plataforma.' : 'Añade la primera serie que hayas visto.'}
            action={originOn ? <Button variant="glass" title="Ver series de todo el mundo" onPress={toggleOrigin} /> : hasFilters ? <Button variant="glass" title="Quitar filtros" onPress={clearFilters} /> : undefined}
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
