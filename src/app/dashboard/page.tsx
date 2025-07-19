'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  display_name: string;
  images?: Array<{ url: string }>;
}

interface DashboardData {
  user: UserProfile;
  sessionId: string;
  shareUrl: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Check if someone has joined the session
  useEffect(() => {
    if (!data?.sessionId) return;

    const checkSessionStatus = async () => {
      try {
        const response = await fetch(`/api/compare/${data.sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkStatus: true })
        });
        
        if (response.ok) {
          const result = await response.json();
          // If user2 has joined, redirect to comparison
          if (result.hasUser2) {
            router.push(`/compare/${data.sessionId}`);
          }
        }
      } catch (error) {
        console.log('Session status check failed:', error);
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkSessionStatus, 3000);
    
    return () => clearInterval(interval);
  }, [data?.sessionId, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      const profileData = await response.json();
      setData(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!data?.shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading your music taste...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to TasteMatch!</h1>
            <div className="flex items-center justify-center space-x-4">
              {data.user.images && data.user.images[0] && (
                <img
                  src={data.user.images[0].url}
                  alt={data.user.display_name}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div className="text-white">
                <h2 className="text-2xl font-semibold">{data.user.display_name}</h2>
                <p className="text-green-200">Your music taste is ready to be compared!</p>
              </div>
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">
              Share Your Taste
            </h3>
            <p className="text-green-100 text-center mb-6">
              Send this link to a friend to compare your music tastes and discover your compatibility!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={data.shareUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-white/20 text-white rounded-lg border border-white/30 focus:outline-none focus:border-green-400"
              />
              <button
                onClick={copyToClipboard}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-green-400 hover:bg-green-500 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">
              How It Works
            </h3>
            <div className="space-y-4 text-green-100">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                  1
                </div>
                <p>Share the link above with a friend who also uses Spotify</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                  2
                </div>
                <p>They'll log in with their Spotify account and see the comparison</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                  3
                </div>
                <p>Discover your compatibility score, shared artists, and create a playlist together!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 