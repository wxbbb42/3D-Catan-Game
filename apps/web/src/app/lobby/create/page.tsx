'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSocketContext } from '@/components/SocketProvider'

export default function CreateGamePage() {
  const router = useRouter()
  const { createLobby, lobby, error, isConnected, clearError } = useSocketContext()
  const [playerCount, setPlayerCount] = useState(4)
  const [isCreating, setIsCreating] = useState(false)

  // Navigate to lobby when it's created
  useEffect(() => {
    if (lobby && isCreating) {
      router.push(`/game/${lobby.code}`)
    }
  }, [lobby, isCreating, router])

  const handleCreate = () => {
    if (!isConnected) {
      return
    }

    setIsCreating(true)
    clearError()
    createLobby(playerCount)
  }

  return (
    <main className="min-h-screen bg-ui-bg">
      {/* Soft gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-ocean-light/30 via-ui-bg to-ui-accent/10 -z-10" />

      {/* Decorative blobs */}
      <div className="fixed top-40 right-20 w-72 h-72 bg-ui-accent/15 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-40 left-20 w-64 h-64 bg-ocean-light/20 rounded-full blur-3xl -z-10" />

      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-ui-text-muted hover:text-ui-text transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-ui-accent to-ocean-dark rounded-2xl shadow-soft-md mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-3xl font-bold text-ui-text mb-2">Create Game</h1>
            <p className="text-ui-text-muted">Set up a new game for you and your friends</p>
          </div>

          {/* Connection status */}
          {!isConnected && (
            <div className="glass-card p-4 mb-4 bg-yellow-50 border-yellow-200">
              <p className="text-sm text-yellow-700 flex items-center gap-2">
                <span className="animate-pulse">●</span>
                Connecting to server...
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="glass-card p-4 mb-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Game settings card */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-ui-text mb-4">Game Settings</h2>

            {/* Player count selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ui-text-muted mb-3">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayerCount(count)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      playerCount === count
                        ? 'bg-ui-accent text-white shadow-soft'
                        : 'bg-white border border-ui-border text-ui-text hover:border-ui-accent/50'
                    }`}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Player colors preview */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-ui-text-muted mb-3">
                Player Colors
              </label>
              <div className="flex gap-3">
                {['red', 'blue', 'orange', 'white'].slice(0, playerCount).map((color, i) => (
                  <div
                    key={color}
                    className={`w-10 h-10 rounded-xl shadow-soft border-2 border-white ${
                      color === 'red' ? 'bg-player-red' :
                      color === 'blue' ? 'bg-player-blue' :
                      color === 'orange' ? 'bg-player-orange' :
                      'bg-player-white border-gray-200'
                    }`}
                    title={`Player ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !isConnected}
            className="w-full py-4 px-6 bg-gradient-to-r from-ui-accent to-ocean-dark text-white font-semibold text-lg rounded-2xl shadow-soft-md transition-all hover:scale-[1.02] hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : !isConnected ? (
              'Connecting...'
            ) : (
              'Create Game'
            )}
          </button>

          {/* Info text */}
          <p className="text-center text-sm text-ui-text-muted mt-4">
            You'll get a shareable code to invite friends
          </p>
        </div>
      </div>
    </main>
  )
}
