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

    // Get comprehensive tracks from both users for better mixing
    const user1Tracks = session.user1Profile.topTracks;
    const user2Tracks = session.user2Profile.topTracks;
    
    console.log('🎵 User1 tracks count:', user1Tracks.length);
    console.log('🎵 User2 tracks count:', user2Tracks.length);
    
    // Smart mixing algorithm for better taste combination
    let mixedTracks = [];
    
    // Step 1: Find ALL shared tracks (like shared artists) - no limit on search
    const user1TrackIds = new Set(user1Tracks.map(track => track.id));
    const user2TrackIds = new Set(user2Tracks.map(track => track.id));
    const allSharedTracks = user1Tracks.filter(track => user2TrackIds.has(track.id));
    
    // Log shared tracks for debugging
    console.log('🎵 Total shared tracks found:', allSharedTracks.length);
    console.log('🎵 Shared track names:', allSharedTracks.map(t => `${t.name} by ${t.artists[0].name}`));
    
    // Use up to 10 shared tracks (more than before, like shared artists)
    const sharedTracks = allSharedTracks.slice(0, 10);
    mixedTracks.push(...sharedTracks);
    
    console.log('🎵 Shared tracks added:', sharedTracks.length);
    
    // Step 2: Get genre information for smart mixing
    const user1Genres = session.user1Profile.genres || [];
    const user2Genres = session.user2Profile.genres || [];
    const sharedGenres = user1Genres.filter(g => user2Genres.includes(g));
    
    console.log('🎵 Shared genres:', sharedGenres);
    
    // Step 3: Add tracks from shared genres (up to 6 more tracks) - EQUAL REPRESENTATION
    const user1Unique = user1Tracks.filter(track => !sharedTracks.some(st => st.id === track.id));
    const user2Unique = user2Tracks.filter(track => !sharedTracks.some(st => st.id === track.id));
    
    // Helper function to check if track belongs to shared genres
    const isSharedGenreTrack = (track: any) => {
      return track.artists && track.artists.some((artist: any) => 
        artist.genres && artist.genres.some((genre: string) => sharedGenres.includes(genre))
      );
    };
    
    const user1SharedGenreTracks = user1Unique.filter(isSharedGenreTrack).slice(0, 3);
    const user2SharedGenreTracks = user2Unique.filter(isSharedGenreTrack).slice(0, 3);
    
    // Add shared genre tracks in alternating order for balance
    const maxSharedGenre = Math.max(user1SharedGenreTracks.length, user2SharedGenreTracks.length);
    for (let i = 0; i < maxSharedGenre; i++) {
      if (i < user1SharedGenreTracks.length) {
        mixedTracks.push(user1SharedGenreTracks[i]);
      }
      if (i < user2SharedGenreTracks.length) {
        mixedTracks.push(user2SharedGenreTracks[i]);
      }
    }
    
    console.log('🎵 Shared genre tracks added:', user1SharedGenreTracks.length + user2SharedGenreTracks.length);
    
    // Step 4: Fill remaining slots with PERFECTLY BALANCED representation
    const remainingSlots = 50 - mixedTracks.length;
    const slotsPerUser = Math.floor(remainingSlots / 2); // Use floor to ensure equal split
    
    // Get remaining unique tracks for each user
    const user1Remaining = user1Unique.filter(track => 
      !mixedTracks.some(mt => mt.id === track.id)
    ).slice(0, slotsPerUser);
    
    const user2Remaining = user2Unique.filter(track => 
      !mixedTracks.some(mt => mt.id === track.id)
    ).slice(0, slotsPerUser);
    
    // Add remaining tracks in strict alternating order
    const maxRemaining = Math.max(user1Remaining.length, user2Remaining.length);
    for (let i = 0; i < maxRemaining && mixedTracks.length < 50; i++) {
      if (i < user1Remaining.length) {
        mixedTracks.push(user1Remaining[i]);
      }
      if (i < user2Remaining.length && mixedTracks.length < 50) {
        mixedTracks.push(user2Remaining[i]);
      }
    }
    
    // Remove any duplicates and take exactly 50 tracks
    const uniqueTracks = mixedTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    const selectedTracks = uniqueTracks.slice(0, 50);
    
    console.log('🎵 Final playlist tracks:', selectedTracks.length);
    console.log('🎵 User1 tracks in playlist:', selectedTracks.filter(t => user1TrackIds.has(t.id)).length);
    console.log('🎵 User2 tracks in playlist:', selectedTracks.filter(t => !user1TrackIds.has(t.id)).length);
    
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
    function filterTracksByGenres(tracks: any[], genres: string[]) {
      return tracks.filter(track =>
        track.artists.some((artist: any) => artist.genres && artist.genres.some((g: string) => genres.includes(g)))
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
    // Take top 50
    blendedTracks = blendedTracks.slice(0, 50);
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