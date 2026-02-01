'use client'

import { useState } from 'react'
import { useGameStore, useIsMyTurn, useTurnPhase } from '@/stores/gameStore'

export function DiceDisplay() {
  const game = useGameStore((state) => state.game)
  const isMyTurn = useIsMyTurn()
  const turnPhase = useTurnPhase()
  const [isRolling, setIsRolling] = useState(false)

  const lastRoll = game?.lastDiceRoll
  const canRoll = isMyTurn && turnPhase === 'pre_roll'

  const handleRoll = async () => {
    if (!canRoll || isRolling) return

    setIsRolling(true)

    // Simulate dice roll animation
    await new Promise((resolve) => setTimeout(resolve, 600))

    // TODO: Send roll to server
    // For now, just update local state with random values
    const dice1 = Math.floor(Math.random() * 6) + 1
    const dice2 = Math.floor(Math.random() * 6) + 1

    useGameStore.getState().actions.setGameState({
      ...game!,
      lastDiceRoll: [dice1, dice2],
      turnPhase: dice1 + dice2 === 7 ? 'robber_move' : 'main',
    })

    setIsRolling(false)
  }

  const getDiceFace = (value: number) => {
    const faces: Record<number, string> = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅',
    }
    return faces[value] ?? '?'
  }

  return (
    <div className="glass-card p-3">
      <div
        className={`flex items-center gap-2 ${canRoll ? 'cursor-pointer' : ''}`}
        onClick={handleRoll}
      >
        {lastRoll ? (
          <>
            <span
              className={`text-4xl ${isRolling ? 'animate-spin' : ''}`}
              style={{ animationDuration: '0.15s' }}
            >
              {getDiceFace(lastRoll[0])}
            </span>
            <span
              className={`text-4xl ${isRolling ? 'animate-spin' : ''}`}
              style={{ animationDuration: '0.15s', animationDelay: '0.05s' }}
            >
              {getDiceFace(lastRoll[1])}
            </span>
            <div className="ml-2 text-center">
              <div className="text-2xl font-bold text-ui-text">
                {lastRoll[0] + lastRoll[1]}
              </div>
              <div className="text-xs text-ui-text-muted">Total</div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-ui-text-muted">
            <span className="text-4xl opacity-50">⚀</span>
            <span className="text-4xl opacity-50">⚀</span>
            <span className="text-sm ml-2">
              {canRoll ? 'Click to roll!' : 'Waiting...'}
            </span>
          </div>
        )}
      </div>

      {canRoll && !isRolling && (
        <button
          onClick={handleRoll}
          className="w-full mt-2 py-2 bg-ui-warning hover:bg-amber-300 text-amber-800 font-medium rounded-lg text-sm transition-all"
        >
          🎲 Roll Dice
        </button>
      )}
    </div>
  )
}
