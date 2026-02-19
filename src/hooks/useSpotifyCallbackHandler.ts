/**
 * Handles the Spotify OAuth callback URL when it arrives as a deep link
 * (i.e. when iOS routes it through the normal URL scheme rather than letting
 * ASWebAuthenticationSession intercept it). Registered once at the root layout
 * level so it fires no matter which screen is visible.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { storeSpotifyToken, PKCE_VERIFIER_KEY } from '@/lib/spotify';

const REDIRECT_URI = 'vibecheck:///spotify-callback';
const SPOTIFY_DISCOVERY = {
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function useSpotifyCallbackHandler() {
  useEffect(() => {
    async function handleUrl(url: string) {
      console.log('[SpotifyCallback] incoming URL:', url);

      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      const errorParam = parsed.queryParams?.error as string | undefined;

      if (errorParam) {
        console.warn('[SpotifyCallback] error param:', errorParam);
        return;
      }
      if (!code) return;

      // Read and immediately delete the verifier — acts as a mutex so only
      // one handler (this or spotify-callback.tsx) completes the exchange.
      const verifier = await SecureStore.getItemAsync(PKCE_VERIFIER_KEY);
      if (!verifier) {
        console.warn('[SpotifyCallback] no verifier in SecureStore — already handled?');
        return;
      }
      await SecureStore.deleteItemAsync(PKCE_VERIFIER_KEY);

      const clientId = Constants.expoConfig?.extra?.spotifyClientId as string;
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code,
            redirectUri: REDIRECT_URI,
            extraParams: { code_verifier: verifier },
          },
          SPOTIFY_DISCOVERY
        );

        await storeSpotifyToken(tokenRes.accessToken, tokenRes.expiresIn ?? 3600, tokenRes.refreshToken);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ spotify_connected: true })
            .eq('id', user.id);
        }

        console.log('[SpotifyCallback] success — navigating to profile');
        router.replace('/(tabs)/profile');
      } catch (e) {
        console.error('[SpotifyCallback] token exchange failed:', e);
        // Navigate back to onboarding so the user can retry
        router.replace('/onboarding');
      }
    }

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, []);
}
