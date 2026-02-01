import Link from 'next/link'
import { UserMenu } from '@/components/auth/UserMenu'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ui-bg">
      {/* Soft gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-ocean-light/30 via-ui-bg to-pastel-pink/20 -z-10" />

      {/* Decorative blobs */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-ui-accent/20 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-pastel-pink/20 rounded-full blur-3xl -z-10" />

      {/* Header with UserMenu */}
      <header className="absolute top-0 right-0 p-4 z-10">
        <UserMenu />
      </header>

      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="mb-6">
            {/* Decorative hex shape */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-ui-accent to-ocean-dark rounded-2xl shadow-soft-lg rotate-12">
              <span className="text-4xl -rotate-12">🏝️</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-ui-text mb-4 tracking-tight">
            3D Catan
          </h1>
          <p className="text-lg text-ui-text-muted max-w-md mx-auto">
            Play Settlers of Catan online with friends in beautiful 3D
          </p>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Link
            href="/lobby/create"
            className="w-full py-4 px-6 bg-gradient-to-r from-ui-accent to-ocean-dark text-white font-semibold text-lg rounded-2xl shadow-soft-md transition-all transform hover:scale-[1.02] hover:shadow-soft-lg text-center"
          >
            Create Game
          </Link>

          <Link
            href="/lobby/join"
            className="w-full py-4 px-6 bg-white text-ui-text font-semibold text-lg rounded-2xl shadow-soft border border-ui-border transition-all transform hover:scale-[1.02] hover:shadow-soft-md text-center"
          >
            Join Game
          </Link>

          <Link
            href="/test"
            className="w-full py-3 px-6 bg-ui-bg hover:bg-white text-ui-text-muted font-medium rounded-xl transition-all text-center border border-ui-border/50"
          >
            Preview 3D Board
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-4">
          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 bg-resource-grain/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎲</span>
            </div>
            <h3 className="font-semibold text-ui-text mb-2">Full Game Rules</h3>
            <p className="text-sm text-ui-text-muted">
              Complete Catan mechanics including trading, dev cards, and robber
            </p>
          </div>

          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 bg-ui-accent/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="font-semibold text-ui-text mb-2">Play Online</h3>
            <p className="text-sm text-ui-text-muted">
              Share a link with friends - no downloads or accounts required
            </p>
          </div>

          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 bg-resource-lumber/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h3 className="font-semibold text-ui-text mb-2">3D Experience</h3>
            <p className="text-sm text-ui-text-muted">
              Beautiful 3D board you can rotate, zoom, and explore
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-ui-text-muted text-sm">
          Built with Next.js, Three.js & Socket.io
        </footer>
      </div>
    </main>
  )
}
