import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Vibecheck',
  slug: 'vibecheck',
  version: '1.0.0',
  orientation: 'portrait',
  // Replace with your own icon at ./assets/icon.png
  // icon: './assets/icon.png',
  scheme: 'vibecheck',
  userInterfaceStyle: 'automatic',
  splash: {
    // image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#080808',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.ryanlee2889.vibecheck',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    // adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#080808' },
    package: 'com.ryanlee2889.vibecheck',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'vibecheck',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    // favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-av',
      {
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '0e39f121-eede-41fd-8166-e3acca65b339',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    spotifyClientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
  },
});
