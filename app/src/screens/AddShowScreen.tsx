import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api, Genre } from '../api';
import { FadeUp } from '../motion';
import { BackButton, Button, Chip, ErrorBanner, Field, GlassCard, Screen, T } from '../components/ui';
import { colors } from '../theme';

export default function AddShowScreen({ route, navigation }: any) {
  const [title, setTitle] = useState<string>(route.params?.title ?? '');
  const [year, setYear] = useState('');
  const [seasons, setSeasons] = useState('');
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [all, setAll] = useState<Genre[]>([]);
  const [overview, setOverview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.meta().then((m) => setAll(m.genres)).catch(() => {}); }, []);

  async function submit() {
    setBusy(true); setError('');
    try {
      const genres = all.filter((g) => genreIds.includes(g.id)).map((g) => g.name).join(', ');
      const { id } = await api.addShow({ title, year: year ? Number(year) : null, genres, overview, seasons: seasons ? Number(seasons) : undefined });
      navigation.replace('Show', { id });
    } catch (e: any) { setError(e.message); setBusy(false); }
  }
  const toggle = (id: number) => setGenreIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length < 3 ? [...l, id] : l));

  return (
    <Screen strength={0.8}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />
        <FadeUp style={{ marginTop: 28 }}>
          <T v="eyebrow" color={colors.accent}>Nueva en el catálogo</T>
          <T v="display" style={{ marginTop: 8 }} accessibilityRole="header">Añadir serie</T>
          <T v="body" color={colors.textDim} style={{ marginTop: 8 }}>Los demás podrán puntuarla y opinar sobre ella.</T>
        </FadeUp>
        <FadeUp delay={80} style={{ marginTop: 28 }}>
          <GlassCard>
            <Field label="Título" value={title} onChangeText={setTitle} />
            <Field label="Año de estreno" value={year} onChangeText={setYear} keyboardType="number-pad" inputMode="numeric" maxLength={4} />
            <Field label="Temporadas (opcional)" value={seasons} onChangeText={setSeasons} keyboardType="number-pad" inputMode="numeric" maxLength={3} />
            <T v="small" color={colors.textDim} style={{ marginBottom: 8 }}>Géneros (hasta 3)</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {all.map((g) => <Chip key={g.id} label={g.name} selected={genreIds.includes(g.id)} onPress={() => toggle(g.id)} />)}
            </View>
            <Field label="Sinopsis (opcional)" value={overview} onChangeText={setOverview} multiline />
            {error ? <View style={{ marginHorizontal: -20, marginBottom: 14 }}><ErrorBanner text={error} /></View> : null}
            <Button title="Añadir serie" onPress={submit} loading={busy} disabled={title.trim().length < 2} />
          </GlassCard>
        </FadeUp>
      </ScrollView>
    </Screen>
  );
}
