import React, { useCallback, useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, Show } from '../api';
import { Empty, Loading, ShowRow, s } from '../components/ui';

export default function RecommendationsScreen({ navigation }: any) {
  const [data, setData] = useState<{ kind: string; shows: Show[] } | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    api.recommendations().then(setData).catch((e) => setError(e.message));
  }, []));

  if (error) return <Text style={[s.error, s.pad]}>{error}</Text>;
  if (!data) return <Loading />;
  return (
    <FlatList style={s.screen} data={data.shows} keyExtractor={(i) => String(i.id)}
      ListHeaderComponent={<Text style={[s.muted, s.pad]}>
        {data.kind === 'personalized' ? 'Basado en usuarios con gustos parecidos a los tuyos' : 'Lo mejor valorado por la comunidad. Puntúa más series para afinar tus recomendaciones.'}
      </Text>}
      ListEmptyComponent={<Empty text="Todavía no hay series valoradas. ¡Busca una que hayas visto y puntúala!" />}
      renderItem={({ item }) => (
        <ShowRow title={item.title} year={item.year} poster={item.poster_url}
          subtitle={`${item.avg_rating ?? '–'}★ · ${item.genres || ''}`} onPress={() => navigation.navigate('Show', { id: item.id })} />
      )} />
  );
}
