/**
 * Discover — swipe/rate flow.
 * Loads tracks from Spotify (top tracks + recommendations) if connected,
 * falls back to mock data otherwise.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SwipeCard, type Track } from '@/components/SwipeCard';
import { RatingControl } from '@/components/RatingControl';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import {
  getStoredSpotifyToken,
  fetchTopTracks,
  fetchTopArtistIds,
  fetchRecommendations,
} from '@/lib/spotify';
import { fetchDeezerPreview, fetchDeezerGenres } from '@/lib/deezer';

const { width, height } = Dimensions.get('window');
const VISIBLE_CARDS = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fallback tracks used when Spotify isn't connected — shuffled each load
const FALLBACK_TRACKS: Track[] = [
  { id: '1',  name: 'LOVE.',                    artists: ['Kendrick Lamar'],        albumName: 'DAMN.',           imageUrl: 'https://i.scdn.co/image/ab67616d0000b2731f609a9db1a2b01e16b99de6', spotifyId: '6PGoSes0D9eUDeeAafB2As' },
  { id: '2',  name: 'Nights',                   artists: ['Frank Ocean'],            albumName: 'Blonde',          imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526', spotifyId: '7eqoqGkKwgOaWNNHx90uEZ' },
  { id: '3',  name: 'Pyramids',                 artists: ['Frank Ocean'],            albumName: 'Channel Orange',  imageUrl: 'https://i.scdn.co/image/ab67616d0000b2732fb3db3a9fe3a7f9ce58e1a2', spotifyId: '6U8NlOHMqtFCFpkrJjOBYo' },
  { id: '4',  name: 'New Magic Wand',           artists: ['Tyler, the Creator'],     albumName: 'IGOR',            imageUrl: 'https://i.scdn.co/image/ab67616d0000b27349a6d4df3b46a7e8a4af1b3e', spotifyId: '2FkN1KiHDU8XPBCHbR16fR' },
  { id: '5',  name: 'Motion Picture Soundtrack',artists: ['Radiohead'],              albumName: 'Kid A',           imageUrl: 'https://i.scdn.co/image/ab67616d0000b273de3c04b5be6f86d3bede5e5c', spotifyId: '4HUkISmicNHqNaHh16SXKL' },
  { id: '6',  name: 'Self Control',             artists: ['Frank Ocean'],            albumName: 'Blonde',          imageUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526', spotifyId: '7LESsgx6COXN43WWEMivGm' },
  { id: '7',  name: 'All The Stars',            artists: ['Kendrick Lamar', 'SZA'], albumName: 'Black Panther',   imageUrl: 'https://i.scdn.co/image/ab67616d0000b273b2d5b8e5bfcdbf1c4c5e8f7e', spotifyId: '6rqqwtrorwMkBPKjMuD6yv' },
  { id: '8',  name: 'The Less I Know The Better',artists: ['Tame Impala'],          albumName: 'Currents',        imageUrl: 'https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d2e', spotifyId: '6K4t31amVTZDgR3sKmwUJJ' },
  { id: '9',  name: 'When I Get Home',          artists: ['SZA'],                    albumName: 'SOS',             imageUrl: 'https://i.scdn.co/image/ab67616d0000b273e346d2b3e18db3e2ecd6ea9f', spotifyId: '0NMoNWynm9F6TYVXVFCMS0' },
  { id: '10', name: 'R.A.P. Music',             artists: ['Killer Mike'],            albumName: 'R.A.P. Music',    imageUrl: 'https://i.scdn.co/image/ab67616d0000b2737c6f60e18de1fb1d2b66e3eb', spotifyId: '7hQJA50XrCWABAu5v6QZ4i' },
  { id: '11', name: 'Peaches',                  artists: ['Justin Bieber'],          albumName: 'Justice',         imageUrl: 'https://i.scdn.co/image/ab67616d0000b273e6f407c7f3a0ec98845e4431', spotifyId: '4iZ4pt7kvcaH6Yo8UoZ4s2' },
  { id: '12', name: 'good 4 u',                 artists: ['Olivia Rodrigo'],         albumName: 'SOUR',            imageUrl: 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', spotifyId: '4ZtFanR9U6ndgddUvNcjcG' },
  { id: '13', name: 'Blinding Lights',          artists: ['The Weeknd'],             albumName: 'After Hours',     imageUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', spotifyId: '0VjIjW4GlUZAMYd2vXMi3b' },
  { id: '14', name: 'drivers license',          artists: ['Olivia Rodrigo'],         albumName: 'SOUR',            imageUrl: 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', spotifyId: '5wANPM4fQCJwkW0ne1F0VQ' },
  { id: '15', name: 'Ghost Town',               artists: ['Kanye West'],             albumName: 'ye',              imageUrl: 'https://i.scdn.co/image/ab67616d0000b273ac5f1a49a4cde2e96c15b5d1', spotifyId: '0OHNnSRPR5IFI6KVnrZUFf' },
  { id: '16', name: 'Moon',                     artists: ['Kanye West'],             albumName: 'Donda',           imageUrl: 'https://i.scdn.co/image/ab67616d0000b2737aa3d8f8f84c4c2e3f00a7d8', spotifyId: '6MIqnFJBfEdF0P03JO6b8N' },
  { id: '17', name: 'Phoebe Bridgers',          artists: ['Funeral'],               albumName: 'Punisher',        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273a3d36ef6a04e70ff48f36b44', spotifyId: '1RXFFMtRLPRgZs3thTfFoX' },
  { id: '18', name: 'Motion',                   artists: ['Bryson Tiller'],          albumName: 'TRAPSOUL',        imageUrl: 'https://i.scdn.co/image/ab67616d0000b27379538be1b7bd6a3cef8ee26f', spotifyId: '1AHO8Tkuk9D2N56vTQ8wgx' },
  { id: '19', name: 'Murder on My Mind',        artists: ['YNW Melly'],             albumName: 'I Am You',        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273b6cb3dff47ed9617f9e70d77', spotifyId: '4SqWfbHDCbF3H0h1PnboBT' },
  { id: '20', name: 'Apocalypse Dreams',        artists: ['Tame Impala'],            albumName: 'Lonerism',        imageUrl: 'https://i.scdn.co/image/ab67616d0000b273ad91e7e46a80a6def4a5a02a', spotifyId: '5M2dJJMEzLCM2TSuNKCzV7' },
];

type RatedTrack = {
  track: Track;
  itemId: string;
  score: number;
};

type UserList = {
  id: string;
  title: string;
};

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRating, setPendingRating] = useState<Track | null>(null);
  const [ratedTrack, setRatedTrack] = useState<RatedTrack | null>(null);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingSpotify, setUsingSpotify] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const currentTrack = tracks[currentIndex] ?? null;
  const visibleTracks = tracks.slice(currentIndex, currentIndex + VISIBLE_CARDS);

  useEffect(() => {
    loadTracks();
  }, []);

  // Stop audio when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => { stopAudio(); };
    }, [])
  );

  // Pre-warm the Deezer cache for the next 3 tracks so playback starts instantly
  useEffect(() => {
    if (tracks.length === 0) return;
    tracks.slice(currentIndex + 1, currentIndex + 4).forEach((t) => {
      fetchDeezerPreview(t.name, t.artists[0] ?? '');
    });
  }, [currentIndex, tracks]);

  // Auto-play preview when the current track changes (if preview is enabled)
  useEffect(() => {
    if (!previewEnabled || !currentTrack) return;
    fetchDeezerPreview(currentTrack.name, currentTrack.artists[0] ?? '').then((url) => {
      if (url) playPreview(url);
      else stopAudio();
    });
  }, [currentTrack?.id, previewEnabled]);

  async function stopAudio() {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
  }

  async function playPreview(url: string) {
    await stopAudio();
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  async function togglePreviewEnabled() {
    if (previewEnabled) {
      await stopAudio();
      setPreviewEnabled(false);
    } else {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      setPreviewEnabled(true);
    }
  }

  async function loadTracks() {
    setLoading(true);
    try {
      const token = await getStoredSpotifyToken();

      if (!token) {
        setTracks(shuffle(FALLBACK_TRACKS));
        setUsingSpotify(false);
        setLoading(false);
        return;
      }

      // Get IDs of tracks the user has already rated
      const { data: { user } } = await supabase.auth.getUser();
      let ratedSpotifyIds = new Set<string>();

      if (user) {
        const { data: ratedItems } = await supabase
          .from('ratings')
          .select('items(spotify_id)')
          .eq('user_id', user.id);

        for (const r of ratedItems ?? []) {
          const sid = (r.items as any)?.spotify_id;
          if (sid) ratedSpotifyIds.add(sid);
        }
      }

      // Fetch top tracks + recommendations in parallel
      const [topTracks, topArtistIds] = await Promise.all([
        fetchTopTracks(token, 50),
        fetchTopArtistIds(token, 5),
      ]);

      const recs = topArtistIds.length > 0
        ? await fetchRecommendations(token, topArtistIds, 30)
        : [];

      // Merge, dedupe, filter already-rated + tracks with no artwork
      const seen = new Set<string>();
      const allTracks: Track[] = [];

      for (const t of [...topTracks, ...recs]) {
        if (!seen.has(t.id) && !ratedSpotifyIds.has(t.id) && t.imageUrl) {
          seen.add(t.id);
          allTracks.push({
            id: t.id,
            name: t.name,
            artists: t.artists,
            artistIds: t.artistIds,
            albumName: t.albumName,
            imageUrl: t.imageUrl,
            spotifyId: t.id,
            previewUrl: t.previewUrl ?? undefined,
          });
        }
      }

      if (allTracks.length > 0) {
        setTracks(shuffle(allTracks));
        setUsingSpotify(true);
      } else {
        // Token valid but no unrated tracks left
        setTracks([]);
        setUsingSpotify(true);
      }
    } catch (e) {
      console.error('Failed to load tracks', e);
      setTracks(shuffle(FALLBACK_TRACKS));
      setUsingSpotify(false);
    } finally {
      setLoading(false);
    }
  }

  // Load user lists when the add-to-list step becomes visible
  useEffect(() => {
    if (!ratedTrack) return;
    setListsLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setListsLoading(false); return; }
      supabase
        .from('lists')
        .select('id, title')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setUserLists(data ?? []);
          setListsLoading(false);
        });
    });
  }, [ratedTrack]);

  function handleSwipeLeft() {
    setCurrentIndex((i) => i + 1);
  }

  function handleSwipeRight() {
    if (currentTrack) {
      setPendingRating(currentTrack);
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleRatingSubmit(score: number) {
    if (!pendingRating) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { dismissSheet(); return; }

    // 1. Upsert track into items cache (with genres from Deezer)
    const genres = await fetchDeezerGenres(
      pendingRating.name,
      pendingRating.artists[0] ?? '',
    );

    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .upsert({
        spotify_id: pendingRating.spotifyId,
        type: 'track',
        name: pendingRating.name,
        image_url: pendingRating.imageUrl,
        preview_url: pendingRating.previewUrl ?? null,
        artists_json: pendingRating.artists,
        genres_json: genres,
        raw_json: {},
      }, { onConflict: 'spotify_id,type' })
      .select('id')
      .single();

    if (itemError || !itemData) {
      console.error('Failed to save track to items:', itemError?.message);
      Alert.alert('Save failed', 'Could not save this track. Please try again.');
      dismissSheet();
      return;
    }

    // 2. Upsert rating
    const { error: ratingError } = await supabase.from('ratings').upsert({
      user_id: user.id,
      item_id: itemData.id,
      score,
    }, { onConflict: 'user_id,item_id' });

    if (ratingError) {
      console.error('Failed to save rating:', ratingError.message);
      Alert.alert('Save failed', 'Could not save your rating. Please try again.');
      dismissSheet();
      return;
    }

    // 3. Transition to "add to list" step
    setPendingRating(null);
    setRatedTrack({ track: pendingRating, itemId: itemData.id, score });
  }

  async function handleAddToList(listId: string) {
    if (!ratedTrack) return;
    setAddingToList(listId);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('list_items').upsert({
        list_id: listId,
        item_id: ratedTrack.itemId,
        added_by: user.id,
      }, { onConflict: 'list_id,item_id' });
    }

    setAddingToList(null);
    dismissSheet();
  }

  async function handleRefresh() {
    setRefreshing(true);
    setCurrentIndex(0);
    await loadTracks();
    setRefreshing(false);
  }

  function dismissSheet() {
    setPendingRating(null);
    setRatedTrack(null);
    setUserLists([]);
  }

  const sheetVisible = pendingRating !== null || ratedTrack !== null;

  if (loading) {
    return <DiscoverSkeleton />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
              Discover
            </Text>
            {usingSpotify && (
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>
                from your Spotify
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            <Pressable onPress={togglePreviewEnabled} hitSlop={12}>
              <Text style={{
                fontSize: 18,
                color: previewEnabled ? colors.accent : colors.textTertiary,
                opacity: previewEnabled ? 1 : 0.6,
              }}>♪</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/settings')}>
              <Text style={{ fontSize: 20, color: colors.textSecondary }}>⚙</Text>
            </Pressable>
          </View>
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
                  isPlaying={stackIndex === 0 && previewEnabled && isPlaying}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>◈</Text>
            <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
              {usingSpotify ? "You're all caught up" : 'Demo tracks'}
            </Text>
            <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
              {usingSpotify
                ? "You've rated everything we found. Refresh for a new batch."
                : 'Connect Spotify in Settings for a personalised feed.'}
            </Text>
            <View style={{ marginTop: spacing[5], gap: spacing[3], alignItems: 'center' }}>
              <Button
                label={refreshing ? 'Loading…' : 'Shuffle again'}
                variant="primary"
                size="md"
                loading={refreshing}
                onPress={handleRefresh}
              />
              {!usingSpotify && (
                <Button
                  label="Connect Spotify"
                  variant="secondary"
                  size="md"
                  onPress={() => router.push('/settings')}
                />
              )}
            </View>
          </View>
        )}

        {/* Swipe hint */}
        {currentTrack && (
          <View style={styles.hint}>
            <Text variant="caption" color="tertiary">← pass</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>
              Swipe to rate
            </Text>
            <Text variant="caption" color="tertiary">love →</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Rating / add-to-list sheet */}
      {sheetVisible && (
        <View style={[styles.ratingOverlay, { backgroundColor: colors.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} />
          <View style={[styles.ratingSheet, { backgroundColor: colors.bg }]}>

            {/* Phase 1: Rate */}
            {pendingRating && (
              <RatingControl
                trackName={pendingRating.name}
                onSubmit={handleRatingSubmit}
                onSkip={dismissSheet}
              />
            )}

            {/* Phase 2: Add to list */}
            {ratedTrack && (
              <View style={styles.addToList}>
                {/* Confirmation */}
                <View style={styles.ratedConfirm}>
                  <Text variant="label" color="secondary" align="center">Rated</Text>
                  <Text
                    style={{ fontSize: 42, fontWeight: '900', color: colors.text, textAlign: 'center', lineHeight: 48 }}
                  >
                    {ratedTrack.score}
                    <Text style={{ fontSize: 20, color: colors.textSecondary }}>/10</Text>
                  </Text>
                  <Text variant="title" align="center" numberOfLines={1}>
                    {ratedTrack.track.name}
                  </Text>
                </View>

                {/* List picker */}
                <View style={styles.listPickerHeader}>
                  <Text variant="label" color="secondary">Save to a list</Text>
                </View>

                {listsLoading ? (
                  <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing[4] }} />
                ) : userLists.length === 0 ? (
                  <Text variant="body" color="tertiary" align="center" style={{ marginVertical: spacing[3] }}>
                    No lists yet — create one in the Lists tab.
                  </Text>
                ) : (
                  <FlatList
                    data={userLists}
                    keyExtractor={(l) => l.id}
                    scrollEnabled={userLists.length > 4}
                    style={{ maxHeight: 200 }}
                    ItemSeparatorComponent={() => (
                      <View style={[styles.listSep, { backgroundColor: colors.border }]} />
                    )}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.listRow}
                        onPress={() => handleAddToList(item.id)}
                        disabled={addingToList !== null}
                      >
                        <Text variant="bodyMedium" style={{ flex: 1 }}>{item.title}</Text>
                        {addingToList === item.id
                          ? <ActivityIndicator size="small" color={colors.accent} />
                          : <Text style={{ fontSize: 18, color: colors.accent }}>+</Text>
                        }
                      </Pressable>
                    )}
                  />
                )}

                <View style={{ marginTop: spacing[3] }}>
                  <Button
                    label="Done"
                    variant="ghost"
                    size="md"
                    fullWidth
                    onPress={dismissSheet}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DiscoverSkeleton() {
  const { colors } = useTheme();
  const cardW = width - spacing[5] * 2;
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ gap: 5 }}>
            <Skeleton width={90} height={24} />
          </View>
          <Skeleton width={22} height={22} borderRadius={11} />
        </View>

        {/* Card placeholder */}
        <View style={styles.deckArea}>
          <Skeleton width={cardW} height={cardW * 1.25} borderRadius={radii['2xl']} />
        </View>

        {/* Hint row */}
        <View style={styles.hint}>
          <Skeleton width={48} height={12} />
          <Skeleton width={72} height={12} />
          <Skeleton width={48} height={12} />
        </View>
      </SafeAreaView>
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
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  // Add to list phase
  addToList: {
    gap: spacing[2],
  },
  ratedConfirm: {
    alignItems: 'center',
    gap: spacing[1],
    paddingBottom: spacing[3],
  },
  listPickerHeader: {
    paddingBottom: spacing[2],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  listSep: {
    height: 1,
  },
});
