/**
 * Onboarding — Connect Spotify or pick seed artists.
 * One-time flow after waitlist is cleared.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

const SEED_ARTISTS = [
  'Kendrick Lamar', 'Frank Ocean', 'Radiohead', 'Beyoncé',
  'Tyler, the Creator', 'Bon Iver', 'SZA', 'Arctic Monkeys',
  'Kanye West', 'Lana Del Rey', 'Mac Miller', 'J. Cole',
  'Phoebe Bridgers', 'The Weeknd', 'Billie Eilish', 'JPEGMAFIA',
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);

  const spotifyClientId = Constants.expoConfig?.extra?.spotifyClientId as string;
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'vibecheck', path: 'spotify-callback' });

  async function connectSpotify() {
    setSpotifyConnecting(true);
    const state = Math.random().toString(36).substring(2);

    const authUrl =
      `https://accounts.spotify.com/authorize?` +
      new URLSearchParams({
        client_id: spotifyClientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'user-top-read user-read-recently-played user-library-read',
        state,
      }).toString();

    // Opens in system browser; deep link vibecheck://spotify-callback handles the return
    await WebBrowser.openBrowserAsync(authUrl);
    setSpotifyConnecting(false);
  }

  function toggleArtist(artist: string) {
    setSelectedArtists((prev) =>
      prev.includes(artist) ? prev.filter((a) => a !== artist) : [...prev, artist]
    );
  }

  function handleContinue() {
    // Save seed artists if any, then push to tabs
    router.replace('/(tabs)/discover');
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.8,
            }}
          >
            Set up your taste
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
            Connect Spotify to pull in your listening history, or pick a few artists to get started.
          </Text>
        </View>

        {/* Spotify card */}
        <Card gap={spacing[4]}>
          <View style={styles.spotifyHeader}>
            {/* Spotify-coloured dot */}
            <View style={[styles.spotifyDot, { backgroundColor: '#1DB954' }]} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Connect Spotify</Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Pulls your top artists and recent plays automatically.
              </Text>
            </View>
            <Badge label="Recommended" variant="accent" />
          </View>

          <Button
            label={spotifyConnecting ? 'Opening…' : 'Connect Spotify'}
            variant="primary"
            fullWidth
            loading={spotifyConnecting}
            onPress={connectSpotify}
          />
        </Card>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text variant="caption" color="tertiary" style={{ paddingHorizontal: spacing[3] }}>
            OR
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Seed artists */}
        <View>
          <Text variant="title" style={{ marginBottom: spacing[3] }}>
            Pick artists you like
          </Text>
          <View style={styles.artistGrid}>
            {SEED_ARTISTS.map((artist) => {
              const selected = selectedArtists.includes(artist);
              return (
                <Pressable key={artist} onPress={() => toggleArtist(artist)}>
                  <View
                    style={[
                      styles.artistChip,
                      {
                        backgroundColor: selected ? colors.accent : colors.surfaceElevated,
                        borderColor: selected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: selected ? colors.accentText : colors.text,
                      }}
                    >
                      {artist}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Continue */}
        <Button
          label={selectedArtists.length > 0 ? `Continue with ${selectedArtists.length} artists` : 'Skip for now'}
          variant={selectedArtists.length > 0 ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          onPress={handleContinue}
          style={{ marginTop: spacing[2] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: spacing[5],
    gap: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {},
  spotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  spotifyDot: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  artistChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
  },
});
