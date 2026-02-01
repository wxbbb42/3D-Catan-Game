'use client'

import { useState } from 'react'
import { useGameStore, usePlayers, useMyPlayer, useIsMyTurn, useTurnPhase } from '@/stores/gameStore'
import { ResourceType, RESOURCE_TYPES, canAfford, createEmptyResources } from '@catan/shared'
import type { ResourceCount } from '@catan/shared'

// Resource icons
const RESOURCE_ICONS: Record<ResourceType, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛰️',
  grain: '🌾',
  wool: '🐑',
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  brick: 'bg-terrain-hills',
  lumber: 'bg-terrain-forest',
  ore: 'bg-terrain-mountains',
  grain: 'bg-terrain-fields',
  wool: 'bg-terrain-pasture',
}

interface ResourceSelectorProps {
  label: string
  resources: ResourceCount
  maxResources?: ResourceCount
  onChange: (resources: ResourceCount) => void
  disabled?: boolean
}

function ResourceSelector({ label, resources, maxResources, onChange, disabled }: ResourceSelectorProps) {
  const handleChange = (type: ResourceType, delta: number) => {
    const current = resources[type] ?? 0
    const max = maxResources?.[type] ?? 99
    const newValue = Math.max(0, Math.min(max, current + delta))
    onChange({ ...resources, [type]: newValue })
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-ui-text">{label}</h4>
      <div className="grid grid-cols-5 gap-1">
        {RESOURCE_TYPES.map((type) => (
          <div
            key={type}
            className={`${RESOURCE_COLORS[type]} rounded-lg p-2 flex flex-col items-center`}
          >
            <span className="text-lg">{RESOURCE_ICONS[type]}</span>
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => handleChange(type, -1)}
                disabled={disabled || (resources[type] ?? 0) <= 0}
                className="w-5 h-5 rounded bg-white/50 hover:bg-white/80 disabled:opacity-30 text-xs font-bold"
              >
                -
              </button>
              <span className="text-sm font-semibold w-4 text-center">
                {resources[type] ?? 0}
              </span>
              <button
                onClick={() => handleChange(type, 1)}
                disabled={disabled || (maxResources && (resources[type] ?? 0) >= (maxResources[type] ?? 0))}
                className="w-5 h-5 rounded bg-white/50 hover:bg-white/80 disabled:opacity-30 text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Bank Trade Panel
function BankTradePanel() {
  const myPlayer = useMyPlayer()
  const [giveResource, setGiveResource] = useState<ResourceType | null>(null)
  const [wantResource, setWantResource] = useState<ResourceType | null>(null)

  const myResources = myPlayer?.resources ?? createEmptyResources()

  // TODO: Check ports for better rates
  const tradeRate = 4

  const canTrade = giveResource &&
    wantResource &&
    giveResource !== wantResource &&
    (myResources[giveResource] ?? 0) >= tradeRate

  const handleTrade = () => {
    if (!canTrade) return
    // TODO: Send trade to server
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-ui-text">Bank Trade (4:1)</h3>

      <div>
        <p className="text-sm text-ui-text-muted mb-2">You give {tradeRate}:</p>
        <div className="flex gap-2 flex-wrap">
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setGiveResource(type)}
              disabled={(myResources[type] ?? 0) < tradeRate}
              className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-all ${
                giveResource === type
                  ? 'ring-2 ring-ui-accent bg-ui-accent/20'
                  : 'bg-gray-100 hover:bg-gray-200'
              } ${(myResources[type] ?? 0) < tradeRate ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{RESOURCE_ICONS[type]}</span>
              <span className="text-xs">({myResources[type] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-ui-text-muted mb-2">You receive 1:</p>
        <div className="flex gap-2 flex-wrap">
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setWantResource(type)}
              disabled={type === giveResource}
              className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-all ${
                wantResource === type
                  ? 'ring-2 ring-ui-accent bg-ui-accent/20'
                  : 'bg-gray-100 hover:bg-gray-200'
              } ${type === giveResource ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{RESOURCE_ICONS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleTrade}
        disabled={!canTrade}
        className={`w-full py-2 rounded-lg font-medium transition-all ${
          canTrade
            ? 'bg-ui-success text-white hover:bg-green-500'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Trade with Bank
      </button>
    </div>
  )
}

// Player Trade Panel
function PlayerTradePanel() {
  const players = usePlayers()
  const myPlayer = useMyPlayer()
  const [offering, setOffering] = useState<ResourceCount>(createEmptyResources())
  const [requesting, setRequesting] = useState<ResourceCount>(createEmptyResources())
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const myResources = myPlayer?.resources ?? createEmptyResources()
  const otherPlayers = players.filter((p) => p.id !== myPlayer?.id)

  const hasOffer = RESOURCE_TYPES.some((type) => (offering[type] ?? 0) > 0)
  const hasRequest = RESOURCE_TYPES.some((type) => (requesting[type] ?? 0) > 0)
  const canPropose = hasOffer && hasRequest && canAfford(myResources, offering)

  const handlePropose = () => {
    if (!canPropose) return
    // TODO: Send trade proposal to server
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-ui-text">Trade with Players</h3>

      {/* Player selection */}
      <div>
        <p className="text-sm text-ui-text-muted mb-2">Trade with:</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPlayerId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              selectedPlayerId === null
                ? 'bg-ui-accent text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All Players
          </button>
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayerId(player.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
                selectedPlayerId === player.id
                  ? 'bg-ui-accent text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full bg-player-${player.color}`}
              />
              {player.username}
            </button>
          ))}
        </div>
      </div>

      {/* Offering */}
      <ResourceSelector
        label="You offer:"
        resources={offering}
        maxResources={myResources}
        onChange={setOffering}
      />

      {/* Arrow divider */}
      <div className="flex justify-center">
        <span className="text-2xl">⇅</span>
      </div>

      {/* Requesting */}
      <ResourceSelector
        label="You want:"
        resources={requesting}
        onChange={setRequesting}
      />

      <button
        onClick={handlePropose}
        disabled={!canPropose}
        className={`w-full py-2 rounded-lg font-medium transition-all ${
          canPropose
            ? 'bg-ui-accent text-white hover:bg-blue-500'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Propose Trade
      </button>
    </div>
  )
}

// Incoming Trade Notification
function IncomingTrade() {
  const game = useGameStore((state) => state.game)
  const myPlayer = useMyPlayer()
  const players = usePlayers()

  const activeTrade = game?.activeTrade
  if (!activeTrade || activeTrade.proposerId === myPlayer?.id) {
    return null
  }

  // Check if we're the target or if it's open to all
  if (activeTrade.targetPlayerId && activeTrade.targetPlayerId !== myPlayer?.id) {
    return null
  }

  const proposer = players.find((p) => p.id === activeTrade.proposerId)

  return (
    <div className="glass-card p-4 border-2 border-ui-accent animate-pulse">
      <h3 className="font-semibold text-ui-text mb-3">
        Trade Offer from {proposer?.username ?? 'Unknown'}
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-ui-text-muted mb-1">They offer:</p>
          <div className="flex gap-1 flex-wrap">
            {RESOURCE_TYPES.map((type) =>
              (activeTrade.offering[type] ?? 0) > 0 ? (
                <span
                  key={type}
                  className={`${RESOURCE_COLORS[type]} px-2 py-1 rounded text-sm`}
                >
                  {activeTrade.offering[type]} {RESOURCE_ICONS[type]}
                </span>
              ) : null
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-ui-text-muted mb-1">They want:</p>
          <div className="flex gap-1 flex-wrap">
            {RESOURCE_TYPES.map((type) =>
              (activeTrade.requesting[type] ?? 0) > 0 ? (
                <span
                  key={type}
                  className={`${RESOURCE_COLORS[type]} px-2 py-1 rounded text-sm`}
                >
                  {activeTrade.requesting[type]} {RESOURCE_ICONS[type]}
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            /* TODO: Accept trade */
          }}
          className="flex-1 py-2 bg-ui-success text-white rounded-lg font-medium hover:bg-green-500"
        >
          Accept
        </button>
        <button
          onClick={() => {
            /* TODO: Reject trade */
          }}
          className="flex-1 py-2 bg-ui-error text-white rounded-lg font-medium hover:bg-red-500"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// Main Trade Panel
export function TradePanel() {
  const [activeTab, setActiveTab] = useState<'bank' | 'players'>('bank')
  const showPanel = useGameStore((state) => state.ui.showTradePanel)
  const actions = useGameStore((state) => state.actions)
  const isMyTurn = useIsMyTurn()
  const turnPhase = useTurnPhase()

  if (!showPanel) {
    return null
  }

  const canTrade = isMyTurn && turnPhase === 'main'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="glass-card w-full max-w-md max-h-[80vh] overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ui-text">Trade</h2>
          <button
            onClick={() => actions.toggleTradePanel()}
            className="text-ui-text-muted hover:text-ui-text"
          >
            ✕
          </button>
        </div>

        {/* Incoming trade notification */}
        <IncomingTrade />

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'bank'
                ? 'bg-ui-accent text-white'
                : 'bg-gray-100 text-ui-text hover:bg-gray-200'
            }`}
          >
            🏦 Bank
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'players'
                ? 'bg-ui-accent text-white'
                : 'bg-gray-100 text-ui-text hover:bg-gray-200'
            }`}
          >
            👥 Players
          </button>
        </div>

        {/* Content */}
        {!canTrade && (
          <div className="text-center text-ui-text-muted py-4 mb-4 bg-gray-100 rounded-lg">
            Wait for your turn to trade
          </div>
        )}

        <div className={!canTrade ? 'opacity-50 pointer-events-none' : ''}>
          {activeTab === 'bank' ? <BankTradePanel /> : <PlayerTradePanel />}
        </div>
      </div>
    </div>
  )
}
