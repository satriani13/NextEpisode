import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FilmSlate } from '../icons';
import { api } from '../api';
import { useAuth } from '../auth';
import { FadeUp, PressScale } from '../motion';
import { Button, Credits, ErrorBanner, Field, GlassCard, Screen, T } from '../components/ui';
import { colors, font, radius, web } from '../theme';

export default function AuthScreen({ route, navigation }: any) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('ES');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notice: string | undefined = route?.params?.notice;

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = mode === 'login' ? await api.login({ email, password }) : await api.register({ email, username, password, country });
      await signIn(r);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const tab = (m: 'login' | 'register', label: string) => (
    <PressScale
      onPress={() => { setMode(m); setError(''); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} accessibilityLabel={label}
      containerStyle={{ flex: 1 }} style={{ minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? colors.glassHi : 'transparent' }}
    >
      <T v="small" color={mode === m ? colors.text : colors.muted} style={{ fontFamily: font.bodySemi }}>{label}</T>
    </PressScale>
  );

  return (
    <Screen strength={1.4}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 72, paddingBottom: 40, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeUp>
            <LinearGradient colors={['#FF8A5C', '#E5502A']} style={[{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, web({ boxShadow: '0 16px 40px -12px rgba(255,107,61,0.6)' })]}>
              <FilmSlate size={30} weight="fill" color={colors.accentInk} />
            </LinearGradient>
            <T v="display" style={{ marginTop: 22 }} accessibilityRole="header">NextEpisode</T>
            <T v="body" color={colors.textDim} style={{ marginTop: 8, maxWidth: 300 }}>Puntúa lo que has visto y descubre qué ver después.</T>
          </FadeUp>

          <FadeUp delay={100} style={{ marginTop: 32 }}>
            <GlassCard>
              <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.glass, marginBottom: 20 }} accessibilityRole="tablist">
                {tab('login', 'Entrar')}
                {tab('register', 'Crear cuenta')}
              </View>
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" inputMode="email" helper={mode === 'register' ? 'Solo se usa para tu cuenta y para recuperar la contraseña.' : undefined} />
              {mode === 'register' && (
                <>
                  <Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" helper="3-24 caracteres: letras, números, punto, guion" />
                  <Field label="País" value={country} onChangeText={setCountry} autoCapitalize="characters" maxLength={2} helper="Código de 2 letras (ES, MX, AR…). Define dónde ves las plataformas." />
                </>
              )}
              <Field label="Contraseña" value={password} onChangeText={setPassword} secure autoComplete={mode === 'login' ? 'current-password' : 'new-password'} helper={mode === 'register' ? 'Mínimo 8 caracteres' : undefined} />
              {notice && !error ? <T v="small" color={colors.success} style={{ marginBottom: 12 }} accessibilityLiveRegion="polite">{notice}</T> : null}
              {error ? <View style={{ marginHorizontal: -20, marginBottom: 14 }}><ErrorBanner text={error} /></View> : null}
              <Button title={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={busy} />
              {mode === 'login' && (
                <Pressable onPress={() => navigation.navigate('Forgot', { email })} accessibilityRole="button" accessibilityLabel="Recuperar contraseña" style={[{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, web({ cursor: 'pointer' })]}>
                  <T v="small" color={colors.accent} style={{ fontFamily: font.bodySemi }}>¿Has olvidado tu contraseña?</T>
                </Pressable>
              )}
            </GlassCard>
          </FadeUp>
          <FadeUp delay={180} style={{ marginTop: 28 }}><Credits style={{ paddingHorizontal: 4 }} /></FadeUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
