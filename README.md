# TasteMatch 🎧

A beautiful, full-stack web application that lets two Spotify users compare their music tastes through a shareable link. Built with Next.js, TypeScript, and Tailwind CSS.

<!-- Updated for Vercel deployment -->

## Features

- 🔐 **Spotify OAuth Authentication** - Secure login with Spotify
- 🔗 **Shareable Comparison Links** - Generate unique links to share with friends
- 📊 **Beautiful Visualizations** - Radar charts and bar graphs comparing music tastes
- 🎯 **Compatibility Scoring** - AI-powered similarity analysis using cosine similarity
- 👯 **Shared Content Discovery** - Find mutual artists and tracks
- 🎧 **Playlist Creation** - Automatically create shared playlists
- 📱 **Responsive Design** - Works perfectly on mobile and desktop
- ⚡ **Real-time Updates** - Live comparison results

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Authentication**: Spotify OAuth 2.0
- **Backend**: Next.js API Routes
- **Storage**: In-memory storage with TTL (30 minutes)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- Spotify Developer Account
- Vercel Account (for deployment)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_BASE_URL=your_app_url
JWT_SECRET=your_jwt_secret
```

### Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `https://your-domain.com/api/auth/callback/spotify`
4. Copy Client ID and Client Secret to your `.env.local`

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd TasteMatch

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## How It Works

1. **User 1** logs in with Spotify and gets a shareable link
2. **User 1** shares the link with a friend
3. **User 2** clicks the link and logs in with their Spotify account
4. Both users see a beautiful comparison dashboard with:
   - Compatibility score
   - Audio features radar chart
   - Genre comparison
   - Shared artists and tracks
   - AI-generated taste summary
5. Users can create a shared playlist based on their combined tastes

## API Endpoints

- `GET /api/auth/login/spotify` - Initiate Spotify OAuth
- `GET /api/auth/callback/spotify` - Handle OAuth callback
- `GET /api/user/profile` - Get user profile and create session
- `GET /api/compare/[sessionId]` - Get session info
- `POST /api/compare/[sessionId]` - Add second user and compare
- `POST /api/playlist/create` - Create shared playlist

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app is optimized for Vercel deployment with:
- Serverless functions for API routes
- Automatic HTTPS
- Global CDN
- Edge functions for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
