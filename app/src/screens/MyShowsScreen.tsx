import React, { useCallback, useState } from 'react';
import { FlatList, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, MyReview } from '../api';
import { useAuth } from '../auth';
import { Empty, Loading, ShowRow, Stars, s } from '../components/ui';

export default function MyShowsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [rows, setRows] = useState<MyReview[] | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    api.myReviews().then(setRows).catch((e) => setError(e.message));
  }, []));

  if (error) return <Text style={[s.error, s.pad]}>{error}</Text>;
  if (!rows) return <Loading />;
  return (
    <FlatList style={s.screen} data={rows} keyExtractor={(i) => String(i.show_id)}
      ListHeaderComponent={<Text style={[s.muted, s.pad]}>Tus series puntuadas, {user?.username}</Text>}
      ListEmptyComponent={<Empty text="Aún no has puntuado ninguna serie." />}
      renderItem={({ item }) => (
        <ShowRow title={item.title} year={item.year} poster={item.poster_url} subtitle={item.body}
          right={<Stars value={item.rating} size={14} />} onPress={() => navigation.navigate('Show', { id: item.show_id })} />
      )} />
  );
}
