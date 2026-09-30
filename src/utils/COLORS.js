/**
 * Palette DeegiTrans — bleu foncé, noir, peu de blanc.
 * primary = actions / accents ; textes = noir ou bleu foncé ; fonds = clair overteint bleu.
 */
const COLORS = {
  // Marque
  primary: '#0B1F3A',
  primaryDark: '#061428',
  primarySoft: '#E8EEF5',
  secondary: '#132F4C',

  // Neutres / texte
  black: '#000000',
  dark: '#0A0A0A',
  text: '#0B1F3A',
  textStrong: '#000000',
  textLight: '#3D4F66',
  gray: '#2A3544',
  muted: '#5A6B7F',
  mutedStrong: '#7A8A9C',

  white: '#FFFFFF',
  whiteSoft: 'rgba(255,255,255,0.92)',
  whiteTranslucent: 'rgba(255,255,255,0.18)',

  // Surfaces (peu de blanc pur — teinte bleutée)
  background: '#F4F6F9',
  card: '#FFFFFF',
  bg: '#E9EEF5',
  bgSoft: '#DDE5F0',

  // Bordures
  border: '#C5D0DE',
  borderLight: '#E2E8F0',
  borderStrong: '#9AA8BA',

  // États (harmonisés bleu / neutre)
  success: '#0F766E',
  successSoft: '#CCFBF1',
  successSoftAlt: '#99F6E4',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningLight: '#FFFBEB',
  error: '#B91C1C',
  errorSoft: '#FEE2E2',
  info: '#0B1F3A',
  infoSoft: '#E8EEF5',
  infoSoftAlt: '#D5DEEA',

  // Accents / overlays
  highlight: '#E8EEF5',
  lightGreen: '#E8EEF5',
  lightOrange: '#E8EEF5',
  lightBlue: '#D5DEEA',
  lightPurple: '#E8EEF5',
  lightRed: '#FEE2E2',
  overlayDark: 'rgba(11,31,58,0.35)',
  overlayMedium: 'rgba(0,0,0,0.5)',
  overlayHeavy: 'rgba(0,0,0,0.65)',
  overlayStrong: 'rgba(0,0,0,0.9)',
  overlayLight: 'rgba(11,31,58,0.2)',
}

export default COLORS
