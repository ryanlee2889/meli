import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const START_Y = 44;
const TRAVEL  = 110;
const EMERGE  = START_Y / TRAVEL; // ≈ 0.4 — fraction of rise when note clears card top

// Each note loops on its own RISE-length cycle; stagger via initial setTimeout delay.
// With N notes spread evenly across one RISE, there's always a note in flight.
const RISE = 1800;
const N    = 8;
const SPACING = RISE / N; // 225ms between each note start

const CARD_WIDTH  = Dimensions.get('window').width - 40;
const EDGE_MARGIN = 20;

const SYMBOLS = ['♪', '♫', '♩', '♬', '♪', '♫', '♩', '♬'];

function FloatingNote({ symbol, delay, x }: { symbol: string; delay: number; x: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: RISE, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);

    return () => {
      clearTimeout(timer);
      loop?.stop();
      anim.setValue(0);
    };
  }, []);

  const translateY = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -TRAVEL],
  });

  // Fade in as note emerges above card top, fade out near peak
  const opacity = anim.interpolate({
    inputRange:  [0, EMERGE - 0.06, EMERGE + 0.12, 0.78, 1],
    outputRange: [0, 0,              0.45,          0.38, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.Text style={[styles.note, { left: x, opacity, transform: [{ translateY }] }]}>
      {symbol}
    </Animated.Text>
  );
}

export function MusicNotes() {
  // Randomize x positions once per mount across the full card width
  const positions = useRef(
    SYMBOLS.map(() =>
      Math.floor(Math.random() * (CARD_WIDTH - EDGE_MARGIN * 2)) + EDGE_MARGIN
    )
  ).current;

  return (
    <View style={styles.container} pointerEvents="none">
      {SYMBOLS.map((symbol, i) => (
        <FloatingNote key={i} symbol={symbol} delay={i * SPACING} x={positions[i]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: START_Y,
    left: 0,
    right: 0,
    height: 1,
  },
  note: {
    position: 'absolute',
    top: 0,
    fontSize: 50,
    color: 'rgba(60, 60, 60, 0.9)',
    fontWeight: '700',
  },
});
