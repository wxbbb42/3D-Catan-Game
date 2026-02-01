'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useGameStore } from '@/stores/gameStore'
import type { HexTile, TerrainType, SerializableBoardState } from '@catan/shared'
import { hexSpiral, hexId } from '@catan/shared'

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

// Generate a test board
function generateTestBoard(): SerializableBoardState {
  const terrains: TerrainType[] = [
    'desert',
    'hills', 'hills', 'hills',
    'mountains', 'mountains', 'mountains',
    'forest', 'forest', 'forest', 'forest',
    'pasture', 'pasture', 'pasture', 'pasture',
    'fields', 'fields', 'fields', 'fields',
  ]

  const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

  // Shuffle terrains
  const shuffledTerrains = [...terrains].sort(() => Math.random() - 0.5)

  // Generate hex coordinates in spiral
  const coords = hexSpiral({ q: 0, r: 0 }, 2)

  // Create hex tiles
  let numberIndex = 0
  const hexes: HexTile[] = coords.map((coord, index) => {
    const terrain = shuffledTerrains[index] ?? 'desert'
    const numberToken = terrain === 'desert' ? null : numbers[numberIndex++] ?? null

    return {
      id: hexId(coord),
      coord,
      terrain,
      numberToken,
    }
  })

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

  // Initialize test board on mount
  useEffect(() => {
    const testBoard = generateTestBoard()

    // Create a mock game state
    actions.setGameState({
      id: 'test-game',
      code: 'TEST01',
      status: 'playing',
      phase: 'playing',
      board: testBoard,
      players: [],
      turnOrder: [],
      currentPlayerIndex: 0,
      turnNumber: 1,
      turnPhase: 'main',
      lastDiceRoll: null,
      devCardDeckCount: 25,
      setupState: null,
      activeTrade: null,
      pendingDiscards: [],
      roadBuildingRoadsPlaced: 0,
      longestRoadHolder: null,
      longestRoadLength: 0,
      largestArmyHolder: null,
      largestArmySize: 0,
      winnerId: null,
      createdAt: Date.now(),
      startedAt: Date.now(),
      finishedAt: null,
    })
  }, [actions])

  return (
    <main className="h-screen w-screen relative">
      <Board3D className="h-full w-full" />

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 glass-card p-4">
        <h1 className="text-lg font-bold text-ui-text mb-1">3D Board Preview</h1>
        <p className="text-sm text-ui-text-muted">
          Drag to rotate • Scroll to zoom • Shift+drag to pan
        </p>
      </div>

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-4 right-4 glass-card px-4 py-2 flex items-center gap-2 text-ui-text hover:bg-white/90 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      {/* Color legend */}
      <div className="absolute bottom-4 left-4 glass-card p-4">
        <h2 className="text-sm font-semibold text-ui-text mb-3">Terrain Types</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-hills" />
            <span className="text-ui-text-muted">Hills (Brick)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-forest" />
            <span className="text-ui-text-muted">Forest (Lumber)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-mountains" />
            <span className="text-ui-text-muted">Mountains (Ore)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-fields" />
            <span className="text-ui-text-muted">Fields (Grain)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-pasture" />
            <span className="text-ui-text-muted">Pasture (Wool)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-terrain-desert" />
            <span className="text-ui-text-muted">Desert</span>
          </div>
        </div>
      </div>

      {/* Randomize button */}
      <button
        onClick={() => {
          const newBoard = generateTestBoard()
          const state = useGameStore.getState().game
          if (state) {
            actions.setGameState({ ...state, board: newBoard })
          }
        }}
        className="absolute bottom-4 right-4 glass-card px-4 py-2 flex items-center gap-2 text-ui-text hover:bg-white/90 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Randomize Board
      </button>
    </main>
  )
}
