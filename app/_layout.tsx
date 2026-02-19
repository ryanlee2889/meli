import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { ThemeProvider, useThemeContext } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useSpotifyCallbackHandler } from '@/hooks/useSpotifyCallbackHandler';

// Called at module level so it fires no matter which screen receives the
// redirect URL. Needed on Android + Expo Go where the OS actually navigates
// the app to the redirect URI rather than intercepting it in the session.
WebBrowser.maybeCompleteAuthSession();

async function redirectForSession(session: Session | null) {
  if (!session) {
    router.replace('/');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, spotify_connected')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    router.replace('/');
    return;
  }

  if (!profile.is_active) {
    router.replace('/waitlist');
  } else if (!profile.spotify_connected) {
    router.replace('/onboarding');
  } else {
    router.replace('/(tabs)/profile');
  }
}

function RootLayoutInner() {
  const { isDark } = useThemeContext();

  // Handles Spotify callback URLs that iOS routes as deep links instead of
  // letting ASWebAuthenticationSession intercept them.
  useSpotifyCallbackHandler();

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION,
    // then again on every sign-in / sign-out / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED / USER_UPDATED don't require re-routing.
        // Responding to them causes races where the user gets sent back
        // to the landing page mid-session.
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
        redirectForSession(session);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="waitlist" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="spotify-callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="daily"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
