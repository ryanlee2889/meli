import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/theme';

const LABELS: [number, string][] = [
  [1, 'unlistenable'],
  [2, 'really bad'],
  [3, 'bad'],
  [4, 'meh'],
  [5, 'okay'],
  [6, 'pretty good'],
  [7, 'good'],
  [8, 'great'],
  [9, 'amazing'],
  [10, 'perfect'],
];

export function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        {LABELS.map(([score, label]) => (
          <View key={score} style={styles.row}>
            <Text style={[styles.score, { color: colors.accent }]}>{score}</Text>
            <Text style={[styles.dash, { color: colors.textTertiary }]}>{' — '}</Text>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 15,
    fontWeight: '700',
    width: 22,
  },
  dash: {
    fontSize: 15,
    fontWeight: '400',
  },
  label: {
    fontSize: 15,
    fontWeight: '400',
  },
});
