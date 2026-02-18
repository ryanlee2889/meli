import React from 'react';
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { radii, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  disabled,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const heights: Record<Size, number> = { sm: 36, md: 48, lg: 56 };
  const fontSizes: Record<Size, number> = { sm: 13, md: 15, lg: 17 };
  const paddingH: Record<Size, number> = { sm: spacing[3], md: spacing[5], lg: spacing[6] };

  const variantStyles = {
    primary: {
      bg: colors.accent,
      text: colors.accentText,
      border: 'transparent',
    },
    secondary: {
      bg: colors.surfaceElevated,
      text: colors.text,
      border: colors.border,
    },
    ghost: {
      bg: 'transparent',
      text: colors.text,
      border: 'transparent',
    },
    danger: {
      bg: 'transparent',
      text: colors.negative,
      border: colors.negative,
    },
  };

  const vs = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: paddingH[size],
          backgroundColor: vs.bg,
          borderColor: vs.border,
          borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0,
          opacity: isDisabled ? 0.4 : pressed ? 0.75 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <View style={styles.inner}>
          {iconLeft}
          <Text
            style={{
              fontSize: fontSizes[size],
              fontWeight: typography.weights.semibold,
              color: vs.text,
            }}
          >
            {label}
          </Text>
          {iconRight}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
