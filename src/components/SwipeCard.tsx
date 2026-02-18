import React, { useCallback } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './ui/Text';
import { spacing, radii } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing[5] * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.35;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName: string;
  imageUrl: string;
  previewUrl?: string;
  spotifyId: string;
}

interface SwipeCardProps {
  track: Track;
  index: number;          // 0 = top card
  totalCards: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeCard({
  track,
  index,
  totalCards,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isTop = index === 0;

  const springConfig = { damping: 20, stiffness: 200 };

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25; // subtle vertical drift
    })
    .onEnd((e) => {
      const shouldSwipeRight = e.translationX > SWIPE_THRESHOLD;
      const shouldSwipeLeft = e.translationX < -SWIPE_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, springConfig);
        runOnJS(onSwipeRight)();
      } else if (shouldSwipeLeft) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, springConfig);
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-18, 0, 18]
    );
    // Stack offset: cards behind are shifted down slightly
    const stackOffsetY = index * 8;
    const stackScale = 1 - index * 0.04;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackOffsetY },
        { rotate: `${rotate}deg` },
        { scale: stackScale },
      ],
      zIndex: totalCards - index,
    };
  });

  // Like/Pass label opacity tied to swipe direction
  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, 100], [0, 1], 'clamp'),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-20, -100], [0, 1], 'clamp'),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardAnimStyle]}>
        {/* Album Art */}
        <Image
          source={{ uri: track.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
        />

        {/* Like indicator */}
        <Animated.View style={[styles.likeLabel, likeOpacity]}>
          <Text
            style={{
              color: '#B5FF4E',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: 2,
              textTransform: 'uppercase',
              borderWidth: 3,
              borderColor: '#B5FF4E',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            Love
          </Text>
        </Animated.View>

        {/* Pass indicator */}
        <Animated.View style={[styles.passLabel, passOpacity]}>
          <Text
            style={{
              color: '#F87171',
              fontSize: 20,
              fontWeight: '900',
              letterSpacing: 2,
              textTransform: 'uppercase',
              borderWidth: 3,
              borderColor: '#F87171',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            Pass
          </Text>
        </Animated.View>

        {/* Track Info */}
        <View style={styles.info}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#F2F2F2',
              lineHeight: 26,
            }}
            numberOfLines={2}
          >
            {track.name}
          </Text>
          <Text
            style={{ fontSize: 15, color: 'rgba(242,242,242,0.7)', marginTop: 4 }}
            numberOfLines={1}
          >
            {track.artists.join(', ')}
          </Text>
          <Text
            style={{ fontSize: 12, color: 'rgba(242,242,242,0.45)', marginTop: 2 }}
            numberOfLines={1}
          >
            {track.albumName}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    backgroundColor: '#1C1C1C',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  likeLabel: {
    position: 'absolute',
    top: 40,
    left: 24,
    transform: [{ rotate: '-15deg' }],
  },
  passLabel: {
    position: 'absolute',
    top: 40,
    right: 24,
    transform: [{ rotate: '15deg' }],
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[6],
  },
});
