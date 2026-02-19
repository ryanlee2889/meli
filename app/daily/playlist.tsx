/**
 * Daily Playlist — your vibe for today, distilled.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing, radii } from '@/theme';
import { getTodayPlaylist, type DailyPlaylist, type DailyPlaylistItem } from '@/lib/dailyApi';

// ─── Mood config ─────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; description: string }
> = {
  hype: {
    label: 'HYPE',
    icon: '⚡',
    color: '#B5FF4E',
    description: "High energy, high vibes — you're in full power mode today.",
  },
  bright: {
    label: 'BRIGHT',
    icon: '☀',
    color: '#FACC15',
    description: "Positive energy, steady groove — a good day by any measure.",
  },
  chill: {
    label: 'CHILL',
    icon: '〜',
    color: '#60A5FA',
    description: "Calm, introspective, unhurried — you needed a breath today.",
  },
  moody: {
    label: 'MOODY',
    icon: '◆',
    color: '#A78BFA',
    description: "Dark energy, complex feelings — music as emotional mirror.",
  },
  mixed: {
    label: 'MIXED',
    icon: '≈',
    color: '#FB923C',
    description: "All over the map — that's a full spectrum kind of day.",
  },
};

function getMoodConfig(mood: string) {
  return MOOD_CONFIG[mood] ?? MOOD_CONFIG.mixed;
}

// ─── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 9) return '#B5FF4E';
  if (score >= 7) return '#4ADE80';
  if (score >= 5) return '#FB923C';
  return '#F87171';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DailyPlaylistScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<DailyPlaylist | null>(null);
  const [items, setItems] = useState<DailyPlaylistItem[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const result = await getTodayPlaylist();
    if (result) {
      setPlaylist(result.playlist);
      setItems(result.items);
    }
    setLoading(false);
  }

  function handleDone() {
    router.replace('/(tabs)/profile');
  }

  function handleExportSpotify() {
    Alert.alert('Coming soon', 'Export to Spotify playlist will be available in a future update.');
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── No playlist yet ───────────────────────────────────────────────────────

  if (!playlist) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>◎</Text>
          <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
            Queue not finished yet
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            style={{ marginTop: spacing[2], paddingHorizontal: spacing[6] }}
          >
            Rate all tracks to unlock your daily playlist.
          </Text>
          <View style={{ marginTop: spacing[5] }}>
            <Button
              label="Back to queue"
              variant="primary"
              size="md"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const mood = getMoodConfig(playlist.mood);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={{ fontSize: 13, color: colors.textTertiary, letterSpacing: 0.4 }}>
          TODAY'S PLAYLIST
        </Text>
        <Pressable onPress={handleDone} hitSlop={12}>
          <Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '600' }}>Done</Text>
        </Pressable>
      </View>

      {/* ── Mood Banner ── */}
      <View style={[styles.moodBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={{ fontSize: 48, lineHeight: 56 }}>{mood.icon}</Text>
        <View style={{ flex: 1, gap: spacing[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <View style={[styles.moodPill, { backgroundColor: mood.color }]}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#080808', letterSpacing: 1 }}>
                {mood.label}
              </Text>
            </View>
            <Text variant="caption" color="tertiary">Your vibe today</Text>
          </View>
          <Text
            variant="caption"
            color="secondary"
            style={{ lineHeight: 17 }}
          >
            {mood.description}
          </Text>
        </View>
      </View>

      {/* ── Track List ── */}
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text
              variant="label"
              color="secondary"
              style={{ marginBottom: spacing[3] }}
            >
              {items.length} {items.length === 1 ? 'track' : 'tracks'} · scored 7+
            </Text>
          }
          ListFooterComponent={
            <View style={{ marginTop: spacing[6] }}>
              <Button
                label="Export to Spotify"
                variant="outline"
                size="md"
                onPress={handleExportSpotify}
              />
            </View>
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item, index }) => (
            <PlaylistTrackRow item={item} position={index + 1} />
          )}
        />
      ) : (
        <View style={styles.center}>
          <Text style={{ fontSize: 32, textAlign: 'center' }}>〜</Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            style={{ marginTop: spacing[3], paddingHorizontal: spacing[6] }}
          >
            No tracks scored 7 or above today. That's okay — tomorrow's a new queue.
          </Text>
          <View style={{ marginTop: spacing[5] }}>
            <Button label="Done" variant="primary" size="md" onPress={handleDone} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function PlaylistTrackRow({
  item,
  position,
}: {
  item: DailyPlaylistItem;
  position: number;
}) {
  const { colors } = useTheme();
  const name = item.item?.name ?? 'Unknown';
  const artists: string[] = Array.isArray(item.item?.artists_json)
    ? item.item.artists_json
    : [];
  const imageUrl = item.item?.image_url;
  const badgeBg = scoreColor(item.score);

  return (
    <View style={styles.trackRow}>
      <Text
        style={{
          width: 20,
          fontSize: 13,
          color: colors.textTertiary,
          textAlign: 'right',
          fontWeight: '600',
        }}
      >
        {position}
      </Text>

      <View style={[styles.artThumb, { backgroundColor: colors.surfaceElevated }]}>
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

      <View style={[styles.scoreBadge, { backgroundColor: badgeBg }]}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#080808' }}>
          {item.score}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },

  moodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    padding: spacing[5],
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  moodPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radii.full,
  },

  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[12],
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
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
    marginLeft: 20 + spacing[3] + 48 + spacing[3],
  },
});
