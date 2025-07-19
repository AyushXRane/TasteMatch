import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SpotifyAPI } from '@/lib/spotify';
import { storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    // Get the JWT token from cookies
    const token = req.cookies.get('taste_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { access_token: string };
    const spotifyAPI = new SpotifyAPI(decoded.access_token);

    // Fetch user's taste profile
    const tasteProfile = await spotifyAPI.getUserTasteProfile();

    // Create a comparison session
    const sessionId = storage.createSession(tasteProfile);

    return NextResponse.json({
      user: tasteProfile.user,
      sessionId,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/compare/${sessionId}`,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
} 