/**
 * Landing screen — minimalist hero with two CTAs.
 * Shown to unauthenticated users.
 */
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';

const { height } = Dimensions.get('window');

export default function LandingScreen() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Background art — abstract music wave or gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['#0A1A0A', colors.bg, colors.bg]
            : ['#E8FFB0', colors.bg, colors.bg]
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />

      {/* Decorative album grid (top area) */}
      <View style={styles.artGrid} pointerEvents="none">
        {DUMMY_COLORS.map((color, i) => (
          <View
            key={i}
            style={[
              styles.artCell,
              {
                backgroundColor: color,
                opacity: isDark ? 0.18 : 0.25,
                transform: [{ rotate: `${(i % 3) * 3 - 3}deg` }],
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView style={styles.content} edges={['bottom', 'top']}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: colors.accent }]} />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.text,
              letterSpacing: -0.3,
            }}
          >
            Vibecheck
          </Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text
            style={{
              fontSize: 46,
              fontWeight: '900',
              color: colors.text,
              letterSpacing: -1.5,
              lineHeight: 50,
            }}
          >
            Track what{'\n'}you love.
          </Text>

          <Text
            variant="body"
            color="secondary"
            style={{ marginTop: spacing[3], maxWidth: 280, lineHeight: 22 }}
          >
            Rate music 1–10, build your taste profile, and discover what fits
            your sound — no algorithms deciding for you.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <Button
            label="Get started"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/sign-up')}
          />
          <Button
            label="Sign in"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/sign-in')}
          />

          <Text
            variant="caption"
            color="tertiary"
            align="center"
            style={{ marginTop: spacing[2] }}
          >
            Invite-only beta — enter your code at sign up
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Placeholder color blocks to suggest album art
const DUMMY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#82E0AA',
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  artGrid: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    height: height * 0.42,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 20,
  },
  artCell: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[2],
  },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[10],
  },
  ctas: {
    gap: spacing[3],
  },
});
