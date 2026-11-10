import React, { useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight, Check, Eye, EyeSlash, FilmSlate, SignOut, Star, WarningCircle, CaretRight,
} from '../icons';
import { colors, font, radius, type, web } from '../theme';
import { Aurora, FadeUp, PressScale, Skeleton } from '../motion';
import { useAuth } from '../auth';

/* ───────── Tipografía ───────── */
export function T({ v = 'body', color, style, children, ...rest }: TextProps & { v?: keyof typeof type; color?: string }) {
  return <Text {...rest} style={[type[v] as any, { color: color ?? colors.text }, style]}>{children}</Text>;
}

/* ───────── Pantalla base: fondo + aurora ───────── */
export function Screen({ children, aurora = true, strength = 1 }: { children: React.ReactNode; aurora?: boolean; strength?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {aurora && <Aurora strength={strength} />}
      {children}
    </View>
  );
}

/* ───────── Contenedor "doble bisel": carcasa + núcleo ───────── */
export function GlassCard({ children, style, inner }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.shell, style]}>
      <View style={[s.core, web({ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }), inner]}>{children}</View>
    </View>
  );
}

/* ───────── Botón (píldora con icono anidado) ───────── */
export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: {
  title: string; onPress?: () => void; variant?: 'primary' | 'glass' | 'ghost'; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const off = disabled || loading;
  return (
    <PressScale
      onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!off, busy: !!loading }}
      containerStyle={{ alignSelf: 'stretch' }}
      style={[s.btn, primary ? s.btnPrimary : variant === 'glass' ? s.btnGlass : s.btnGhost, off && { opacity: 0.45 }, style]}
    >
      {loading ? <ActivityIndicator color={primary ? colors.accentInk : colors.text} /> : (
        <>
          <T v="bodyMed" color={primary ? colors.accentInk : colors.text} style={{ fontFamily: font.bodySemi }}>{title}</T>
          {primary && <View style={s.btnNest}><ArrowRight size={16} weight="bold" color={colors.accentInk} /></View>}
        </>
      )}
    </PressScale>
  );
}

/* ───────── Chip de filtro (multi-selección) ───────── */
export function Chip({ label, selected, onPress, logo }: { label: string; selected?: boolean; onPress: () => void; logo?: string | null }) {
  return (
    <PressScale
      onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}${selected ? ', seleccionado' : ''}`} accessibilityState={{ selected: !!selected }}
      style={[s.chip, selected && s.chipOn]}
    >
      {logo ? <Image source={{ uri: logo }} style={s.chipLogo} accessibilityIgnoresInvertColors /> : null}
      <T v="small" color={selected ? colors.text : colors.textDim} style={{ fontFamily: font.bodyMed }}>{label}</T>
      {selected && <Check size={14} weight="bold" color={colors.accent} />}
    </PressScale>
  );
}

/* ───────── Campo de formulario: etiqueta arriba, error debajo ───────── */
export function Field({ label, error, helper, secure, ...props }: TextInputProps & { label: string; error?: string; helper?: string; secure?: boolean }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <T v="small" color={colors.textDim} style={{ marginBottom: 8, fontFamily: font.bodyMed }}>{label}</T>
      <View style={[s.field, focus && s.fieldFocus, !!error && s.fieldErr]}>
        <TextInput
          {...props} secureTextEntry={secure && !show} placeholderTextColor={colors.muted} accessibilityLabel={label}
          onFocus={(e) => { setFocus(true); props.onFocus?.(e); }} onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
          style={[s.input, web({ outlineStyle: 'none' }), props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 }]}
        />
        {secure && (
          <Pressable onPress={() => setShow((x) => !x)} hitSlop={12} accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeSlash size={22} color={colors.muted} /> : <Eye size={22} color={colors.muted} />}
          </Pressable>
        )}
      </View>
      {error ? <T v="small" color={colors.danger} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">{error}</T>
        : helper ? <T v="small" color={colors.muted} style={{ marginTop: 6 }}>{helper}</T> : null}
    </View>
  );
}

/* ───────── Estrellas (lectura o selección) ───────── */
export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 2 }} accessibilityRole="adjustable" accessibilityLabel={`Puntuación: ${Math.round(value)} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const icon = <Star size={size} weight={on ? 'fill' : 'regular'} color={on ? colors.star : 'rgba(255,255,255,0.28)'} />;
        return onChange ? (
          <PressScale key={n} scale={0.85} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            hitSlop={4} style={{ padding: 4 }}>{icon}</PressScale>
        ) : <View key={n}>{icon}</View>;
      })}
    </View>
  );
}

export function RatingBadge({ value, count }: { value: number | null; count?: number }) {
  if (!value) return null;
  return (
    <View style={s.rating} accessibilityLabel={`Nota ${value} de 5${count ? `, ${count} opiniones` : ''}`}>
      <Star size={12} weight="fill" color={colors.star} />
      <T v="caption" style={{ fontVariant: ['tabular-nums'] }}>{Number(value).toFixed(1)}</T>
    </View>
  );
}

/* ───────── Póster con respaldo degradado ───────── */
const TONES: [string, string][] = [['#2B3340', '#141820'], ['#2C3A36', '#121815'], ['#3B2E28', '#17110E'], ['#34363F', '#16171C'], ['#2A3544', '#11151D']];
export function Poster({ uri, title, style }: { uri?: string | null; title: string; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  const tone = TONES[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: tone[1] }, style]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel={`Póster de ${title}`} />
      ) : (
        <LinearGradient colors={tone} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <FilmSlate size={26} weight="light" color="rgba(255,255,255,0.35)" />
          <T v="heading" color="rgba(255,255,255,0.45)" style={{ marginTop: 6 }}>{initials}</T>
        </LinearGradient>
      )}
    </View>
  );
}

/* ───────── Tarjetas de serie ───────── */
export type Card = {
  key: string; title: string; year?: number | null; genres?: string; rating?: number | null; count?: number;
  poster?: string | null; backdrop?: string | null; isNew?: boolean; onPress: () => void;
};
const meta = (c: Card) => [c.year, c.genres?.split(',').slice(0, 2).join(' · ').trim()].filter(Boolean).join(' · ');

export function FeaturedCard({ card, label = 'Destacada' }: { card: Card; label?: string }) {
  return (
    <PressScale onPress={card.onPress} accessibilityRole="button" accessibilityLabel={`${card.title}. ${meta(card)}`} scale={0.98} style={[s.featShell, web({ boxShadow: '0 30px 60px -30px rgba(255,107,61,0.30)' })]}>
      <View style={s.featCore}>
        <Poster uri={card.backdrop || card.poster} title={card.title} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(11,11,16,0.05)', 'rgba(11,11,16,0.55)', 'rgba(11,11,16,0.96)']} locations={[0.1, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.featBody}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={s.tag}><T v="eyebrow" color={colors.accent} style={{ fontSize: 11 }}>{card.isNew ? 'Nueva en la app' : label}</T></View>
            <RatingBadge value={card.rating ?? null} count={card.count} />
          </View>
          <T v="title" numberOfLines={2}>{card.title}</T>
          <T v="small" color={colors.textDim} style={{ marginTop: 4 }} numberOfLines={1}>{meta(card)}</T>
        </View>
      </View>
    </PressScale>
  );
}

export function ShowCard({ card }: { card: Card }) {
  return (
    <PressScale onPress={card.onPress} accessibilityRole="button" accessibilityLabel={`${card.title}. ${meta(card)}`} scale={0.97}>
      <View style={s.cardPoster}>
        <Poster uri={card.poster} title={card.title} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', 'rgba(11,11,16,0.55)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.cardBadges}>
          <RatingBadge value={card.rating ?? null} count={card.count} />
          {card.isNew && <View style={[s.tag, { backgroundColor: colors.accent }]}><T v="caption" color={colors.accentInk} style={{ fontFamily: font.bodySemi }}>Nueva</T></View>}
        </View>
      </View>
      <T v="bodyMed" numberOfLines={2} style={{ marginTop: 10, fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20 }}>{card.title}</T>
      <T v="caption" color={colors.muted} numberOfLines={1} style={{ marginTop: 2 }}>{meta(card)}</T>
    </PressScale>
  );
}

export function ShowRow({ card, right, index }: { card: Card; right?: React.ReactNode; index?: number }) {
  return (
    <FadeUp delay={(index ?? 0) * 45}>
      <PressScale onPress={card.onPress} accessibilityRole="button" accessibilityLabel={`${card.title}. ${meta(card)}`} scale={0.985} style={s.row}>
        <Poster uri={card.poster} title={card.title} style={s.rowPoster} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="bodyMed" numberOfLines={2} style={{ fontFamily: font.bodySemi }}>{card.title}</T>
          <T v="caption" color={colors.muted} numberOfLines={1}>{meta(card)}</T>
          {right}
        </View>
        <CaretRight size={18} color={colors.muted} />
      </PressScale>
    </FadeUp>
  );
}

/* ───────── Cabecera de pantalla + menú de cuenta ───────── */
export function ScreenHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <T v="eyebrow" color={colors.accent}>{eyebrow}</T> : null}
        <T v="display" style={{ marginTop: 6 }} accessibilityRole="header">{title}</T>
      </View>
      <AccountMenu />
    </View>
  );
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ zIndex: 30 }}>
      <PressScale onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={`Cuenta de ${user?.username}`} accessibilityState={{ expanded: open }} style={s.avatar}>
        <T v="bodyMed" style={{ fontFamily: font.bodySemi }}>{(user?.username ?? '?')[0].toUpperCase()}</T>
      </PressScale>
      {open && (
        <FadeUp y={-6} style={[s.menu, web({ boxShadow: '0 24px 50px -20px rgba(0,0,0,0.8)' })]}>
          <T v="bodyMed" style={{ fontFamily: font.bodySemi }} numberOfLines={1}>{user?.username}</T>
          <T v="caption" color={colors.muted} style={{ marginBottom: 10 }}>{user?.admin ? 'Administrador' : 'Usuario'}</T>
          <PressScale onPress={signOut} accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={s.menuItem}>
            <SignOut size={18} color={colors.accent} />
            <T v="small" color={colors.text} style={{ fontFamily: font.bodyMed }}>Cerrar sesión</T>
          </PressScale>
        </FadeUp>
      )}
    </View>
  );
}

/* ───────── Estados: vacío, error, carga ───────── */
export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <FadeUp style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={s.emptyShell}><View style={s.emptyCore}>{icon}</View></View>
      <T v="heading" style={{ marginTop: 20, textAlign: 'center' }}>{title}</T>
      {body ? <T v="small" color={colors.textDim} style={{ marginTop: 6, textAlign: 'center', maxWidth: 280 }}>{body}</T> : null}
      {action ? <View style={{ marginTop: 20, alignSelf: 'stretch', maxWidth: 260, width: '100%' }}>{action}</View> : null}
    </FadeUp>
  );
}

export function ErrorBanner({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={s.error} accessibilityRole="alert">
      <WarningCircle size={20} color={colors.danger} weight="fill" />
      <T v="small" color={colors.text} style={{ flex: 1 }}>{text}</T>
      {onRetry ? <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button" accessibilityLabel="Reintentar"><T v="small" color={colors.accent} style={{ fontFamily: font.bodySemi }}>Reintentar</T></Pressable> : null}
    </View>
  );
}

export function ResultsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, gap: 18 }} accessibilityLabel="Cargando resultados" accessibilityLiveRegion="polite">
      <Skeleton style={{ height: 230, borderRadius: 32 }} />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flex: 1, paddingTop: i ? 22 : 0 }}>
            <Skeleton style={{ aspectRatio: 2 / 3, borderRadius: 22 }} />
            <Skeleton style={{ height: 14, borderRadius: 7, marginTop: 12, width: '80%' }} />
            <Skeleton style={{ height: 12, borderRadius: 6, marginTop: 8, width: '50%' }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel="Volver" style={s.back}>
      <CaretRight size={20} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
    </PressScale>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
      <T v="eyebrow" color={colors.muted}>{children}</T>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { padding: 6, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: colors.hairline },
  core: { borderRadius: radius.xl - 6, backgroundColor: colors.surface, padding: 20 },
  btn: { minHeight: 54, borderRadius: radius.pill, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnPrimary: { backgroundColor: colors.accent },
  btnGlass: { backgroundColor: colors.glassHi, borderWidth: 1, borderColor: colors.hairline },
  btnGhost: { backgroundColor: 'transparent' },
  btnNest: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(28,10,4,0.14)', alignItems: 'center', justifyContent: 'center' },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  chipLogo: { width: 22, height: 22, borderRadius: 6 },
  field: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldFocus: { borderColor: colors.accentLine, backgroundColor: colors.glassHi },
  fieldErr: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontFamily: font.body, fontSize: 16, paddingVertical: 14 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill, backgroundColor: 'rgba(11,11,16,0.72)', borderWidth: 1, borderColor: colors.hairline },
  tag: { height: 24, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: 'rgba(11,11,16,0.72)', borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  featShell: { padding: 4, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.hairline },
  featCore: { height: 232, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.surface },
  featBody: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  cardPoster: { aspectRatio: 2 / 3, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  cardBadges: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, paddingRight: 16, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.hairline },
  rowPoster: { width: 64, height: 96, borderRadius: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, zIndex: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.glassHi, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  menu: { position: 'absolute', top: 56, right: 0, width: 210, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceHi, borderWidth: 1, borderColor: colors.hairline },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.glass },
  emptyShell: { padding: 6, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: colors.hairline },
  emptyCore: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(255,138,138,0.10)', borderWidth: 1, borderColor: 'rgba(255,138,138,0.35)' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(11,11,16,0.6)', borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
});
