import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export function Skeleton({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.surfaceElevated },
        { opacity },
        style as object,
      ]}
    />
  );
}
