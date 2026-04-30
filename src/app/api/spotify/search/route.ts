import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { searchSpotifyTracks } from '@/services/spotifyService';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const request_id = crypto.randomUUID();

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q') ?? '';
    if (q.trim().length < 2) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = await searchSpotifyTracks(q);
    return NextResponse.json({ tracks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search Spotify';
    logger.error('GET /api/spotify/search error', { request_id }, error);
    const status = message === 'Spotify is not configured' ? 501 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
