import React, { useCallback, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, Review, ShowDetail } from '../api';
import { Button, Loading, Stars, s } from '../components/ui';
import { colors } from '../theme';

export default function ShowScreen({ route }: any) {
  const { id } = route.params;
  const [show, setShow] = useState<ShowDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([api.show(id), api.reviews(id)]);
      setShow(d); setReviews(r);
      if (d.my_review) { setRating(d.my_review.rating); setBody(d.my_review.body); }
    } catch (e: any) { setError(e.message); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setError(''); setSaved(false);
    try { await api.rate(id, rating, body); setSaved(true); await load(); }
    catch (e: any) { setError(e.message); }
  }

  if (!show) return error ? <Text style={[s.error, s.pad]}>{error}</Text> : <Loading />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {show.poster_url ? <Image source={{ uri: show.poster_url }} style={{ width: 110, height: 165, borderRadius: 8 }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>{show.title}</Text>
          <Text style={s.muted}>{[show.year, show.genres].filter(Boolean).join(' · ')}</Text>
          <View style={{ marginTop: 8 }}>
            <Stars value={show.avg_rating ?? 0} size={20} />
            <Text style={s.muted}>{show.ratings_count ? `${show.avg_rating} · ${show.ratings_count} opiniones` : 'Sé el primero en opinar'}</Text>
          </View>
        </View>
      </View>

      <Text style={[s.title, { marginTop: 20 }]}>Dónde verla ({show.country})</Text>
      {show.providers.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {show.providers.map((p) => (
            <View key={p.provider} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, padding: 6, paddingRight: 10, borderRadius: 8 }}>
              {p.logo_url ? <Image source={{ uri: p.logo_url }} style={{ width: 24, height: 24, borderRadius: 5 }} /> : null}
              <Text style={{ color: colors.text }}>{p.provider}</Text>
            </View>
          ))}
        </View>
      ) : <Text style={s.muted}>Sin información de plataformas para tu país.</Text>}

      {show.overview ? <Text style={{ color: colors.text, marginTop: 16, lineHeight: 20 }}>{show.overview}</Text> : null}

      <Text style={[s.title, { marginTop: 24, marginBottom: 8 }]}>{show.my_review ? 'Tu opinión' : '¿Qué te ha parecido?'}</Text>
      <Stars value={rating} onChange={setRating} size={36} />
      <TextInput style={[s.input, { height: 90, marginTop: 10 }]} multiline placeholder="Cuenta qué te ha parecido (opcional)"
        placeholderTextColor={colors.muted} value={body} onChangeText={setBody} maxLength={2000} />
      {error ? <Text style={s.error}>{error}</Text> : null}
      {saved ? <Text style={{ color: colors.star, marginBottom: 6 }}>¡Guardado!</Text> : null}
      <Button title={show.my_review ? 'Actualizar opinión' : 'Publicar opinión'} onPress={save} disabled={rating === 0} />

      <Text style={[s.title, { marginTop: 20 }]}>Opiniones</Text>
      {reviews.map((r) => (
        <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{r.username}</Text>
            <Stars value={r.rating} size={14} />
          </View>
          {r.body ? <Text style={{ color: colors.text, marginTop: 4 }}>{r.body}</Text> : null}
        </View>
      ))}
      {!reviews.length && <Text style={s.muted}>Aún no hay opiniones.</Text>}
    </ScrollView>
  );
}
