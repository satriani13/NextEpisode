import React, { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { api, Show, TmdbShow } from '../api';
import { Button, Empty, Loading, ShowRow, Stars, s } from '../components/ui';
import { colors } from '../theme';

export default function SearchScreen({ navigation }: any) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ catalog: Show[]; tmdb: TmdbShow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    setLoading(true); setError('');
    const h = setTimeout(() => {
      api.search(q.trim()).then(setRes).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, 350); // debounce
    return () => clearTimeout(h);
  }, [q]);

  async function importTmdb(t: TmdbShow) {
    try {
      const { id } = await api.addShow({ tmdb_id: t.tmdb_id });
      navigation.navigate('Show', { id });
    } catch (e: any) { setError(e.message); }
  }

  type Item = { key: string; header?: string; show?: Show; tmdb?: TmdbShow };
  const items: Item[] = [];
  if (res?.catalog.length) items.push({ key: 'h1', header: 'En NextEpisode' }, ...res.catalog.map((show) => ({ key: `c${show.id}`, show })));
  if (res?.tmdb.length) items.push({ key: 'h2', header: 'Otras series' }, ...res.tmdb.map((tmdb) => ({ key: `t${tmdb.tmdb_id}`, tmdb })));

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <TextInput style={s.input} placeholder="Busca una serie que hayas visto…" placeholderTextColor={colors.muted}
          value={q} onChangeText={setQ} autoCorrect={false} />
        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>
      {loading && <Loading />}
      <FlatList data={items} keyExtractor={(i) => i.key} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => item.header ? (
          <Text style={[s.muted, { paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase' }]}>{item.header}</Text>
        ) : item.show ? (
          <ShowRow title={item.show.title} year={item.show.year} poster={item.show.poster_url}
            subtitle={item.show.ratings_count ? `${item.show.avg_rating}★ · ${item.show.ratings_count} opiniones` : 'Sin opiniones todavía'}
            onPress={() => navigation.navigate('Show', { id: item.show!.id })}
            right={item.show.avg_rating ? <Stars value={item.show.avg_rating} size={14} /> : undefined} />
        ) : (
          <ShowRow title={item.tmdb!.title} year={item.tmdb!.year} poster={item.tmdb!.poster_url}
            subtitle={item.tmdb!.overview} onPress={() => importTmdb(item.tmdb!)} />
        )}
        ListFooterComponent={res && !loading ? (
          <View style={s.pad}>
            {!items.length && <Empty text="No hemos encontrado esa serie." />}
            <Button secondary title="No la encuentro → añadirla" onPress={() => navigation.navigate('AddShow', { title: q.trim() })} />
          </View>
        ) : undefined}
      />
    </View>
  );
}
