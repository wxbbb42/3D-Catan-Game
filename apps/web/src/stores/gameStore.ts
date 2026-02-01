import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  GameState,
  PlayerState,
  ResourceCount,
  TurnPhase,
  GamePhase,
  TradeProposal,
  SerializableBoardState,
} from '@catan/shared'
import { createEmptyResources } from '@catan/shared'

// UI selection state
interface UIState {
  selectedVertexId: string | null
  selectedEdgeId: string | null
  selectedHexId: string | null
  hoveredVertexId: string | null
  hoveredEdgeId: string | null
  hoveredHexId: string | null
  buildMode: 'none' | 'road' | 'settlement' | 'city'
  showTradePanel: boolean
  showDevCardPanel: boolean
}

// Connection state
interface ConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  playerId: string | null
  error: string | null
}

// Complete game store state
interface GameStore {
  // Connection
  connection: ConnectionState

  // Game state (from server)
  game: GameState | null

  // UI state (local only)
  ui: UIState

  // My local player state (convenience reference)
  myPlayerId: string | null
  myResources: ResourceCount

  // Actions
  actions: {
    // Connection actions
    setConnected: (connected: boolean) => void
    setReconnecting: (reconnecting: boolean) => void
    setPlayerId: (id: string) => void
    setConnectionError: (error: string | null) => void

    // Game state actions (from server updates)
    setGameState: (state: GameState) => void
    updateBoard: (board: SerializableBoardState) => void
    updatePlayer: (player: PlayerState) => void
    setCurrentPlayer: (playerId: string, turnPhase: TurnPhase) => void
    setGamePhase: (phase: GamePhase) => void
    setLastDiceRoll: (dice: [number, number]) => void
    setActiveTrade: (trade: TradeProposal | null) => void
    setWinner: (winnerId: string) => void

    // UI actions
    selectVertex: (id: string | null) => void
    selectEdge: (id: string | null) => void
    selectHex: (id: string | null) => void
    hoverVertex: (id: string | null) => void
    hoverEdge: (id: string | null) => void
    hoverHex: (id: string | null) => void
    setBuildMode: (mode: UIState['buildMode']) => void
    toggleTradePanel: () => void
    toggleDevCardPanel: () => void
    clearSelection: () => void

    // Reset
    reset: () => void
    clearGame: () => void
  }
}

const initialUIState: UIState = {
  selectedVertexId: null,
  selectedEdgeId: null,
  selectedHexId: null,
  hoveredVertexId: null,
  hoveredEdgeId: null,
  hoveredHexId: null,
  buildMode: 'none',
  showTradePanel: false,
  showDevCardPanel: false,
}

const initialConnectionState: ConnectionState = {
  isConnected: false,
  isReconnecting: false,
  playerId: null,
  error: null,
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    connection: initialConnectionState,
    game: null,
    ui: initialUIState,
    myPlayerId: null,
    myResources: createEmptyResources(),

    actions: {
      // Connection actions
      setConnected: (connected) =>
        set((state) => ({
          connection: { ...state.connection, isConnected: connected, isReconnecting: false },
        })),

      setReconnecting: (reconnecting) =>
        set((state) => ({
          connection: { ...state.connection, isReconnecting: reconnecting },
        })),

      setPlayerId: (id) =>
        set((state) => ({
          connection: { ...state.connection, playerId: id },
          myPlayerId: id,
        })),

      setConnectionError: (error) =>
        set((state) => ({
          connection: { ...state.connection, error },
        })),

      // Game state actions
      setGameState: (gameState) => {
        const myPlayerId = get().myPlayerId
        const myPlayer = gameState.players.find((p) => p.id === myPlayerId)

        set({
          game: gameState,
          myResources: myPlayer?.resources ?? createEmptyResources(),
        })
      },

      updateBoard: (board) =>
        set((state) => {
          if (!state.game) return state
          return {
            game: { ...state.game, board },
          }
        }),

      updatePlayer: (player) =>
        set((state) => {
          if (!state.game) return state

          const updatedPlayers = state.game.players.map((p) =>
            p.id === player.id ? player : p
          )

          const isMyPlayer = player.id === state.myPlayerId

          return {
            game: { ...state.game, players: updatedPlayers },
            myResources: isMyPlayer ? player.resources : state.myResources,
          }
        }),

      setCurrentPlayer: (playerId, turnPhase) =>
        set((state) => {
          if (!state.game) return state

          const playerIndex = state.game.turnOrder.indexOf(playerId)

          return {
            game: {
              ...state.game,
              currentPlayerIndex: playerIndex >= 0 ? playerIndex : state.game.currentPlayerIndex,
              turnPhase,
            },
          }
        }),

      setGamePhase: (phase) =>
        set((state) => {
          if (!state.game) return state
          return {
            game: { ...state.game, phase },
          }
        }),

      setLastDiceRoll: (dice) =>
        set((state) => {
          if (!state.game) return state
          return {
            game: { ...state.game, lastDiceRoll: dice },
          }
        }),

      setActiveTrade: (trade) =>
        set((state) => {
          if (!state.game) return state
          return {
            game: { ...state.game, activeTrade: trade },
          }
        }),

      setWinner: (winnerId) =>
        set((state) => {
          if (!state.game) return state
          return {
            game: { ...state.game, winnerId, status: 'finished' },
          }
        }),

      // UI actions
      selectVertex: (id) =>
        set((state) => ({
          ui: { ...state.ui, selectedVertexId: id, selectedEdgeId: null, selectedHexId: null },
        })),

      selectEdge: (id) =>
        set((state) => ({
          ui: { ...state.ui, selectedEdgeId: id, selectedVertexId: null, selectedHexId: null },
        })),

      selectHex: (id) =>
        set((state) => ({
          ui: { ...state.ui, selectedHexId: id, selectedVertexId: null, selectedEdgeId: null },
        })),

      hoverVertex: (id) =>
        set((state) => ({
          ui: { ...state.ui, hoveredVertexId: id },
        })),

      hoverEdge: (id) =>
        set((state) => ({
          ui: { ...state.ui, hoveredEdgeId: id },
        })),

      hoverHex: (id) =>
        set((state) => ({
          ui: { ...state.ui, hoveredHexId: id },
        })),

      setBuildMode: (mode) =>
        set((state) => ({
          ui: { ...state.ui, buildMode: mode },
        })),

      toggleTradePanel: () =>
        set((state) => ({
          ui: { ...state.ui, showTradePanel: !state.ui.showTradePanel },
        })),

      toggleDevCardPanel: () =>
        set((state) => ({
          ui: { ...state.ui, showDevCardPanel: !state.ui.showDevCardPanel },
        })),

      clearSelection: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            selectedVertexId: null,
            selectedEdgeId: null,
            selectedHexId: null,
          },
        })),

      // Reset
      reset: () =>
        set({
          connection: initialConnectionState,
          game: null,
          ui: initialUIState,
          myPlayerId: null,
          myResources: createEmptyResources(),
        }),

      // Clear game state but keep connection
      clearGame: () =>
        set((state) => ({
          game: null,
          ui: initialUIState,
          myResources: createEmptyResources(),
          // Keep connection and playerId
          connection: state.connection,
          myPlayerId: state.myPlayerId,
        })),
    },
  }))
)

// ============== SELECTORS ==============

// Check if it's my turn
export const useIsMyTurn = () =>
  useGameStore((state) => {
    if (!state.game || !state.myPlayerId) return false
    const currentPlayerId = state.game.turnOrder[state.game.currentPlayerIndex]
    return currentPlayerId === state.myPlayerId
  })

// Get current player
export const useCurrentPlayer = () =>
  useGameStore((state) => {
    if (!state.game) return null
    const playerId = state.game.turnOrder[state.game.currentPlayerIndex]
    return state.game.players.find((p) => p.id === playerId) ?? null
  })

// Get my player
export const useMyPlayer = () =>
  useGameStore((state) => {
    if (!state.game || !state.myPlayerId) return null
    return state.game.players.find((p) => p.id === state.myPlayerId) ?? null
  })

// Get all players
export const usePlayers = () =>
  useGameStore((state) => state.game?.players ?? [])

// Get board state
export const useBoard = () =>
  useGameStore((state) => state.game?.board ?? null)

// Get turn phase
export const useTurnPhase = () =>
  useGameStore((state) => state.game?.turnPhase ?? null)

// Get game phase
export const useGamePhase = () =>
  useGameStore((state) => state.game?.phase ?? null)

// Check connection
export const useIsConnected = () =>
  useGameStore((state) => state.connection.isConnected)
