'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [showMenu, setShowMenu] = useState(false)

  if (status === 'loading') {
    return (
      <div className="glass-card px-4 py-2 animate-pulse">
        <div className="w-20 h-4 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="glass-card px-4 py-2 hover:bg-white/30 transition-all text-ui-text font-medium"
      >
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="glass-card px-3 py-2 flex items-center gap-2 hover:bg-white/30 transition-all"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? 'User'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ui-accent flex items-center justify-center text-white font-semibold">
            {session.user.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        <span className="text-ui-text font-medium max-w-[100px] truncate">
          {session.user.name}
        </span>
        <svg
          className={`w-4 h-4 text-ui-text-muted transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-48 glass-card p-2 z-50">
            <div className="px-3 py-2 border-b border-ui-border mb-2">
              <p className="text-sm font-medium text-ui-text truncate">{session.user.name}</p>
              <p className="text-xs text-ui-text-muted truncate">{session.user.email}</p>
            </div>

            <button
              onClick={() => {
                setShowMenu(false)
                signOut({ callbackUrl: '/' })
              }}
              className="w-full px-3 py-2 text-left text-sm text-ui-text hover:bg-gray-100 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
