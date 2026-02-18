import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { radii, spacing, typography } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, iconLeft, iconRight, style, ...props },
  ref
) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.negative
    : focused
    ? colors.accent
    : colors.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="label" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor,
            borderWidth: focused || !!error ? 1.5 : 1,
          },
        ]}
      >
        {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: colors.text,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.accent}
          {...props}
        />

        {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
      </View>

      {(error || hint) && (
        <Text
          variant="caption"
          color={error ? 'negative' : 'secondary'}
          style={styles.hint}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1.5],
  },
  label: {
    marginBottom: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  input: {
    height: 48,
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
  },
  iconLeft: {
    paddingLeft: spacing[4],
  },
  iconRight: {
    paddingRight: spacing[4],
  },
  hint: {
    marginTop: 2,
    marginLeft: 4,
  },
});
