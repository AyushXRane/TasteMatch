import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Get callbackUrl from query params, if present
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
  // Build the redirect_uri, appending callbackUrl if present
  let redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/spotify`;
  if (callbackUrl) {
    // Do NOT encodeURIComponent here, as URLSearchParams will encode it
    redirectUri += `?callbackUrl=${callbackUrl}`;
  }

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
      'user-read-playback-state',
      'user-read-currently-playing'
    ].join(' '),
    show_dialog: 'true',
  });



  console.log('Spotify authorize params:', params.toString());

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}