import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { spacing, radii } from '@/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const ITEM_W = 52;
const WHEEL_H = 80;
const INITIAL_IDX = 4; // score 5

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

function scoreColor(score: number): string {
  if (score <= 3) return '#F87171';
  if (score <= 5) return '#FB923C';
  if (score <= 7) return '#FACC15';
  return '#B5FF4E';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RatingControlProps {
  onSubmit: (score: number) => void;
  onSkip?: () => void;
  trackName: string;
  previewPlaying?: boolean;
  previewLoading?: boolean;
  onTogglePreview?: () => void;
}

// ─── Wheel item ───────────────────────────────────────────────────────────────

function WheelItem({
  score,
  index,
  scrollX,
}: {
  score: number;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const dist = Math.abs(index * ITEM_W - scrollX.value);
    const scale = interpolate(dist, [0, ITEM_W, ITEM_W * 2], [1, 0.55, 0.36], 'clamp');
    const opacity = interpolate(dist, [0, ITEM_W * 0.6, ITEM_W * 1.6], [1, 0.4, 0.12], 'clamp');
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={[styles.wheelItem, animStyle]}>
      <Text style={{ fontSize: 36, fontWeight: '900', color: scoreColor(score), lineHeight: WHEEL_H }}>
        {score}
      </Text>
    </Animated.View>
  );
}

// ─── Wheel ────────────────────────────────────────────────────────────────────

function RatingWheel({
  onSelect,
}: {
  onSelect: (score: number) => void;
}) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(INITIAL_IDX * ITEM_W);
  const [containerW, setContainerW] = useState(0);
  const sidepad = containerW > 0 ? (containerW - ITEM_W) / 2 : 0;

  useEffect(() => {
    if (containerW > 0) {
      scrollRef.current?.scrollTo({ x: INITIAL_IDX * ITEM_W, animated: false });
    }
  }, [containerW]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.max(0, Math.min(Math.round(x / ITEM_W), SCORES.length - 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(SCORES[idx]);
  };

  return (
    <View
      style={styles.wheelContainer}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* Center selector highlight */}
      {containerW > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.wheelHighlight,
            { left: containerW / 2 - ITEM_W / 2, backgroundColor: colors.surfaceElevated },
          ]}
        />
      )}

      {containerW > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_W}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: sidepad }}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            scrollX.value = x;
            // Update label in real-time as wheel spins
            const idx = Math.max(0, Math.min(Math.round(x / ITEM_W), SCORES.length - 1));
            onSelect(SCORES[idx]);
          }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {SCORES.map((score, i) => (
            <Pressable
              key={score}
              onPress={() => {
                const x = i * ITEM_W;
                scrollRef.current?.scrollTo({ x, animated: true });
                scrollX.value = x;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(score);
              }}
            >
              <WheelItem score={score} index={i} scrollX={scrollX} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RatingControl({
  onSubmit,
  onSkip,
  trackName,
  previewPlaying,
  previewLoading,
  onTogglePreview,
}: RatingControlProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number>(SCORES[INITIAL_IDX]);

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

      {/* Spinning wheel */}
      <RatingWheel onSelect={setSelected} />

      {/* Label beneath selected number */}
      <Text
        align="center"
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: scoreColor(selected),
          marginTop: -spacing[2],
        }}
      >
        {ratingLabels[selected]}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        {onTogglePreview ? (
          <Pressable
            style={[
              styles.previewBtn,
              { backgroundColor: previewPlaying ? colors.accent : colors.surfaceElevated, borderColor: colors.border },
            ]}
            onPress={onTogglePreview}
            disabled={previewLoading}
          >
            {previewLoading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={{ fontSize: 16, color: previewPlaying ? '#080808' : colors.textSecondary, lineHeight: 20 }}>
                {previewPlaying ? '⏸' : '▶'}
              </Text>
            )}
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {onSkip && (
          <Button label="Skip" variant="ghost" onPress={onSkip} size="md" />
        )}
        <Button
          label="Submit"
          variant="primary"
          onPress={() => onSubmit(selected)}
          size="md"
          fullWidth={!onSkip && !onTogglePreview}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    padding: spacing[6],
    gap: spacing[4],
  },
  wheelContainer: {
    height: WHEEL_H,
    marginHorizontal: -spacing[2],
  },
  wheelHighlight: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: ITEM_W,
    borderRadius: radii.md,
  },
  wheelItem: {
    width: ITEM_W,
    height: WHEEL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
  },
  previewBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
