/**
 * Vibecheck color tokens.
 *
 * Accent: #B5FF4E — electric lime. Bold on dark, still legible on light.
 * Text-on-accent is always #080808 (dark) since lime is inherently light.
 */

export const palette = {
  lime: '#B5FF4E',
  limeDeep: '#7AB833',  // darker variant for light-mode accent text
  black: '#080808',
  white: '#F2F2F2',
  trueWhite: '#FFFFFF',
  gray50: '#F8F8F6',
  gray100: '#EFEFED',
  gray200: '#DEDEDD',
  gray300: '#C4C4C3',
  gray400: '#A0A0A0',
  gray500: '#777777',
  gray600: '#555555',
  gray700: '#333333',
  gray800: '#1C1C1C',
  gray850: '#141414',
  gray900: '#111111',
  gray950: '#080808',
  green: '#4ADE80',
  red: '#F87171',
  orange: '#FB923C',
  blue: '#60A5FA',
} as const;

export const dark = {
  bg: palette.gray950,
  surface: palette.gray900,
  surfaceElevated: palette.gray800,
  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',

  accent: palette.lime,
  accentDim: 'rgba(181, 255, 78, 0.12)',
  accentText: palette.black,   // text rendered ON accent backgrounds

  text: palette.white,
  textSecondary: palette.gray500,
  textTertiary: palette.gray700,
  textInverse: palette.black,

  positive: palette.green,
  negative: palette.red,
  warning: palette.orange,
  info: palette.blue,

  overlay: 'rgba(0, 0, 0, 0.6)',
  scrim: 'rgba(0, 0, 0, 0.85)',
} as const;

export const light = {
  bg: palette.gray50,
  surface: palette.trueWhite,
  surfaceElevated: palette.gray100,
  border: 'rgba(0, 0, 0, 0.07)',
  borderStrong: 'rgba(0, 0, 0, 0.14)',

  accent: palette.lime,
  accentDim: 'rgba(181, 255, 78, 0.20)',
  accentText: palette.black,

  text: palette.gray950,
  textSecondary: palette.gray600,
  textTertiary: palette.gray300,
  textInverse: palette.white,

  positive: '#16A34A',
  negative: '#DC2626',
  warning: '#EA580C',
  info: '#2563EB',

  overlay: 'rgba(0, 0, 0, 0.4)',
  scrim: 'rgba(0, 0, 0, 0.7)',
} as const;

export type ColorScheme = typeof dark;
