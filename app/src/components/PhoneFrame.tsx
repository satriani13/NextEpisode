import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, web } from '../theme';
import { T } from './ui';

// En pantallas anchas (web) muestra la app dentro de un marco de móvil centrado; en un móvil real
// o en una ventana estrecha ocupa toda la pantalla. El contenido se adapta al ancho disponible.
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width >= 760 && height >= 560;
  if (!framed) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;

  const h = Math.min(height - 48, 900);
  const w = Math.min(420, Math.round(h * 0.5));
  return (
    <View style={{ flex: 1, backgroundColor: '#06060A', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={['rgba(255,107,61,0.10)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <View style={{ position: 'absolute', top: 28, left: 32 }} accessibilityElementsHidden>
        <T v="heading" color={colors.textDim}>NextEpisode</T>
        <T v="small" color={colors.muted} style={{ marginTop: 2 }}>Vista móvil</T>
      </View>
      <View
        style={[
          { width: w + 16, height: h + 16, padding: 8, borderRadius: 54, backgroundColor: '#12121A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
          web({ boxShadow: '0 50px 120px -30px rgba(255,107,61,0.28), 0 30px 60px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)' }),
        ]}
      >
        <View style={{ flex: 1, borderRadius: 46, overflow: 'hidden', backgroundColor: colors.bg }}>{children}</View>
      </View>
    </View>
  );
}
