import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { ThemeProvider, useThemeContext } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

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
    router.replace('/(tabs)');
  }
}

function RootLayoutInner() {
  const { isDark } = useThemeContext();

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION,
    // then again on every sign-in / sign-out / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
