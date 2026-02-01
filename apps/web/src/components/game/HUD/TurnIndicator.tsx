'use client'

import { useCurrentPlayer, useGameStore, useGamePhase } from '@/stores/gameStore'

export function TurnIndicator() {
  const currentPlayer = useCurrentPlayer()
  const game = useGameStore((state) => state.game)
  const gamePhase = useGamePhase()

  if (!currentPlayer || !game) return null

  // Setup phase labels
  const phaseLabels: Record<string, string> = {
    setup_first: 'Setup Round 1',
    setup_second: 'Setup Round 2',
    playing: '',
  }

  const turnPhaseLabels: Record<string, string> = {
    pre_roll: 'Roll dice',
    post_roll: 'Collecting resources',
    robber_move: 'Move robber',
    robber_steal: 'Steal resource',
    discard: 'Discard cards',
    main: gamePhase?.startsWith('setup') ? 'Place settlement & road' : 'Build & trade',
    road_building: 'Place roads',
    year_of_plenty: 'Take resources',
    monopoly: 'Take all of one',
  }

  const isSetupPhase = gamePhase === 'setup_first' || gamePhase === 'setup_second'

  return (
    <div className="glass-card px-4 py-2 flex items-center gap-3">
      <div
        className={`w-4 h-4 rounded-full shadow-soft ${currentPlayer.color === 'red'
            ? 'bg-player-red'
            : currentPlayer.color === 'blue'
              ? 'bg-player-blue'
              : currentPlayer.color === 'orange'
                ? 'bg-player-orange'
                : 'bg-player-white border border-gray-200'
          }`}
      />
      <div>
        <div className="font-medium text-ui-text">{currentPlayer.username}'s Turn</div>
        <div className="text-xs text-ui-text-muted">
          {turnPhaseLabels[game.turnPhase] ?? game.turnPhase}
        </div>
      </div>
      {isSetupPhase ? (
        <div className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
          {phaseLabels[gamePhase] ?? 'Setup'}
        </div>
      ) : (
        <div className="text-xs bg-ui-border/50 px-2 py-1 rounded">
          Turn {game.turnNumber}
        </div>
      )}
    </div>
  )
}
