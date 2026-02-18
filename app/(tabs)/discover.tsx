/**
 * Discover — swipe/rate flow.
 * Fetches a batch of tracks, renders SwipeCard deck,
 * shows RatingControl after a right swipe.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { SwipeCard, type Track } from '@/components/SwipeCard';
import { RatingControl } from '@/components/RatingControl';
import { spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const VISIBLE_CARDS = 3;

// Mock data — replace with API call to /discover endpoint
const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    name: 'LOVE.',
    artists: ['Kendrick Lamar'],
    albumName: 'DAMN.',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b2731f609a9db1a2b01e16b99de6',
    spotifyId: '6PGoSes0D9eUDeeAafB2As',
  },
  {
    id: '2',
    name: 'Nights',
    artists: ['Frank Ocean'],
    albumName: 'Blonde',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
    spotifyId: '7eqoqGkKwgOaWNNHx90uEZ',
  },
  {
    id: '3',
    name: 'Pyramids',
    artists: ['Frank Ocean'],
    albumName: 'Channel Orange',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b2732fb3db3a9fe3a7f9ce58e1a2',
    spotifyId: '6U8NlOHMqtFCFpkrJjOBYo',
  },
  {
    id: '4',
    name: 'New Magic Wand',
    artists: ['Tyler, the Creator'],
    albumName: 'IGOR',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b27349a6d4df3b46a7e8a4af1b3e',
    spotifyId: '2FkN1KiHDU8XPBCHbR16fR',
  },
  {
    id: '5',
    name: 'Motion Picture Soundtrack',
    artists: ['Radiohead'],
    albumName: 'Kid A',
    imageUrl: 'https://i.scdn.co/image/ab67616d0000b273de3c04b5be6f86d3bede5e5c',
    spotifyId: '4HUkISmicNHqNaHh16SXKL',
  },
];

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingRating, setPendingRating] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);

  const currentTrack = tracks[currentIndex] ?? null;
  const visibleTracks = tracks.slice(currentIndex, currentIndex + VISIBLE_CARDS);

  function handleSwipeLeft() {
    // Skip — move to next card
    setCurrentIndex((i) => i + 1);
  }

  function handleSwipeRight() {
    // Like — prompt rating
    if (currentTrack) {
      setPendingRating(currentTrack);
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleRatingSubmit(score: number) {
    if (!pendingRating) return;

    // TODO: upsert rating to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // supabase.from('ratings').upsert({ user_id: user.id, item_id: pendingRating.id, score })
    }

    setPendingRating(null);
  }

  function handleRatingSkip() {
    setPendingRating(null);
  }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.5,
            }}
          >
            Discover
          </Text>
          <Pressable onPress={() => router.push('/settings')}>
            <Text style={{ fontSize: 20, color: colors.textSecondary }}>⚙</Text>
          </Pressable>
        </View>

        {/* Card deck or empty state */}
        {currentTrack ? (
          <View style={styles.deckArea}>
            {[...visibleTracks].reverse().map((track, reversedIndex) => {
              const stackIndex = visibleTracks.length - 1 - reversedIndex;
              return (
                <SwipeCard
                  key={track.id}
                  track={track}
                  index={stackIndex}
                  totalCards={visibleTracks.length}
                  onSwipeLeft={stackIndex === 0 ? handleSwipeLeft : () => {}}
                  onSwipeRight={stackIndex === 0 ? handleSwipeRight : () => {}}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={{ fontSize: 40, textAlign: 'center' }}
            >
              ◈
            </Text>
            <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
              You're all caught up
            </Text>
            <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
              Check back later for more tracks.
            </Text>
          </View>
        )}

        {/* Swipe hint */}
        {currentTrack && (
          <View style={styles.hint}>
            <Text variant="caption" color="tertiary">
              ← pass
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                textAlign: 'center',
              }}
            >
              Swipe to rate
            </Text>
            <Text variant="caption" color="tertiary">
              love →
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Rating sheet — slides up from bottom */}
      {pendingRating && (
        <View style={[styles.ratingOverlay, { backgroundColor: colors.scrim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleRatingSkip}
          />
          <View style={[styles.ratingSheet, { backgroundColor: colors.bg }]}>
            <RatingControl
              trackName={pendingRating.name}
              onSubmit={handleRatingSubmit}
              onSkip={handleRatingSkip}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  deckArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  hint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[4],
  },
  ratingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  ratingSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
});
