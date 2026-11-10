import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, Pressable } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button, s } from '../components/ui';
import { colors } from '../theme';

export default function AuthScreen({ route, navigation }: any) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('ES');
  const [error, setError] = useState('');
  const notice: string | undefined = route?.params?.notice;
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = mode === 'login' ? await api.login({ email, password }) : await api.register({ email, username, password, country });
      await signIn(r);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.pad, { paddingTop: 100 }]} keyboardShouldPersistTaps="handled">
        <Text style={[s.h1, { fontSize: 34, marginBottom: 4 }]}>NextEpisode</Text>
        <Text style={[s.muted, { marginBottom: 28 }]}>Puntúa lo que has visto y descubre qué ver después.</Text>
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {mode === 'register' && <>
          <TextInput style={s.input} placeholder="Usuario" placeholderTextColor={colors.muted} autoCapitalize="none" value={username} onChangeText={setUsername} />
          <TextInput style={s.input} placeholder="País (ES, MX, AR…)" placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={2} value={country} onChangeText={setCountry} />
        </>}
        <TextInput style={s.input} placeholder="Contraseña (mín. 8)" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
        {notice && !error ? <Text style={{ color: colors.star, marginBottom: 8 }}>{notice}</Text> : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button title={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} disabled={busy} />
        {mode === 'login' && (
          <Pressable onPress={() => navigation.navigate('Forgot', { email })}>
            <Text style={[s.muted, { textAlign: 'center', marginTop: 12, color: colors.accent }]}>¿Has olvidado tu contraseña?</Text>
          </Pressable>
        )}
        <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          <Text style={[s.muted, { textAlign: 'center', marginTop: 12 }]}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
