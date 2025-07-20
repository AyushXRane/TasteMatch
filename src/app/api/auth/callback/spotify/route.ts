import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  
  console.log('🔍 Spotify Callback Debug:');
  console.log('  - Code exists:', !!code);
  console.log('  - Error exists:', !!error);
  console.log('  - Full URL:', req.url);
  console.log('  - Query params:', Object.fromEntries(req.nextUrl.searchParams.entries()));
  
  if (error) {
    console.error('❌ Spotify OAuth Error:', error);
    return NextResponse.json({ error: `Spotify OAuth error: ${error}` }, { status: 400 });
  }
  
  if (!code) {
    console.error('❌ No authorization code provided');
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Automatically detect the base URL from the request
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
    const baseUrl = `${protocol}://${host}`;
    
    // Use a simple redirect URI without any query parameters
    const redirectUri = 'https://tastematch.vercel.app/api/auth/callback/spotify';

    console.log('🔍 Token Exchange Debug:');
    console.log('  - Protocol:', protocol);
    console.log('  - Host:', host);
    console.log('  - Base URL:', baseUrl);
    console.log('  - Redirect URI:', redirectUri);
    console.log('  - Client ID exists:', !!process.env.SPOTIFY_CLIENT_ID);
    console.log('  - Client Secret exists:', !!process.env.SPOTIFY_CLIENT_SECRET);
    console.log('  - JWT Secret exists:', !!process.env.JWT_SECRET);
    console.log('  - Client ID (first 10 chars):', process.env.SPOTIFY_CLIENT_ID?.substring(0, 10) + '...');
    console.log('  - Client Secret (first 10 chars):', process.env.SPOTIFY_CLIENT_SECRET?.substring(0, 10) + '...');
    console.log('  - Client ID length:', process.env.SPOTIFY_CLIENT_ID?.length);
    console.log('  - Client Secret length:', process.env.SPOTIFY_CLIENT_SECRET?.length);

    // Exchange code for access and refresh tokens
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        } 
      }
    );

    console.log('✅ Token exchange successful');
    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Create a JWT for session management
    const token = jwt.sign(
      { access_token, refresh_token },
      process.env.JWT_SECRET!,
      { expiresIn: expires_in }
    );

    // Read the callbackUrl from query parameters
    const finalCallbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard';
    // Redirect to the callbackUrl with the JWT as a cookie
    const response = NextResponse.redirect(`${baseUrl}${finalCallbackUrl}`);
    response.cookies.set('taste_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in,
      path: '/',
    });

    console.log('✅ Redirecting to:', `${baseUrl}${finalCallbackUrl}`);
    return response;
  } catch (error: any) {
    console.error('❌ Spotify token exchange error:');
    console.error('  - Error message:', error.message);
    console.error('  - Response status:', error.response?.status);
    console.error('  - Response data:', error.response?.data);
    console.error('  - Full error:', error);
    
    return NextResponse.json({ 
      error: 'Spotify authentication failed', 
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
}