import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Check, Lightbulb } from '../icons';
import { api } from '../api';
import { FadeUp } from '../motion';
import { BackButton, Button, ErrorBanner, Field, GlassCard, Screen, T } from '../components/ui';
import { colors } from '../theme';

const MIN = 10;

// Buzón de ideas: la sugerencia llega por correo al equipo con tu nombre y la fecha.
export default function SuggestScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true); setError('');
    try { await api.suggest(text.trim()); setSent(true); setText(''); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Screen strength={0.8}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />
        <FadeUp style={{ marginTop: 28 }}>
          <T v="eyebrow" color={colors.accent}>Ayúdanos a mejorar</T>
          <T v="display" style={{ marginTop: 8 }} accessibilityRole="header">Sugerencias</T>
        </FadeUp>
        <FadeUp delay={80} style={{ marginTop: 28 }}>
          <GlassCard>
            {sent ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }} accessibilityLiveRegion="polite">
                <Check size={30} weight="bold" color={colors.success} />
                <T v="heading" style={{ marginTop: 12, textAlign: 'center' }}>¡Gracias por tu idea!</T>
                <T v="small" color={colors.textDim} style={{ marginTop: 6, textAlign: 'center' }}>La hemos recibido y la leeremos con cariño.</T>
                <View style={{ alignSelf: 'stretch', marginTop: 20, gap: 4 }}>
                  <Button title="Enviar otra" variant="glass" onPress={() => setSent(false)} />
                  <Button title="Volver" variant="ghost" onPress={() => navigation.goBack()} />
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                  <Lightbulb size={26} weight="light" color={colors.accent} />
                  <T v="small" color={colors.textDim} style={{ flex: 1 }}>
                    NextEpisode lo construimos con lo que nos cuentas. ¿Qué cambiarías o añadirías? Cualquier idea, grande o pequeña, nos sirve.
                  </T>
                </View>
                <Field label="Tu sugerencia" multiline value={text} onChangeText={setText} maxLength={2000} placeholder="Me gustaría poder… / Echo en falta… / Sería genial que…" helper={`Mínimo ${MIN} caracteres`} />
                {error ? <View style={{ marginHorizontal: -20, marginBottom: 14 }}><ErrorBanner text={error} /></View> : null}
                <Button title="Enviar sugerencia" onPress={send} loading={busy} disabled={text.trim().length < MIN} />
              </>
            )}
          </GlassCard>
        </FadeUp>
      </ScrollView>
    </Screen>
  );
}
