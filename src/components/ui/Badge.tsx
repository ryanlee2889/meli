import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { radii, spacing } from '@/theme';

type BadgeVariant = 'accent' | 'neutral' | 'positive' | 'negative';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { colors } = useTheme();

  const variantMap = {
    accent: { bg: colors.accentDim, text: colors.accent },
    neutral: { bg: colors.surfaceElevated, text: colors.textSecondary },
    positive: { bg: 'rgba(74, 222, 128, 0.12)', text: colors.positive },
    negative: { bg: 'rgba(248, 113, 113, 0.12)', text: colors.negative },
  };

  const vs = variantMap[variant];

  return (
    <View style={[styles.badge, { backgroundColor: vs.bg }]}>
      <Text variant="label" style={{ color: vs.text, fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
});
