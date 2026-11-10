import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TelevisionSimple } from '../icons';
import { api, MyReview } from '../api';
import { FadeUp } from '../motion';
import { Button, Card, Empty, ErrorBanner, GlassCard, ResultsSkeleton, Screen, ScreenHeader, ShowRow, Stars, T } from '../components/ui';
import { colors, TAB_SPACE } from '../theme';

export default function MyShowsScreen({ navigation }: any) {
  const [rows, setRows] = useState<MyReview[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    api.myReviews().then(setRows).catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const avg = rows?.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
  const toCard = (r: MyReview): Card => ({
    key: String(r.show_id), title: r.title, year: r.year, poster: r.poster_url, onPress: () => navigation.navigate('Show', { id: r.show_id }),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Tu diario" title="Mis series" />
        {error ? <ErrorBanner text={error} onRetry={load} /> : !rows ? <ResultsSkeleton /> : rows.length === 0 ? (
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
                  <T v="display" style={{ fontVariant: ['tabular-nums'] }}>{rows.length}</T>
                  <T v="caption" color={colors.muted}>{rows.length === 1 ? 'serie vista' : 'series vistas'}</T>
                </View>
                <View style={{ width: 1, backgroundColor: colors.hairline }} />
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <T v="display" style={{ fontVariant: ['tabular-nums'] }}>{avg.toFixed(1)}</T>
                  <T v="caption" color={colors.muted}>tu nota media</T>
                </View>
              </GlassCard>
            </FadeUp>
            {rows.map((r, i) => (
              <ShowRow key={r.show_id} card={toCard(r)} index={i + 1}
                right={<View style={{ gap: 4 }}><Stars value={r.rating} size={14} />{r.body ? <T v="caption" color={colors.textDim} numberOfLines={2}>{r.body}</T> : null}</View>} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
