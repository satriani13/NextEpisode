import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookmarkSimple, Check, TelevisionSimple } from '../icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, Review, ShowDetail } from '../api';
import { FadeUp, PressScale, Skeleton } from '../motion';
import { BackButton, Button, ErrorBanner, Field, GlassCard, Poster, Screen, SectionLabel, Stars, T } from '../components/ui';
import { colors, font, radius } from '../theme';

export default function ShowScreen({ route, navigation }: any) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState<ShowDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [more, setMore] = useState(false);
  const [inList, setInList] = useState(false);
  const [listBusy, setListBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([api.show(id), api.reviews(id)]);
      setShow(d); setReviews(r); setInList(d.in_watchlist);
      if (d.my_review) { setRating(d.my_review.rating); setBody(d.my_review.body); }
    } catch (e: any) { setError(e.message); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setError(''); setSaved(false); setSaving(true);
    try { await api.rate(id, rating, body); setSaved(true); await load(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  // «Quiero ver»: cambia al instante y se deshace si el servidor falla.
  async function toggleList() {
    if (listBusy) return;
    const next = !inList;
    setInList(next); setListBusy(true); setError('');
    try { await (next ? api.addWatch(id) : api.removeWatch(id)); }
    catch (e: any) { setInList(!next); setError(e.message); } finally { setListBusy(false); }
  }

  if (!show) {
    return (
      <Screen aurora={false}>
        <View style={{ position: 'absolute', top: insets.top + 16, left: 16, zIndex: 5 }}><BackButton onPress={() => navigation.goBack()} /></View>
        {error ? <View style={{ marginTop: insets.top + 90 }}><ErrorBanner text={error} onRetry={load} /></View> : <Skeleton style={{ height: 340 }} />}
      </Screen>
    );
  }

  const meta = [show.year, show.genres].filter(Boolean).join(' · ');
  // Sin variantes "con anuncios" como si fueran otra plataforma (salvo que sea lo único que hay).
  const clean = show.providers.filter((p) => !/with ads|standard/i.test(p.provider));
  const provs = clean.length ? clean : show.providers;
  const STATUS: Record<string, string> = { 'Returning Series': 'En emisión', Ended: 'Finalizada', Canceled: 'Cancelada', 'In Production': 'En producción', Planned: 'Prevista', Pilot: 'Piloto' };
  const facts = [
    show.seasons ? `${show.seasons} ${show.seasons === 1 ? 'temporada' : 'temporadas'}` : null,
    show.episodes ? `${show.episodes} episodios` : null,
    show.status ? STATUS[show.status] ?? null : null,
  ].filter(Boolean) as string[];
  return (
    <Screen aurora={false}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: 360 }}>
          <Poster uri={show.backdrop_url || show.poster_url} title={show.title} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(11,11,16,0.55)', 'rgba(11,11,16,0.15)', colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={{ position: 'absolute', top: insets.top + 16, left: 16 }}><BackButton onPress={() => navigation.goBack()} /></View>
          <FadeUp style={{ position: 'absolute', left: 20, right: 20, bottom: 8 }}>
            <T v="display" numberOfLines={3} accessibilityRole="header">{show.title}</T>
            {meta ? <T v="small" color={colors.textDim} style={{ marginTop: 6 }}>{meta}</T> : null}
          </FadeUp>
        </View>

        <FadeUp delay={80} style={{ paddingHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <T v="display" style={{ fontVariant: ['tabular-nums'] }}>{show.avg_rating ? Number(show.avg_rating).toFixed(1) : '–'}</T>
          <View style={{ gap: 4 }}>
            <Stars value={show.avg_rating ?? 0} size={18} />
            <T v="caption" color={colors.muted}>{show.ratings_count ? `${show.ratings_count} ${show.ratings_count === 1 ? 'opinión' : 'opiniones'}` : 'Sé el primero en opinar'}</T>
          </View>
        </FadeUp>

        {facts.length > 0 && (
          <FadeUp delay={95} style={{ paddingHorizontal: 20, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {facts.map((f, i) => (
              <View key={f} style={[s.fact, i === 0 && s.factMain]} accessibilityLabel={f}>
                <T v="small" color={i === 0 ? colors.text : colors.textDim} style={{ fontFamily: i === 0 ? font.bodySemi : font.bodyMed }}>{f}</T>
              </View>
            ))}
          </FadeUp>
        )}

        {!show.my_review && (
          <FadeUp delay={110} style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <PressScale
              onPress={toggleList} accessibilityRole="button" accessibilityState={{ selected: inList, busy: listBusy }}
              accessibilityLabel={inList ? 'Quitar de Quiero ver' : 'Guardar en Quiero ver'} scale={0.97}
              style={[s.watch, inList && s.watchOn]}
            >
              <BookmarkSimple size={20} weight={inList ? 'fill' : 'regular'} color={inList ? colors.accent : colors.textDim} />
              <T v="small" color={inList ? colors.text : colors.textDim} style={{ fontFamily: font.bodySemi }}>{inList ? 'En tu lista · Quiero ver' : 'Quiero ver'}</T>
            </PressScale>
          </FadeUp>
        )}

        <FadeUp delay={140} style={{ marginTop: 28 }}>
          <SectionLabel>{`Dónde verla · ${show.country}`}</SectionLabel>
          {provs.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 }}>
              {provs.map((p) => (
                <View key={p.provider} style={s.prov}>
                  {p.logo_url ? <Image source={{ uri: p.logo_url }} style={s.provLogo} accessibilityIgnoresInvertColors /> : <TelevisionSimple size={20} color={colors.textDim} />}
                  <T v="small" style={{ fontFamily: font.bodyMed }}>{p.provider}</T>
                </View>
              ))}
            </View>
          ) : <T v="small" color={colors.muted} style={{ paddingHorizontal: 20 }}>Sin información de plataformas para tu país.</T>}
          <T v="caption" color={colors.muted} style={{ paddingHorizontal: 20, marginTop: 10 }}>Datos de plataformas: JustWatch</T>
        </FadeUp>

        {show.overview ? (
          <FadeUp delay={200} style={{ marginTop: 28 }}>
            <SectionLabel>Sinopsis</SectionLabel>
            <T v="body" color={colors.textDim} numberOfLines={more ? undefined : 4} style={{ marginHorizontal: 20, marginTop: -4 }}>{show.overview}</T>
            {show.overview.length > 200 && (
              <PressScale onPress={() => setMore((m) => !m)} accessibilityRole="button" accessibilityLabel={more ? 'Mostrar menos' : 'Leer más'} containerStyle={{ marginHorizontal: 20, marginTop: 8, alignSelf: 'flex-start' }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <T v="small" color={colors.accent} style={{ fontFamily: font.bodySemi }}>{more ? 'Mostrar menos' : 'Leer más'}</T>
              </PressScale>
            )}
          </FadeUp>
        ) : null}

        <FadeUp delay={260} style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <GlassCard>
            <T v="heading">{show.my_review ? 'Tu opinión' : '¿Qué te ha parecido?'}</T>
            <View style={{ marginVertical: 14, marginLeft: -4 }}><Stars value={rating} onChange={setRating} size={34} /></View>
            <Field label="Cuéntalo (opcional)" multiline value={body} onChangeText={setBody} maxLength={2000} placeholder="Qué te gustó, qué no, a quién se la recomendarías…" />
            {error ? <ErrorBanner text={error} /> : null}
            {saved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }} accessibilityLiveRegion="polite">
                <Check size={16} weight="bold" color={colors.success} /><T v="small" color={colors.success}>Guardado</T>
              </View>
            ) : null}
            <Button title={show.my_review ? 'Actualizar opinión' : 'Publicar opinión'} onPress={save} disabled={rating === 0} loading={saving} />
          </GlassCard>
        </FadeUp>

        <View style={{ marginTop: 32 }}>
          <SectionLabel>Opiniones</SectionLabel>
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {reviews.map((r, i) => (
              <FadeUp key={r.id} delay={i * 45}>
                <View style={s.review}>
                  <View style={s.avatar}><T v="caption" style={{ fontFamily: font.bodySemi }}>{r.username[0].toUpperCase()}</T></View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <T v="small" style={{ fontFamily: font.bodySemi }}>{r.username}</T>
                      <Stars value={r.rating} size={13} />
                    </View>
                    {r.body ? <T v="small" color={colors.textDim}>{r.body}</T> : null}
                  </View>
                </View>
              </FadeUp>
            ))}
            {!reviews.length && <T v="small" color={colors.muted}>Todavía nadie ha opinado. Tu opinión puede ser la primera.</T>}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  fact: { minHeight: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline, justifyContent: 'center' },
  factMain: { backgroundColor: colors.glassHi },
  watch: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline },
  watchOn: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  prov: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, paddingRight: 16, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline },
  provLogo: { width: 26, height: 26, borderRadius: 7 },
  review: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.glassHi, alignItems: 'center', justifyContent: 'center' },
});
