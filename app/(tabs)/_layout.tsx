import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { spacing, radii } from '@/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Custom minimal tab bar
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const icons: Record<string, string> = {
    discover: '◈',
    lists: '≡',
    profile: '○',
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom || spacing[3],
        },
      ]}
    >
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === i;
        const label = options.title ?? route.name;

        return (
          <Pressable
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(route.name);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
          >
            <Text
              style={{
                fontSize: 20,
                color: isFocused ? colors.accent : colors.textTertiary,
                marginBottom: 2,
              }}
            >
              {icons[route.name] ?? '●'}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: isFocused ? '700' : '400',
                color: isFocused ? colors.text : colors.textSecondary,
                letterSpacing: 0.3,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="lists" options={{ title: 'Lists' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing[2],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing[1],
  },
});
