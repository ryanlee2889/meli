/**
 * Profile — taste profile, recent ratings, similar users.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase, type Profile, type Rating } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const GRID_COL = 3;
const RATING_CELL = (width - spacing[5] * 2 - spacing[2] * (GRID_COL - 1)) / GRID_COL;

// Mock genre taste data
const MOCK_GENRES = [
  { name: 'Hip-Hop', pct: 82 },
  { name: 'R&B', pct: 64 },
  { name: 'Alternative', pct: 51 },
  { name: 'Electronic', pct: 38 },
  { name: 'Jazz', pct: 22 },
];

const MOCK_SIMILAR_USERS = [
  { id: 'a', username: 'mchael', similarity: 94 },
  { id: 'b', username: 'jpxo', similarity: 87 },
  { id: 'c', username: 'sndra', similarity: 81 },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentRatings, setRecentRatings] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(p);

    // Load recent ratings with item info
    const { data: ratings } = await supabase
      .from('ratings')
      .select('*, items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    setRecentRatings(ratings ?? []);
  }

  const totalRatings = recentRatings.length;
  const avgScore =
    totalRatings > 0
      ? (recentRatings.reduce((s, r) => s + r.score, 0) / totalRatings).toFixed(1)
      : '—';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}
            >
              {profile?.display_name ?? profile?.username ?? 'Your profile'}
            </Text>
            {profile?.username && (
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                @{profile.username}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {profile?.spotify_connected && (
              <Badge label="Spotify" variant="positive" />
            )}
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <StatCell label="Ratings" value={String(totalRatings)} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell label="Avg score" value={String(avgScore)} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell label="Lists" value="0" />
        </View>

        <View style={styles.body}>
          {/* Taste profile / genre map */}
          <Section title="Taste profile">
            <Card gap={spacing[4]}>
              {MOCK_GENRES.map((g) => (
                <GenreBar key={g.name} name={g.name} pct={g.pct} />
              ))}
            </Card>
          </Section>

          {/* Recent ratings grid */}
          <Section title="Recent ratings">
            {recentRatings.length === 0 ? (
              <Text variant="body" color="secondary" align="center">
                Rate some tracks to see them here.
              </Text>
            ) : (
              <View style={styles.ratingsGrid}>
                {recentRatings.map((r) => (
                  <RatingCell key={r.id} rating={r} />
                ))}
              </View>
            )}
          </Section>

          {/* Similar users */}
          <Section title="Similar taste">
            <View style={{ gap: spacing[3] }}>
              {MOCK_SIMILAR_USERS.map((u) => (
                <SimilarUserRow key={u.id} user={u} />
              ))}
            </View>
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="label" color="secondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

function GenreBar({ name, pct }: { name: string; pct: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[1.5] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="primary">
          {name}
        </Text>
        <Text variant="caption" color="secondary">
          {pct}%
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>
    </View>
  );
}

function RatingCell({ rating }: { rating: any }) {
  const { colors } = useTheme();
  const imageUrl = rating.items?.image_url;

  return (
    <View style={[styles.ratingCell, { backgroundColor: colors.surfaceElevated }]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      {/* Score badge */}
      <View style={[styles.scoreBadge, { backgroundColor: colors.accent }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentText }}>
          {rating.score}
        </Text>
      </View>
    </View>
  );
}

function SimilarUserRow({ user }: { user: { id: string; username: string; similarity: number } }) {
  const { colors } = useTheme();
  return (
    <View style={styles.similarRow}>
      <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
          {user.username[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">@{user.username}</Text>
      </View>
      <Badge label={`${user.similarity}% match`} variant="accent" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing[4],
    marginHorizontal: spacing[5],
    marginBottom: spacing[2],
  },
  statDivider: {
    width: 1,
    marginVertical: spacing[1],
  },
  body: {
    padding: spacing[5],
    gap: spacing[6],
    paddingBottom: spacing[10],
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  ratingCell: {
    width: RATING_CELL,
    height: RATING_CELL,
    borderRadius: radii.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  scoreBadge: {
    margin: 4,
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 5,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  similarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
