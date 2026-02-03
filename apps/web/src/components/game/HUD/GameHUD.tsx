'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsMyTurn, useGamePhase } from '@/stores/gameStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocketContext } from '@/components/SocketProvider'
import { ResourcePanel } from './ResourcePanel'
import { PlayerList } from './PlayerList'
import { ActionButtons } from './ActionButtons'
import { DiceDisplay } from './DiceDisplay'
import { TurnIndicator } from './TurnIndicator'
import { TradePanel } from './TradePanel'
import { DevCardPanel } from './DevCardPanel'
import { RobberPanel } from './RobberPanel'

interface GameHUDProps {
  gameCode: string
}

export function GameHUD({ gameCode }: GameHUDProps) {
  const router = useRouter()
  const isMyTurn = useIsMyTurn()
  const game = useGameStore((state) => state.game)
  const gamePhase = useGamePhase()
  const isSetupPhase = gamePhase === 'setup_first' || gamePhase === 'setup_second'
  const { leaveGame } = useSocketContext()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const handleExitGame = () => {
    leaveGame()
    router.push('/')
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar - Game info */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
        {/* Game code and exit button */}
        <div className="flex items-center gap-2">
          <div className="glass-card px-4 py-2">
            <div className="text-xs text-ui-text-muted uppercase tracking-wider mb-0.5">Game Code</div>
            <div className="font-mono font-bold text-ui-text tracking-wider">{gameCode}</div>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="glass-card px-3 py-3 hover:bg-red-50 transition-colors group"
            title="Exit Game"
          >
            <svg
              className="w-5 h-5 text-ui-text-muted group-hover:text-red-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* Turn indicator */}
        <TurnIndicator />

        {/* Dice display - hide during setup */}
        {!isSetupPhase && <DiceDisplay />}
      </div>

      {/* Left side - Player list */}
      <div className="absolute left-4 top-24 bottom-24 w-56 pointer-events-auto">
        <PlayerList />
      </div>

      {/* Right side - Action buttons + Setup hint */}
      <div className="absolute right-4 top-24 pointer-events-auto">
        <ActionButtons />

        {/* Setup phase hint - compact, below action buttons */}
        {isMyTurn && isSetupPhase && (
          <div className="mt-3 glass-card px-4 py-3 text-sm max-w-[200px]">
            <div className="font-semibold text-ui-text mb-1">
              {game?.setupState?.placementType === 'settlement' ? '🏠 Place Settlement' : '🛤️ Place Road'}
            </div>
            <div className="text-ui-text-muted text-xs">
              {game?.setupState?.placementType === 'settlement'
                ? 'Click a corner on the board'
                : 'Click an edge next to your settlement'}
            </div>
          </div>
        )}
      </div>

      {/* Bottom - Resource panel */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
        <div className="max-w-3xl mx-auto">
          <ResourcePanel />
        </div>
      </div>

      {/* Your turn overlay - only for dice roll, not setup */}
      {isMyTurn && game?.turnPhase === 'pre_roll' && !isSetupPhase && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-card px-8 py-6 text-center animate-pulse-soft pointer-events-auto">
            <h2 className="text-2xl font-bold text-ui-text mb-2">Your Turn!</h2>
            <p className="text-ui-text-muted">Click the dice to roll</p>
          </div>
        </div>
      )}

      {/* Trade panel modal */}
      <TradePanel />

      {/* Dev card panel modal */}
      <DevCardPanel />

      {/* Robber panel (discard/steal) */}
      <RobberPanel />

      {/* Exit game confirmation modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-auto z-50">
          <div className="glass-card p-6 max-w-sm mx-4">
            <h3 className="text-xl font-bold text-ui-text mb-3">Exit Game?</h3>
            <p className="text-ui-text-muted mb-6">
              Are you sure you want to leave this game? You may not be able to rejoin.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 px-4 bg-white text-ui-text font-medium rounded-lg border border-ui-border hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExitGame}
                className="flex-1 py-2 px-4 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                Exit Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
