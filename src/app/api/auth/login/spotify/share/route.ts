import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get callbackUrl from query params
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
  if (!callbackUrl) {
    return NextResponse.json({ error: 'No callbackUrl provided' }, { status: 400 });
  }

  // Automatically detect the base URL from the request
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const baseUrl = `${protocol}://${host}`;

  // Always use clean redirect_uri for share links, put callbackUrl in state parameter
      const redirectUri = 'https://tastematch.vercel.app/api/auth/callback/spotify/share';

  // Use callbackUrl directly in state parameter (no double encoding)
  const stateParam = callbackUrl;
  

  
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!.trim(), // Remove any whitespace
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
    state: stateParam,
  });



  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(spotifyAuthUrl);
} 