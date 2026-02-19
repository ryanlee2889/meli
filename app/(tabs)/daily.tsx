/**
 * Daily tab entry — launches the full-screen daily queue flow.
 * The actual daily screens live outside the tabs group so the tab bar
 * doesn't show during the queue/playlist experience.
 */
import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function DailyTabEntry() {
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      // Replace so the back gesture doesn't return to the daily tab
      // (which would retrigger this effect and create an infinite loop).
      router.replace('/daily');
    }, [])
  );

  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
