'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useGameStore } from '@/stores/gameStore'
import type { HexTile, TerrainType, SerializableBoardState, PlayerColor } from '@catan/shared'
import { hexSpiral, hexId, axialToWorld, HEX_TILE_RADIUS } from '@catan/shared'
import { Dice3D } from '@/components/game/Dice/Dice3D'

// Dynamic import for 3D component (client-side only)
const Board3D = dynamic(
  () => import('@/components/game/Board/Board3D').then((mod) => mod.Board3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-ocean-light/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ui-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ui-text-muted">Loading 3D board...</p>
        </div>
      </div>
    ),
  }
)

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

// Check if 6 and 8 are adjacent (they shouldn't be)
function hasAdjacentHighNumbers(hexes: HexTile[]): boolean {
  const highNumberHexes = hexes.filter(
    (h) => h.numberToken === 6 || h.numberToken === 8
  )

  for (const hex of highNumberHexes) {
    const worldPos = axialToWorld(hex.coord)

    for (const other of highNumberHexes) {
      if (hex.id === other.id) continue

      const otherPos = axialToWorld(other.coord)
      const distance = Math.sqrt(
        Math.pow(worldPos.x - otherPos.x, 2) +
        Math.pow(worldPos.z - otherPos.z, 2)
      )

      // If distance is less than 2 hex sizes, they're adjacent
      if (distance < HEX_TILE_RADIUS * 2.5) {
        return true
      }
    }
  }

  return false
}

// Generate a balanced Catan board
function generateBalancedBoard(): SerializableBoardState {
  const terrains: TerrainType[] = [
    'desert',
    'hills', 'hills', 'hills',
    'mountains', 'mountains', 'mountains',
    'forest', 'forest', 'forest', 'forest',
    'pasture', 'pasture', 'pasture', 'pasture',
    'fields', 'fields', 'fields', 'fields',
  ]

  const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
  const coords = hexSpiral({ q: 0, r: 0 }, 2)

  let hexes: HexTile[]
  let attempts = 0
  const maxAttempts = 100

  do {
    const shuffledTerrains = shuffle(terrains)
    const shuffledNumbers = shuffle(numbers)

    let numberIndex = 0
    hexes = coords.map((coord, index) => {
      const terrain = shuffledTerrains[index] ?? 'desert'
      const numberToken = terrain === 'desert' ? null : shuffledNumbers[numberIndex++] ?? null

      return {
        id: hexId(coord),
        coord,
        terrain,
        numberToken,
      }
    })

    attempts++
  } while (hasAdjacentHighNumbers(hexes) && attempts < maxAttempts)

  if (attempts >= maxAttempts) {
    console.warn('Could not generate board without adjacent 6/8 after', maxAttempts, 'attempts')
  }

  return {
    hexes,
    ports: [],
    vertices: [],
    edges: [],
    buildings: [],
    roads: [],
    robberHexId: hexes.find((h) => h.terrain === 'desert')?.id ?? hexes[0]?.id ?? '',
  }
}

export default function TestBoardPage() {
  const { actions } = useGameStore()
  const buildMode = useGameStore((state) => state.ui.buildMode)
  const [testPlayerColor, setTestPlayerColor] = useState<PlayerColor>('red')
  const [diceValues, setDiceValues] = useState<[number, number]>([1, 1])
  const [isRolling, setIsRolling] = useState(false)
  const [showDiceModal, setShowDiceModal] = useState(false)
  const [canConfirm, setCanConfirm] = useState(false)

  // Initialize test board on mount
  useEffect(() => {
    const testBoard = generateBalancedBoard()

    // Create a mock game state with test mode enabled
    actions.setGameState({
      id: 'test-game',
      code: 'TEST01',
      status: 'playing',
      phase: 'playing',
      board: testBoard,
      players: [
        { id: 'test-red', userId: 'user-red', username: 'Red Player', color: 'red', resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 }, devCards: [], settlements: [], cities: [], roads: [], knightsPlayed: 0, longestRoadLength: 0, hasLongestRoad: false, hasLargestArmy: false, publicVictoryPoints: 0, isConnected: true },
        { id: 'test-blue', userId: 'user-blue', username: 'Blue Player', color: 'blue', resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 }, devCards: [], settlements: [], cities: [], roads: [], knightsPlayed: 0, longestRoadLength: 0, hasLongestRoad: false, hasLargestArmy: false, publicVictoryPoints: 0, isConnected: true },
        { id: 'test-orange', userId: 'user-orange', username: 'Orange Player', color: 'orange', resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 }, devCards: [], settlements: [], cities: [], roads: [], knightsPlayed: 0, longestRoadLength: 0, hasLongestRoad: false, hasLargestArmy: false, publicVictoryPoints: 0, isConnected: true },
        { id: 'test-white', userId: 'user-white', username: 'White Player', color: 'white', resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 }, devCards: [], settlements: [], cities: [], roads: [], knightsPlayed: 0, longestRoadLength: 0, hasLongestRoad: false, hasLargestArmy: false, publicVictoryPoints: 0, isConnected: true },
      ],
      turnOrder: ['test-red', 'test-blue', 'test-orange', 'test-white'],
      currentPlayerIndex: 0,
      turnNumber: 1,
      turnPhase: 'main',
      lastDiceRoll: null,
      devCardDeckCount: 25,
      setupState: null,
      activeTrade: null,
      pendingDiscards: [],
      roadBuildingRoadsPlaced: 0,
      rollForOrderState: null,
      longestRoadHolder: null,
      longestRoadLength: 0,
      largestArmyHolder: null,
      largestArmySize: 0,
      winnerId: null,
      createdAt: Date.now(),
      startedAt: Date.now(),
      finishedAt: null,
    })

    // Enable test mode
    actions.setTestMode(true)
    actions.setTestPlayerColor(testPlayerColor)
  }, [actions])

  // Update test player color when changed
  useEffect(() => {
    actions.setTestPlayerColor(testPlayerColor)
  }, [testPlayerColor, actions])

  const handleRandomize = useCallback(() => {
    const newBoard = generateBalancedBoard()
    const state = useGameStore.getState().game
    if (state) {
      actions.setGameState({ ...state, board: newBoard })
    }
  }, [actions])

  const handleReset = useCallback(() => {
    const state = useGameStore.getState().game
    if (state) {
      const clearedBoard: SerializableBoardState = {
        ...state.board,
        buildings: [],
        roads: [],
      }
      actions.setGameState({ ...state, board: clearedBoard })
    }
  }, [actions])

  const handleRollDice = useCallback(() => {
    if (isRolling) return

    // Open modal and start rolling
    setShowDiceModal(true)
    setIsRolling(true)
    setCanConfirm(false)

    // Generate random dice values
    const die1 = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6
    const die2 = Math.floor(Math.random() * 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6
    setDiceValues([die1, die2])

    // Allow confirm after animation completes
    setTimeout(() => {
      setIsRolling(false)
      setCanConfirm(true)
    }, 1500)
  }, [isRolling])

  const handleConfirmDice = useCallback(() => {
    setShowDiceModal(false)
    setCanConfirm(false)
  }, [])

  const setBuildMode = useCallback((mode: 'settlement' | 'city' | 'road' | null) => {
    actions.setBuildMode(mode === null ? 'none' : mode)
  }, [actions])

  return (
    <main className="h-screen w-screen relative">
      <Board3D className="h-full w-full" />

      {/* Overlay UI - Title */}
      <div className="absolute top-4 left-4 glass-card p-3">
        <h1 className="text-base font-bold text-ui-text">3D Catan Test Page</h1>
        <p className="text-xs text-ui-text-muted">
          Drag to rotate • Scroll to zoom • Shift+drag to pan
        </p>
      </div>

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-4 right-4 glass-card px-3 py-2 flex items-center gap-2 text-sm text-ui-text hover:bg-white/90 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Home
      </Link>

      {/* Right side panel - Build Controls + Dice */}
      <div className="absolute top-14 right-4 glass-card p-3 w-44">
        {/* Player Color Selection */}
        <div className="mb-3">
          <label className="text-xs text-ui-text-muted mb-1 block">Player:</label>
          <div className="flex gap-1.5">
            {(['red', 'blue', 'orange', 'white'] as PlayerColor[]).map((color) => (
              <button
                key={color}
                onClick={() => setTestPlayerColor(color)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  testPlayerColor === color
                    ? 'border-ui-accent scale-110'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: color === 'red' ? '#D35F5F'
                    : color === 'blue' ? '#5F8FD3'
                    : color === 'orange' ? '#D3955F'
                    : '#E8E8E0'
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Build Mode Buttons */}
        <div className="space-y-1">
          <button
            onClick={() => setBuildMode(buildMode === 'settlement' ? null : 'settlement')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              buildMode === 'settlement'
                ? 'bg-green-500 text-white'
                : 'bg-white/50 text-ui-text hover:bg-white/80'
            }`}
          >
            🏠 Settlement
          </button>
          <button
            onClick={() => setBuildMode(buildMode === 'city' ? null : 'city')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              buildMode === 'city'
                ? 'bg-purple-500 text-white'
                : 'bg-white/50 text-ui-text hover:bg-white/80'
            }`}
          >
            🏰 City
          </button>
          <button
            onClick={() => setBuildMode(buildMode === 'road' ? null : 'road')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              buildMode === 'road'
                ? 'bg-amber-500 text-white'
                : 'bg-white/50 text-ui-text hover:bg-white/80'
            }`}
          >
            🛤️ Road
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-2 pt-2 border-t border-white/20 flex gap-1">
          <button
            onClick={handleReset}
            className="flex-1 px-2 py-1 rounded text-xs font-medium bg-red-500/80 text-white hover:bg-red-500 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleRandomize}
            className="flex-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500 transition-colors"
          >
            Random
          </button>
        </div>

        {/* Dice - simplified */}
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎲</span>
              <span className="text-lg font-bold text-ui-text">
                {isRolling ? '?' : diceValues[0] + diceValues[1]}
              </span>
            </div>
            <button
              onClick={handleRollDice}
              disabled={isRolling}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                isRolling
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isRolling ? '...' : 'Roll'}
            </button>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="absolute bottom-4 left-4 glass-card p-3">
        <h2 className="text-xs font-semibold text-ui-text mb-2">Terrain</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-hills" />
            <span className="text-ui-text-muted">Hills</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-forest" />
            <span className="text-ui-text-muted">Forest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-mountains" />
            <span className="text-ui-text-muted">Mountains</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-fields" />
            <span className="text-ui-text-muted">Fields</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-pasture" />
            <span className="text-ui-text-muted">Pasture</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-terrain-desert" />
            <span className="text-ui-text-muted">Desert</span>
          </div>
        </div>
      </div>

      {/* Dice Roll Modal */}
      {showDiceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-2xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-ui-text mb-4">🎲 Rolling Dice</h2>

            {/* 3D Dice */}
            <div className="mb-4">
              <Dice3D values={diceValues} isRolling={isRolling} size="large" />
            </div>

            {/* Result */}
            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-ui-text">
                {isRolling ? '?' : diceValues[0] + diceValues[1]}
              </span>
              {!isRolling && (
                <p className="text-sm text-ui-text-muted mt-1">
                  ({diceValues[0]} + {diceValues[1]})
                </p>
              )}
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmDice}
              disabled={!canConfirm}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                canConfirm
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isRolling ? 'Rolling...' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
