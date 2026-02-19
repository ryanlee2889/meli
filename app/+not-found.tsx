/**
 * Catch-all for unmatched routes.
 *
 * The most common unmatched route is `vibecheck:///` (empty path) which can be
 * triggered by the Spotify OAuth redirect or Supabase's auth redirect URL.
 * We check auth state to decide where to send the user rather than blindly
 * going to `/`, which would race with onAuthStateChange and boot logged-in
 * users back to the landing page.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { PKCE_VERIFIER_KEY } from '@/lib/spotify';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    async function resolve() {
      // If there's a pending PKCE verifier, a Spotify auth is in flight.
      // Stay on this spinner; useSpotifyCallbackHandler will navigate when done.
      const verifier = await SecureStore.getItemAsync(PKCE_VERIFIER_KEY);
      if (verifier) return;

      // For all other unmatched routes, route based on current session.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }

      // User is authenticated — read profile to decide the right destination.
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, spotify_connected')
        .eq('id', session.user.id)
        .single();

      if (!profile || !profile.is_active) {
        router.replace('/waitlist');
      } else if (!profile.spotify_connected) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }

    resolve();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
