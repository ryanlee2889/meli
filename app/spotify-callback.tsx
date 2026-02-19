/**
 * Spotify OAuth callback landing screen.
 *
 * When iOS routes the redirect URI as a deep link, Expo Router navigates here.
 * The actual token exchange is handled by useSpotifyCallbackHandler() in the
 * root layout, which runs in parallel and navigates away once done.
 * This screen just shows a spinner so there's no flash of an error.
 */
import { View, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/hooks/useTheme';

// Signals any in-app browser session (ASWebAuthenticationSession) to close.
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyCallbackScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
