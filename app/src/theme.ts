import { Platform } from 'react-native';

// Sistema visual "cine nocturno": fondo casi negro con tinte, UN solo acento (ember) y superficies de cristal.
export const colors = {
  bg: '#0B0B10',
  surface: '#14141C',
  surfaceHi: '#1C1C26',
  glass: 'rgba(255,255,255,0.06)',
  glassHi: 'rgba(255,255,255,0.10)',
  hairline: 'rgba(255,255,255,0.09)',
  text: '#F5F5F7',
  textDim: '#BDBDCB',
  muted: '#8F8FA3', // 5.9:1 sobre bg
  accent: '#FF6B3D',
  accentInk: '#1C0A04', // texto sobre el acento (≈8:1)
  accentSoft: 'rgba(255,107,61,0.14)',
  accentLine: 'rgba(255,107,61,0.55)',
  star: '#F2B84B',
  danger: '#FF8A8A',
  success: '#7EDDAA',
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };

export const font = {
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
  body: 'Geist_400Regular',
  bodyMed: 'Geist_500Medium',
  bodySemi: 'Geist_600SemiBold',
};

// Escala tipográfica (mín. 12 px; cuerpo 16).
export const type = {
  display: { fontFamily: font.displayBold, fontSize: 36, lineHeight: 38, letterSpacing: -1.2 },
  title: { fontFamily: font.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: font.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  bodyMed: { fontFamily: font.bodyMed, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.bodyMed, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  eyebrow: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase' as const },
};

export const isWeb = Platform.OS === 'web';
// Estilos solo web (cursor, outline, filtros) sin romper el nativo.
export const web = (s: Record<string, unknown>): any => (isWeb ? s : {});

// Espacio inferior que reserva la barra de pestañas flotante.
export const TAB_SPACE = 112;
