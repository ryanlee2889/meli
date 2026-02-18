import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radii, spacing } from '@/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padding?: keyof typeof spacing | number;
  gap?: number;
}

export function Card({
  elevated = false,
  padding = 5,
  gap,
  style,
  children,
  ...props
}: CardProps) {
  const { colors } = useTheme();

  const paddingValue = typeof padding === 'number' ? padding : spacing[padding as keyof typeof spacing];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          padding: paddingValue,
          gap,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
