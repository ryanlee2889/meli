/**
 * Waitlist screen — shown when profile.is_active === false.
 * Displays invite progress and a share sheet.
 */
import { View, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/supabase';

export default function WaitlistScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creditedCount, setCreditedCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: p }, { count }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('inviter_user_id', user.id)
        .eq('status', 'credited'),
    ]);

    setProfile(p);
    setCreditedCount(count ?? 0);
  }

  async function handleShare() {
    if (!profile) return;
    await Share.share({
      message: `Join me on Vibecheck — rate music and build your taste profile. Use my invite: ${profile.invite_code}\n\nvibecheck://signup?code=${profile.invite_code}`,
      title: 'Join Vibecheck',
    });
  }

  const goal = profile?.invite_goal ?? 3;
  const remaining = Math.max(0, goal - creditedCount);
  const progress = Math.min(creditedCount / goal, 1);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 38,
              fontWeight: '900',
              color: colors.text,
              letterSpacing: -1,
            }}
            align="center"
          >
            You're on{'\n'}the list.
          </Text>
          <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[3] }}>
            Invite {remaining} more friend{remaining !== 1 ? 's' : ''} to unlock Vibecheck.
          </Text>
        </View>

        {/* Progress card */}
        <Card gap={spacing[4]}>
          {/* Progress bar */}
          <View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text variant="caption" color="secondary">
                {creditedCount} joined
              </Text>
              <Text variant="caption" color="secondary">
                {goal} needed
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Stat label="Invited" value={creditedCount} accent />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Stat label="Remaining" value={remaining} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Stat label="Goal" value={goal} />
          </View>

          {/* Invite code */}
          <View style={[styles.codeBlock, { backgroundColor: colors.surfaceElevated }]}>
            <Text variant="label" color="secondary">
              Your invite code
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: 4,
                marginTop: 4,
              }}
            >
              {profile?.invite_code ?? '------'}
            </Text>
          </View>
        </Card>

        {/* Share button */}
        <Button
          label="Share invite link"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleShare}
        />

        <Text variant="caption" color="tertiary" align="center">
          Each person who signs up with your code counts toward your goal.
        </Text>

        {/* Sign out link */}
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          onPress={() => supabase.auth.signOut()}
          style={{ alignSelf: 'center' }}
        />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: accent ? colors.accent : colors.text,
        }}
      >
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    padding: spacing[5],
    gap: spacing[5],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 0,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1.5],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 32,
  },
  codeBlock: {
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
});
