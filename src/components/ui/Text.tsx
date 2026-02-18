import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { textStyles, typography } from '@/theme';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label';

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'positive' | 'negative' | 'inverse';
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  color = 'primary',
  align,
  style,
  ...props
}: ThemedTextProps) {
  const { colors } = useTheme();

  const colorMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
    positive: colors.positive,
    negative: colors.negative,
    inverse: colors.textInverse,
  };

  return (
    <RNText
      style={[
        textStyles[variant],
        { color: colorMap[color] },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    />
  );
}
