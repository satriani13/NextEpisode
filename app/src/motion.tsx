import React, { memo, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, web } from './theme';

// Solo transform y opacity (aceleradas por GPU). En web el driver nativo no existe: se anima en JS.
const native = Platform.OS !== 'web';
export const ease = Easing.bezier(0.32, 0.72, 0, 1);

// ¿La última interacción fue con teclado? El anillo de foco solo se pinta entonces (no al hacer clic).
let keyboardMode = false;
if (!native && typeof window !== 'undefined') {
  window.addEventListener('keydown', () => { keyboardMode = true; }, true);
  window.addEventListener('pointerdown', () => { keyboardMode = false; }, true);
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduced;
}

// Entrada escalonada: sube y aparece. `delay` = índice × 45 ms para cascadas.
export function FadeUp({ children, delay = 0, y = 14, style }: { children: React.ReactNode; delay?: number; y?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: 520, delay, easing: ease, useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [reduced, delay, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Pulsación con muelle: escala al pulsar y vuelve al soltar. Siempre interrumpible.
export function PressScale({
  children, style, containerStyle, scale = 0.96, ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; scale?: number; children?: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const [ring, setRing] = useState(false);
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: native, speed: 40, bounciness: 5 }).start();
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => { to(scale); rest.onPressIn?.(e); }}
      onPressOut={(e) => { to(1); rest.onPressOut?.(e); }}
      onFocus={(e) => { if (keyboardMode) setRing(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setRing(false); rest.onBlur?.(e); }}
      style={[containerStyle, web({ cursor: 'pointer', touchAction: 'manipulation', outlineStyle: 'none' })]}
    >
      <Animated.View style={[style, { transform: [{ scale: v }] }, ring && web({ outlineWidth: 2, outlineColor: colors.accent, outlineStyle: 'solid', outlineOffset: 3 })]}>{children}</Animated.View>
    </Pressable>
  );
}

// Carga: bloque con brillo que recorre la superficie (en lugar de spinners).
export const Skeleton = memo(function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (reduced || !w) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [reduced, w, x]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ backgroundColor: colors.glass, overflow: 'hidden' }, style]}>
      {!reduced && w > 0 && (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: w * 0.6, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w] }) }] }}>
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      )}
    </View>
  );
});

// Aurora: dos orbes difuminados que derivan muy despacio detrás de la cabecera. Aislada y memoizada
// para que su bucle no provoque renders en el resto. En nativo (sin blur CSS) queda un degradado suave.
export const Aurora = memo(function Aurora({ height = 440, strength = 1 }: { height?: number; strength?: number }) {
  const reduced = useReducedMotion();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || !Platform.OS) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(a, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, a]);
  const orb = (color: string, size: number, left: number, top: number, dx: number, dy: number, o: number) => (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, left, top, backgroundColor: color, opacity: o * strength },
        { transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] },
        web({ filter: 'blur(80px)' }),
      ]}
    />
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height, overflow: 'hidden' }}>
      {Platform.OS === 'web' ? (
        <>
          {orb('#FF6B3D', 300, -90, -120, 70, 50, 0.34)}
          {orb('#2F4A6B', 340, 150, -60, -80, 70, 0.30)}
        </>
      ) : (
        <LinearGradient colors={['rgba(255,107,61,0.18)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }} />
      )}
      <LinearGradient colors={['rgba(11,11,16,0)', colors.bg]} locations={[0.35, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }} />
    </View>
  );
});
