import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkle, Fire } from '../icons';
import { api, Show } from '../api';
import { FadeUp } from '../motion';
import { Button, Card, Empty, ErrorBanner, FeaturedCard, ResultsSkeleton, Screen, ScreenHeader, ShowRow, T } from '../components/ui';
import { colors, radius, TAB_SPACE } from '../theme';

export default function RecommendationsScreen({ navigation }: any) {
  const [data, setData] = useState<{ kind: string; shows: Show[] } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    api.recommendations().then(setData).catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const toCard = (s: Show): Card => ({
    key: String(s.id), title: s.title, year: s.year, genres: s.genres, rating: s.avg_rating, count: s.ratings_count,
    poster: s.poster_url, backdrop: s.backdrop_url, seasons: s.seasons, onPress: () => navigation.navigate('Show', { id: s.id }),
  });
  const personal = data?.kind === 'personalized';
  const [hero, ...rest] = (data?.shows ?? []).map(toCard);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Recomendadas" title="Para ti" />
        {error ? <ErrorBanner text={error} onRetry={load} /> : !data ? <ResultsSkeleton /> : (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <FadeUp>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline }}>
                {personal ? <Sparkle size={24} weight="fill" color={colors.accent} /> : <Fire size={24} weight="fill" color={colors.accent} />}
                <T v="small" color={colors.textDim} style={{ flex: 1 }}>
                  {personal ? 'Basado en usuarios con gustos parecidos a los tuyos.' : 'Lo mejor valorado por la comunidad. Puntúa más series y afinaremos tus recomendaciones.'}
                </T>
              </View>
            </FadeUp>
            {hero ? (
              <>
                <FadeUp delay={60}><FeaturedCard card={hero} label={personal ? 'Tu mejor opción' : 'La mejor valorada'} /></FadeUp>
                {rest.map((c, i) => <ShowRow key={c.key} card={c} index={i + 2} />)}
              </>
            ) : (
              <Empty
                icon={<Sparkle size={30} weight="light" color={colors.textDim} />}
                title="Aún no hay nada que recomendar"
                body="Busca una serie que hayas visto y puntúala: así empezamos a conocer tus gustos."
                action={<Button title="Buscar una serie" onPress={() => navigation.navigate('Buscar')} />}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
