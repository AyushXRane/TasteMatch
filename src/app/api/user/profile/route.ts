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

    console.log('🔍 Starting getUserTasteProfile...');
    
    // Fetch user's taste profile with detailed error handling
    let tasteProfile;
    try {
      tasteProfile = await spotifyAPI.getUserTasteProfile();
      console.log('✅ getUserTasteProfile completed successfully');
    } catch (error: any) {
      console.error('❌ getUserTasteProfile failed:', error);
      console.error('  - Error message:', error.message);
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      throw error;
    }

    // Create a comparison session
    const sessionId = storage.createSession(tasteProfile);

    // Automatically detect the base URL from the request
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      user: tasteProfile.user,
      sessionId,
      shareUrl: `${baseUrl}/compare/${sessionId}`,
    });
  } catch (error: any) {
    console.error('❌ Error in /api/user/profile:', error);
    console.error('  - Error message:', error.message);
    console.error('  - Response status:', error.response?.status);
    console.error('  - Response data:', error.response?.data);
    
    return NextResponse.json({ 
      error: 'Failed to fetch user profile',
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
} 