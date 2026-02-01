'use client'

import { useGameStore, useIsMyTurn, useTurnPhase, useGamePhase } from '@/stores/gameStore'
import { BUILDING_COSTS, canAfford } from '@catan/shared'

export function ActionButtons() {
  const isMyTurn = useIsMyTurn()
  const turnPhase = useTurnPhase()
  const gamePhase = useGamePhase()
  const myResources = useGameStore((state) => state.myResources)
  const { ui, actions } = useGameStore()

  // Check if we're in setup phase
  const isSetupPhase = gamePhase === 'setup_first' || gamePhase === 'setup_second'

  const canBuildRoad = isSetupPhase || canAfford(myResources, BUILDING_COSTS.road)
  const canBuildSettlement = isSetupPhase || canAfford(myResources, BUILDING_COSTS.settlement)
  const canBuildCity = !isSetupPhase && canAfford(myResources, BUILDING_COSTS.city)
  const canBuyDevCard = !isSetupPhase && canAfford(myResources, BUILDING_COSTS.devCard)

  const isMainPhase = turnPhase === 'main'
  const canTakeActions = isMyTurn && (isMainPhase || isSetupPhase)

  const handleBuildMode = (mode: 'road' | 'settlement' | 'city') => {
    if (ui.buildMode === mode) {
      actions.setBuildMode('none')
    } else {
      actions.setBuildMode(mode)
    }
  }

  return (
    <div className="space-y-2">
      {/* Build buttons */}
      <div className="glass-card p-3">
        <h3 className="font-semibold text-ui-text text-sm mb-3">Build</h3>

        <div className="space-y-2">
          <button
            onClick={() => handleBuildMode('road')}
            disabled={!canTakeActions || !canBuildRoad}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${ui.buildMode === 'road'
                ? 'bg-ui-accent text-white'
                : canTakeActions && canBuildRoad
                  ? 'bg-white hover:bg-gray-50 text-ui-text border border-ui-border'
                  : 'bg-gray-100 text-ui-text-muted cursor-not-allowed'
              }`}
          >
            <span>🛤️ Road</span>
            <span className="text-xs opacity-70">1🧱 1🪵</span>
          </button>

          <button
            onClick={() => handleBuildMode('settlement')}
            disabled={!canTakeActions || !canBuildSettlement}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${ui.buildMode === 'settlement'
                ? 'bg-ui-accent text-white'
                : canTakeActions && canBuildSettlement
                  ? 'bg-white hover:bg-gray-50 text-ui-text border border-ui-border'
                  : 'bg-gray-100 text-ui-text-muted cursor-not-allowed'
              }`}
          >
            <span>🏠 Settlement</span>
            <span className="text-xs opacity-70">1🧱 1🪵 1🌾 1🐑</span>
          </button>

          <button
            onClick={() => handleBuildMode('city')}
            disabled={!canTakeActions || !canBuildCity}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${ui.buildMode === 'city'
                ? 'bg-ui-accent text-white'
                : canTakeActions && canBuildCity
                  ? 'bg-white hover:bg-gray-50 text-ui-text border border-ui-border'
                  : 'bg-gray-100 text-ui-text-muted cursor-not-allowed'
              }`}
          >
            <span>🏰 City</span>
            <span className="text-xs opacity-70">3�ite 2🌾</span>
          </button>
        </div>
      </div>

      {/* Other actions */}
      <div className="glass-card p-3">
        <div className="space-y-2">
          <button
            disabled={!canTakeActions || !canBuyDevCard}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${canTakeActions && canBuyDevCard
                ? 'bg-white hover:bg-gray-50 text-ui-text border border-ui-border'
                : 'bg-gray-100 text-ui-text-muted cursor-not-allowed'
              }`}
          >
            <span>🃏 Buy Dev Card</span>
            <span className="text-xs opacity-70">1⛰️ 1🌾 1🐑</span>
          </button>

          <button
            onClick={() => actions.toggleDevCardPanel()}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all bg-white hover:bg-gray-50 text-ui-text border border-ui-border"
          >
            📋 View Cards
          </button>

          <button
            onClick={() => actions.toggleTradePanel()}
            disabled={!canTakeActions}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all ${canTakeActions
                ? 'bg-white hover:bg-gray-50 text-ui-text border border-ui-border'
                : 'bg-gray-100 text-ui-text-muted cursor-not-allowed'
              }`}
          >
            🤝 Trade
          </button>
        </div>
      </div>

      {/* End turn button */}
      {isMyTurn && isMainPhase && (
        <button className="w-full py-3 px-4 bg-gradient-to-r from-ui-success to-green-400 text-white font-semibold rounded-xl shadow-soft transition-all hover:shadow-soft-md">
          End Turn ✓
        </button>
      )}
    </div>
  )
}
