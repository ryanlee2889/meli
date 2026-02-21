/**
 * Daily Queue — rate 10 tracks, discover your day's vibe.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { RatingControl } from '@/components/RatingControl';
import { MusicNotes } from '@/components/MusicNotes';
import { spacing, radii } from '@/theme';
import {
  ensureDailyQueue,
  getTodayQueue,
  rateDailyItem,
  skipDailyItem,
  type DailyQueueItem,
  type DailyQueue,
} from '@/lib/dailyApi';
import { getStoredSpotifyToken } from '@/lib/spotify';
import { fetchDeezerPreview } from '@/lib/deezer';

const { width } = Dimensions.get('window');
const ART_SIZE = width - spacing[5] * 2;

export default function DailyQueueScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<DailyQueue | null>(null);
  const [items, setItems] = useState<DailyQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  // null = no error, 'no_token' = not connected, 'build_failed' = connected but queue failed
  const [queueError, setQueueError] = useState<'no_token' | 'build_failed' | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadQueue();
      return () => {
        // Stop audio when leaving screen
        soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlaying(false);
      };
    }, [])
  );

  // Auto-play preview whenever the current item changes
  useEffect(() => {
    if (!currentItem) return;
    let cancelled = false;
    const item = currentItem.item;
    const artists: string[] = Array.isArray(item?.artists_json) ? item.artists_json : [];

    setPreviewLoading(true);
    fetchDeezerPreview(item?.name ?? '', artists[0] ?? '').then(async (url) => {
      if (cancelled || !url) { setPreviewLoading(false); return; }
      await stopAudio();
      if (cancelled) return;
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, isLooping: true }
        );
        if (cancelled) { sound.unloadAsync(); return; }
        soundRef.current = sound;
        setPlaying(true);
      } catch {
        setPlaying(false);
      } finally {
        setPreviewLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [currentItem?.id]);

  async function loadQueue() {
    setLoading(true);
    setQueueError(null);
    setQueue(null);
    setItems([]);
    try {
      // Configure audio session
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      let result = await getTodayQueue();

      if (!result) {
        // First time today — build the queue
        result = await ensureDailyQueue();
      }

      if (!result) {
        // Check the actual token — auto-refreshes if a refresh token exists.
        // If we still get null here the user genuinely needs to reconnect.
        const token = await getStoredSpotifyToken();
        setQueueError(token ? 'build_failed' : 'no_token');
        setLoading(false);
        return;
      }

      setQueue(result.queue);

      // If already completed today, go straight to playlist
      if (result.queue.completed_at) {
        router.replace('/daily/playlist');
        return;
      }

      // Find first unrated, non-skipped item
      const firstPending = result.items.findIndex(
        (i) => i.score === null && !i.skipped
      );
      setItems(result.items);
      setCurrentIndex(firstPending >= 0 ? firstPending : result.items.length);
    } catch (err) {
      Alert.alert('Error', 'Could not load your daily queue. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const currentItem = items[currentIndex] ?? null;
  const totalItems = items.length;
  const doneCount = items.filter((i) => i.score !== null || i.skipped).length;

  async function stopAudio() {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlaying(false);
    setPreviewLoading(false);
  }

  async function togglePreview() {
    if (!currentItem) return;

    // If audio already loaded, just toggle pause/play
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
        return;
      } else if (status.isLoaded) {
        await soundRef.current.playAsync();
        setPlaying(true);
        return;
      }
    }

    // Fetch preview from Deezer (Spotify no longer provides preview_url for new apps)
    const item = currentItem.item;
    const artists: string[] = Array.isArray(item?.artists_json) ? item.artists_json : [];
    setPreviewLoading(true);
    const previewUrl = await fetchDeezerPreview(item?.name ?? '', artists[0] ?? '');
    setPreviewLoading(false);

    if (!previewUrl) return;

    await stopAudio();
    const { sound } = await Audio.Sound.createAsync(
      { uri: previewUrl },
      { shouldPlay: true, isLooping: true }
    );
    soundRef.current = sound;
    setPlaying(true);
  }

  async function handleSubmit(score: number) {
    if (!currentItem || submitting) return;
    setSubmitting(true);
    await stopAudio();

    const result = await rateDailyItem(currentItem.id, currentItem.item_id, score);

    if (result === null) {
      Alert.alert('Error', 'Could not save rating. Try again.');
      setSubmitting(false);
      return;
    }

    advanceOrFinish(result?.playlist != null);
    setSubmitting(false);
  }

  async function handleSkip() {
    if (!currentItem || submitting) return;
    setSubmitting(true);
    await stopAudio();
    const result = await skipDailyItem(currentItem.id);
    advanceOrFinish(result?.playlist != null);
    setSubmitting(false);
  }

  function advanceOrFinish(playlistReady: boolean) {
    // Find next unrated non-skipped item
    const nextIndex = items.findIndex(
      (item, i) => i > currentIndex && item.score === null && !item.skipped
    );

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    } else if (playlistReady) {
      router.push('/daily/playlist');
    } else {
      // All done — reload to check if playlist was generated
      router.push('/daily/playlist');
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return <DailyQueueSkeleton />;
  }

  // ── No Spotify / no queue ─────────────────────────────────────────────────

  if (!queue || !items.length) {
    const noToken = queueError === 'no_token';
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.emptyHeader}>
          <Button
            label="← Back"
            variant="ghost"
            size="sm"
            onPress={() => router.replace('/(tabs)/profile')}
          />
        </View>
        <View style={styles.loadingCenter}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>✦</Text>
          <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
            {noToken ? 'Connect Spotify first' : "Couldn't build your queue"}
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            style={{ marginTop: spacing[2], paddingHorizontal: spacing[6] }}
          >
            {noToken
              ? 'Daily queues are built from your Spotify listening history.'
              : "We weren't able to pull tracks from Spotify. This can happen if your listening history is sparse or Spotify had a hiccup."}
          </Text>
          <View style={{ marginTop: spacing[5], gap: spacing[3] }}>
            {noToken ? (
              <Button
                label="Connect Spotify"
                variant="primary"
                size="md"
                onPress={() => router.push('/onboarding')}
              />
            ) : (
              <Button
                label="Try again"
                variant="primary"
                size="md"
                onPress={() => {
                  setQueueError(null);
                  loadQueue();
                }}
              />
            )}
            <Button
              label="Go to settings"
              variant="secondary"
              size="md"
              onPress={() => router.push('/settings')}
            />
            <Button
              label="Back to app"
              variant="ghost"
              size="md"
              onPress={() => router.replace('/(tabs)/profile')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── All done (shouldn't normally reach, router.push handles it) ──────────

  if (!currentItem) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loadingCenter}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>◎</Text>
          <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
            Queue complete
          </Text>
          <View style={{ marginTop: spacing[5] }}>
            <Button
              label="View playlist"
              variant="primary"
              size="md"
              onPress={() => router.push('/daily/playlist')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const trackName = currentItem.item?.name ?? 'Unknown';
  const artists: string[] = Array.isArray(currentItem.item?.artists_json)
    ? currentItem.item.artists_json
    : [];
  const imageUrl = currentItem.item?.image_url;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
            Daily
          </Text>
          <Text variant="caption" color="secondary">
            {doneCount} / {totalItems} rated
          </Text>
        </View>
        <ProgressDots total={totalItems} done={doneCount} current={currentIndex} colors={colors} />
        <Pressable onPress={() => router.replace('/(tabs)/profile')} hitSlop={12}>
          <Text style={{ fontSize: 15, color: colors.textTertiary, fontWeight: '500' }}>✕</Text>
        </Pressable>
      </View>

      {/* ── Album Art ── */}
      <View style={styles.artContainer}>
        <View style={{ position: 'relative' }}>
        {playing && <MusicNotes />}
        <View style={[styles.artCard, { backgroundColor: colors.surfaceElevated }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* Gradient overlay for text legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
          />

          {/* Track info */}
          <View style={styles.artInfo}>
            <Text
              style={{ fontSize: 22, fontWeight: '800', color: '#F2F2F2', lineHeight: 26 }}
              numberOfLines={2}
            >
              {trackName}
            </Text>
            <Text
              style={{ fontSize: 14, color: 'rgba(242,242,242,0.75)', marginTop: 3 }}
              numberOfLines={1}
            >
              {artists.join(', ')}
            </Text>
          </View>

        </View>
        </View>
      </View>

      {/* ── Rating ── */}
      <View style={styles.ratingContainer}>
        <RatingControl
          trackName={trackName}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          previewPlaying={playing}
          previewLoading={previewLoading}
          onTogglePreview={togglePreview}
        />
      </View>

    </SafeAreaView>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DailyQueueSkeleton() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ gap: 5 }}>
          <Skeleton width={52} height={20} />
          <Skeleton width={80} height={13} />
        </View>
        <View style={styles.dotsRow}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width={6} height={6} borderRadius={3} />
          ))}
        </View>
        <Skeleton width={16} height={16} borderRadius={8} />
      </View>

      {/* Album art placeholder */}
      <View style={styles.artContainer}>
        <Skeleton width={ART_SIZE} height={ART_SIZE * 0.78} borderRadius={radii['2xl']} />
      </View>

      {/* Rating control placeholder */}
      <View style={[styles.ratingContainer, { gap: spacing[4] }]}>
        <Skeleton width={160} height={22} style={{ alignSelf: 'center' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[2] }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width={28} height={44} borderRadius={radii.md} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <Skeleton width="48%" height={48} borderRadius={radii.xl} />
          <Skeleton width="48%" height={48} borderRadius={radii.xl} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Progress Dots ──────────────────────────────────────────────────────────

function ProgressDots({
  total,
  done,
  current,
  colors,
}: {
  total: number;
  done: number;
  current: number;
  colors: any;
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => {
        const item_done = i < done;
        const is_current = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: item_done
                  ? colors.accent
                  : is_current
                  ? colors.text
                  : colors.border,
                opacity: is_current ? 1 : item_done ? 0.85 : 0.35,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  emptyHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },

  loadingCenter: {
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
    paddingBottom: spacing[2],
  },

  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  artContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  artCard: {
    width: ART_SIZE,
    height: ART_SIZE * 0.78,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  artInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
  },
  ratingContainer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    flex: 1,
  },
});
