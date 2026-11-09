import React, { useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { api } from '../api';
import { Button, s } from '../components/ui';
import { colors } from '../theme';

export default function AddShowScreen({ route, navigation }: any) {
  const [title, setTitle] = useState<string>(route.params?.title ?? '');
  const [year, setYear] = useState('');
  const [genres, setGenres] = useState('');
  const [overview, setOverview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      const { id } = await api.addShow({ title, year: year ? Number(year) : null, genres, overview });
      navigation.replace('Show', { id });
    } catch (e: any) { setError(e.message); setBusy(false); }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={[s.muted, { marginBottom: 12 }]}>Añade la serie al catálogo para que otros puedan opinar sobre ella.</Text>
      <TextInput style={s.input} placeholder="Título *" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} />
      <TextInput style={s.input} placeholder="Año de estreno" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
      <TextInput style={s.input} placeholder="Géneros (Drama, Comedia…)" placeholderTextColor={colors.muted} value={genres} onChangeText={setGenres} />
      <TextInput style={[s.input, { height: 100 }]} multiline placeholder="Sinopsis (opcional)" placeholderTextColor={colors.muted} value={overview} onChangeText={setOverview} />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button title="Añadir serie" onPress={submit} disabled={busy || title.trim().length < 2} />
    </ScrollView>
  );
}
