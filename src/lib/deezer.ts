/**
 * Deezer search API — no auth required.
 * Used to fetch 30-second preview clips since Spotify deprecated preview_url for new apps.
 * Also used to fetch album genre data.
 */

type DeezerTrackInfo = { previewUrl: string | null; albumId: number | null };

const searchCache = new Map<string, DeezerTrackInfo>();

async function searchDeezer(trackName: string, artistName: string): Promise<DeezerTrackInfo> {
  const key = `${artistName}::${trackName}`.toLowerCase();
  if (searchCache.has(key)) return searchCache.get(key)!;

  try {
    const q = encodeURIComponent(`artist:"${artistName}" track:"${trackName}"`);
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1&output=json`);
    if (!res.ok) {
      const info = { previewUrl: null, albumId: null };
      searchCache.set(key, info);
      return info;
    }
    const data = await res.json();
    const track = data?.data?.[0];
    const info: DeezerTrackInfo = {
      previewUrl: track?.preview ?? null,
      albumId: track?.album?.id ?? null,
    };
    searchCache.set(key, info);
    console.log(`[deezer] "${trackName}" by "${artistName}" → ${info.previewUrl ? 'preview found' : 'no preview'}, albumId: ${info.albumId}`);
    return info;
  } catch (e) {
    console.warn('[deezer] search failed:', e);
    const info = { previewUrl: null, albumId: null };
    searchCache.set(key, info);
    return info;
  }
}

/**
 * Look up a 30-second preview URL on Deezer by track name + artist.
 */
export async function fetchDeezerPreview(
  trackName: string,
  artistName: string,
): Promise<string | null> {
  return (await searchDeezer(trackName, artistName)).previewUrl;
}

/**
 * Look up genre names for a track via Deezer's album endpoint.
 * Reuses the cached search result if already fetched for this track.
 */
export async function fetchDeezerGenres(
  trackName: string,
  artistName: string,
): Promise<string[]> {
  const { albumId } = await searchDeezer(trackName, artistName);
  if (!albumId) return [];

  try {
    const res = await fetch(`https://api.deezer.com/album/${albumId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.genres?.data ?? []).map((g: any) => g.name as string);
  } catch {
    return [];
  }
}
