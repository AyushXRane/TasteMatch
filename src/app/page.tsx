export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-400 to-blue-600">
      <h1 className="text-4xl font-bold text-white mb-8">TasteMatch</h1>
      <a
        href="/api/auth/login/spotify"
        className="px-6 py-3 bg-black text-green-400 rounded-lg font-semibold shadow-lg hover:bg-green-600 hover:text-white transition"
      >
        Log in with Spotify
      </a>
    </main>
  );
}