import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { SpotifyAPI } from '@/lib/spotify';
import { storage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    // Get the JWT token from cookies
    const token = req.cookies.get('taste_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { access_token: string };
    const spotifyAPI = new SpotifyAPI(decoded.access_token);

    // Get the session
    const session = storage.getSession(sessionId);
    if (!session || !session.user2Profile) {
      return NextResponse.json({ error: 'Session not found or incomplete' }, { status: 404 });
    }

    // Get user profile to get user ID
    const userProfile = await spotifyAPI.getUserProfile();

    // Combine top tracks from both users, excluding duplicates
    const allTracks = [...session.user1Profile.topTracks, ...session.user2Profile.topTracks];
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );

    // Take top 20 tracks
    const selectedTracks = uniqueTracks.slice(0, 20);
    const trackUris = selectedTracks.map(track => `spotify:track:${track.id}`);

    // Create playlist name
    const playlistName = `TasteMatch: ${session.user1Profile.user.display_name} & ${session.user2Profile.user.display_name}`;

    // Create the playlist
    const playlistId = await spotifyAPI.createPlaylist(userProfile.id, playlistName, trackUris);

    return NextResponse.json({
      playlistId,
      playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
      trackCount: selectedTracks.length,
    });
  } catch (error: any) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
} 

// New: AI/Smart Blended Playlist Endpoint
export async function POST_blended(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    // Get the JWT token from cookies
    const token = req.cookies.get('taste_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { access_token: string };
    const spotifyAPI = new SpotifyAPI(decoded.access_token);

    // Get the session
    const session = storage.getSession(sessionId);
    if (!session || !session.user2Profile) {
      return NextResponse.json({ error: 'Session not found or incomplete' }, { status: 404 });
    }

    // Get user profile to get user ID
    const userProfile = await spotifyAPI.getUserProfile();

    // --- SMART BLENDING LOGIC ---
    // 1. Mix top tracks, but prioritize shared genres, similar audio features, and some unique picks from each user.
    // 2. (Placeholder) For now, alternate tracks from each user, prioritize shared genres, and fill with unique tracks.
    const user1Tracks = session.user1Profile.topTracks;
    const user2Tracks = session.user2Profile.topTracks;
    const user1Genres = session.user1Profile.genres;
    const user2Genres = session.user2Profile.genres;
    const sharedGenres = user1Genres.filter(g => user2Genres.includes(g));

    // Helper: filter tracks by genre
    function filterTracksByGenres(tracks, genres) {
      return tracks.filter(track =>
        track.artists.some(artist => artist.genres && artist.genres.some(g => genres.includes(g)))
      );
    }

    // Prioritize tracks in shared genres
    let blendedTracks = [
      ...filterTracksByGenres(user1Tracks, sharedGenres),
      ...filterTracksByGenres(user2Tracks, sharedGenres),
    ];
    // Remove duplicates
    blendedTracks = blendedTracks.filter((track, idx, self) => idx === self.findIndex(t => t.id === track.id));
    // Fill with unique tracks from each user
    blendedTracks = blendedTracks.concat(
      user1Tracks.filter(t => !blendedTracks.some(bt => bt.id === t.id)),
      user2Tracks.filter(t => !blendedTracks.some(bt => bt.id === t.id))
    );
    // Take top 20
    blendedTracks = blendedTracks.slice(0, 20);
    const trackUris = blendedTracks.map(track => `spotify:track:${track.id}`);

    // Create playlist name
    const playlistName = `Blended Vibes: ${session.user1Profile.user.display_name} & ${session.user2Profile.user.display_name}`;

    // Create the playlist
    const playlistId = await spotifyAPI.createPlaylist(userProfile.id, playlistName, trackUris);

    return NextResponse.json({
      playlistId,
      playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
      trackCount: blendedTracks.length,
    });
  } catch (error: any) {
    console.error('Error creating blended playlist:', error);
    return NextResponse.json({ error: 'Failed to create blended playlist' }, { status: 500 });
  }
} 