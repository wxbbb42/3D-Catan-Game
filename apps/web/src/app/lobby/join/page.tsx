'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSocketContext } from '@/components/SocketProvider'

export default function JoinGamePage() {
  const router = useRouter()
  const { joinLobby, lobby, error: socketError, isConnected, clearError } = useSocketContext()
  const [gameCode, setGameCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Navigate to lobby when it's joined
  useEffect(() => {
    if (lobby && isJoining) {
      router.push(`/game/${lobby.code}`)
    }
  }, [lobby, isJoining, router])

  // Display socket error
  useEffect(() => {
    if (socketError && isJoining) {
      setLocalError(socketError)
      setIsJoining(false)
    }
  }, [socketError, isJoining])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    const code = gameCode.toUpperCase().trim()

    if (code.length !== 6) {
      setLocalError('Game code must be 6 characters')
      return
    }

    if (!isConnected) {
      setLocalError('Not connected to server')
      return
    }

    setIsJoining(true)
    joinLobby(code)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setGameCode(value)
    setLocalError(null)
    clearError()
  }

  const error = localError || (isJoining ? socketError : null)

  return (
    <main className="min-h-screen bg-ui-bg">
      {/* Soft gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-resource-lumber/10 via-ui-bg to-ocean-light/20 -z-10" />

      {/* Decorative blobs */}
      <div className="fixed top-32 left-20 w-64 h-64 bg-resource-lumber/15 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-32 right-20 w-72 h-72 bg-ocean-light/15 rounded-full blur-3xl -z-10" />

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-resource-lumber to-terrain-forest rounded-2xl shadow-soft-md mb-4">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-ui-text mb-2">Join Game</h1>
            <p className="text-ui-text-muted">Enter the game code shared by your friend</p>
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

          {/* Join form card */}
          <form onSubmit={handleJoin} className="glass-card p-6 mb-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-ui-text-muted mb-3">
                Game Code
              </label>
              <input
                type="text"
                value={gameCode}
                onChange={handleCodeChange}
                placeholder="ABCD12"
                className={`input-field text-center text-2xl font-mono tracking-widest uppercase ${
                  error ? 'border-ui-error focus:ring-ui-error/50 focus:border-ui-error' : ''
                }`}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-ui-error">{error}</p>
              )}
            </div>

            {/* Character count indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < gameCode.length ? 'bg-ui-accent' : 'bg-ui-border'
                  }`}
                />
              ))}
            </div>

            {/* Join button */}
            <button
              type="submit"
              disabled={isJoining || gameCode.length !== 6 || !isConnected}
              className="w-full py-4 px-6 bg-gradient-to-r from-resource-lumber to-terrain-forest text-white font-semibold text-lg rounded-2xl shadow-soft-md transition-all hover:scale-[1.02] hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining...
                </span>
              ) : !isConnected ? (
                'Connecting...'
              ) : (
                'Join Game'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-ui-border" />
            <span className="text-sm text-ui-text-muted">or</span>
            <div className="flex-1 h-px bg-ui-border" />
          </div>

          {/* Create game link */}
          <Link
            href="/lobby/create"
            className="block w-full py-3 px-6 bg-white text-ui-text font-medium rounded-xl shadow-soft border border-ui-border transition-all hover:shadow-soft-md text-center"
          >
            Create New Game Instead
          </Link>
        </div>
      </div>
    </main>
  )
}
