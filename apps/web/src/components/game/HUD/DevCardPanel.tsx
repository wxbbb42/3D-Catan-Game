'use client'

import { useState, useEffect, useCallback } from 'react'
import { useGameStore, useMyPlayer, useIsMyTurn, useTurnPhase } from '@/stores/gameStore'
import type { DevCard, DevCardType } from '@catan/shared'

// Dev card info
const DEV_CARD_INFO: Record<DevCardType, { name: string; icon: string; description: string }> = {
  knight: {
    name: 'Knight',
    icon: '⚔️',
    description: 'Move the robber and steal a resource from an adjacent player.',
  },
  victory_point: {
    name: 'Victory Point',
    icon: '🏆',
    description: 'Worth 1 victory point. Revealed at game end.',
  },
  road_building: {
    name: 'Road Building',
    icon: '🛤️',
    description: 'Build 2 roads for free.',
  },
  year_of_plenty: {
    name: 'Year of Plenty',
    icon: '🎁',
    description: 'Take any 2 resources from the bank.',
  },
  monopoly: {
    name: 'Monopoly',
    icon: '💰',
    description: 'Choose a resource. All players must give you all of that resource.',
  },
}

interface DevCardItemProps {
  card: DevCard
  canPlay: boolean
  onPlay: (card: DevCard) => void
}

function DevCardItem({ card, canPlay, onPlay }: DevCardItemProps) {
  const info = DEV_CARD_INFO[card.type]
  const isVP = card.type === 'victory_point'

  return (
    <div
      className={`glass-card p-3 flex flex-col items-center text-center transition-all ${
        canPlay && !isVP ? 'hover:scale-105 cursor-pointer hover:shadow-soft-md' : ''
      } ${card.played ? 'opacity-50' : ''}`}
      onClick={() => canPlay && !isVP && !card.played && onPlay(card)}
    >
      <span className="text-3xl mb-1">{info.icon}</span>
      <h4 className="font-semibold text-ui-text text-sm">{info.name}</h4>
      <p className="text-xs text-ui-text-muted mt-1">{info.description}</p>
      {card.played && (
        <span className="mt-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Played</span>
      )}
      {isVP && !card.played && (
        <span className="mt-2 text-xs bg-yellow-200 px-2 py-0.5 rounded">+1 VP</span>
      )}
    </div>
  )
}

// Year of Plenty dialog
interface YearOfPlentyDialogProps {
  onSelect: (resources: [string, string]) => void
  onCancel: () => void
}

function YearOfPlentyDialog({ onSelect, onCancel }: YearOfPlentyDialogProps) {
  const [selected, setSelected] = useState<string[]>([])
  const resources = ['brick', 'lumber', 'ore', 'grain', 'wool']
  const icons: Record<string, string> = {
    brick: '🧱',
    lumber: '🪵',
    ore: '⛰️',
    grain: '🌾',
    wool: '🐑',
  }

  const handleSelect = (resource: string) => {
    if (selected.length < 2) {
      setSelected([...selected, resource])
    }
  }

  const canConfirm = selected.length === 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="glass-card p-6 w-80">
        <h3 className="font-bold text-lg text-ui-text mb-4">Year of Plenty</h3>
        <p className="text-sm text-ui-text-muted mb-4">Select 2 resources to take from the bank:</p>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {resources.map((res) => (
            <button
              key={res}
              onClick={() => handleSelect(res)}
              className={`p-2 rounded-lg transition-all ${
                selected.filter((s) => s === res).length > 0
                  ? 'bg-ui-accent text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="text-xl">{icons[res]}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <span className="text-sm">Selected: </span>
          {selected.map((res, i) => (
            <span key={i} className="text-lg">
              {icons[res]}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-200 text-ui-text rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onSelect(selected as [string, string])}
            disabled={!canConfirm}
            className={`flex-1 py-2 rounded-lg ${
              canConfirm
                ? 'bg-ui-success text-white hover:bg-green-500'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Monopoly dialog
interface MonopolyDialogProps {
  onSelect: (resource: string) => void
  onCancel: () => void
}

function MonopolyDialog({ onSelect, onCancel }: MonopolyDialogProps) {
  const resources = ['brick', 'lumber', 'ore', 'grain', 'wool']
  const icons: Record<string, string> = {
    brick: '🧱',
    lumber: '🪵',
    ore: '⛰️',
    grain: '🌾',
    wool: '🐑',
  }
  const names: Record<string, string> = {
    brick: 'Brick',
    lumber: 'Lumber',
    ore: 'Ore',
    grain: 'Grain',
    wool: 'Wool',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="glass-card p-6 w-80">
        <h3 className="font-bold text-lg text-ui-text mb-4">Monopoly</h3>
        <p className="text-sm text-ui-text-muted mb-4">
          Choose a resource. All players must give you all of that resource:
        </p>

        <div className="space-y-2 mb-4">
          {resources.map((res) => (
            <button
              key={res}
              onClick={() => onSelect(res)}
              className="w-full p-3 rounded-lg bg-gray-100 hover:bg-ui-accent hover:text-white transition-all flex items-center gap-3"
            >
              <span className="text-2xl">{icons[res]}</span>
              <span className="font-medium">{names[res]}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 bg-gray-200 text-ui-text rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function DevCardPanel() {
  const showPanel = useGameStore((state) => state.ui.showDevCardPanel)
  const { actions } = useGameStore()
  const myPlayer = useMyPlayer()
  const isMyTurn = useIsMyTurn()
  const turnPhase = useTurnPhase()
  const game = useGameStore((state) => state.game)

  const [activeDialog, setActiveDialog] = useState<'year_of_plenty' | 'monopoly' | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedCard, setSelectedCard] = useState<DevCard | null>(null)

  const handleClose = useCallback(() => {
    actions.toggleDevCardPanel()
  }, [actions])

  // Close on Escape key
  useEffect(() => {
    if (!showPanel) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPanel, handleClose])

  if (!showPanel) {
    return null
  }

  const devCards = myPlayer?.devCards ?? []
  const currentTurn = game?.turnNumber ?? 0

  // Can only play cards during main phase on your turn
  // Cannot play cards purchased this turn
  const canPlayCards = isMyTurn && turnPhase === 'main'

  const handlePlayCard = (card: DevCard) => {
    if (!canPlayCards || card.purchasedOnTurn === currentTurn) return

    setSelectedCard(card)

    switch (card.type) {
      case 'knight':
        // TODO: Activate robber placement mode
        break
      case 'road_building':
        // TODO: Activate road building mode (2 free roads)
        break
      case 'year_of_plenty':
        setActiveDialog('year_of_plenty')
        break
      case 'monopoly':
        setActiveDialog('monopoly')
        break
      default:
        break
    }
  }

  const handleYearOfPlenty = (_resources: [string, string]) => {
    // TODO: Send to server
    setActiveDialog(null)
    setSelectedCard(null)
  }

  const handleMonopoly = (_resource: string) => {
    // TODO: Send to server
    setActiveDialog(null)
    setSelectedCard(null)
  }

  const cardsByType: Record<DevCardType, DevCard[]> = {
    knight: [],
    victory_point: [],
    road_building: [],
    year_of_plenty: [],
    monopoly: [],
  }

  devCards.forEach((card) => {
    cardsByType[card.type].push(card)
  })

  const unplayedCount = devCards.filter((c) => !c.played && c.type !== 'victory_point').length
  const vpCount = devCards.filter((c) => c.type === 'victory_point').length
  const knightCount = devCards.filter((c) => c.type === 'knight' && c.played).length

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        onClick={handleClose}
      >
        <div
          className="glass-card w-full max-w-lg max-h-[80vh] overflow-y-auto p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-ui-text">Development Cards</h2>
              <p className="text-sm text-ui-text-muted">
                {unplayedCount} playable • {vpCount} VP • {knightCount} knights played
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-ui-text-muted hover:text-ui-text hover:bg-gray-100 rounded-lg transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Instructions */}
          {!canPlayCards && (
            <div className="text-center text-ui-text-muted py-3 mb-4 bg-gray-100 rounded-lg text-sm">
              {!isMyTurn
                ? 'Wait for your turn to play cards'
                : 'Roll the dice first, then play cards'}
            </div>
          )}

          {/* Cards */}
          {devCards.length === 0 ? (
            <div className="text-center py-8 text-ui-text-muted">
              <p className="text-4xl mb-2">🃏</p>
              <p>No development cards yet</p>
              <p className="text-sm mt-1">Buy cards during your turn</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {devCards.map((card) => (
                <DevCardItem
                  key={card.id}
                  card={card}
                  canPlay={canPlayCards && card.purchasedOnTurn !== currentTurn}
                  onPlay={handlePlayCard}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {activeDialog === 'year_of_plenty' && (
        <YearOfPlentyDialog
          onSelect={handleYearOfPlenty}
          onCancel={() => {
            setActiveDialog(null)
            setSelectedCard(null)
          }}
        />
      )}

      {activeDialog === 'monopoly' && (
        <MonopolyDialog
          onSelect={handleMonopoly}
          onCancel={() => {
            setActiveDialog(null)
            setSelectedCard(null)
          }}
        />
      )}
    </>
  )
}
