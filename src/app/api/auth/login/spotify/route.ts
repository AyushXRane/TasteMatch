import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get callbackUrl from query params, if present
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
  
  // Automatically detect the base URL from the request
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const baseUrl = `${protocol}://${host}`;
  
  // Build the redirect_uri, appending callbackUrl if present
  let redirectUri = `${baseUrl}/api/auth/callback/spotify`;
  if (callbackUrl) {
    redirectUri += `?callbackUrl=${callbackUrl}`;
  }

  // Debug logging
  console.log('🔍 Spotify OAuth Debug Info:');
  console.log('  - Protocol:', protocol);
  console.log('  - Host:', host);
  console.log('  - Base URL:', baseUrl);
  console.log('  - Redirect URI:', redirectUri);
  console.log('  - Client ID exists:', !!process.env.SPOTIFY_CLIENT_ID);
  console.log('  - Client ID length:', process.env.SPOTIFY_CLIENT_ID?.length);
  console.log('  - Client ID (first 10 chars):', process.env.SPOTIFY_CLIENT_ID?.substring(0, 10) + '...');
  console.log('  - Environment:', process.env.NODE_ENV);

  if (!process.env.SPOTIFY_CLIENT_ID) {
    console.error('❌ SPOTIFY_CLIENT_ID environment variable is missing!');
    return NextResponse.json({ error: 'Spotify client configuration error' }, { status: 500 });
  }

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
      'user-read-playback-state',
      'user-read-currently-playing'
    ].join(' '),
    show_dialog: 'true',
  });

  console.log('🎵 Spotify authorize params:', params.toString());
  console.log('🔗 Final Spotify Auth URL:', `https://accounts.spotify.com/authorize?${params.toString()}`);

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(spotifyAuthUrl);
}