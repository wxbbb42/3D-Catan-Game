'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { useSocketContext } from '@/components/SocketProvider'
import { GameHUD } from '@/components/game/HUD/GameHUD'
import { RollForOrderOverlay } from '@/components/game/Dice'
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

// Generate a test board (for demo/fallback)
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

  const shuffledTerrains = [...terrains].sort(() => Math.random() - 0.5)
  const coords = hexSpiral({ q: 0, r: 0 }, 2)

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

// Player color component
function PlayerColorBadge({ color }: { color: string }) {
  const colorClasses = {
    red: 'bg-player-red',
    blue: 'bg-player-blue',
    orange: 'bg-player-orange',
    white: 'bg-player-white border border-gray-300',
  }
  return (
    <span className={`inline-block w-4 h-4 rounded-full ${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-400'}`} />
  )
}

// Lobby component (waiting room)
function LobbyView({ gameCode }: { gameCode: string }) {
  const router = useRouter()
  const { lobby, playerId, setReady, setColor, startGame, leaveLobby, error, isGameStarting, countdown } = useSocketContext()

  if (!lobby) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ui-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ui-text-muted">Loading lobby...</p>
        </div>
      </div>
    )
  }

  const currentPlayer = lobby.players.find(p => p.id === playerId)
  const isHost = currentPlayer?.isHost ?? false
  const allReady = lobby.players.every(p => p.isReady || p.isHost)
  const canStart = isHost && allReady && lobby.players.length >= 2

  const handleLeave = () => {
    leaveLobby()
    router.push('/')
  }

  const availableColors = ['red', 'blue', 'orange', 'white'].filter(
    color => !lobby.players.some(p => p.id !== playerId && p.color === color)
  )

  return (
    <div className="min-h-screen bg-ui-bg p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ui-text mb-2">Game Lobby</h1>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-soft">
            <span className="text-ui-text-muted">Code:</span>
            <span className="font-mono text-xl font-bold tracking-wider text-ui-accent">{gameCode}</span>
            <button
              onClick={() => navigator.clipboard.writeText(gameCode)}
              className="p-1 hover:bg-ui-bg rounded transition-colors"
              title="Copy code"
            >
              <svg className="w-5 h-5 text-ui-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="glass-card p-4 mb-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Countdown overlay */}
        {isGameStarting && countdown !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center text-white">
              <p className="text-2xl mb-4">Game Starting...</p>
              <p className="text-8xl font-bold">{countdown}</p>
            </div>
          </div>
        )}

        {/* Players list */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-semibold text-ui-text mb-4">
            Players ({lobby.players.length}/{lobby.maxPlayers})
          </h2>
          <div className="space-y-3">
            {lobby.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${player.id === playerId ? 'bg-ui-accent/10 border-2 border-ui-accent' : 'bg-white border border-ui-border'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <PlayerColorBadge color={player.color} />
                  <span className="font-medium text-ui-text">
                    {player.username}
                    {player.id === playerId && ' (You)'}
                    {player.isHost && ' ⭐'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {player.isReady || player.isHost ? (
                    <span className="text-sm text-ui-success font-medium">Ready</span>
                  ) : (
                    <span className="text-sm text-ui-text-muted">Waiting...</span>
                  )}
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-3 rounded-lg border border-dashed border-ui-border text-ui-text-muted"
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        {/* Player settings (color picker) */}
        {currentPlayer && (
          <div className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-ui-text mb-4">Your Settings</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-ui-text-muted mb-2">
                Select Color
              </label>
              <div className="flex gap-3">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColor(color)}
                    className={`w-10 h-10 rounded-xl shadow-soft transition-all ${currentPlayer.color === color ? 'ring-2 ring-ui-accent ring-offset-2' : ''
                      } ${color === 'red' ? 'bg-player-red' :
                        color === 'blue' ? 'bg-player-blue' :
                          color === 'orange' ? 'bg-player-orange' :
                            'bg-player-white border border-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Ready toggle */}
            {!isHost && (
              <button
                onClick={() => setReady(!currentPlayer.isReady)}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${currentPlayer.isReady
                  ? 'bg-ui-success text-white'
                  : 'bg-white border border-ui-border text-ui-text hover:border-ui-accent'
                  }`}
              >
                {currentPlayer.isReady ? '✓ Ready' : 'Click when ready'}
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleLeave}
            className="flex-1 py-3 px-6 bg-white text-ui-text font-medium rounded-xl shadow-soft border border-ui-border transition-all hover:shadow-soft-md"
          >
            Leave Lobby
          </button>

          {isHost && (
            <button
              onClick={startGame}
              disabled={!canStart}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-ui-accent to-ocean-dark text-white font-semibold rounded-xl shadow-soft-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {!canStart && lobby.players.length < 2
                ? 'Need 2+ Players'
                : !canStart
                  ? 'Waiting for Ready'
                  : 'Start Game'}
            </button>
          )}
        </div>

        {/* Share link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-ui-text-muted mb-2">Share this link with friends:</p>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-soft text-sm">
            <span className="text-ui-text truncate max-w-xs">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="p-1 hover:bg-ui-bg rounded transition-colors"
            >
              <svg className="w-4 h-4 text-ui-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Roll for turn order phase component
function RollForOrderPhase() {
  const game = useGameStore((state) => state.game)
  const storePlayerId = useGameStore((state) => state.myPlayerId)
  const { rollForOrder, playerId: socketPlayerId } = useSocketContext()

  if (!game || !game.rollForOrderState) return null

  const currentRollerIndex = game.rollForOrderState.currentRollerIndex
  const currentRollerId = game.turnOrder[currentRollerIndex]
  const currentRoller = game.players.find(p => p.id === currentRollerId)

  if (!currentRoller) return null

  // Use socket playerId (more reliable) or fall back to store
  const myPlayerId = socketPlayerId ?? storePlayerId
  const isMyTurn = currentRollerId === myPlayerId

  // Debug logging
  console.log('[RollForOrderPhase] currentRollerId:', currentRollerId)
  console.log('[RollForOrderPhase] socketPlayerId:', socketPlayerId)
  console.log('[RollForOrderPhase] storePlayerId:', storePlayerId)
  console.log('[RollForOrderPhase] myPlayerId:', myPlayerId)
  console.log('[RollForOrderPhase] isMyTurn:', isMyTurn)

  const rolls = game.rollForOrderState.rolls

  const players = game.players.map(p => ({
    id: p.id,
    username: p.username,
    color: p.color,
  }))

  return (
    <RollForOrderOverlay
      currentRoller={{
        id: currentRoller.id,
        username: currentRoller.username,
        color: currentRoller.color,
      }}
      isMyTurn={isMyTurn}
      rolls={rolls}
      players={players}
      onRoll={rollForOrder}
    />
  )
}

export default function GamePage() {
  const params = useParams()
  const gameCode = params.code as string
  const game = useGameStore((state) => state.game)
  const setGameState = useGameStore((state) => state.actions.setGameState)
  const setPlayerId = useGameStore((state) => state.actions.setPlayerId)
  const { lobby, joinLobby, isConnected, playerId } = useSocketContext()
  const [hasJoined, setHasJoined] = useState(false)

  // Join the lobby when connected
  useEffect(() => {
    if (isConnected && !hasJoined && !lobby) {
      joinLobby(gameCode)
      setHasJoined(true)
    }
  }, [isConnected, gameCode, joinLobby, hasJoined, lobby])

  // Set player ID in game store
  useEffect(() => {
    if (playerId) {
      setPlayerId(playerId)
    }
  }, [playerId, setPlayerId])

  // Fallback: Create test board for demo (when not connected or for testing)
  // Only runs if server is completely unreachable after a timeout
  useEffect(() => {
    // Only create test board if we don't already have a game
    if (game) return

    // And only if we're not connected or have no lobby
    if (isConnected && lobby) return

    // Don't create fallback while still trying to connect
    if (hasJoined) return

    // Wait a bit to let connection establish
    const timeoutId = setTimeout(() => {
      // Re-check conditions after timeout
      if (game || (isConnected && lobby)) return

      console.log('[GamePage] Creating fallback test board (server unreachable)')
      const testBoard = generateTestBoard()

      setGameState({
        id: `game-${gameCode}`,
        code: gameCode,
        status: 'playing',
        phase: 'playing',
        board: testBoard,
        players: [
          {
            id: 'player-1',
            userId: 'player-1',
            username: 'You',
            color: 'red',
            resources: { brick: 2, lumber: 3, ore: 1, grain: 2, wool: 1 },
            devCards: [],
            settlements: [],
            cities: [],
            roads: [],
            knightsPlayed: 0,
            longestRoadLength: 0,
            hasLongestRoad: false,
            hasLargestArmy: false,
            publicVictoryPoints: 2,
            isConnected: true,
          },
          {
            id: 'player-2',
            userId: 'player-2',
            username: 'Alice',
            color: 'blue',
            resources: { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 },
            devCards: [],
            settlements: [],
            cities: [],
            roads: [],
            knightsPlayed: 0,
            longestRoadLength: 0,
            hasLongestRoad: false,
            hasLargestArmy: false,
            publicVictoryPoints: 3,
            isConnected: true,
          },
        ],
        turnOrder: ['player-1', 'player-2'],
        currentPlayerIndex: 0,
        turnNumber: 5,
        turnPhase: 'main',
        lastDiceRoll: [4, 3],
        devCardDeckCount: 20,
        rollForOrderState: null,
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

      setPlayerId('player-1')
    }, 3000) // Wait 3 seconds before falling back to test board

    return () => clearTimeout(timeoutId)
  }, [isConnected, lobby, game, hasJoined, setGameState, setPlayerId, gameCode])

  // If no game state and in lobby mode, show lobby
  if (!game && lobby && lobby.status !== 'started') {
    return <LobbyView gameCode={gameCode} />
  }

  // If game has started or we have game state, show the game
  if (game) {
    const isRollForOrder = game.phase === 'roll_for_order'

    return (
      <main className="h-screen w-screen overflow-hidden relative">
        {/* 3D Board */}
        <Board3D className="absolute inset-0" />

        {/* Game HUD overlay */}
        <GameHUD gameCode={gameCode} />

        {/* Roll for order overlay */}
        {isRollForOrder && <RollForOrderPhase />}
      </main>
    )
  }

  // Loading state
  return (
    <div className="flex items-center justify-center h-screen bg-ui-bg">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-ui-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-ui-text-muted">
          {!isConnected ? 'Connecting to server...' : 'Loading game...'}
        </p>
      </div>
    </div>
  )
}
