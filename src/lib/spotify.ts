import axios from 'axios';

export interface SpotifyUser {
  id: string;
  display_name: string;
  images?: Array<{ url: string }>;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images?: Array<{ url: string }>;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images?: Array<{ url: string }>;
    release_date: string;
  };
  popularity: number;
}

export interface TrackMetrics {
  averagePopularity: number;
  topGenre: string;
  recentTracks: Array<{ name: string; artist: string; popularity: number; albumImage?: string }>;
}

export interface UserTasteProfile {
  user: SpotifyUser;
  topArtists: SpotifyArtist[];
  topTracks: SpotifyTrack[];
  trackMetrics: TrackMetrics;
  genres: string[];
}

export class SpotifyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Spotify API error for ${endpoint}:`, error.response?.status, error.response?.data);
      throw error;
    }
  }

  async getUserProfile(): Promise<SpotifyUser> {
    return this.makeRequest('/me');
  }

  async getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'): Promise<SpotifyArtist[]> {
    const data = await this.makeRequest(`/me/top/artists?limit=50&time_range=${timeRange}`);
    return data.items;
  }

  async getRecentlyPlayed(limit: number = 50): Promise<SpotifyTrack[]> {
    console.log(`🎵 Fetching recently played tracks (limit: ${limit})`);
    const data = await this.makeRequest(`/me/player/recently-played?limit=${limit}`);
    console.log(`🎵 Got ${data.items.length} recently played tracks`);
    
    // Convert to SpotifyTrack format
    const tracks = data.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((a: any) => ({ name: a.name })),
      album: {
        name: item.track.album.name,
        images: item.track.album.images,
        release_date: item.track.album.release_date,
      },
      popularity: item.track.popularity,
    }));
    
    return tracks;
  }

  async getTracksForTimeRange(timeRange: 'short_term' | 'medium_term' | 'long_term'): Promise<SpotifyTrack[]> {
    console.log(`🎵 Getting tracks for timeRange: ${timeRange}`);
    
    // For different time ranges, use different data sources to simulate time-based analysis
    if (timeRange === 'short_term') {
      // Short term: Use recently played (last few days)
      return await this.getRecentlyPlayed(50);
    } else if (timeRange === 'medium_term') {
      // Medium term: Mix of recently played and saved tracks
      const [recent, saved] = await Promise.all([
        this.getRecentlyPlayed(50),
        this.getSavedTracks(50)
      ]);
      return [...recent, ...saved];
    } else {
      // Long term: Use saved tracks and top tracks (represents overall taste)
      const [saved, top] = await Promise.all([
        this.getSavedTracks(50),
        this.getTopTracks('long_term')
      ]);
      return [...saved, ...top];
    }
  }

  async getRecentlyPlayedForMetrics(): Promise<SpotifyTrack[]> {
    console.log(`🎵 Fetching recently played tracks for metrics`);
    return await this.getRecentlyPlayed(20); // Get last 20 recently played
  }

  async getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'): Promise<SpotifyTrack[]> {
    console.log(`🎵 Fetching top tracks for timeRange: ${timeRange}`);
    // Try to get more tracks for better analysis
    const data = await this.makeRequest(`/me/top/tracks?limit=50&time_range=${timeRange}`);
    console.log(`🎵 Got ${data.items.length} tracks for ${timeRange}`);
    return data.items;
  }

  async getSavedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
    console.log(`🎵 Fetching saved tracks (limit: ${limit})`);
    const data = await this.makeRequest(`/me/tracks?limit=${limit}`);
    console.log(`🎵 Got ${data.items.length} saved tracks`);
    
    // Convert to SpotifyTrack format
    const tracks = data.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((a: any) => ({ name: a.name })),
      album: {
        name: item.track.album.name,
        images: item.track.album.images,
        release_date: item.track.album.release_date,
      },
      popularity: item.track.popularity,
    }));
    
    return tracks;
  }



  async calculateTrackMetrics(tracks: SpotifyTrack[]): Promise<TrackMetrics> {
    if (tracks.length === 0) {
      return {
        averagePopularity: 0,
        topGenre: 'Unknown',
        recentTracks: [],
      };
    }

    // Calculate average popularity
    const totalPopularity = tracks.reduce((sum, track) => sum + track.popularity, 0);
    const averagePopularity = totalPopularity / tracks.length;

    // Get actually recently played tracks (not from the input tracks)
    const recentlyPlayedTracks = await this.getRecentlyPlayedForMetrics();
    const recentTracks = recentlyPlayedTracks.slice(0, 5).map(track => ({
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown',
      popularity: track.popularity,
      albumImage: track.album.images?.[0]?.url,
    }));

    // Debug: Log the actual popularity values
    console.log('🎵 Recent tracks with popularity:', recentTracks.map(t => ({
      name: t.name,
      artist: t.artist,
      popularity: t.popularity
    })));
    
    // Also log the raw recently played data
    console.log('🎵 Raw recently played tracks:', recentlyPlayedTracks.slice(0, 3).map(t => ({
      name: t.name,
      artist: t.artists[0]?.name,
      popularity: t.popularity,
      id: t.id
    })));

    // Get top genre from track names and artists (simplified)
    const allText = tracks.map(t => `${t.name} ${t.artists.map(a => a.name).join(' ')}`).join(' ').toLowerCase();
    let topGenre = 'Pop'; // Default
    
    if (allText.includes('rock') || allText.includes('metal')) topGenre = 'Rock';
    else if (allText.includes('hip') || allText.includes('rap')) topGenre = 'Hip Hop';
    else if (allText.includes('jazz')) topGenre = 'Jazz';
    else if (allText.includes('classical')) topGenre = 'Classical';
    else if (allText.includes('country')) topGenre = 'Country';
    else if (allText.includes('electronic') || allText.includes('edm')) topGenre = 'Electronic';

    console.log('📊 Track metrics calculated:', {
      averagePopularity: Math.round(averagePopularity),
      topGenre,
      recentTracks,
      trackCount: tracks.length,
    });

    return {
      averagePopularity,
      topGenre,
      recentTracks,
    };
  }

  async createPlaylist(userId: string, name: string, trackUris: string[]): Promise<string> {
    // Create playlist
    const playlistData = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name,
        description: 'Created by TasteMatch - A shared playlist based on your music taste!',
        public: false,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const playlistId = playlistData.data.id;

    // Add tracks to playlist
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: trackUris,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return playlistId;
  }

  async getUserTasteProfile(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'): Promise<UserTasteProfile> {
    console.log('🚀 getUserTasteProfile called with timeRange:', timeRange);
    
    const [user, topArtists, topTracks] = await Promise.all([
      this.getUserProfile(),
      this.getTopArtists(timeRange),
      this.getTopTracks(timeRange),
    ]);

    // Extract unique genres from top artists
    const genres = Array.from(new Set(topArtists.flatMap(artist => artist.genres)));

    // Calculate track metrics from the tracks we already have
    const trackMetrics = await this.calculateTrackMetrics(topTracks);

    return {
      user,
      topArtists,
      topTracks,
      trackMetrics,
      genres,
    };
  }
} 