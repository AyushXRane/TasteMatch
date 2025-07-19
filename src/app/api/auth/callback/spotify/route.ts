import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Exchange code for access and refresh tokens
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/spotify`,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Create a JWT for session management
    const token = jwt.sign(
      { access_token, refresh_token },
      process.env.JWT_SECRET!,
      { expiresIn: expires_in }
    );

    // Read the callbackUrl from query parameters
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard';
    // Redirect to the callbackUrl with the JWT as a cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}${callbackUrl}`);
    response.cookies.set('taste_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Spotify token exchange error:', error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}