'use client'

import { useState, useMemo } from 'react'
import { useGameStore, usePlayers, useMyPlayer, useBoard } from '@/stores/gameStore'
import { RESOURCE_TYPES, countResources } from '@catan/shared'
import type { ResourceCount, ResourceType, HexTile, PlayerState } from '@catan/shared'

// Resource icons
const RESOURCE_ICONS: Record<ResourceType, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛰️',
  grain: '🌾',
  wool: '🐑',
}

// Discard Panel - shown when rolling 7 with >7 cards
interface DiscardPanelProps {
  requiredDiscard: number
  onDiscard: (resources: ResourceCount) => void
}

export function DiscardPanel({ requiredDiscard, onDiscard }: DiscardPanelProps) {
  const myPlayer = useMyPlayer()
  const myResources = myPlayer?.resources ?? { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 }

  const [toDiscard, setToDiscard] = useState<ResourceCount>({
    brick: 0,
    lumber: 0,
    ore: 0,
    grain: 0,
    wool: 0,
  })

  const totalSelected = countResources(toDiscard)
  const canConfirm = totalSelected === requiredDiscard

  const handleChange = (type: ResourceType, delta: number) => {
    const current = toDiscard[type]
    const max = myResources[type]
    const newValue = Math.max(0, Math.min(max, current + delta))
    setToDiscard({ ...toDiscard, [type]: newValue })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="glass-card p-6 w-96">
        <h2 className="text-xl font-bold text-ui-text mb-2">Discard Resources</h2>
        <p className="text-sm text-ui-text-muted mb-4">
          A 7 was rolled! You have more than 7 cards. Discard {requiredDiscard} cards.
        </p>

        <div className="space-y-3 mb-4">
          {RESOURCE_TYPES.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{RESOURCE_ICONS[type]}</span>
                <span className="text-sm text-ui-text-muted">
                  ({myResources[type]} available)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleChange(type, -1)}
                  disabled={toDiscard[type] <= 0}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold">{toDiscard[type]}</span>
                <button
                  onClick={() => handleChange(type, 1)}
                  disabled={toDiscard[type] >= myResources[type] || totalSelected >= requiredDiscard}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-ui-text-muted">
            Selected: {totalSelected} / {requiredDiscard}
          </span>
          <div className="flex gap-1">
            {RESOURCE_TYPES.map((type) =>
              toDiscard[type] > 0 ? (
                <span key={type}>
                  {toDiscard[type]}
                  {RESOURCE_ICONS[type]}
                </span>
              ) : null
            )}
          </div>
        </div>

        <button
          onClick={() => onDiscard(toDiscard)}
          disabled={!canConfirm}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            canConfirm
              ? 'bg-ui-error text-white hover:bg-red-500'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Discard {totalSelected} Cards
        </button>
      </div>
    </div>
  )
}

// Steal Panel - shown after moving robber
interface StealPanelProps {
  targetHex: HexTile
  eligiblePlayers: PlayerState[]
  onSteal: (playerId: string) => void
  onSkip: () => void
}

export function StealPanel({ targetHex: _targetHex, eligiblePlayers, onSteal, onSkip }: StealPanelProps) {
  if (eligiblePlayers.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="glass-card p-6 w-80 text-center">
          <h2 className="text-xl font-bold text-ui-text mb-2">No Targets</h2>
          <p className="text-sm text-ui-text-muted mb-4">
            No players have settlements or cities adjacent to this hex.
          </p>
          <button
            onClick={onSkip}
            className="w-full py-3 bg-ui-accent text-white rounded-lg font-semibold hover:bg-blue-500"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="glass-card p-6 w-80">
        <h2 className="text-xl font-bold text-ui-text mb-2">Steal a Resource</h2>
        <p className="text-sm text-ui-text-muted mb-4">
          Choose a player to steal from:
        </p>

        <div className="space-y-2">
          {eligiblePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onSteal(player.id)}
              className="w-full p-3 rounded-lg bg-gray-100 hover:bg-ui-accent hover:text-white transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full bg-player-${player.color}`}
                />
                <span className="font-medium">{player.username}</span>
              </div>
              <span className="text-sm opacity-70">
                {countResources(player.resources)} cards
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Robber Placement Mode Indicator
export function RobberPlacementIndicator() {
  // When robber mode is active (we'll use a special build mode)
  // For now, just show a simple indicator
  return null
}

// Hook to determine if player needs to discard
export function useNeedsDiscard(): number {
  const myPlayer = useMyPlayer()
  const game = useGameStore((state) => state.game)

  if (!myPlayer || !game) return 0

  // Check if we're in the discard phase after a 7
  const pendingDiscard = game.pendingDiscards?.find(
    (pd) => pd.playerId === myPlayer.id && !pd.discarded
  )
  if (!pendingDiscard) return 0

  return pendingDiscard.amountToDiscard
}

// Main Robber Panel - orchestrates the robber flow
export function RobberPanel() {
  const myPlayer = useMyPlayer()
  const players = usePlayers()
  const board = useBoard()
  const needsDiscard = useNeedsDiscard()

  const [robberPhase, setRobberPhase] = useState<'discard' | 'place' | 'steal' | null>(null)
  const [newRobberHex, setNewRobberHex] = useState<HexTile | null>(null)

  // Determine eligible steal targets for a hex
  const eligiblePlayers = useMemo(() => {
    if (!newRobberHex || !board || !myPlayer) return []

    // Find players with buildings adjacent to the hex
    // For now, return empty as this requires vertex/hex adjacency calculation
    // TODO: Implement proper adjacency check
    return players.filter(
      (p) => p.id !== myPlayer.id && countResources(p.resources) > 0
    )
  }, [newRobberHex, board, myPlayer, players])

  // Handle discard
  const handleDiscard = (_resources: ResourceCount) => {
    // TODO: Send to server
    setRobberPhase(null)
  }

  // Handle steal
  const handleSteal = (_playerId: string) => {
    // TODO: Send to server
    setRobberPhase(null)
    setNewRobberHex(null)
  }

  // Show discard panel if needed
  if (needsDiscard > 0) {
    return <DiscardPanel requiredDiscard={needsDiscard} onDiscard={handleDiscard} />
  }

  // Show steal panel if robber was just placed
  if (robberPhase === 'steal' && newRobberHex) {
    return (
      <StealPanel
        targetHex={newRobberHex}
        eligiblePlayers={eligiblePlayers}
        onSteal={handleSteal}
        onSkip={() => {
          setRobberPhase(null)
          setNewRobberHex(null)
        }}
      />
    )
  }

  return null
}
