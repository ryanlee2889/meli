/**
 * Settings — presented as a modal sheet.
 * Links Spotify, toggles privacy, sign out, Stripe plumbing.
 */
import { View, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { clearSpotifyToken, getStoredSpotifyToken } from '@/lib/spotify';

type SettingRowProps = {
  label: string;
  description?: string;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
  destructive?: boolean;
  rightLabel?: string;
};

function SettingRow({
  label,
  description,
  value,
  onPress,
  onToggle,
  destructive,
  rightLabel,
}: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="bodyMedium"
          style={{ color: destructive ? colors.negative : colors.text }}
        >
          {label}
        </Text>
        {description && (
          <Text variant="caption" color="secondary">
            {description}
          </Text>
        )}
      </View>

      {onToggle !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.surfaceElevated}
        />
      ) : rightLabel ? (
        <Text variant="caption" color="secondary">
          {rightLabel}
        </Text>
      ) : onPress ? (
        <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    // Load real Spotify connection status
    getStoredSpotifyToken().then((token) => {
      setSpotifyConnected(!!token);
    });
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  }

  async function handleCreateStripeCustomer() {
    // Call Edge Function to create Stripe customer
    const { data } = await supabase.functions.invoke('create-stripe-customer');
    if (data?.customer_id) {
      Alert.alert('Done', 'Your payment profile is set up.');
    }
  }

  const themeLabels = { system: 'System', dark: 'Dark', light: 'Light' };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Drag handle (modal indicator) */}
      <View style={styles.handleRow}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.header}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Settings
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Spotify */}
        <SectionLabel label="Spotify" />
        <Card padding={0}>
          <SettingRow
            label={spotifyConnected ? 'Spotify connected' : 'Connect Spotify'}
            description={
              spotifyConnected
                ? 'Your listening data is synced'
                : 'Link to pull in your top tracks and artists'
            }
            rightLabel={spotifyConnected ? '✓' : undefined}
            onPress={
              spotifyConnected
                ? undefined
                : () => router.push('/onboarding')
            }
          />
          {spotifyConnected && (
            <SettingRow
              label="Disconnect Spotify"
              destructive
              onPress={() => {
                Alert.alert(
                  'Disconnect Spotify',
                  'Your Spotify tokens will be deleted. Ratings stay.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disconnect',
                      style: 'destructive',
                      onPress: async () => {
                        await clearSpotifyToken();
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase.from('profiles').update({ spotify_connected: false }).eq('id', user.id);
                        }
                        setSpotifyConnected(false);
                      },
                    },
                  ]
                );
              }}
            />
          )}
        </Card>

        {/* Appearance */}
        <SectionLabel label="Appearance" />
        <Card padding={0}>
          {(['system', 'dark', 'light'] as const).map((m) => (
            <SettingRow
              key={m}
              label={themeLabels[m]}
              rightLabel={mode === m ? '✓' : undefined}
              onPress={() => setMode(m)}
            />
          ))}
        </Card>

        {/* Privacy */}
        <SectionLabel label="Privacy" />
        <Card padding={0}>
          <SettingRow
            label="Private profile"
            description="Only you can see your ratings"
            value={privateProfile}
            onToggle={setPrivateProfile}
          />
        </Card>

        {/* Account */}
        <SectionLabel label="Account" />
        <Card padding={0}>
          <SettingRow
            label="Set up payments"
            description="Prepare your account for future features"
            onPress={handleCreateStripeCustomer}
          />
          <SettingRow
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
        </Card>

        {/* Version */}
        <Text variant="caption" color="tertiary" align="center" style={{ marginTop: spacing[4] }}>
          Vibecheck 1.0.0 — Early access
        </Text>
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      variant="label"
      color="secondary"
      style={{ marginTop: spacing[2], marginBottom: -spacing[1], marginLeft: spacing[1] }}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  body: {
    padding: spacing[5],
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    gap: spacing[3],
  },
});
