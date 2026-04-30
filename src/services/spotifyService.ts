export interface SpotifyTrackSearchResult {
  spotify_track_id: string;
  spotify_url: string;
  name: string;
  artist: string;
  album_name?: string;
  album_image_url?: string;
}

interface SpotifyTokenResponse {
  access_token?: string;
  error?: string;
}

interface SpotifySearchResponse {
  tracks?: {
    items?: Array<{
      id: string;
      name: string;
      external_urls?: { spotify?: string };
      artists?: Array<{ name: string }>;
      album?: {
        name?: string;
        images?: Array<{ url: string; width: number; height: number }>;
      };
    }>;
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify is not configured');
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const body = (await response.json()) as SpotifyTokenResponse & { expires_in?: number };

  if (!response.ok || !body.access_token) {
    throw new Error(body.error || 'Failed to authenticate with Spotify');
  }

  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };

  return body.access_token;
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrackSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const token = await getSpotifyAccessToken();
  const params = new URLSearchParams({
    q: trimmedQuery,
    type: 'track',
    limit: '8',
    market: 'IN',
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as SpotifySearchResponse;

  if (!response.ok) {
    throw new Error('Failed to search Spotify');
  }

  return (body.tracks?.items ?? []).map((track) => ({
    spotify_track_id: track.id,
    spotify_url: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
    name: track.name,
    artist: track.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown artist',
    album_name: track.album?.name,
    album_image_url: track.album?.images?.[0]?.url,
  }));
}
