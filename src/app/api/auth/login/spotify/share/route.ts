import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get callbackUrl from query params
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
  if (!callbackUrl) {
    return NextResponse.json({ error: 'No callbackUrl provided' }, { status: 400 });
  }

  // Always use clean redirect_uri for share links, put callbackUrl in state parameter
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/spotify/share`;

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: [
      'user-top-read',
      'playlist-read-private',
      'playlist-modify-private',
      'playlist-modify-public',
      'user-read-private',
      'user-read-email',
      'user-read-recently-played',
      'user-read-playback-state'
    ].join(' '),
    show_dialog: 'true',
    state: callbackUrl,
  });

  console.log('Spotify share authorize params:', params.toString());

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
} 