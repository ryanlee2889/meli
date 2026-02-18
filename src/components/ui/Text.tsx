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

  const variantStyle = textStyles[variant] as Record<string, any>;
  const flatStyle = StyleSheet.flatten(style) as Record<string, any> | undefined;

  // When a caller overrides fontSize without providing lineHeight, the variant's
  // lineHeight (sized for the variant's own fontSize) will clip the larger text.
  // Recompute lineHeight based on the actual fontSize being rendered.
  let lineHeightFix: { lineHeight?: number } = {};
  if (
    flatStyle?.fontSize &&
    flatStyle.fontSize !== variantStyle.fontSize &&
    !flatStyle.lineHeight &&
    variantStyle.lineHeight
  ) {
    lineHeightFix = { lineHeight: Math.round(flatStyle.fontSize * 1.3) };
  }

  return (
    <RNText
      style={[
        variantStyle,
        { color: colorMap[color] },
        align ? { textAlign: align } : undefined,
        lineHeightFix,
        style,
      ]}
      {...props}
    />
  );
}
