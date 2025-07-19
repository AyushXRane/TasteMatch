import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SpotifyAPI } from '@/lib/spotify';
import { storage } from '@/lib/storage';
import { compareTastes } from '@/lib/similarity';

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
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { access_token: string };
    const spotifyAPI = new SpotifyAPI(decoded.access_token);

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
      console.log('🔧 API: Fetching fresh data for both users');
      const user1Profile = await spotifyAPI.getUserTasteProfile(timeRange);
      const user2Profile = await spotifyAPI.getUserTasteProfile(timeRange);
      
      // Update the session with fresh data
      storage.updateSessionData(sessionId, user1Profile, user2Profile);
      
      // Compare the tastes using fresh data
      const comparison = compareTastes(user1Profile, user2Profile);

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
      
      // Use different data sources for different time ranges
      const user1TopTracks = await spotifyAPI.getTracksForTimeRange(timeRange);
      const user2TopTracks = await spotifyAPI.getTracksForTimeRange(timeRange);
      
      console.log(`🔧 API: Fetched ${user1TopTracks.length} tracks for user1 in ${timeRange}`);
      console.log(`🔧 API: Fetched ${user2TopTracks.length} tracks for user2 in ${timeRange}`);
      console.log(`🔧 API: Sample tracks for user1:`, user1TopTracks.slice(0, 3).map(t => ({ name: t.name, popularity: t.popularity, release_date: t.album.release_date })));
      console.log(`🔧 API: Track IDs for user1 (${timeRange}):`, user1TopTracks.map(t => t.id).slice(0, 5));
      
      // Calculate track metrics for both users
      const user1TrackMetrics = await spotifyAPI.calculateTrackMetrics(user1TopTracks);
      const user2TrackMetrics = await spotifyAPI.calculateTrackMetrics(user2TopTracks);

      return NextResponse.json({
        trackMetricsComparison: {
          user1: user1TrackMetrics,
          user2: user2TrackMetrics,
        }
      });
    }

    // If genresOnly is true, only update genres for both users
    if (genresOnly) {
      console.log('🔧 API: Updating genres only for timeRange:', timeRange);
      
      // Get existing session data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Only fetch artists for the new time range (genres come from artists)
      const user1TopArtists = await spotifyAPI.getTopArtists(timeRange);
      const user2TopArtists = await spotifyAPI.getTopArtists(timeRange);
      
      // Calculate only the genre comparison
      const user1Genres = Array.from(new Set(user1TopArtists.flatMap(artist => artist.genres)));
      const user2Genres = Array.from(new Set(user2TopArtists.flatMap(artist => artist.genres)));
      
      // Count genre occurrences
      const user1GenreCounts = user1TopArtists.flatMap(artist => artist.genres).reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const user2GenreCounts = user2TopArtists.flatMap(artist => artist.genres).reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const user1GenreData = Object.entries(user1GenreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);
      
      const user2GenreData = Object.entries(user2GenreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json({
        genreComparison: {
          user1: user1GenreData,
          user2: user2GenreData,
        },
        genreOverlap: user1Genres.filter(genre => user2Genres.includes(genre)),
      });
    }

    // If topArtistsTracksOnly is true, only update top artists and tracks for both users
    if (topArtistsTracksOnly) {
      console.log('🔧 API: Updating top artists and tracks only for timeRange:', timeRange);
      
      // Get existing session data
      const existingSession = storage.getSession(sessionId);
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Only fetch artists and tracks for the new time range
      const user1TopArtists = await spotifyAPI.getTopArtists(timeRange);
      const user1TopTracks = await spotifyAPI.getTopTracks(timeRange);
      const user2TopArtists = await spotifyAPI.getTopArtists(timeRange);
      const user2TopTracks = await spotifyAPI.getTopTracks(timeRange);
      
      // Create updated profiles with new artists/tracks but keep existing data
      const user1Profile = {
        user: existingSession.user1Profile.user,
        topArtists: user1TopArtists,
        topTracks: user1TopTracks,
        trackMetrics: existingSession.user1Profile.trackMetrics,
        genres: existingSession.user1Profile.genres,
      };
      
      const user2Profile = {
        user: existingSession.user2Profile!.user,
        topArtists: user2TopArtists,
        topTracks: user2TopTracks,
        trackMetrics: existingSession.user2Profile!.trackMetrics,
        genres: existingSession.user2Profile!.genres,
      };
      
      // Update the session with new artists/tracks
      storage.updateSessionData(sessionId, user1Profile, user2Profile);
      
      // Compare the tastes
      const comparison = compareTastes(user1Profile, user2Profile);

      return NextResponse.json({
        comparison,
        user1: user1Profile.user,
        user2: user2Profile.user,
      });
    }

    // If user2 already exists, this is a time range refresh - fetch fresh data for both users
    const user1Profile = await spotifyAPI.getUserTasteProfile(timeRange);
    const user2Profile = await spotifyAPI.getUserTasteProfile(timeRange);

    // Update the session with fresh data
    storage.updateSessionData(sessionId, user1Profile, user2Profile);

    // Compare the tastes
    const comparison = compareTastes(user1Profile, user2Profile);

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