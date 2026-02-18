import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto',
    semibold: 'Roboto',
    bold: 'Roboto',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

export const typography = {
  fonts: fontFamily,

  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
    '5xl': 60,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  lineHeights: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.45,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

// Pre-built text style presets
export const textStyles = {
  display: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.black,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
  },
  h1: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.snug,
  },
  h2: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.snug,
  },
  h3: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.sizes.xl * typography.lineHeights.snug,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.md * typography.lineHeights.normal,
  },
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  bodyMedium: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontSize: typography.sizes.sm,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    letterSpacing: 0,
  },
} as const;
