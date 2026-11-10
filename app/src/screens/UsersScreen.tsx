import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminUser, api, setToken } from '../api';
import { Button, Empty, Loading, s } from '../components/ui';
import { colors } from '../theme';

// Solo administradores. Las contraseñas están cifradas: no se pueden ver, solo fijar una nueva.
export default function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    api.adminUsers().then(setUsers).catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  async function save(u: AdminUser) {
    setMsg(null);
    try {
      const r = await api.adminSetPassword(u.id, pwd);
      if (r.token) await setToken(r.token); // me cambié la mía: sigo con sesión
      setMsg({ id: u.id, text: 'Contraseña cambiada. Sus sesiones abiertas se han cerrado.', ok: true });
      setPwd(''); setOpenId(null);
    } catch (e: any) { setMsg({ id: u.id, text: e.message, ok: false }); }
  }

  if (error) return <Text style={[s.error, s.pad]}>{error}</Text>;
  if (!users) return <Loading />;
  return (
    <FlatList style={s.screen} data={users} keyExtractor={(u) => String(u.id)}
      ListHeaderComponent={<Text style={[s.muted, s.pad]}>{users.length} usuarios. Toca uno para cambiarle la contraseña.</Text>}
      ListEmptyComponent={<Empty text="Aún no hay usuarios." />}
      renderItem={({ item: u }) => (
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={() => { setOpenId(openId === u.id ? null : u.id); setPwd(''); setMsg(null); }} style={{ padding: 14 }}>
            <Text style={s.title}>{u.username}{u.admin ? '  · admin' : ''}</Text>
            <Text style={s.muted}>{u.email} · {u.country} · {u.reviews_count} opiniones · alta {u.created_at.slice(0, 10)}</Text>
            {msg?.id === u.id && <Text style={{ color: msg.ok ? colors.star : colors.accent, marginTop: 6 }}>{msg.text}</Text>}
          </Pressable>
          {openId === u.id && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <TextInput style={s.input} placeholder="Nueva contraseña (mín. 8)" placeholderTextColor={colors.muted}
                secureTextEntry autoCapitalize="none" value={pwd} onChangeText={setPwd} />
              <Button title="Guardar contraseña" onPress={() => save(u)} disabled={pwd.length < 8} />
            </View>
          )}
        </View>
      )} />
  );
}
