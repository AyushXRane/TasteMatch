"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface UserProfile {
  id: string;
  display_name: string;
  images?: Array<{ url: string }>;
}

interface TrackMetrics {
  averagePopularity: number;
  topGenre: string;
  recentTracks: Array<{ name: string; artist: string; popularity: number; albumImage?: string }>;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images?: Array<{ url: string }>;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images?: Array<{ url: string }>;
  };
}

interface ComparisonData {
  compatibilityScore: number;
  trackMetricsComparison: {
    user1: TrackMetrics;
    user2: TrackMetrics;
  };
  sharedArtists: SpotifyArtist[];
  sharedTracks: SpotifyTrack[];
  genreOverlap: string[];
  genreComparison: {
    user1: { genre: string; count: number }[];
    user2: { genre: string; count: number }[];
  };
  tasteSummary: string;
  listeningPersonality: {
    user1: string;
    user2: string;
  };
  genreTag: string;
  user1TopArtists?: SpotifyArtist[];
  user1TopTracks?: SpotifyTrack[];
  user2TopArtists?: SpotifyArtist[];
  user2TopTracks?: SpotifyTrack[];
  playfulSummary?: string;
}

interface ComparisonResponse {
  comparison: ComparisonData;
  user1: UserProfile;
  user2: UserProfile;
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Soulmates!";
  if (score >= 75) return "Pretty synced!";
  if (score >= 60) return "Good match!";
  if (score >= 40) return "Some overlap!";
  if (score >= 20) return "A little chaos!";
  return "Chaos collab incoming!";
}

function getGenreEmoji(genre: string | undefined) {
  if (!genre) return '🎵';
  const map = {
    pop: '🎤',
    rock: '🎸',
    hiphop: '🎧',
    rap: '🎤',
    indie: '🌈',
    edm: '🎛️',
    dance: '💃',
    electronic: '🔊',
    rnb: '🎷',
    jazz: '🎺',
    classical: '🎻',
    country: '🤠',
    metal: '🤘',
    folk: '🪕',
    soul: '🧡',
    funk: '🕺',
    blues: '🎹',
    punk: '🧷',
    reggae: '🇯🇲',
    kpop: '🇰🇷',
    latin: '🪇',
    soundtrack: '🎬',
    alternative: '🌀',
  };
  const key = Object.keys(map).find(k => genre && genre.toLowerCase().includes(k));
  return key ? (map as Record<string, string>)[key] : '🎵';
}

export default function ComparePage() {
  console.log('🔄 ComparePage component loaded');
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionInfo, setSessionInfo] = useState<{ user1: UserProfile; hasUser2: boolean } | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlistCreated, setPlaylistCreated] = useState<string | null>(null);
  const [aiCreatingPlaylist, setAICreatingPlaylist] = useState(false);
  const [aiPlaylistCreated, setAIPlaylistCreated] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState('default');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');

  const [genresTimeRange, setGenresTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');

  useEffect(() => {
    fetchSessionInfo();
  }, [sessionId]);

  // Check if user is logged in and automatically trigger comparison
  useEffect(() => {
    const checkAndTriggerComparison = async () => {
      if (sessionInfo && !sessionInfo.hasUser2) {
        // Try to fetch comparison - if it succeeds, user is logged in
        try {
          const response = await fetch(`/api/compare/${sessionId}`, {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            setComparisonData(data);
            // Refresh session info to update hasUser2
            fetchSessionInfo();
          }
        } catch (err) {
          // User is not logged in, this is expected
        }
      }
    };

    checkAndTriggerComparison();
  }, [sessionInfo, sessionId]);

  const fetchSessionInfo = async () => {
    try {
      const response = await fetch(`/api/compare/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('This comparison link has expired or is invalid');
        } else {
          throw new Error('Failed to fetch session');
        }
        return;
      }
      const data = await response.json();
      setSessionInfo(data);

      if (data.hasUser2) {
        fetchComparison();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await fetch(`/api/compare/${sessionId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch comparison');
      }
      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createPlaylist = async () => {
    if (!comparisonData) return;
    
    setCreatingPlaylist(true);
    try {
      const response = await fetch('/api/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }
      
      const data = await response.json();
      setPlaylistCreated(data.playlistUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const createAIPlaylist = async () => {
    if (!comparisonData) return;
    setAICreatingPlaylist(true);
    try {
      const response = await fetch('/api/playlist/create/blended', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) {
        throw new Error('Failed to create blended playlist');
      }
      const data = await response.json();
      setAIPlaylistCreated(data.playlistUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blended playlist');
    } finally {
      setAICreatingPlaylist(false);
    }
  };

  const refreshComparisonData = async (timeRange: 'short_term' | 'medium_term' | 'long_term') => {
    try {
      const response = await fetch(`/api/compare/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeRange, topArtistsTracksOnly: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to refresh comparison data');
      }
      const data = await response.json();
      
      // Only update the top artists and tracks, keep shared content unchanged
      if (comparisonData) {
        setComparisonData({
          ...comparisonData,
          comparison: {
            ...comparisonData.comparison,
            user1TopArtists: data.comparison.user1TopArtists,
            user1TopTracks: data.comparison.user1TopTracks,
            user2TopArtists: data.comparison.user2TopArtists,
            user2TopTracks: data.comparison.user2TopTracks,
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh comparison data');
    }
  };



  const refreshGenres = async (timeRange: 'short_term' | 'medium_term' | 'long_term') => {
    try {
      const response = await fetch(`/api/compare/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeRange, genresOnly: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to refresh genres');
      }
      const data = await response.json();
      
      // Only update the genres part of the comparison
      if (comparisonData) {
        setComparisonData({
          ...comparisonData,
          comparison: {
            ...comparisonData.comparison,
            genreComparison: data.genreComparison,
            genreOverlap: data.genreOverlap,
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh genres');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl text-center">
          <div className="mb-4">Error: {error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-green-400 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Session not found</div>
      </div>
    );
  }

  if (!sessionInfo.hasUser2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-8">Join the Comparison!</h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-center space-x-4 mb-6">
                {sessionInfo.user1.images && sessionInfo.user1.images[0] && (
                  <img
                    src={sessionInfo.user1.images[0].url}
                    alt={sessionInfo.user1.display_name}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div className="text-white">
                  <h2 className="text-2xl font-semibold">{sessionInfo.user1.display_name}</h2>
                  <p className="text-green-200">is waiting to compare music tastes with you!</p>
                </div>
              </div>
              
                      <a
          href={`/api/auth/login/spotify/share?callbackUrl=/compare/${sessionId}`}
          className="px-8 py-4 bg-green-400 hover:bg-green-500 text-white rounded-lg font-semibold text-lg transition-colors inline-block"
        >
          Log in with Spotify & Compare
        </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading comparison data...</div>
      </div>
    );
  }

  const { comparison, user1, user2 } = comparisonData;

  // Debug: Log the actual values
  console.log('📊 Track Metrics - User1:', {
    popularity: comparison.trackMetricsComparison.user1.averagePopularity,
    topGenre: comparison.trackMetricsComparison.user1.topGenre,
    recentTracks: comparison.trackMetricsComparison.user1.recentTracks
  });
  console.log('📊 Track Metrics - User2:', {
    popularity: comparison.trackMetricsComparison.user2.averagePopularity,
    topGenre: comparison.trackMetricsComparison.user2.topGenre,
    recentTracks: comparison.trackMetricsComparison.user2.recentTracks
  });



  // Prepare data for pie charts - top genres for each user (increased to 8 to show more genres)
  const user1GenreData = comparison.genreComparison.user1.slice(0, 8).map(g => ({
    name: g.genre,
    value: g.count
  }));
  
  const user2GenreData = comparison.genreComparison.user2.slice(0, 8).map(g => ({
    name: g.genre,
    value: g.count
  }));

  // Colors for pie charts (extended to support 8 genres)
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

  // Custom tooltip for pie charts
  const CustomTooltip = ({ active, payload, data }: any) => {
    if (active && payload && payload.length) {
      const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-black/80 text-white p-3 rounded-lg border border-white/20">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-green-300">{percentage}%</p>
        </div>
      );
    }
    return null;
  };



  const tonePresets = [
    { label: 'Default', value: 'default', color: 'from-green-400 to-blue-600' },
    { label: 'Chaotic', value: 'chaotic', color: 'from-pink-500 to-yellow-400' },
    { label: 'Hype', value: 'hype', color: 'from-yellow-400 to-orange-500' },
    { label: 'Chill', value: 'chill', color: 'from-blue-400 to-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-950 w-full">
      <div className="container mx-auto px-2 md:px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow">TasteMatch Results</h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center space-x-3">
              {user1.images && user1.images[0] && (
                <img src={user1.images[0].url} alt={user1.display_name} className="w-12 h-12 rounded-full" />
              )}
              <span className="text-white font-semibold">{user1.display_name}</span>
            </div>
            <div className="text-white text-2xl">vs</div>
            <div className="flex items-center space-x-3">
              {user2.images && user2.images[0] && (
                <img src={user2.images[0].url} alt={user2.display_name} className="w-12 h-12 rounded-full" />
              )}
              <span className="text-white font-semibold">{user2.display_name}</span>
            </div>
          </div>
        </div>

        {/* Compatibility Score */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 mb-8 max-w-2xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Compatibility Score</h2>
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-full max-w-md h-8 mb-2">
                <div className="absolute top-0 left-0 w-full h-full rounded-full bg-green-900/30" />
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 shadow-lg transition-all duration-1000"
                  style={{ width: `${comparison.compatibilityScore}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg drop-shadow">
                  {comparison.compatibilityScore}%
                </div>
              </div>
              <div className="mt-2 text-xl font-semibold text-green-300 neon-glow animate-pulse">
                {getScoreLabel(comparison.compatibilityScore)}
              </div>
            </div>
            <p className="text-green-100 text-lg mb-2 font-medium drop-shadow">
              {comparison.tasteSummary}
            </p>
            {comparison.playfulSummary && (
              <p className="text-green-200 text-base mt-2 italic font-medium drop-shadow animate-fade-in">
                {comparison.playfulSummary}
              </p>
            )}
          </div>
        </div>

        {/* Top Row - Shared Vibe and Genre Match */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Shared Vibe Paragraph */}
          <div className={`bg-gradient-to-br ${tonePresets.find(t => t.value === selectedTone)?.color} rounded-2xl shadow-xl p-6 md:p-8 border-2 border-white/20 transition-all duration-300`}> 
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-2xl font-bold text-white mb-2 md:mb-0">Shared Vibe</h2>
              <div className="flex space-x-2 justify-center md:justify-end">
                {tonePresets.map(tone => (
                  <button
                    key={tone.value}
                    onClick={() => setSelectedTone(tone.value)}
                    className={`px-3 py-1 rounded-full font-semibold text-sm transition-colors border border-white/20 focus:outline-none ${selectedTone === tone.value ? 'bg-white/80 text-black shadow' : 'bg-white/10 text-white hover:bg-white/30'}`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-white text-lg md:text-xl font-medium animate-fade-in text-center">
              {selectedTone === 'default' && (comparison.playfulSummary || 'Your musical chemistry will appear here!')}
              {selectedTone === 'chaotic' && `${user1.display_name} and ${user2.display_name} have ${comparison.compatibilityScore}% compatibility. ${comparison.compatibilityScore < 50 ? 'You two are on completely different wavelengths. This could be chaos.' : 'You actually vibe pretty well together. Not as chaotic as expected!'}`}
              {selectedTone === 'hype' && `${user1.display_name} and ${user2.display_name} are both into the hits. With ${comparison.compatibilityScore}% compatibility, you'll probably agree on what to play at parties.`}
              {selectedTone === 'chill' && `${user1.display_name} and ${user2.display_name} have similar chill vibes. Your ${comparison.compatibilityScore}% match means you'll probably get along well on road trips.`}
            </div>
          </div>

          {/* Fun Genre Tags */}
          <div className="bg-purple-500/20 backdrop-blur-sm rounded-2xl p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Genre Match</h2>
              <div className="inline-block px-6 py-2 bg-purple-400 text-white rounded-full font-semibold text-lg mb-2">
                {comparison.genreTag}
              </div>
              <p className="text-purple-100 text-lg">
                {comparison.genreOverlap.length > 0 ? (
                  (() => {
                                      const genres = comparison.genreOverlap.slice(0, 3);
                  // Remove exact duplicates and related genres to avoid redundancy
                  const uniqueGenres = genres.filter((genre, index) => {
                    const currentLower = genre.toLowerCase();
                    // Check if this genre is already covered by a previous, more specific genre
                    return !genres.slice(0, index).some(prevGenre => {
                      const prevLower = prevGenre.toLowerCase();
                      // If current is more specific than previous, keep current
                      if (currentLower.includes(prevLower) && currentLower !== prevLower) {
                        return false; // Remove the more general one
                      }
                      // If previous is more specific than current, remove current
                      if (prevLower.includes(currentLower) && currentLower !== prevLower) {
                        return true; // Remove current (it's more general)
                      }
                      // If they're the same, remove duplicate
                      return currentLower === prevLower;
                    });
                  });
                    
                    if (uniqueGenres.length === 1) {
                      return `You both love ${uniqueGenres[0]}!`;
                    } else if (uniqueGenres.length === 2) {
                      return `You both love ${uniqueGenres[0]} and ${uniqueGenres[1]}!`;
                    } else {
                      return `You both love ${uniqueGenres[0]}, ${uniqueGenres[1]}, and ${uniqueGenres[2]}!`;
                    }
                  })()
                ) : (
                  `You have unique tastes!`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Listening Personality Test */}
        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Listening Personality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="bg-yellow-400/20 rounded-lg p-4">
                <div className="bg-yellow-400 text-white rounded-full px-4 py-2 font-semibold text-lg mb-2 inline-block">{comparison.listeningPersonality.user1}</div>
                <p className="text-yellow-100 text-sm mt-2">
                  {(() => {
                    const descriptions: Record<string, string> = {
                      'The Nomad': 'These "sonic explorers" are happy to listen to all kinds of music. But the handful of artists and songs they love will always be with them, "kind of like a musical souvenir."',
                      'The Voyager': 'Voyagers live and breathe music and expand their world "through sound."',
                      'The Adventurer': 'A "seeker of sound," Adventurers veer out into the "unknown, searching for fresher artists, deeper cuts, newer tracks."',
                      'The Devotee': 'Devoted listeners have an encyclopedic knowledge of their most beloved artists. They know the words to the deep cuts and the hits.',
                      'The Deep Diver': 'Deep Divers delve into their favorite artists\' catalogs to take "in all the sights and sounds" they discover along the way.',
                      'The Top Charter': 'While others prefer the obscure, the Top Charter is here for the hits only.',
                      'The Specialist': 'The most selective of the bunch. Specialists are curators, but once they fall in love with an artist, they\'re all in.',
                      'The Maverick': 'A more rebellious music lover, Mavericks are "frolicking in that sidestream" while the masses flock to the mainstream.',
                      'The Connoisseur': 'The Connoisseur has "taste that people can get behind." The friend whose playlist never disappoints.',
                      'The Enthusiast': 'Enthusiasts are super fans who always know what their idols are doing and are always ready to support them.',
                      'The Time Traveler': 'Time Travelers seek out music that\'s new to them, "regardless of whether it\'s new to the rest of the world."',
                      'The Fan Clubber': 'Every artist\'s ideal fan, the Fan Clubber, supports their fave through and through with their "full heart."',
                      'The Jukeboxer': 'Jukeboxers act like every song they like is one of their favorite songs, and they\'re happy to queue them all up.',
                      'The Musicologist': 'Musicologists are more preoccupied with the sonic elements of songs, "gravitating towards songs that stand the test of time."',
                      'The Replayer': 'These are "comfort listeners" who stick to a few core artists on their playlists.',
                      'The Early Adopter': 'Early Adopters are always on "the pulse of new music" and are the first to pick up on trends.'
                    };
                    return descriptions[comparison.listeningPersonality.user1] || 'A unique music listener with their own special taste!';
                  })()}
                </p>
              </div>
              
              <div className="bg-yellow-400/20 rounded-lg p-4">
                <div className="bg-yellow-400 text-white rounded-full px-4 py-2 font-semibold text-lg mb-2 inline-block">{comparison.listeningPersonality.user2}</div>
                <p className="text-yellow-100 text-sm mt-2">
                  {(() => {
                    const descriptions: Record<string, string> = {
                      'The Nomad': 'These "sonic explorers" are happy to listen to all kinds of music. But the handful of artists and songs they love will always be with them, "kind of like a musical souvenir."',
                      'The Voyager': 'Voyagers live and breathe music and expand their world "through sound."',
                      'The Adventurer': 'A "seeker of sound," Adventurers veer out into the "unknown, searching for fresher artists, deeper cuts, newer tracks."',
                      'The Devotee': 'Devoted listeners have an encyclopedic knowledge of their most beloved artists. They know the words to the deep cuts and the hits.',
                      'The Deep Diver': 'Deep Divers delve into their favorite artists\' catalogs to take "in all the sights and sounds" they discover along the way.',
                      'The Top Charter': 'While others prefer the obscure, the Top Charter is here for the hits only.',
                      'The Specialist': 'The most selective of the bunch. Specialists are curators, but once they fall in love with an artist, they\'re all in.',
                      'The Maverick': 'A more rebellious music lover, Mavericks are "frolicking in that sidestream" while the masses flock to the mainstream.',
                      'The Connoisseur': 'The Connoisseur has "taste that people can get behind." The friend whose playlist never disappoints.',
                      'The Enthusiast': 'Enthusiasts are super fans who always know what their idols are doing and are always ready to support them.',
                      'The Time Traveler': 'Time Travelers seek out music that\'s new to them, "regardless of whether it\'s new to the rest of the world."',
                      'The Fan Clubber': 'Every artist\'s ideal fan, the Fan Clubber, supports their fave through and through with their "full heart."',
                      'The Jukeboxer': 'Jukeboxers act like every song they like is one of their favorite songs, and they\'re happy to queue them all up.',
                      'The Musicologist': 'Musicologists are more preoccupied with the sonic elements of songs, "gravitating towards songs that stand the test of time."',
                      'The Replayer': 'These are "comfort listeners" who stick to a few core artists on their playlists.',
                      'The Early Adopter': 'Early Adopters are always on "the pulse of new music" and are the first to pick up on trends.'
                    };
                    return descriptions[comparison.listeningPersonality.user2] || 'A unique music listener with their own special taste!';
                  })()}
                </p>
              </div>
            </div>
            <p className="text-yellow-100 text-lg">Personalities based on your top genres, diversity, and vibe!</p>
          </div>
        </div>

        {/* Create Playlist Button */}
        <div className="text-center mb-8">
          <div className="mb-2 text-green-100 text-sm font-medium">
            Playlist will be created in <span className="font-bold text-green-300">your</span> Spotify account. Your friend can follow it too!
          </div>
          {playlistCreated ? (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">Playlist Created!</h3>
              <a
                href={playlistCreated}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-green-400 hover:bg-green-500 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg animate-fade-in"
              >
                Open in Spotify
              </a>
            </div>
          ) : (
            <>
              <button
                onClick={createPlaylist}
                disabled={creatingPlaylist}
                className="px-10 py-5 bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 hover:from-green-500 hover:to-purple-600 text-white rounded-full font-extrabold text-2xl shadow-xl transition-all duration-300 mb-4 animate-pulse disabled:bg-gray-400 disabled:animate-none"
              >
                {creatingPlaylist ? 'Creating Your Mix...' : '✨ Make Our Mix ✨'}
              </button>
              {error && (
                <div className="mt-2 text-red-300 font-semibold animate-fade-in">{error}</div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Tracks Display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Recent Tracks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold text-green-200 mb-2">{user1.display_name}'s Recent Tracks</h4>
                <div className="space-y-2">
                  {comparison.trackMetricsComparison.user1.recentTracks.map((track, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-white/10 rounded">
                      <span className="text-green-300 font-mono text-sm">{index + 1}.</span>
                      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
                        {track.albumImage ? (
                          <img 
                            src={track.albumImage} 
                            alt={`${track.name} album cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">🎵</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">{track.name}</div>
                        <div className="text-green-200 text-xs">{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-blue-200 mb-2">{user2.display_name}'s Recent Tracks</h4>
                <div className="space-y-2">
                  {comparison.trackMetricsComparison.user2.recentTracks.map((track, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-white/10 rounded">
                      <span className="text-blue-300 font-mono text-sm">{index + 1}.</span>
                      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden">
                        {track.albumImage ? (
                          <img 
                            src={track.albumImage} 
                            alt={`${track.name} album cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">🎵</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">{track.name}</div>
                        <div className="text-blue-200 text-xs">{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Genre Comparison */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <h3 className="text-2xl font-bold text-white mb-2 md:mb-0 text-center md:text-left">Top Genres</h3>
              <div className="flex justify-center md:justify-end space-x-2">
                <button
                  onClick={() => {
                    setGenresTimeRange('short_term');
                    refreshGenres('short_term');
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors border border-white/20 focus:outline-none ${
                    genresTimeRange === 'short_term' 
                      ? 'bg-white/80 text-black shadow' 
                      : 'bg-white/10 text-white hover:bg-white/30'
                  }`}
                >
                  4W
                </button>
                <button
                  onClick={() => {
                    setGenresTimeRange('medium_term');
                    refreshGenres('medium_term');
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors border border-white/20 focus:outline-none ${
                    genresTimeRange === 'medium_term' 
                      ? 'bg-white/80 text-black shadow' 
                      : 'bg-white/10 text-white hover:bg-white/30'
                  }`}
                >
                  6M
                </button>
                <button
                  onClick={() => {
                    setGenresTimeRange('long_term');
                    refreshGenres('long_term');
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors border border-white/20 focus:outline-none ${
                    genresTimeRange === 'long_term' 
                      ? 'bg-white/80 text-black shadow' 
                      : 'bg-white/10 text-white hover:bg-white/30'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User 1 Pie Chart */}
              <div>
                <h4 className="text-lg font-semibold text-green-200 mb-2 text-center">{user1.display_name}</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={user1GenreData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {user1GenreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip data={user1GenreData} />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Genre Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {user1GenreData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-white truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* User 2 Pie Chart */}
              <div>
                <h4 className="text-lg font-semibold text-blue-200 mb-2 text-center">{user2.display_name}</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={user2GenreData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {user2GenreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip data={user2GenreData} />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Genre Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {user2GenreData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-white truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shared Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Shared Artists */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Shared Artists</h3>
            <div className="space-y-3">
              {comparison.sharedArtists.slice(0, 5).map((artist) => (
                <div key={artist.id} className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                  {artist.images && artist.images[0] && (
                    <img src={artist.images[0].url} alt={artist.name} className="w-12 h-12 rounded-full" />
                  )}
                  <div>
                    <div className="text-white font-semibold">{artist.name}</div>
                    <div className="text-green-200 text-sm">{artist.genres.slice(0, 2).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Tracks */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Shared Tracks</h3>
            <div className="space-y-3">
              {comparison.sharedTracks.slice(0, 5).map((track) => (
                <div key={track.id} className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                  {track.album.images && track.album.images[0] && (
                    <img src={track.album.images[0].url} alt={track.name} className="w-12 h-12 rounded" />
                  )}
                  <div>
                    <div className="text-white font-semibold">{track.name}</div>
                    <div className="text-green-200 text-sm">{track.artists.map(a => a.name).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Artists & Tracks Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Top Artists & Tracks</h2>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => {
                  setSelectedTimeRange('short_term');
                  refreshComparisonData('short_term');
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-white/20 focus:outline-none ${
                  selectedTimeRange === 'short_term' 
                    ? 'bg-white/80 text-black shadow' 
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                Last 4 Weeks
              </button>
              <button
                onClick={() => {
                  setSelectedTimeRange('medium_term');
                  refreshComparisonData('medium_term');
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-white/20 focus:outline-none ${
                  selectedTimeRange === 'medium_term' 
                    ? 'bg-white/80 text-black shadow' 
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                Last 6 Months
              </button>
              <button
                onClick={() => {
                  setSelectedTimeRange('long_term');
                  refreshComparisonData('long_term');
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-white/20 focus:outline-none ${
                  selectedTimeRange === 'long_term' 
                    ? 'bg-white/80 text-black shadow' 
                    : 'bg-white/10 text-white hover:bg-white/30'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User 1 */}
            <div>
              <h3 className="text-xl font-semibold text-green-200 mb-2 text-center flex items-center justify-center gap-2">
                {user1.images && user1.images[0] && (
                  <img src={user1.images[0].url} alt={user1.display_name} className="w-8 h-8 rounded-full border-2 border-green-300" />
                )}
                {user1.display_name}
              </h3>
              <div className="mb-4">
                <h4 className="text-lg font-bold text-white mb-2">Top Artists</h4>
                <div className="space-y-2">
                  {comparison.user1TopArtists?.slice(0, 5).map((artist) => (
                    <div key={artist.id} className="flex items-center space-x-3 p-2 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-xl shadow-md">
                      {artist.images && artist.images[0] && (
                        <img src={artist.images[0].url} alt={artist.name} className="w-10 h-10 rounded-full border-2 border-green-200" />
                      )}
                      <span className="text-white font-medium flex items-center gap-2">
                        {artist.name}
                        {artist.genres && artist.genres[0] && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-700/60 text-xs font-bold text-white flex items-center gap-1">
                            {getGenreEmoji(artist.genres[0])} {artist.genres[0].charAt(0).toUpperCase() + artist.genres[0].slice(1)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Top Tracks</h4>
                <div className="space-y-2">
                  {comparison.user1TopTracks?.slice(0, 5).map((track) => (
                    <div key={track.id} className="flex items-center space-x-3 p-2 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-xl shadow-md">
                      {track.album.images && track.album.images[0] && (
                        <img src={track.album.images[0].url} alt={track.name} className="w-10 h-10 rounded border-2 border-green-200" />
                      )}
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {track.name}
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-700/60 text-xs font-bold text-white flex items-center gap-1">
                            {getGenreEmoji(undefined)} Track
                          </span>
                        </div>
                        <div className="text-green-200 text-sm">{track.artists.map(a => a.name).join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* User 2 */}
            <div>
              <h3 className="text-xl font-semibold text-blue-200 mb-2 text-center flex items-center justify-center gap-2">
                {user2.images && user2.images[0] && (
                  <img src={user2.images[0].url} alt={user2.display_name} className="w-8 h-8 rounded-full border-2 border-blue-300" />
                )}
                {user2.display_name}
              </h3>
              <div className="mb-4">
                <h4 className="text-lg font-bold text-white mb-2">Top Artists</h4>
                <div className="space-y-2">
                  {comparison.user2TopArtists?.slice(0, 5).map((artist) => (
                    <div key={artist.id} className="flex items-center space-x-3 p-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl shadow-md">
                      {artist.images && artist.images[0] && (
                        <img src={artist.images[0].url} alt={artist.name} className="w-10 h-10 rounded-full border-2 border-blue-200" />
                      )}
                      <span className="text-white font-medium flex items-center gap-2">
                        {artist.name}
                        {artist.genres && artist.genres[0] && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-700/60 text-xs font-bold text-white flex items-center gap-1">
                            {getGenreEmoji(artist.genres[0])} {artist.genres[0].charAt(0).toUpperCase() + artist.genres[0].slice(1)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Top Tracks</h4>
                <div className="space-y-2">
                  {comparison.user2TopTracks?.slice(0, 5).map((track) => (
                    <div key={track.id} className="flex items-center space-x-3 p-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl shadow-md">
                      {track.album.images && track.album.images[0] && (
                        <img src={track.album.images[0].url} alt={track.name} className="w-10 h-10 rounded border-2 border-blue-200" />
                      )}
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {track.name}
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-700/60 text-xs font-bold text-white flex items-center gap-1">
                            {getGenreEmoji(undefined)} Track
                          </span>
                        </div>
                        <div className="text-blue-200 text-sm">{track.artists.map(a => a.name).join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 