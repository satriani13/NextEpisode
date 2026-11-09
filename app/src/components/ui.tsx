import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Button({ title, onPress, disabled, secondary }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={[s.btn, secondary && s.btnSecondary, disabled && { opacity: 0.5 }]}>
      <Text style={[s.btnText, secondary && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export const Stars = ({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Text key={n} onPress={onChange ? () => onChange(n) : undefined}
        style={{ fontSize: size, color: n <= Math.round(value) ? colors.star : colors.border }}>★</Text>
    ))}
  </View>
);

export function ShowRow({ title, year, poster, subtitle, onPress, right }: {
  title: string; year?: number | null; poster?: string | null; subtitle?: string; onPress: () => void; right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      {poster ? <Image source={{ uri: poster }} style={s.poster} /> : <View style={[s.poster, s.noPoster]}><Text style={{ fontSize: 22 }}>📺</Text></View>}
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>{title}{year ? ` (${year})` : ''}</Text>
        {subtitle ? <Text style={s.muted} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export const Loading = () => <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
export const Empty = ({ text }: { text: string }) => <Text style={[s.muted, { textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }]}>{text}</Text>;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '700' },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13 },
  input: { backgroundColor: colors.card, color: colors.text, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  btn: { backgroundColor: colors.accent, padding: 14, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  btnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  poster: { width: 52, height: 78, borderRadius: 6, backgroundColor: colors.card },
  noPoster: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.accent, marginBottom: 8 },
});
