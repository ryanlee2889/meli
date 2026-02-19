/**
 * Daily Queues — client-side API wrapper.
 * Uses Supabase directly + Spotify helpers from spotify.ts.
 */
import { supabase } from './supabase';
import {
  getStoredSpotifyToken,
  fetchTopTracks,
  fetchTopArtistIds,
  fetchRecommendations,
} from './spotify';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DailyQueue = {
  id: string;
  user_id: string;
  date: string;
  mood: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DailyQueueItem = {
  id: string;
  queue_id: string;
  item_id: string;
  position: number;
  score: number | null;
  skipped: boolean;
  rated_at: string | null;
  item: {
    id: string;
    spotify_id: string;
    name: string;
    image_url: string | null;
    preview_url: string | null;
    artists_json: string[];
    raw_json: Record<string, any>;
  };
};

export type DailyPlaylist = {
  id: string;
  queue_id: string;
  user_id: string;
  mood: string;
  created_at: string;
};

export type DailyPlaylistItem = {
  id: string;
  playlist_id: string;
  item_id: string;
  score: number;
  position: number;
  item: {
    id: string;
    name: string;
    image_url: string | null;
    artists_json: string[];
  };
};

export type DailyStatus =
  | { state: 'none' }
  | { state: 'in_progress'; queue: DailyQueue; rated: number; total: number }
  | { state: 'completed'; queue: DailyQueue; playlist: DailyPlaylist | null };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Compute mood label from rated queue items' audio features. */
export function computeMood(
  audioFeaturesList: Array<{ valence: number; energy: number }>
): string {
  if (!audioFeaturesList.length) return 'mixed';
  const n = audioFeaturesList.length;
  const avgValence = audioFeaturesList.reduce((s, f) => s + f.valence, 0) / n;
  const avgEnergy = audioFeaturesList.reduce((s, f) => s + f.energy, 0) / n;

  if (avgValence >= 0.6 && avgEnergy >= 0.7) return 'hype';
  if (avgValence >= 0.6 && avgEnergy < 0.7) return 'bright';
  if (avgValence < 0.6 && avgEnergy < 0.5) return 'chill';
  if (avgValence < 0.4 && avgEnergy >= 0.5) return 'moody';
  return 'mixed';
}

/** Fetch audio features for up to 100 track IDs. Returns map of spotifyId → features. */
export async function fetchAudioFeatures(
  token: string,
  trackIds: string[]
): Promise<Record<string, { valence: number; energy: number }>> {
  if (!trackIds.length) return {};
  const ids = trackIds.slice(0, 100).join(',');
  try {
    const res = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, { valence: number; energy: number }> = {};
    for (const f of data.audio_features ?? []) {
      if (f?.id) result[f.id] = { valence: f.valence ?? 0.5, energy: f.energy ?? 0.5 };
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get or create today's daily queue.
 * Returns null if no Spotify token (user not connected).
 */
export async function ensureDailyQueue(): Promise<{
  queue: DailyQueue;
  items: DailyQueueItem[];
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Return existing queue if already created today
  const { data: existing } = await supabase
    .from('daily_queues')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayDate())
    .single();

  if (existing) {
    return getTodayQueue();
  }

  // Need Spotify token to build the queue
  const token = await getStoredSpotifyToken();
  if (!token) return null;

  // Fetch tracks + audio features in parallel
  const [topTracks, topArtistIds] = await Promise.all([
    fetchTopTracks(token, 50),
    fetchTopArtistIds(token, 5),
  ]);

  let candidates = [...topTracks];
  if (topArtistIds.length) {
    const recs = await fetchRecommendations(token, topArtistIds, 30);
    candidates = [...topTracks, ...recs];
  }

  // Deduplicate by spotify ID
  const seen = new Set<string>();
  candidates = candidates.filter((t) => {
    if (seen.has(t.id) || !t.imageUrl) return false;
    seen.add(t.id);
    return true;
  });

  // Fetch audio features for mood computation later
  const audioFeatures = await fetchAudioFeatures(token, candidates.map((t) => t.id));

  // Pick 10 shuffled candidates
  const selected = shuffle(candidates).slice(0, 10);
  if (!selected.length) return null;

  // Upsert items into the items table
  const itemUpserts = selected.map((t) => ({
    spotify_id: t.id,
    type: 'track' as const,
    name: t.name,
    image_url: t.imageUrl,
    preview_url: t.previewUrl,
    artists_json: t.artists,
    genres_json: [],
    raw_json: audioFeatures[t.id]
      ? { audio_features: audioFeatures[t.id] }
      : {},
  }));

  await supabase
    .from('items')
    .upsert(itemUpserts, { onConflict: 'spotify_id', ignoreDuplicates: false });

  // Fetch the item IDs we just upserted
  const { data: itemRows } = await supabase
    .from('items')
    .select('id, spotify_id')
    .in('spotify_id', selected.map((t) => t.id));

  if (!itemRows?.length) return null;

  const idMap: Record<string, string> = {};
  for (const row of itemRows) {
    idMap[row.spotify_id] = row.id;
  }

  // Create the daily queue
  const { data: queue, error: qErr } = await supabase
    .from('daily_queues')
    .insert({ user_id: user.id, date: todayDate() })
    .select()
    .single();

  if (qErr || !queue) return null;

  // Create queue items
  const queueItems = selected
    .map((t, i) => ({
      queue_id: queue.id,
      item_id: idMap[t.id],
      position: i,
    }))
    .filter((qi) => qi.item_id);

  await supabase.from('daily_queue_items').insert(queueItems);

  return getTodayQueue();
}

/** Fetch today's queue with full item metadata. */
export async function getTodayQueue(): Promise<{
  queue: DailyQueue;
  items: DailyQueueItem[];
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: queue } = await supabase
    .from('daily_queues')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayDate())
    .single();

  if (!queue) return null;

  const { data: items } = await supabase
    .from('daily_queue_items')
    .select('*, item:items(id, spotify_id, name, image_url, preview_url, artists_json, raw_json)')
    .eq('queue_id', queue.id)
    .order('position');

  return { queue, items: (items as DailyQueueItem[]) ?? [] };
}

/**
 * Rate a queue item. Also writes to the main ratings table.
 * Returns the playlist if this was the final item.
 */
export async function rateDailyItem(
  queueItemId: string,
  itemId: string,
  score: number
): Promise<{ playlist?: DailyPlaylist } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { error } = await supabase
    .from('daily_queue_items')
    .update({ score, rated_at: new Date().toISOString() })
    .eq('id', queueItemId);

  if (error) return null;

  // Mirror to main ratings table so profile reflects it
  await supabase
    .from('ratings')
    .upsert({ user_id: user.id, item_id: itemId, score }, { onConflict: 'user_id,item_id' });

  return checkAndGeneratePlaylist(user.id);
}

/** Mark a queue item as skipped. Returns playlist if this was the last item. */
export async function skipDailyItem(
  queueItemId: string
): Promise<{ playlist?: DailyPlaylist } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await supabase
    .from('daily_queue_items')
    .update({ skipped: true })
    .eq('id', queueItemId);

  return checkAndGeneratePlaylist(user.id);
}

/** Get today's completed playlist with tracks. */
export async function getTodayPlaylist(): Promise<{
  playlist: DailyPlaylist;
  items: DailyPlaylistItem[];
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: queue } = await supabase
    .from('daily_queues')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayDate())
    .single();

  if (!queue?.completed_at) return null;

  const { data: playlist } = await supabase
    .from('daily_playlists')
    .select('*')
    .eq('queue_id', queue.id)
    .single();

  if (!playlist) return null;

  const { data: items } = await supabase
    .from('daily_playlist_items')
    .select('*, item:items(id, name, image_url, artists_json)')
    .eq('playlist_id', playlist.id)
    .order('position');

  return {
    playlist: playlist as DailyPlaylist,
    items: (items as DailyPlaylistItem[]) ?? [],
  };
}

/**
 * Lightweight status check for the profile "Today's vibe" card.
 */
export async function getDailyStatus(): Promise<DailyStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: 'none' };

  const { data: queue } = await supabase
    .from('daily_queues')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayDate())
    .single();

  if (!queue) return { state: 'none' };

  if (queue.completed_at) {
    const { data: playlist } = await supabase
      .from('daily_playlists')
      .select('*')
      .eq('queue_id', queue.id)
      .single();
    return {
      state: 'completed',
      queue: queue as DailyQueue,
      playlist: (playlist as DailyPlaylist) ?? null,
    };
  }

  const { data: items } = await supabase
    .from('daily_queue_items')
    .select('id, score, skipped')
    .eq('queue_id', queue.id);

  const total = items?.length ?? 0;
  const rated = items?.filter((i) => i.score !== null || i.skipped).length ?? 0;

  return {
    state: 'in_progress',
    queue: queue as DailyQueue,
    rated,
    total,
  };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/** Check if all items done; if so, compute mood + create playlist. */
async function checkAndGeneratePlaylist(
  userId: string
): Promise<{ playlist?: DailyPlaylist }> {
  const { data: queue } = await supabase
    .from('daily_queues')
    .select('*')
    .eq('user_id', userId)
    .eq('date', todayDate())
    .single();

  if (!queue) return {};

  // Already completed
  if (queue.completed_at) {
    const { data: pl } = await supabase
      .from('daily_playlists')
      .select('*')
      .eq('queue_id', queue.id)
      .single();
    return { playlist: (pl as DailyPlaylist) ?? undefined };
  }

  const { data: items } = await supabase
    .from('daily_queue_items')
    .select('*, item:items(raw_json)')
    .eq('queue_id', queue.id);

  if (!items) return {};

  const allDone = items.every((i) => i.score !== null || i.skipped);
  if (!allDone) return {};

  // Compute mood from audio features of rated (non-skipped) items
  const ratedItems = items.filter((i) => i.score !== null && !i.skipped);
  const audioFeaturesList = ratedItems
    .map((i: any) => i.item?.raw_json?.audio_features)
    .filter(Boolean) as Array<{ valence: number; energy: number }>;

  const mood = computeMood(audioFeaturesList);

  // Mark queue complete
  await supabase
    .from('daily_queues')
    .update({ completed_at: new Date().toISOString(), mood })
    .eq('id', queue.id);

  // Create playlist
  const { data: playlist, error: plErr } = await supabase
    .from('daily_playlists')
    .insert({ queue_id: queue.id, user_id: userId, mood })
    .select()
    .single();

  if (plErr || !playlist) return {};

  // Add items scored >= 7
  const highScores = ratedItems
    .filter((i) => (i.score ?? 0) >= 7)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (highScores.length) {
    await supabase.from('daily_playlist_items').insert(
      highScores.map((i, idx) => ({
        playlist_id: playlist.id,
        item_id: i.item_id,
        score: i.score,
        position: idx,
      }))
    );
  }

  return { playlist: playlist as DailyPlaylist };
}
