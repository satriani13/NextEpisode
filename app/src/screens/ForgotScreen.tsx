import React, { useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { api } from '../api';
import { Button, s } from '../components/ui';
import { colors } from '../theme';

// Recuperar contraseña en 2 pasos: 1) pedir el código por correo, 2) código + nueva contraseña.
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
  const sendCode = () => run(async () => {
    const r = await api.forgot(email.trim());
    setInfo(r.message); setStep(2);
  });
  const reset = () => run(async () => {
    await api.reset({ email: email.trim(), code, password });
    navigation.navigate('Auth', { notice: 'Contraseña cambiada. Ya puedes entrar con la nueva.' });
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={[s.muted, { marginBottom: 12 }]}>
        {step === 1 ? 'Te enviaremos por correo un código para elegir una contraseña nueva.' : info}
      </Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} editable={step === 1} />
      {step === 2 && <>
        <TextInput style={s.input} placeholder="Código del correo (8 caracteres)" placeholderTextColor={colors.muted}
          autoCapitalize="characters" autoCorrect={false} maxLength={9} value={code} onChangeText={setCode} />
        <TextInput style={s.input} placeholder="Nueva contraseña (mín. 8)" placeholderTextColor={colors.muted}
          secureTextEntry value={password} onChangeText={setPassword} />
      </>}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {step === 1
        ? <Button title="Enviar código" onPress={sendCode} disabled={busy || !email.includes('@')} />
        : <>
            <Button title="Cambiar contraseña" onPress={reset} disabled={busy || code.length < 8 || password.length < 8} />
            <Button secondary title="Reenviar código" onPress={sendCode} disabled={busy} />
          </>}
    </ScrollView>
  );
}
