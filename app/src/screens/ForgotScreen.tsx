import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EnvelopeSimple } from '../icons';
import { api } from '../api';
import { FadeUp } from '../motion';
import { BackButton, Button, ErrorBanner, Field, GlassCard, Screen, T } from '../components/ui';
import { colors, radius } from '../theme';

// Recuperar contraseña en 2 pasos: 1) pedir el código por correo, 2) código + contraseña nueva.
export default function ForgotScreen({ route, navigation }: any) {
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  const sendCode = () => run(async () => { const r = await api.forgot(email.trim()); setInfo(r.message); setStep(2); });
  const reset = () => run(async () => {
    await api.reset({ email: email.trim(), code, password });
    navigation.navigate('Auth', { notice: 'Contraseña cambiada. Ya puedes entrar con la nueva.' });
  });

  return (
    <Screen strength={0.8}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => navigation.goBack()} />
        <FadeUp style={{ marginTop: 28 }}>
          <T v="eyebrow" color={colors.accent}>{`Paso ${step} de 2`}</T>
          <T v="display" style={{ marginTop: 8 }} accessibilityRole="header">Recuperar contraseña</T>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }} accessibilityElementsHidden>
            {[1, 2].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: n <= step ? colors.accent : colors.glassHi }} />)}
          </View>
        </FadeUp>
        <FadeUp delay={80} style={{ marginTop: 28 }}>
          <GlassCard>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 18 }}>
              <EnvelopeSimple size={26} weight="light" color={colors.accent} />
              <T v="small" color={colors.textDim} style={{ flex: 1 }}>
                {step === 1 ? 'Te enviaremos por correo un código para elegir una contraseña nueva.' : info}
              </T>
            </View>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" inputMode="email" editable={step === 1} />
            {step === 2 && (
              <>
                <Field label="Código del correo" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={9} helper="8 caracteres; vale con o sin guion" />
                <Field label="Nueva contraseña" value={password} onChangeText={setPassword} secure helper="Mínimo 8 caracteres" />
              </>
            )}
            {error ? <View style={{ marginHorizontal: -20, marginBottom: 14 }}><ErrorBanner text={error} /></View> : null}
            {step === 1 ? (
              <Button title="Enviar código" onPress={sendCode} loading={busy} disabled={!email.includes('@')} />
            ) : (
              <>
                <Button title="Cambiar contraseña" onPress={reset} loading={busy} disabled={code.length < 8 || password.length < 8} />
                <Button variant="ghost" title="Reenviar código" onPress={sendCode} disabled={busy} />
              </>
            )}
          </GlassCard>
        </FadeUp>
      </ScrollView>
    </Screen>
  );
}
