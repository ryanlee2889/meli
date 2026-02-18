import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { spacing, radii } from '@/theme';

interface RatingControlProps {
  onSubmit: (score: number) => void;
  onSkip?: () => void;
  trackName: string;
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const ratingLabels: Record<number, string> = {
  1: 'Unlistenable',
  2: 'Really bad',
  3: 'Bad',
  4: 'Meh',
  5: 'Okay',
  6: 'Pretty good',
  7: 'Good',
  8: 'Great',
  9: 'Amazing',
  10: 'Perfect',
};

function ScoreDot({ score, selected, onPress }: {
  score: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.3, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Color gradient: low = muted red, mid = neutral, high = lime
  const getColor = (s: number, active: boolean) => {
    if (!active) return colors.surfaceElevated;
    if (s <= 3) return '#F87171';
    if (s <= 5) return '#FB923C';
    if (s <= 7) return '#FACC15';
    return '#B5FF4E';
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View
        style={[
          styles.dot,
          animStyle,
          {
            backgroundColor: getColor(score, selected),
            borderColor: selected ? getColor(score, true) : colors.border,
            borderWidth: 1.5,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: selected ? '#080808' : colors.textSecondary,
          }}
        >
          {score}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function RatingControl({ onSubmit, onSkip, trackName }: RatingControlProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="label" color="secondary" align="center">
        Rate this track
      </Text>
      <Text
        variant="title"
        align="center"
        numberOfLines={1}
        style={{ marginTop: spacing[1] }}
      >
        {trackName}
      </Text>

      {selected !== null && (
        <Text
          align="center"
          style={{ marginTop: spacing[1], color: colors.textSecondary, fontSize: 13 }}
        >
          {ratingLabels[selected]}
        </Text>
      )}

      {/* Score row */}
      <View style={styles.dotsRow}>
        {SCORES.map((s) => (
          <ScoreDot
            key={s}
            score={s}
            selected={selected !== null && s <= selected}
            onPress={() => setSelected(s)}
          />
        ))}
      </View>

      {/* Large score display */}
      {selected !== null && (
        <Text
          style={{
            fontSize: 56,
            fontWeight: '900',
            color: colors.text,
            textAlign: 'center',
            lineHeight: 60,
          }}
        >
          {selected}
          <Text style={{ fontSize: 24, color: colors.textSecondary }}>
            {' '}/10
          </Text>
        </Text>
      )}

      <View style={styles.actions}>
        {onSkip && (
          <Button
            label="Skip"
            variant="ghost"
            onPress={onSkip}
            size="md"
          />
        )}
        <Button
          label="Submit"
          variant="primary"
          disabled={selected === null}
          onPress={() => selected !== null && onSubmit(selected)}
          size="md"
          fullWidth={!onSkip}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    padding: spacing[6],
    gap: spacing[4],
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'flex-end',
    marginTop: spacing[2],
  },
});
