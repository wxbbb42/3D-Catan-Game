'use client'

import { usePlayers, useCurrentPlayer, useMyPlayer } from '@/stores/gameStore'
import type { PlayerColor } from '@catan/shared'

const PLAYER_COLOR_CLASSES: Record<PlayerColor, string> = {
  red: 'bg-player-red',
  blue: 'bg-player-blue',
  orange: 'bg-player-orange',
  white: 'bg-player-white border border-gray-200',
}

export function PlayerList() {
  const players = usePlayers()
  const currentPlayer = useCurrentPlayer()
  const myPlayer = useMyPlayer()

  return (
    <div className="space-y-2">
      {players.map((player) => {
        const isCurrentTurn = currentPlayer?.id === player.id
        const isMe = myPlayer?.id === player.id

        return (
          <div
            key={player.id}
            className={`glass-card p-3 transition-all ${
              isCurrentTurn ? 'ring-2 ring-ui-accent shadow-glow' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Player color indicator */}
              <div
                className={`w-8 h-8 rounded-lg shadow-soft ${PLAYER_COLOR_CLASSES[player.color]}`}
              />

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ui-text truncate">
                    {player.username}
                  </span>
                  {isMe && (
                    <span className="text-xs bg-ui-accent/20 text-ui-accent px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-ui-text-muted">
                  {player.publicVictoryPoints} VP
                </div>
              </div>

              {/* Connection status */}
              <div
                className={`w-2 h-2 rounded-full ${
                  player.isConnected ? 'bg-ui-success' : 'bg-ui-error'
                }`}
              />
            </div>

            {/* Turn indicator */}
            {isCurrentTurn && (
              <div className="mt-2 text-xs text-ui-accent font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-ui-accent animate-pulse" />
                Current turn
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
