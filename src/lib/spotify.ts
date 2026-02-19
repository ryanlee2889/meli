/**
 * Spotify token storage + API helpers.
 */
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const ACCESS_TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
export const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier';

export async function storeSpotifyToken(
  accessToken: string,
  expiresIn: number,
  refreshToken?: string | null,
) {
  const expiryMs = Date.now() + expiresIn * 1000;
  const writes: Promise<void>[] = [
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(EXPIRY_KEY, String(expiryMs)),
  ];
  if (refreshToken) {
    writes.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken));
  }
  await Promise.all(writes);
}

/**
 * Returns a valid access token. Automatically refreshes using the stored
 * refresh token if the access token is expired or within 60s of expiry.
 * Returns null only if there is no token at all or refresh fails.
 */
export async function getStoredSpotifyToken(): Promise<string | null> {
  const [token, expiryStr] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(EXPIRY_KEY),
  ]);

  if (!token || !expiryStr) return null;

  const expiry = parseInt(expiryStr, 10);
  if (Date.now() <= expiry - 60_000) return token; // still valid

  // Expired — attempt silent refresh
  return refreshSpotifyToken();
}

async function refreshSpotifyToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const clientId = Constants.expoConfig?.extra?.spotifyClientId as string | undefined;
  if (!clientId) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccess: string = data.access_token;
    const expiresIn: number = data.expires_in ?? 3600;
    // Spotify may rotate the refresh token — store it if provided
    const newRefresh: string | undefined = data.refresh_token;

    await storeSpotifyToken(newAccess, expiresIn, newRefresh ?? refreshToken);
    return newAccess;
  } catch {
    return null;
  }
}

export async function clearSpotifyToken() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRY_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// ─── API calls ────────────────────────────────────────────────────────────────

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string[];
  albumName: string;
  imageUrl: string | null;
  previewUrl: string | null;
};

async function spotifyGet<T>(endpoint: string, token: string): Promise<T | null> {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function mapSpotifyTrack(t: any): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists ?? []).map((a: any) => a.name as string),
    albumName: t.album?.name ?? '',
    imageUrl: t.album?.images?.[0]?.url ?? null,
    previewUrl: t.preview_url ?? null,
  };
}

/** User's top tracks across medium term (4 weeks). */
export async function fetchTopTracks(token: string, limit = 50): Promise<SpotifyTrack[]> {
  const data = await spotifyGet<{ items: any[] }>(
    `/me/top/tracks?limit=${limit}&time_range=medium_term`,
    token
  );
  return (data?.items ?? []).map(mapSpotifyTrack);
}

/** Recommendations seeded from the user's top artists. */
export async function fetchRecommendations(
  token: string,
  seedArtistIds: string[],
  limit = 30
): Promise<SpotifyTrack[]> {
  const seeds = seedArtistIds.slice(0, 5).join(',');
  const data = await spotifyGet<{ tracks: any[] }>(
    `/recommendations?seed_artists=${seeds}&limit=${limit}`,
    token
  );
  return (data?.tracks ?? []).map(mapSpotifyTrack);
}

/** Top artist IDs for seeding recommendations. */
export async function fetchTopArtistIds(token: string, limit = 5): Promise<string[]> {
  const data = await spotifyGet<{ items: any[] }>(
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
    token
  );
  return (data?.items ?? []).map((a: any) => a.id as string);
}
