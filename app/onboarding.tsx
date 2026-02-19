/**
 * Onboarding — Connect Spotify or pick seed artists.
 * One-time flow after waitlist is cleared.
 *
 * Spotify auth uses PKCE so no client secret is ever on device.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import { storeSpotifyToken, PKCE_VERIFIER_KEY } from '@/lib/spotify';

const SEED_ARTISTS = [
  'Kendrick Lamar', 'Frank Ocean', 'Radiohead', 'Beyoncé',
  'Tyler, the Creator', 'Bon Iver', 'SZA', 'Arctic Monkeys',
  'Kanye West', 'Lana Del Rey', 'Mac Miller', 'J. Cole',
  'Phoebe Bridgers', 'The Weeknd', 'Billie Eilish', 'JPEGMAFIA',
];

const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const spotifyClientId = Constants.expoConfig?.extra?.spotifyClientId as string;

  // Triple-slash form so Expo Router maps it to app/spotify-callback.tsx
  const redirectUri = 'vibecheck:///spotify-callback';

  // PKCE auth request — no client secret needed on device
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: spotifyClientId,
      scopes: ['user-top-read', 'user-read-recently-played', 'user-library-read'],
      usePKCE: true,
      redirectUri,
    },
    SPOTIFY_DISCOVERY
  );

  // Persist the PKCE code verifier so spotify-callback.tsx can complete the
  // exchange even if this screen is unmounted when the redirect fires.
  useEffect(() => {
    if (request?.codeVerifier) {
      SecureStore.setItemAsync(PKCE_VERIFIER_KEY, request.codeVerifier).catch(() => null);
    }
  }, [request?.codeVerifier]);

  // Handle auth response — fires when ASWebAuthenticationSession intercepts
  // the redirect before Expo Router does (the common iOS case).
  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { code } = response.params;
      if (code && request?.codeVerifier) {
        exchangeCodeForToken(code, request.codeVerifier);
      } else {
        setSpotifyError('Auth response missing code. Please try again.');
        setSpotifyConnecting(false);
      }
    } else if (response.type === 'error') {
      setSpotifyError(response.error?.message ?? 'Spotify auth failed. Please try again.');
      setSpotifyConnecting(false);
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setSpotifyConnecting(false);
    }
  }, [response]);

  async function exchangeCodeForToken(code: string, codeVerifier: string) {
    try {
      const tokenRes = await AuthSession.exchangeCodeAsync(
        {
          clientId: spotifyClientId,
          code,
          redirectUri,
          extraParams: { code_verifier: codeVerifier },
        },
        SPOTIFY_DISCOVERY
      );

      await storeSpotifyToken(tokenRes.accessToken, tokenRes.expiresIn ?? 3600, tokenRes.refreshToken);
      // Clean up verifier so the root layout handler doesn't double-exchange
      await SecureStore.deleteItemAsync(PKCE_VERIFIER_KEY).catch(() => null);

      // Mark Spotify as connected in the user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ spotify_connected: true })
          .eq('id', user.id);
      }

      router.replace('/(tabs)/profile');
    } catch (e: any) {
      console.error('Spotify token exchange failed', e);
      setSpotifyError('Could not complete Spotify login. Please try again.');
      setSpotifyConnecting(false);
    }
  }

  async function connectSpotify() {
    setSpotifyError(null);
    setSpotifyConnecting(true);
    await promptAsync();
    // spotifyConnecting will be cleared in the response useEffect
  }

  function toggleArtist(artist: string) {
    setSelectedArtists((prev) =>
      prev.includes(artist) ? prev.filter((a) => a !== artist) : [...prev, artist]
    );
  }

  function handleContinue() {
    router.replace('/(tabs)/profile');
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
            <View style={[styles.spotifyDot, { backgroundColor: '#1DB954' }]} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Connect Spotify</Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>
                Pulls your top artists and recent plays automatically.
              </Text>
            </View>
            <Badge label="Recommended" variant="accent" />
          </View>

          {spotifyError && (
            <Text variant="caption" color="negative">
              {spotifyError}
            </Text>
          )}

          <Button
            label={spotifyConnecting ? 'Connecting…' : 'Connect Spotify'}
            variant="primary"
            fullWidth
            loading={spotifyConnecting}
            disabled={!spotifyClientId || spotifyConnecting}
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
        <View style={{ marginTop: spacing[2] }}>
          <Button
            label={selectedArtists.length > 0 ? `Continue with ${selectedArtists.length} artists` : 'Skip for now'}
            variant={selectedArtists.length > 0 ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            onPress={handleContinue}
          />
        </View>
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
