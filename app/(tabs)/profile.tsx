/**
 * Profile — identity-first view. Your musical self.
 */
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Image,
  Pressable,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase, type Profile } from '@/lib/supabase';
import { getDailyStatus, type DailyStatus } from '@/lib/dailyApi';
import type { ColorScheme } from '@/theme/colors';

const { width } = Dimensions.get('window');
const CONTENT_W = width - spacing[5] * 2;
const HALF_W = (CONTENT_W - spacing[2]) / 2;
const THIRD_W = (CONTENT_W - spacing[2] * 2) / 3;
const LOVED_CELL = (CONTENT_W - spacing[2] * 2) / 3;

// ─── Data helpers ─────────────────────────────────────────────────────────────

type ArtistCell = {
  name: string;
  count: number;
  avgScore: number;
  imageUrl?: string;
};

function computeTopArtists(ratings: any[]): ArtistCell[] {
  const map: Record<string, { count: number; total: number; imageUrl?: string }> = {};
  for (const r of ratings) {
    const artists: string[] = Array.isArray(r.items?.artists_json)
      ? r.items.artists_json
      : [];
    for (const a of artists) {
      if (!map[a]) map[a] = { count: 0, total: 0 };
      map[a].count++;
      map[a].total += r.score;
      if (!map[a].imageUrl && r.items?.image_url) {
        map[a].imageUrl = r.items.image_url;
      }
    }
  }
  return Object.entries(map)
    .map(([name, d]) => ({ name, count: d.count, avgScore: d.total / d.count, imageUrl: d.imageUrl }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, 7);
}

function computeDistribution(ratings: any[]) {
  return Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: ratings.filter((r) => r.score === i + 1).length,
  }));
}

function getArtistTracks(ratings: any[], artistName: string) {
  return ratings
    .filter((r) => {
      const artists: string[] = Array.isArray(r.items?.artists_json)
        ? r.items.artists_json
        : [];
      return artists.includes(artistName);
    })
    .sort((a, b) => b.score - a.score);
}

function getPersona(avg: number, total: number) {
  if (total < 5) return { label: 'Getting Started', description: 'Rate more tracks to reveal your taste' };
  if (avg >= 8.5) return { label: 'The Connoisseur', description: 'Only what truly moves you earns a high score' };
  if (avg >= 7.5) return { label: 'True Believer', description: 'Music is a deeply serious thing to you' };
  if (avg >= 6.5) return { label: 'Discerning Listener', description: 'You know exactly what you like' };
  if (avg >= 5.5) return { label: 'Avid Explorer', description: 'You hear it all and rate honestly' };
  return { label: 'Hard to Please', description: 'Your standards are sky high' };
}

function scoreColor(score: number, colors: ColorScheme): string {
  if (score >= 8.5) return colors.accent;
  if (score >= 7) return colors.positive;
  if (score >= 5.5) return colors.warning;
  return colors.negative;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<{ artist: ArtistCell; rank: number } | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus>({ state: 'none' });

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, ratingsRes, listsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('ratings')
        .select('*, items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('lists')
        .select('id, title, description, is_public, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setRatings(ratingsRes.data ?? []);
    setLists(listsRes.data ?? []);

    // Load daily status in the background (non-blocking)
    getDailyStatus().then(setDailyStatus);

    setLoading(false);
  }

  // Derived state
  const totalRatings = ratings.length;
  const avgScore =
    totalRatings > 0 ? ratings.reduce((s, r) => s + r.score, 0) / totalRatings : 0;
  const persona = getPersona(avgScore, totalRatings);
  const topArtists = computeTopArtists(ratings);
  const distribution = computeDistribution(ratings);
  const maxDist = Math.max(...distribution.map((d) => d.count), 1);
  const recentlyLoved = ratings.filter((r) => r.score >= 8).slice(0, 6);

  async function handleShare() {
    const artistNames = topArtists
      .slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.name} (avg ${a.avgScore.toFixed(1)})`)
      .join('\n');
    const scoreStr = totalRatings > 0 ? avgScore.toFixed(1) : '—';

    Share.share({
      message: [
        `My Vibecheck Profile`,
        `${persona.label}`,
        `${totalRatings} ratings · ${scoreStr}/10 avg`,
        topArtists.length > 0 ? `\nTop Artists:\n${artistNames}` : '',
        `\nvibecheck.app/@${profile?.username ?? ''}`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
        <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
              {profile?.display_name ?? profile?.username ?? 'Your profile'}
            </Text>
            {profile?.username && (
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                @{profile.username}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            {profile?.spotify_connected && <Badge label="Spotify" variant="positive" />}
            <Pressable onPress={handleShare} hitSlop={12}>
              <Text style={{ fontSize: 20, color: colors.textSecondary }}>↑</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Taste persona chip ── */}
        <View style={styles.personaRow}>
          <View style={[styles.personaChip, { backgroundColor: colors.accentDim }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 }}>
              {persona.label.toUpperCase()}
            </Text>
          </View>
          {totalRatings >= 5 && (
            <Text variant="caption" color="secondary" style={{ marginTop: spacing[1] }}>
              {persona.description}
            </Text>
          )}
        </View>

        {/* ── Stats row ── */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <StatCell label="Ratings" value={String(totalRatings)} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell
            label="Avg score"
            value={totalRatings > 0 ? avgScore.toFixed(1) : '—'}
            highlight={totalRatings > 0}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell label="Lists" value={String(lists.length)} />
        </View>

        <View style={styles.body}>

          {/* ── Today's vibe (daily queue) ── */}
          <TodayVibeCard status={dailyStatus} />

          {/* ── Taste Map ── */}
          {topArtists.length > 0 && (
            <Section title="Taste Map">
              <TasteMap
                artists={topArtists}
                onArtistPress={(artist, rank) => setSelectedArtist({ artist, rank })}
              />
            </Section>
          )}

          {/* ── Rating distribution ── */}
          {totalRatings > 0 && (
            <Section title="Rating distribution">
              <View style={[styles.distCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.distBars}>
                  {distribution.map((d) => {
                    const barH = Math.max(d.count > 0 ? 6 : 2, (d.count / maxDist) * 64);
                    const color =
                      d.score >= 9 ? colors.accent
                      : d.score >= 7 ? colors.positive
                      : d.score >= 5 ? colors.warning
                      : colors.negative;
                    return (
                      <View key={d.score} style={styles.distCol}>
                        <View style={styles.distBarContainer}>
                          <View
                            style={[
                              styles.distBar,
                              { height: barH, backgroundColor: color, opacity: d.count === 0 ? 0.15 : 1 },
                            ]}
                          />
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 4 }}>
                          {d.score}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Section>
          )}

          {/* ── Recently loved ── */}
          {recentlyLoved.length > 0 && (
            <Section title="Recently loved">
              <View style={styles.lovedGrid}>
                {recentlyLoved.map((r) => (
                  <LovedCell key={r.id} rating={r} />
                ))}
              </View>
            </Section>
          )}

          {/* ── My lists ── */}
          {lists.length > 0 && (
            <Section title="My lists">
              <View style={{ gap: spacing[2] }}>
                {lists.slice(0, 5).map((list) => (
                  <Pressable key={list.id} onPress={() => router.push(`/list/${list.id}`)}>
                    <View style={[styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" numberOfLines={1}>{list.title}</Text>
                        {list.description ? (
                          <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                            {list.description}
                          </Text>
                        ) : null}
                      </View>
                      {list.is_public ? <Badge label="Public" variant="neutral" /> : null}
                      <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
                    </View>
                  </Pressable>
                ))}
                {lists.length > 5 && (
                  <Pressable onPress={() => router.push('/(tabs)/lists')}>
                    <Text variant="caption" color="secondary" align="center">
                      View all {lists.length} lists
                    </Text>
                  </Pressable>
                )}
              </View>
            </Section>
          )}

          {/* ── Empty state ── */}
          {totalRatings === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40, textAlign: 'center' }}>◈</Text>
              <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
                Your profile starts here
              </Text>
              <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
                Rate tracks on Discover to build your taste profile.
              </Text>
              <View style={{ marginTop: spacing[4] }}>
                <Button
                  label="Start rating"
                  variant="primary"
                  size="md"
                  onPress={() => router.push('/(tabs)/discover')}
                />
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Artist sheet ── */}
      {selectedArtist && (
        <ArtistSheet
          artist={selectedArtist.artist}
          rank={selectedArtist.rank}
          tracks={getArtistTracks(ratings, selectedArtist.artist.name)}
          onClose={() => setSelectedArtist(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const MOOD_META: Record<string, { icon: string; color: string }> = {
  hype:   { icon: '⚡', color: '#B5FF4E' },
  bright: { icon: '☀', color: '#FACC15' },
  chill:  { icon: '〜', color: '#60A5FA' },
  moody:  { icon: '◆', color: '#A78BFA' },
  mixed:  { icon: '≈', color: '#FB923C' },
};

function TodayVibeCard({ status }: { status: DailyStatus }) {
  const { colors } = useTheme();

  if (status.state === 'none') {
    return (
      <Pressable
        onPress={() => router.push('/daily')}
        style={({ pressed }) => [
          styles.vibeCard,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.vibeIconBox, { backgroundColor: colors.accentDim }]}>
          <Text style={{ fontSize: 20 }}>✦</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">Start your daily queue</Text>
          <Text variant="caption" color="secondary">10 tracks · discover today's vibe</Text>
        </View>
        <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
      </Pressable>
    );
  }

  if (status.state === 'in_progress') {
    const pct = status.total > 0 ? status.rated / status.total : 0;
    return (
      <Pressable
        onPress={() => router.push('/daily')}
        style={({ pressed }) => [
          styles.vibeCard,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.vibeIconBox, { backgroundColor: colors.accentDim }]}>
          <Text style={{ fontSize: 20 }}>✦</Text>
        </View>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Text variant="bodyMedium">Daily queue in progress</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent, width: `${Math.round(pct * 100)}%` as any },
              ]}
            />
          </View>
          <Text variant="caption" color="secondary">
            {status.rated} / {status.total} rated
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
      </Pressable>
    );
  }

  // completed
  const moodKey = status.queue.mood ?? 'mixed';
  const meta = MOOD_META[moodKey] ?? MOOD_META.mixed;

  return (
    <Pressable
      onPress={() => router.push('/daily/playlist')}
      style={({ pressed }) => [
        styles.vibeCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.vibeIconBox, { backgroundColor: meta.color + '22' }]}>
        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium">Today's vibe</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View style={[styles.moodPill, { backgroundColor: meta.color }]}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#080808', letterSpacing: 0.8 }}>
              {moodKey.toUpperCase()}
            </Text>
          </View>
          {status.playlist && (
            <Text variant="caption" color="secondary">View playlist</Text>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="label" color="secondary">{title}</Text>
      {children}
    </View>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: highlight ? colors.accent : colors.text }}>
        {value}
      </Text>
      <Text variant="caption" color="secondary">{label}</Text>
    </View>
  );
}

function TasteMap({
  artists,
  onArtistPress,
}: {
  artists: ArtistCell[];
  onArtistPress: (artist: ArtistCell, rank: number) => void;
}) {
  const featured = artists[0];
  const midPair = artists.slice(1, 3);
  const bottomTrio = artists.slice(3, 6);

  return (
    <View style={{ gap: spacing[2] }}>
      {featured && (
        <ArtistFeaturedCell
          artist={featured}
          rank={1}
          onPress={() => onArtistPress(featured, 1)}
        />
      )}

      {midPair.length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {midPair.map((a, i) => (
            <ArtistMidCell
              key={a.name}
              artist={a}
              rank={i + 2}
              onPress={() => onArtistPress(a, i + 2)}
            />
          ))}
        </View>
      )}

      {bottomTrio.length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {bottomTrio.map((a, i) => (
            <ArtistMiniCell
              key={a.name}
              artist={a}
              rank={i + 4}
              onPress={() => onArtistPress(a, i + 4)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ArtistFeaturedCell({
  artist,
  rank,
  onPress,
}: {
  artist: ArtistCell;
  rank: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const strip = scoreColor(artist.avgScore, colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featuredCell,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {artist.imageUrl ? (
        <Image
          source={{ uri: artist.imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.22, borderRadius: radii.lg }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={[styles.rankBadge, { backgroundColor: strip }]}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#080808', letterSpacing: 0.3 }}>
          #{rank}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
          {artist.count} {artist.count === 1 ? 'track' : 'tracks'} · avg {artist.avgScore.toFixed(1)}
        </Text>
      </View>
      <View style={[styles.scoreStrip, styles.scoreStripLg, { backgroundColor: strip }]} />
    </Pressable>
  );
}

function ArtistMidCell({
  artist,
  rank,
  onPress,
}: {
  artist: ArtistCell;
  rank: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const strip = scoreColor(artist.avgScore, colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.midCell,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {artist.imageUrl ? (
        <Image
          source={{ uri: artist.imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.18, borderRadius: radii.md }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={[styles.rankBadgeSmall, { backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textSecondary }}>
          #{rank}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
          {artist.count} tracks
        </Text>
      </View>
      <View style={[styles.scoreStrip, styles.scoreStripMd, { backgroundColor: strip }]} />
    </Pressable>
  );
}

function ArtistMiniCell({
  artist,
  rank,
  onPress,
}: {
  artist: ArtistCell;
  rank: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const strip = scoreColor(artist.avgScore, colors);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniCell,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {artist.imageUrl ? (
        <Image
          source={{ uri: artist.imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.18, borderRadius: radii.sm }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }} numberOfLines={1}>
          #{rank}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {artist.name}
        </Text>
      </View>
      <View style={[styles.scoreStrip, styles.scoreStripSm, { backgroundColor: strip }]} />
    </Pressable>
  );
}

function LovedCell({ rating }: { rating: any }) {
  const { colors } = useTheme();
  const imageUrl = rating.items?.image_url;
  return (
    <View style={[styles.lovedCell, { backgroundColor: colors.surfaceElevated }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <View style={[styles.lovedBadge, { backgroundColor: colors.accent }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#080808' }}>
          {rating.score}
        </Text>
      </View>
    </View>
  );
}

// ─── Artist sheet ─────────────────────────────────────────────────────────────

function ArtistSheet({
  artist,
  rank,
  tracks,
  onClose,
}: {
  artist: ArtistCell;
  rank: number;
  tracks: any[];
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const strip = scoreColor(artist.avgScore, colors);

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sheet.root, { backgroundColor: colors.bg }]}>

        {/* Handle */}
        <View style={sheet.handleRow}>
          <View style={[sheet.handle, { backgroundColor: colors.borderStrong }]} />
        </View>

        {/* Artist header */}
        <View style={sheet.header}>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text
              style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6 }}
              numberOfLines={1}
            >
              {artist.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <View style={[sheet.rankPill, { backgroundColor: strip }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#080808', letterSpacing: 0.3 }}>
                  #{rank}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · avg {artist.avgScore.toFixed(1)}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={16} style={sheet.closeBtn}>
            <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={[sheet.divider, { backgroundColor: colors.border }]} />

        {/* Track list */}
        <FlatList
          data={tracks}
          keyExtractor={(r) => r.id}
          contentContainerStyle={sheet.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[sheet.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => <ArtistTrackRow rating={item} />}
        />
      </View>
    </Modal>
  );
}

function ArtistTrackRow({ rating }: { rating: any }) {
  const { colors } = useTheme();
  const badgeColor = scoreColor(rating.score, colors);
  const imageUrl = rating.items?.image_url;
  const name = rating.items?.name ?? 'Unknown';
  const artists: string[] = Array.isArray(rating.items?.artists_json)
    ? rating.items.artists_json
    : [];

  return (
    <View style={sheet.trackRow}>
      <View style={[sheet.artThumb, { backgroundColor: colors.surfaceElevated }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" numberOfLines={1}>{name}</Text>
        {artists.length > 0 && (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {artists.join(', ')}
          </Text>
        )}
      </View>

      <View style={[sheet.scoreBadge, { backgroundColor: badgeColor }]}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#080808' }}>
          {rating.score}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },

  personaRow: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  personaChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radii.full,
  },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing[4],
    marginHorizontal: spacing[5],
    marginBottom: spacing[2],
  },
  statDivider: { width: 1, marginVertical: spacing[1] },

  body: {
    padding: spacing[5],
    gap: spacing[7],
    paddingBottom: spacing[12],
  },

  // Taste Map cells
  featuredCell: {
    height: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[4],
    overflow: 'hidden',
    position: 'relative',
  },
  midCell: {
    width: HALF_W,
    height: 90,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing[3],
    overflow: 'hidden',
    position: 'relative',
  },
  miniCell: {
    width: THIRD_W,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing[2],
    overflow: 'hidden',
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  rankBadgeSmall: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  scoreStrip: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  scoreStripLg: { width: 4, borderTopRightRadius: radii.lg, borderBottomRightRadius: radii.lg },
  scoreStripMd: { width: 3, borderTopRightRadius: radii.md, borderBottomRightRadius: radii.md },
  scoreStripSm: { width: 3, borderTopRightRadius: radii.md, borderBottomRightRadius: radii.md },

  // Rating distribution
  distCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing[4],
    paddingBottom: spacing[3],
  },
  distBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  distCol: {
    flex: 1,
    alignItems: 'center',
  },
  distBarContainer: {
    height: 64,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  distBar: {
    width: '100%',
    borderRadius: radii.sm,
  },

  // Recently loved grid
  lovedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  lovedCell: {
    width: LOVED_CELL,
    height: LOVED_CELL,
    borderRadius: radii.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  lovedBadge: {
    margin: 4,
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Lists
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
  },

  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },

  // Today's vibe card
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  vibeIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    minWidth: 4,
  },
  moodPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
});

const sheet = StyleSheet.create({
  root: {
    flex: 1,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  rankPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  closeBtn: {
    paddingTop: spacing[1],
  },
  divider: {
    height: 1,
    marginHorizontal: spacing[5],
    marginBottom: spacing[1],
  },
  listContent: {
    paddingBottom: spacing[10],
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  artThumb: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  scoreBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: spacing[5] + 48 + spacing[3],
  },
});
