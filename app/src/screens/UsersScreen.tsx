import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ShieldCheck } from '../icons';
import { AdminUser, api, setToken } from '../api';
import { FadeUp, PressScale } from '../motion';
import { Button, Empty, ErrorBanner, Field, ResultsSkeleton, Screen, ScreenHeader, T } from '../components/ui';
import { colors, font, radius, TAB_SPACE } from '../theme';

// Solo administradores. Las contraseñas están cifradas: no se pueden ver, solo fijar una nueva.
export default function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const load = useCallback(() => { setError(''); api.adminUsers().then(setUsers).catch((e) => setError(e.message)); }, []);
  useFocusEffect(load);

  async function save(u: AdminUser) {
    setMsg(null); setBusy(true);
    try {
      const r = await api.adminSetPassword(u.id, pwd);
      if (r.token) await setToken(r.token); // me cambié la mía: sigo con sesión
      setMsg({ id: u.id, text: 'Contraseña cambiada. Sus sesiones abiertas se han cerrado.', ok: true });
      setPwd(''); setOpenId(null);
    } catch (e: any) { setMsg({ id: u.id, text: e.message, ok: false }); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Administración" title="Usuarios" />
        {error ? <ErrorBanner text={error} onRetry={load} /> : !users ? <ResultsSkeleton /> : users.length === 0 ? (
          <Empty icon={<ShieldCheck size={30} weight="light" color={colors.textDim} />} title="Aún no hay usuarios" />
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <T v="small" color={colors.muted} style={{ marginBottom: 4 }}>{`${users.length} ${users.length === 1 ? 'usuario' : 'usuarios'}. Toca uno para cambiarle la contraseña.`}</T>
            {users.map((u, i) => (
              <FadeUp key={u.id} delay={i * 40}>
                <View style={{ borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: openId === u.id ? colors.accentLine : colors.hairline, overflow: 'hidden' }}>
                  <PressScale
                    onPress={() => { setOpenId(openId === u.id ? null : u.id); setPwd(''); setMsg(null); }}
                    accessibilityRole="button" accessibilityState={{ expanded: openId === u.id }} accessibilityLabel={`${u.username}, ${u.email}`} scale={0.99}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.glassHi, alignItems: 'center', justifyContent: 'center' }}>
                      <T v="bodyMed" style={{ fontFamily: font.bodySemi }}>{u.username[0].toUpperCase()}</T>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T v="bodyMed" style={{ fontFamily: font.bodySemi }} numberOfLines={1}>{u.username}</T>
                        {u.admin && <View style={{ paddingHorizontal: 8, height: 20, borderRadius: radius.pill, backgroundColor: colors.accentSoft, justifyContent: 'center' }}><T v="caption" color={colors.accent}>admin</T></View>}
                      </View>
                      <T v="caption" color={colors.muted} numberOfLines={1}>{u.email}</T>
                      <T v="caption" color={colors.muted}>{`${u.country} · ${u.reviews_count} ${u.reviews_count === 1 ? 'opinión' : 'opiniones'} · alta ${u.created_at.slice(0, 10)}`}</T>
                    </View>
                  </PressScale>
                  {msg?.id === u.id && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 12 }} accessibilityLiveRegion="polite">
                      {msg.ok && <Check size={16} weight="bold" color={colors.success} />}
                      <T v="small" color={msg.ok ? colors.success : colors.danger} style={{ flex: 1 }}>{msg.text}</T>
                    </View>
                  )}
                  {openId === u.id && (
                    <FadeUp y={8} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                      <Field label="Nueva contraseña" value={pwd} onChangeText={setPwd} secure autoCapitalize="none" helper="Mínimo 8 caracteres. Cerrará sus sesiones abiertas." />
                      <Button title="Guardar contraseña" onPress={() => save(u)} loading={busy} disabled={pwd.length < 8} />
                    </FadeUp>
                  )}
                </View>
              </FadeUp>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
