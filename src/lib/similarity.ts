import { TrackMetrics, SpotifyArtist, SpotifyTrack } from './spotify';

export interface ComparisonResult {
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

export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export function calculateAverageTrackMetrics(metrics: TrackMetrics[]): TrackMetrics {
  if (metrics.length === 0) {
    return { averagePopularity: 0, topGenre: 'Unknown', recentTracks: [] };
  }

  const sum = metrics.reduce(
    (acc, metric) => ({
      averagePopularity: acc.averagePopularity + metric.averagePopularity,
    }),
    { averagePopularity: 0 }
  );

  // For genre, use the most common one
  const genreCounts = metrics.reduce((acc, metric) => {
    acc[metric.topGenre] = (acc[metric.topGenre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Combine recent tracks
  const allRecentTracks = metrics.flatMap(m => m.recentTracks);

  return {
    averagePopularity: sum.averagePopularity / metrics.length,
    topGenre,
    recentTracks: allRecentTracks.slice(0, 5), // Keep only first 5
  };
}

export function findSharedItems<T extends { id: string }>(items1: T[], items2: T[]): T[] {
  const ids1 = new Set(items1.map(item => item.id));
  return items2.filter(item => ids1.has(item.id));
}

export function getGenreComparison(artists1: SpotifyArtist[], artists2: SpotifyArtist[]) {
  const genreCount1 = new Map<string, number>();
  const genreCount2 = new Map<string, number>();

  // Count genres for user 1
  artists1.forEach(artist => {
    artist.genres.forEach(genre => {
      genreCount1.set(genre, (genreCount1.get(genre) || 0) + 1);
    });
  });

  // Count genres for user 2
  artists2.forEach(artist => {
    artist.genres.forEach(genre => {
      genreCount2.set(genre, (genreCount2.get(genre) || 0) + 1);
    });
  });

  // Get top 5 genres for each user
  const topGenres1 = Array.from(genreCount1.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const topGenres2 = Array.from(genreCount2.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Find overlapping genres
  const overlap = topGenres1
    .filter(g1 => topGenres2.some(g2 => g2.genre === g1.genre))
    .map(g => g.genre);

  return {
    user1: topGenres1,
    user2: topGenres2,
    overlap,
  };
}

export function generateTasteSummary(
  user1Name: string,
  user2Name: string,
  sharedArtists: SpotifyArtist[],
  sharedTracks: SpotifyTrack[],
  genreComparison: { user1: { genre: string; count: number }[]; user2: { genre: string; count: number }[]; overlap: string[] },
  trackMetricsComparison: { user1: TrackMetrics; user2: TrackMetrics },
  compatibilityScore: number
): string {
  const sharedGenres = genreComparison.overlap.slice(0, 3);
  const user1TopGenre = genreComparison.user1[0]?.genre || '';
  const user2TopGenre = genreComparison.user2[0]?.genre || '';
  const popularityDiff = Math.abs(trackMetricsComparison.user1.averagePopularity - trackMetricsComparison.user2.averagePopularity);

  // High compatibility (80-100%)
  if (compatibilityScore >= 80) {
    let summary = `You and ${user2Name} are musical soulmates! `;
    if (sharedGenres.length > 0) {
      summary += `You both love ${sharedGenres.join(', ')}`;
    }
    if (sharedArtists.length > 0) {
      summary += ` and share favorite artists like ${sharedArtists[0].name}`;
      if (sharedArtists.length > 1) {
        summary += ` and ${sharedArtists[1].name}`;
      }
    }
    summary += `. Your playlists would be practically identical!`;
    return summary;
  }

  // Good compatibility (60-79%)
  if (compatibilityScore >= 60) {
    let summary = `You and ${user2Name} have great musical chemistry! `;
    if (sharedGenres.length > 0) {
      summary += `You both enjoy ${sharedGenres.join(', ')}`;
    }
    if (sharedArtists.length > 0) {
      summary += ` and love ${sharedArtists[0].name}`;
    }
    summary += `. You'd have a blast sharing music!`;
    return summary;
  }

  // Moderate compatibility (40-59%)
  if (compatibilityScore >= 40) {
    let summary = `You and ${user2Name} have some musical overlap. `;
    if (sharedGenres.length > 0) {
      summary += `You both like ${sharedGenres.join(', ')}`;
    } else {
      summary += `${user1Name} is into ${user1TopGenre} while ${user2Name} prefers ${user2TopGenre}`;
    }
    if (popularityDiff > 30) {
      summary += `. One of you loves the hits, the other digs deeper!`;
    }
    summary += ` You'll discover new music from each other!`;
    return summary;
  }

  // Low compatibility (20-39%)
  if (compatibilityScore >= 20) {
    let summary = `You and ${user2Name} have very different tastes! `;
    if (sharedGenres.length > 0) {
      summary += `You only share ${sharedGenres.join(', ')}`;
    } else {
      summary += `${user1Name} loves ${user1TopGenre} while ${user2Name} is all about ${user2TopGenre}`;
    }
    if (popularityDiff > 40) {
      summary += `. Your music discovery levels are completely opposite!`;
    }
    summary += ` But opposites attract, right?`;
    return summary;
  }

  // Very low compatibility (0-19%)
  let summary = `You and ${user2Name} are musical opposites! `;
  summary += `${user1Name} is a ${user1TopGenre} fan while ${user2Name} vibes with ${user2TopGenre}. `;
  if (sharedArtists.length === 0) {
    summary += `Not a single shared favorite artist! `;
  }
  if (popularityDiff > 50) {
    summary += `Your music discovery levels are polar opposites! `;
  }
  summary += `This could be interesting... or chaotic!`;
  return summary;
}

function assignListeningPersonality({ topArtists, topTracks, trackMetrics, genres }: {
  topArtists: SpotifyArtist[];
  topTracks: SpotifyTrack[];
  trackMetrics: TrackMetrics;
  genres: string[];
}): string {
  // 1. Dominant genre
  const genreCounts: Record<string, number> = {};
  topArtists.forEach(artist => {
    artist.genres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = sortedGenres[0]?.[0] || null;
  const topGenreCount = sortedGenres[0]?.[1] || 0;
  const totalGenreMentions = Object.values(genreCounts).reduce((a, b) => a + b, 0);
  const dominantGenrePercent = totalGenreMentions > 0 ? topGenreCount / totalGenreMentions : 0;

  // 2. Diversity
  const uniqueGenres = Object.keys(genreCounts).length;
  const uniqueArtists = new Set(topArtists.map(a => a.id)).size;

  // 3. Track metrics analysis
  const avgPopularity = trackMetrics.averagePopularity;
  const userTopGenre = trackMetrics.topGenre;
  const recentTracksCount = trackMetrics.recentTracks.length;

  // 4. Assign personality based on listening patterns
  if (uniqueGenres > 10) {
    return 'The Nomad';
  }
  if (uniqueGenres > 6) {
    return 'The Voyager';
  }
  if (uniqueGenres > 4 && avgPopularity < 50) {
    return 'The Adventurer';
  }
  if (dominantGenrePercent > 0.7 && topGenre) {
    return 'The Devotee';
  }
  if (avgPopularity < 30) {
    return 'The Deep Diver';
  }
  if (avgPopularity > 80) {
    return 'The Top Charter';
  }
  if (uniqueGenres <= 2 && topGenre) {
    return 'The Specialist';
  }
  if (uniqueGenres > 4 && avgPopularity < 40) {
    return 'The Maverick';
  }
  if (avgPopularity > 60 && avgPopularity < 80) {
    return 'The Connoisseur';
  }
  if (uniqueGenres > 3 && uniqueGenres <= 5) {
    return 'The Enthusiast';
  }
  if (avgPopularity < 40) {
    return 'The Time Traveler';
  }
  if (dominantGenrePercent > 0.5 && dominantGenrePercent <= 0.7) {
    return 'The Fan Clubber';
  }
  if (uniqueGenres > 5 && uniqueGenres <= 7) {
    return 'The Jukeboxer';
  }
  if (avgPopularity > 40 && avgPopularity < 60) {
    return 'The Musicologist';
  }
  if (uniqueGenres <= 3) {
    return 'The Replayer';
  }
  return 'The Early Adopter';
}

function capitalize(str: string) {
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getPersonalityDescription(personality: string): string {
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
  
  return descriptions[personality] || 'A unique music listener with their own special taste!';
}

function assignGenreTag(genreComparison: { user1: { genre: string; count: number }[]; user2: { genre: string; count: number }[]; overlap: string[] }): string {
  const overlap = genreComparison.overlap;
  if (overlap.length >= 2) {
    // If they share 2+ top genres, pick a fun label based on the top shared genre
    const mainGenre = overlap[0];
    const labels = [
      `${capitalize(mainGenre)} Twins`,
      `${capitalize(mainGenre)} Squad`,
      `${capitalize(mainGenre)} Crew`,
      `${capitalize(mainGenre)} Vibes`,
      `${capitalize(mainGenre)} Lovers`,
      `${capitalize(mainGenre)} Heads`
    ];
    return labels[Math.floor(Math.random() * labels.length)];
  } else if (overlap.length === 1) {
    return `${capitalize(overlap[0])} Buddies`;
  } else {
    // No overlap: pick a contrast label
    const user1Top = genreComparison.user1[0]?.genre;
    const user2Top = genreComparison.user2[0]?.genre;
    if (user1Top && user2Top) {
      return `${capitalize(user1Top)} x ${capitalize(user2Top)} Opposites`;
    }
    return 'Genre Explorers';
  }
}

function generatePlayfulSummary({
  user1Name,
  user2Name,
  sharedArtists,
  sharedTracks,
  genreComparison,
  trackMetricsComparison,
  user1TopArtists,
  user2TopArtists,
  user1TopTracks,
  user2TopTracks,
}: {
  user1Name: string;
  user2Name: string;
  sharedArtists: SpotifyArtist[];
  sharedTracks: SpotifyTrack[];
  genreComparison: { user1: { genre: string; count: number }[]; user2: { genre: string; count: number }[]; overlap: string[] };
  trackMetricsComparison: { user1: TrackMetrics; user2: TrackMetrics };
  user1TopArtists: SpotifyArtist[];
  user2TopArtists: SpotifyArtist[];
  user1TopTracks: SpotifyTrack[];
  user2TopTracks: SpotifyTrack[];
}): string {
  const sharedGenres = genreComparison.overlap.slice(0, 2);
  const user1UniqueArtist = user1TopArtists.find(a => !sharedArtists.some(sa => sa.id === a.id));
  const user2UniqueArtist = user2TopArtists.find(a => !sharedArtists.some(sa => sa.id === a.id));
  const user1UniqueTrack = user1TopTracks.find(t => !sharedTracks.some(st => st.id === t.id));
  const user2UniqueTrack = user2TopTracks.find(t => !sharedTracks.some(st => st.id === t.id));
  const popularityDiff = Math.abs(trackMetricsComparison.user1.averagePopularity - trackMetricsComparison.user2.averagePopularity);
  const bothMainstream = trackMetricsComparison.user1.averagePopularity > 60 && trackMetricsComparison.user2.averagePopularity > 60;
  const bothIndie = trackMetricsComparison.user1.averagePopularity < 40 && trackMetricsComparison.user2.averagePopularity < 40;

  // Template options
  const templates = [
    () => sharedGenres.length > 0
      ? `You both enjoy ${sharedGenres.join(' and ')}. Looks like you’d have a good time swapping playlists.`
      : `You each bring something different to the mix—unique tastes make for interesting listening!`,
    () => sharedArtists.length > 0
      ? `You both have a soft spot for ${sharedArtists[0].name}.`
      : `No shared favorite artists, but plenty of new music to discover from each other!`,
    () => bothIndie
      ? `Both of you dig deep for hidden gems—perfect for discovering new music together.`
      : bothMainstream
        ? `You both love the hits—your playlists would be full of crowd-pleasers.`
        : popularityDiff > 30
          ? `One of you loves the hits, the other digs deeper. Nice balance!`
          : `Your music discovery levels are pretty well matched.`,
    () => user1UniqueArtist && user2UniqueArtist
      ? `${user1Name} is into ${user1UniqueArtist.name}, while ${user2Name} prefers ${user2UniqueArtist.name}. Plenty to share!`
      : undefined,
    () => user1UniqueTrack && user2UniqueTrack
      ? `Top tracks like "${user1UniqueTrack.name}" and "${user2UniqueTrack.name}" show off your unique styles.`
      : undefined,
  ];

  // Pick 2-3 non-empty templates for variety
  const chosen = templates.map(fn => fn()).filter(Boolean);
  return chosen.slice(0, 2).join(' ');
}

export function compareTastes(
  user1Profile: { user: { display_name: string }; topArtists: SpotifyArtist[]; topTracks: SpotifyTrack[]; trackMetrics: TrackMetrics; genres?: string[] },
  user2Profile: { user: { display_name: string }; topArtists: SpotifyArtist[]; topTracks: SpotifyTrack[]; trackMetrics: TrackMetrics; genres?: string[] }
): ComparisonResult {
  console.log('🔍 Track metrics check - User1:', user1Profile.trackMetrics);
  console.log('🔍 Track metrics check - User2:', user2Profile.trackMetrics);
  
  // Get track metrics for each user
  const user1Metrics = user1Profile.trackMetrics;
  const user2Metrics = user2Profile.trackMetrics;

  // Calculate track metrics similarity using new properties
  const genreMatch = user1Metrics.topGenre === user2Metrics.topGenre ? 1 : 0;
  const popularitySimilarity = 1 - Math.abs(user1Metrics.averagePopularity - user2Metrics.averagePopularity) / 100;
  const trackCountSimilarity = 1 - Math.abs(user1Metrics.recentTracks.length - user2Metrics.recentTracks.length) / 3;
  
  const metricsVec1 = [user1Metrics.averagePopularity / 100, genreMatch, trackCountSimilarity];
  const metricsVec2 = [user2Metrics.averagePopularity / 100, genreMatch, trackCountSimilarity];
  const metricsSimilarity = calculateCosineSimilarity(metricsVec1, metricsVec2);

  // Find shared artists and tracks
  const sharedArtists = findSharedItems(user1Profile.topArtists, user2Profile.topArtists);
  const sharedTracks = findSharedItems(user1Profile.topTracks, user2Profile.topTracks);

  // Calculate genre comparison
  const genreComparison = getGenreComparison(user1Profile.topArtists, user2Profile.topArtists);

  // Calculate overall compatibility score
  const artistSimilarity = sharedArtists.length / Math.max(user1Profile.topArtists.length, user2Profile.topArtists.length);
  const trackSimilarity = sharedTracks.length / Math.max(user1Profile.topTracks.length, user2Profile.topTracks.length);
  const genreSimilarity = genreComparison.overlap.length / Math.max(genreComparison.user1.length, genreComparison.user2.length);

  const compatibilityScore = Math.round(
    (metricsSimilarity * 0.3 + artistSimilarity * 0.25 + trackSimilarity * 0.2 + genreSimilarity * 0.25) * 100
  );

  // Generate taste summary
  const tasteSummary = generateTasteSummary(
    user1Profile.user.display_name,
    user2Profile.user.display_name,
    sharedArtists,
    sharedTracks,
    genreComparison,
    { user1: user1Metrics, user2: user2Metrics },
    compatibilityScore
  );

  // Assign listening personalities
  const listeningPersonality = {
    user1: assignListeningPersonality({
      topArtists: user1Profile.topArtists,
      topTracks: user1Profile.topTracks,
      trackMetrics: user1Profile.trackMetrics,
      genres: user1Profile.genres || [],
    }),
    user2: assignListeningPersonality({
      topArtists: user2Profile.topArtists,
      topTracks: user2Profile.topTracks,
      trackMetrics: user2Profile.trackMetrics,
      genres: user2Profile.genres || [],
    }),
  };

  // Assign genre tag
  const genreTag = assignGenreTag(genreComparison);

  // Playful summary
  const playfulSummary = generatePlayfulSummary({
    user1Name: user1Profile.user.display_name,
    user2Name: user2Profile.user.display_name,
    sharedArtists,
    sharedTracks,
    genreComparison,
    trackMetricsComparison: { user1: user1Metrics, user2: user2Metrics },
    user1TopArtists: user1Profile.topArtists,
    user2TopArtists: user2Profile.topArtists,
    user1TopTracks: user1Profile.topTracks,
    user2TopTracks: user2Profile.topTracks,
  });

  return {
    compatibilityScore,
    trackMetricsComparison: {
      user1: user1Metrics,
      user2: user2Metrics,
    },
    sharedArtists,
    sharedTracks,
    genreOverlap: genreComparison.overlap,
    genreComparison,
    tasteSummary,
    listeningPersonality,
    genreTag,
    user1TopArtists: user1Profile.topArtists,
    user1TopTracks: user1Profile.topTracks,
    user2TopArtists: user2Profile.topArtists,
    user2TopTracks: user2Profile.topTracks,
    playfulSummary,
  };
} 