import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.nextUrl.searchParams.get('key') !== process.env.DEBUG_KEY) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    baseUrl,
    redirectUri: `${baseUrl}/api/auth/callback/spotify`,
    hasSpotifyClientId: !!process.env.SPOTIFY_CLIENT_ID,
    hasSpotifyClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasJwtSecret: !!process.env.JWT_SECRET,
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    clientSecretLength: process.env.SPOTIFY_CLIENT_SECRET?.length || 0,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    headers: {
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      host: req.headers.get('host'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
    }
  });
} 