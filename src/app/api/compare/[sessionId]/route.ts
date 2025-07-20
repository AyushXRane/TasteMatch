import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SpotifyAPI } from '@/lib/spotify';
import { storage } from '@/lib/storage';
import { compareTastes, getGenreComparison } from '@/lib/similarity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json().catch(() => ({}));
    const timeRange = body.timeRange || 'medium_term';
    const audioFeaturesOnly = body.audioFeaturesOnly || false;
    const genresOnly = body.genresOnly || false;
    const topArtistsTracksOnly = body.topArtistsTracksOnly || false;
    const checkStatus = body.checkStatus || false;
    
    console.log('🔧 API: POST request for session:', sessionId, 'timeRange:', timeRange, 'audioFeaturesOnly:', audioFeaturesOnly, 'genresOnly:', genresOnly, 'topArtistsTracksOnly:', topArtistsTracksOnly);

    // Get the JWT token from cookies
    const token = req.cookies.get('taste_token')?.value;
    console.log('🔍 API - taste_token exists:', !!token);
    console.log('🔍 API - All cookies:', req.cookies.getAll().map(c => c.name));
    
    let spotifyAPI: SpotifyAPI;
    
    if (!token) {
      // For share links, try to get token from Authorization header as fallback
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        spotifyAPI = new SpotifyAPI(accessToken);
      } else {
        // For share links, allow the request to proceed without authentication
        // The frontend will handle showing the login button
        console.log('🔍 API - No auth token, but allowing request to proceed for share link');
        return NextResponse.json({ error: 'Authentication required', needsAuth: true }, { status: 401 });
      }
    } else {
      // Verify and decode the JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { access_token: string };
      spotifyAPI = new SpotifyAPI(decoded.access_token);
    }

    // Get the existing session
    const session = storage.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // If this is just a status check, return whether user2 has joined
    if (checkStatus) {
      return NextResponse.json({
        hasUser2: !!session.user2Profile,
        user1Name: session.user1Profile.user.display_name,
        user2Name: session.user2Profile?.user.display_name
      });
    }

    // If this is the first time (no user2), fetch fresh data for both users
    if (!session.user2Profile) {
      console.log('🔧 API: User2 joining - fetching user2 data for all time ranges');
      
      // Use existing user1 data from session
      const user1Profile = session.user1Profile;
      
      // Fetch user2 data for all time ranges so we can show their data for any time range
      const user2ShortTerm = await spotifyAPI.getUserTasteProfile('short_term');
      const user2MediumTerm = await spotifyAPI.getUserTasteProfile('medium_term');
      const user2LongTerm = await spotifyAPI.getUserTasteProfile('long_term');
      
      // Use the requested time range for the main comparison
      const user2Profile = timeRange === 'short_term' ? user2ShortTerm : 
                          timeRange === 'long_term' ? user2LongTerm : 
                          user2MediumTerm;
      
      // Store all time ranges in the session
      const user2ProfileWithAllRanges = {
        ...user2Profile,
        shortTermData: user2ShortTerm,
        mediumTermData: user2MediumTerm,
        longTermData: user2LongTerm
      };
      
      // Fetch additional tracks from different time ranges for better shared track detection
      const user1ShortTermTracks = await spotifyAPI.getTopTracks('short_term');
      const user2ShortTermTracks = user2Profile.topTracks;
      
      console.log('🔧 API: User1:', user1Profile.user.display_name);
      console.log('🔧 API: User2:', user2Profile.user.display_name);
      console.log('🔧 API: Additional short-term tracks - User1:', user1ShortTermTracks.length, 'User2:', user2ShortTermTracks.length);
      
      // Update the session with user2 data (including all time ranges)
      storage.updateSessionData(sessionId, user1Profile, user2ProfileWithAllRanges);
      
      // Compare the tastes using user1 from session and user2 from current token, with additional tracks
      const comparison = compareTastes(user1Profile, user2Profile, user1ShortTermTracks, user2ShortTermTracks);

      return NextResponse.json({
        comparison,
        user1: user1Profile.user,
        user2: user2Profile.user,
      });
    }

    // If audioFeaturesOnly is true, only update track metrics for both users
    if (audioFeaturesOnly) {
      console.log('🔧 API: Updating track metrics only for timeRange:', timeRange);
      
      // Get existing session data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Use existing data from session instead of fetching fresh data
      const user1Profile = existingSession.user1Profile;
      const user2Profile = existingSession.user2Profile!;
      
      console.log('🔧 API: Using existing session data for audioFeaturesOnly');
      console.log('🔧 API: User1:', user1Profile.user.display_name);
      console.log('🔧 API: User2:', user2Profile.user.display_name);

      return NextResponse.json({
        trackMetricsComparison: {
          user1: user1Profile.trackMetrics,
          user2: user2Profile.trackMetrics,
        }
      });
    }

    // If genresOnly is true, only update genres for both users
    if (genresOnly) {
      console.log('🔧 API: Updating genres only for timeRange:', timeRange);
      
      // Get existing session data to preserve user2's data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Only fetch fresh data for the current user (user1), keep user2's existing data
      const user1Profile = await spotifyAPI.getUserTasteProfile(timeRange);
      const user2Profile = existingSession.user2Profile!;
      
      console.log('🔧 API: Fresh data fetched for genresOnly with timeRange:', timeRange);
      console.log('🔧 API: User1:', user1Profile.user.display_name);
      console.log('🔧 API: User2:', user2Profile.user.display_name);

      // Use the proper genre comparison function to get accurate counts
      const genreComparison = getGenreComparison(user1Profile.topArtists, user2Profile.topArtists);
      
      // Debug logging to verify genre data
      console.log('🔧 API: Genre comparison results:');
      console.log('🔧 API: User1 genres:', genreComparison.user1);
      console.log('🔧 API: User2 genres:', genreComparison.user2);
      console.log('🔧 API: Genre overlap:', genreComparison.overlap);
      console.log('🔧 API: User1 artists count:', user1Profile.topArtists.length);
      console.log('🔧 API: User2 artists count:', user2Profile.topArtists.length);

      return NextResponse.json({
        genreComparison: {
          user1: genreComparison.user1,
          user2: genreComparison.user2,
        },
        genreOverlap: genreComparison.overlap,
      });
    }

    // If topArtistsTracksOnly is true, only update top artists and tracks for both users
    if (topArtistsTracksOnly) {
      console.log('🔧 API: Updating top artists and tracks only for timeRange:', timeRange);
      
      // Get existing session data to preserve user2's data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Only fetch fresh data for the current user (user1), keep user2's existing data
      const user1Profile = await spotifyAPI.getUserTasteProfile(timeRange);
      const user2Profile = existingSession.user2Profile!;
      
      // Fetch additional tracks from different time ranges for better shared track detection
      const user1ShortTermTracks = await spotifyAPI.getTopTracks('short_term');
      // Use user2's existing short-term tracks from session instead of fetching with current token
      const user2ShortTermTracks = user2Profile.topTracks; // Use existing data
      
      console.log('🔧 API: Fresh data fetched for topArtistsTracksOnly with timeRange:', timeRange);
      console.log('🔧 API: User1:', user1Profile.user.display_name);
      console.log('🔧 API: User2:', user2Profile.user.display_name);
      console.log('🔧 API: Additional short-term tracks - User1:', user1ShortTermTracks.length, 'User2:', user2ShortTermTracks.length);
      
      // Compare the tastes using fresh data with additional tracks
      const comparison = compareTastes(user1Profile, user2Profile, user1ShortTermTracks, user2ShortTermTracks);

      return NextResponse.json({
        comparison,
        user1: user1Profile.user,
        user2: user2Profile.user,
      });
    }

    // If user2 already exists, check if we need to refresh data for time range changes
    console.log('🔧 API: User2 already exists - checking if time range refresh needed');
    
    // Check if this is a time range refresh request
    const isTimeRangeRefresh = body.timeRange && body.timeRange !== 'medium_term';
    
    if (isTimeRangeRefresh) {
      console.log('🔧 API: Time range refresh requested - fetching fresh data for user1, using user2 data for requested time range');
      
      // Get existing session data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Fetch fresh data for user1
      const user1Profile = await spotifyAPI.getUserTasteProfile(timeRange);
      
      // Get user2's data for the requested time range
      let user2Profile = existingSession.user2Profile!;
      if ((user2Profile as any).shortTermData && (user2Profile as any).mediumTermData && (user2Profile as any).longTermData) {
        // Use the stored data for the correct time range
        user2Profile = timeRange === 'short_term' ? (user2Profile as any).shortTermData :
                      timeRange === 'long_term' ? (user2Profile as any).longTermData :
                      (user2Profile as any).mediumTermData;
      }
      
      // Fetch additional tracks from different time ranges for better shared track detection
      const user1ShortTermTracks = await spotifyAPI.getTopTracks('short_term');
      const user2ShortTermTracks = user2Profile.topTracks; // Use user2's data for the correct time range
      
      console.log('🔧 API: Fresh data fetched for timeRange:', timeRange);
      console.log('🔧 API: User1:', user1Profile.user.display_name);
      console.log('🔧 API: User2:', user2Profile.user.display_name);
      console.log('🔧 API: Additional short-term tracks - User1:', user1ShortTermTracks.length, 'User2:', user2ShortTermTracks.length);
      
      // Update the session with fresh user1 data, keep user2's original data
      storage.updateSessionData(sessionId, user1Profile, existingSession.user2Profile!);
      
      // Compare the tastes using fresh user1 data with user2's data for the correct time range
      const comparison = compareTastes(user1Profile, user2Profile, user1ShortTermTracks, user2ShortTermTracks);

      return NextResponse.json({
        comparison,
        user1: user1Profile.user,
        user2: user2Profile.user,
      });
    }
    
    // Use existing session data for normal requests
    const user1Profile = session.user1Profile;
    const user2Profile = session.user2Profile!;
    
    // Fetch additional tracks from different time ranges for better shared track detection
    const user1ShortTermTracks = await spotifyAPI.getTopTracks('short_term');
    // Use user2's existing tracks from session instead of fetching with current token
    const user2ShortTermTracks = user2Profile.topTracks; // Use existing data
    
    console.log('🔧 API: Using existing session data');
    console.log('🔧 API: User1:', user1Profile.user.display_name);
    console.log('🔧 API: User2:', user2Profile.user.display_name);
    console.log('🔧 API: Requested timeRange:', timeRange);
    console.log('🔧 API: Additional short-term tracks - User1:', user1ShortTermTracks.length, 'User2:', user2ShortTermTracks.length);
    
    // Compare the tastes using existing session data with additional tracks
    const comparison = compareTastes(user1Profile, user2Profile, user1ShortTermTracks, user2ShortTermTracks);

    return NextResponse.json({
      comparison,
      user1: user1Profile.user,
      user2: user2Profile.user,
    });
  } catch (error: any) {
    console.error('Error in comparison:', error);
    return NextResponse.json({ error: 'Failed to compare tastes' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    console.log('GET request for session:', sessionId);

    // Get the existing session
    const session = storage.getSession(sessionId);
    if (!session) {
      console.log('Session not found in GET request');
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    console.log('Session found, returning data');
    return NextResponse.json({
      user1: session.user1Profile.user,
      hasUser2: !!session.user2Profile,
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 