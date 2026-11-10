import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BookmarkSimple, TelevisionSimple, X } from '../icons';
import { api, MyReview, WatchItem } from '../api';
import { FadeUp, PressScale } from '../motion';
import { Button, Card, Empty, ErrorBanner, GlassCard, ResultsSkeleton, Screen, ScreenHeader, ShowRow, Stars, T } from '../components/ui';
import { colors, font, radius, TAB_SPACE } from '../theme';

type Tab = 'seen' | 'want';

export default function MyShowsScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('seen');
  const [rows, setRows] = useState<MyReview[] | null>(null);
  const [want, setWant] = useState<WatchItem[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    Promise.all([api.myReviews(), api.watchlist()]).then(([r, w]) => { setRows(r); setWant(w); }).catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  async function remove(id: number) {
    const before = want;
    setWant((w) => (w ? w.filter((x) => x.show_id !== id) : w)); // al instante; se deshace si falla
    try { await api.removeWatch(id); } catch (e: any) { setWant(before); setError(e.message); }
  }

  const avg = rows?.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
  const open = (id: number) => navigation.navigate('Show', { id });
  const seg = (t: Tab, label: string, n: number | undefined) => (
    <PressScale
      onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} accessibilityLabel={`${label}${n != null ? `, ${n}` : ''}`}
      containerStyle={{ flex: 1 }} scale={0.97}
      style={{ minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: tab === t ? colors.glassHi : 'transparent' }}
    >
      <T v="small" color={tab === t ? colors.text : colors.muted} style={{ fontFamily: font.bodySemi }}>{label}</T>
      {n != null && <T v="caption" color={tab === t ? colors.accent : colors.muted} style={{ fontVariant: ['tabular-nums'] }}>{n}</T>}
    </PressScale>
  );

  const loading = !rows || !want;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Tu diario" title="Mis series" />
        <View style={{ marginHorizontal: 20, marginBottom: 18, flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline }} accessibilityRole="tablist">
          {seg('seen', 'Vistas', rows?.length)}
          {seg('want', 'Quiero ver', want?.length)}
        </View>

        {error ? <ErrorBanner text={error} onRetry={load} /> : loading ? <ResultsSkeleton /> : tab === 'seen' ? (
          rows!.length === 0 ? (
            <Empty
              icon={<TelevisionSimple size={30} weight="light" color={colors.textDim} />}
              title="Aún no has puntuado nada"
              body="Cada serie que puntúes aparece aquí y mejora tus recomendaciones."
              action={<Button title="Buscar una serie" onPress={() => navigation.navigate('Buscar')} />}
            />
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <FadeUp>
                <GlassCard inner={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 18 }}>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <T v="display" style={{ fontVariant: ['tabular-nums'] }}>{rows!.length}</T>
                    <T v="caption" color={colors.muted}>{rows!.length === 1 ? 'serie vista' : 'series vistas'}</T>
                  </View>
                  <View style={{ width: 1, backgroundColor: colors.hairline }} />
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <T v="display" style={{ fontVariant: ['tabular-nums'] }}>{avg.toFixed(1)}</T>
                    <T v="caption" color={colors.muted}>tu nota media</T>
                  </View>
                </GlassCard>
              </FadeUp>
              {rows!.map((r, i) => {
                const card: Card = { key: String(r.show_id), title: r.title, year: r.year, poster: r.poster_url, onPress: () => open(r.show_id) };
                return (
                  <ShowRow key={r.show_id} card={card} index={i + 1}
                    right={<View style={{ gap: 4 }}><Stars value={r.rating} size={14} />{r.body ? <T v="caption" color={colors.textDim} numberOfLines={2}>{r.body}</T> : null}</View>} />
                );
              })}
            </View>
          )
        ) : want!.length === 0 ? (
          <Empty
            icon={<BookmarkSimple size={30} weight="light" color={colors.textDim} />}
            title="Tu lista está vacía"
            body="Pulsa «Quiero ver» en la ficha de una serie para guardarla aquí. Cuando la puntúes, saldrá de la lista."
            action={<Button title="Buscar una serie" onPress={() => navigation.navigate('Buscar')} />}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <T v="small" color={colors.muted}>Series que quieres ver. Al puntuarlas pasan a «Vistas».</T>
            {want!.map((w, i) => {
              const card: Card = { key: String(w.show_id), title: w.title, year: w.year, genres: w.genres, rating: w.avg_rating, poster: w.poster_url, onPress: () => open(w.show_id) };
              return (
                <ShowRow key={w.show_id} card={card} index={i}
                  right={
                    <PressScale onPress={() => remove(w.show_id)} accessibilityRole="button" accessibilityLabel={`Quitar ${w.title} de Quiero ver`} scale={0.95}
                      containerStyle={{ alignSelf: 'flex-start' }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 }}>
                      <X size={14} color={colors.muted} />
                      <T v="caption" color={colors.muted}>Quitar de la lista</T>
                    </PressScale>
                  } />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
