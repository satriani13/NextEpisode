import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, Sparkle, TelevisionSimple, UsersThree } from '../icons';
import { colors, font, radius, web } from '../theme';
import { PressScale } from '../motion';
import { T } from './ui';

const ICONS: Record<string, any> = { Buscar: MagnifyingGlass, 'Para ti': Sparkle, 'Mis series': TelevisionSimple, Usuarios: UsersThree };

// Barra flotante de cristal, separada del borde (nunca pegada abajo). Máx. 4 destinos, con icono y etiqueta.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 14 + insets.bottom }}>
      <View style={[s.pill, web({ boxShadow: '0 20px 40px -18px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)' })]}>
        <BlurView intensity={Platform.OS === 'web' ? 30 : 45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.row} accessibilityRole="tablist">
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const Icon = ICONS[route.name] ?? MagnifyingGlass;
            const go = () => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
            };
            return (
              <PressScale key={route.key} onPress={go} accessibilityRole="tab" accessibilityLabel={route.name} accessibilityState={{ selected: focused }}
                containerStyle={{ flex: 1 }} style={[s.item, focused && s.itemOn]} scale={0.93}>
                <Icon size={24} weight={focused ? 'fill' : 'light'} color={focused ? colors.accent : colors.textDim} />
                <T v="caption" color={focused ? colors.text : colors.muted} style={{ fontFamily: focused ? font.bodySemi : font.bodyMed }}>{route.name}</T>
              </PressScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { borderRadius: radius.pill, overflow: 'hidden', backgroundColor: 'rgba(20,20,28,0.78)', borderWidth: 1, borderColor: colors.hairline },
  row: { flexDirection: 'row', padding: 6, gap: 4 },
  item: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemOn: { backgroundColor: colors.accentSoft },
});
