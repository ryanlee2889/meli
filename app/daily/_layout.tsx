import { Stack } from 'expo-router';

export default function DailyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="playlist" />
    </Stack>
  );
}
