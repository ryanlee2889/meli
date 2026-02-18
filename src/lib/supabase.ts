import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- Type-safe table helpers ---

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  is_active: boolean;
  invite_code: string;
  inviter_user_id: string | null;
  invite_goal: number;
  spotify_connected: boolean;
  stripe_customer_id: string | null;
};

export type Rating = {
  id: string;
  user_id: string;
  item_id: string;
  score: number;
  tags: string[] | null;
  created_at: string;
};

export type Item = {
  id: string;
  spotify_id: string;
  type: 'track' | 'album' | 'artist' | 'playlist';
  name: string;
  image_url: string | null;
  preview_url: string | null;
  artists_json: object;
  genres_json: object;
  raw_json: object;
  updated_at: string;
};
