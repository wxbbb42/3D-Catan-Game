'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { useGameStore } from '@/stores/gameStore'
import type { GameState, LobbyState, LobbyPlayer, ResourceCount } from '@catan/shared'

// Helper to get/set persistent playerId from localStorage
const PLAYER_ID_KEY = 'catan_player_id'

function getStoredPlayerId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(PLAYER_ID_KEY)
}

function storePlayerId(playerId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PLAYER_ID_KEY, playerId)
}

// Socket types aligned with server events
export interface ServerToClientEvents {
  // Connection
  'connection:established': (payload: { playerId: string }) => void

  // Lobby events
  'lobby:state': (payload: { lobby: LobbyState }) => void
  'lobby:player_joined': (payload: { player: LobbyPlayer }) => void
  'lobby:player_left': (payload: { playerId: string }) => void
  'lobby:player_ready': (payload: { playerId: string; isReady: boolean }) => void
  'lobby:player_color': (payload: { playerId: string; color: string }) => void
  'lobby:game_starting': (payload: { countdown: number }) => void
  'lobby:error': (payload: { code: string; message: string }) => void

  // Game state events
  'game:state': (payload: { gameState: GameState }) => void
  'game:started': (payload: { gameState: GameState }) => void
  'game:turn_changed': (payload: { playerId: string; turnPhase: string }) => void
  'game:phase_changed': (payload: { phase: string }) => void
  'game:ended': (payload: { winnerId: string; finalState: GameState }) => void
  'game:roll_for_order_result': (payload: {
    playerId: string
    dice: [number, number]
    total: number
    allRolled: boolean
    turnOrder?: string[]
  }) => void

  // Dice events
  'dice:rolled': (payload: { playerId: string; dice: [number, number]; total: number }) => void
  'dice:resources_distributed': (payload: { distributions: Array<{ playerId: string; resources: Partial<ResourceCount> }> }) => void

  // Building events
  'build:settlement_placed': (payload: { playerId: string; vertexId: string }) => void
  'build:city_placed': (payload: { playerId: string; vertexId: string }) => void
  'build:road_placed': (payload: { playerId: string; edgeId: string }) => void
  'build:error': (payload: { code: string; message: string }) => void

  // Robber events
  'robber:activated': (payload: { playerId: string }) => void
  'robber:moved': (payload: { playerId: string; hexId: string }) => void
  'robber:discard_required': (payload: { players: Array<{ playerId: string; amountToDiscard: number }> }) => void
  'robber:player_discarded': (payload: { playerId: string }) => void

  // Trade events
  'trade:proposed': (payload: { trade: { id: string; targetPlayerId?: string | null; offering: ResourceCount; requesting: ResourceCount } }) => void
  'trade:accepted': (payload: { tradeId: string; acceptedBy: string }) => void
  'trade:rejected': (payload: { tradeId: string; rejectedBy: string }) => void
  'trade:cancelled': (payload: { tradeId: string }) => void
  'trade:error': (payload: { code: string; message: string }) => void

  // Dev card events
  'devcard:purchased': (payload: { playerId: string }) => void

  // Chat
  'chat:message': (payload: { playerId: string; username: string; message: string; timestamp: number }) => void

  // Player events
  'player:disconnected': (payload: { playerId: string }) => void
  'player:reconnected': (payload: { playerId: string }) => void
}

export interface ClientToServerEvents {
  // Lobby
  'lobby:create': (payload: { maxPlayers?: number }) => void
  'lobby:join': (payload: { gameCode: string }) => void
  'lobby:leave': () => void
  'lobby:ready': (payload: { isReady: boolean }) => void
  'lobby:set_color': (payload: { color: string }) => void
  'lobby:start_game': () => void

  // Game actions
  'game:roll_dice': () => void
  'game:roll_for_order': () => void
  'game:end_turn': () => void
  'game:request_state': () => void

  // Building actions
  'build:settlement': (payload: { vertexId: string }) => void
  'build:city': (payload: { vertexId: string }) => void
  'build:road': (payload: { edgeId: string }) => void
  'build:dev_card': () => void

  // Robber actions
  'robber:move': (payload: { hexId: string }) => void
  'robber:steal': (payload: { victimId: string }) => void
  'robber:discard': (payload: { resources: ResourceCount }) => void

  // Trade actions
  'trade:propose': (payload: { targetPlayerId?: string | null; offering: ResourceCount; requesting: ResourceCount }) => void
  'trade:accept': (payload: { tradeId: string }) => void
  'trade:reject': (payload: { tradeId: string }) => void
  'trade:cancel': (payload: { tradeId: string }) => void

  // Chat
  'chat:send': (payload: { message: string }) => void
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000'

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null)
  const { data: session, status } = useSession()
  const actions = useGameStore((state) => state.actions)
  const [playerId, setPlayerId] = useState<string | null>(() => getStoredPlayerId())
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGameStarting, setIsGameStarting] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Initialize socket connection
  useEffect(() => {
    // Allow connection even without session (guest mode)
    if (status === 'loading') return

    // Get stored playerId for reconnection
    const storedPlayerId = getStoredPlayerId()

    const socket: TypedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        userId: session?.user?.id ?? `guest_${Date.now()}`,
        username: session?.user?.name ?? 'Guest',
        // Send stored playerId for reconnection
        playerId: storedPlayerId,
      },
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      actions.setConnected(true)
      actions.setConnectionError(null)
      setError(null)
    })

    socket.on('disconnect', () => {
      actions.setConnected(false)
    })

    socket.on('connect_error', (err) => {
      actions.setConnectionError(err.message)
      actions.setConnected(false)
      setError(err.message)
    })

    // Connection established - get player ID and store it
    socket.on('connection:established', (payload) => {
      setPlayerId(payload.playerId)
      storePlayerId(payload.playerId)
    })

    // Lobby events
    socket.on('lobby:state', (payload) => {
      setLobby(payload.lobby)
      setError(null)
    })

    socket.on('lobby:player_joined', (payload) => {
      setLobby((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          players: [...prev.players, payload.player],
        }
      })
    })

    socket.on('lobby:player_left', (payload) => {
      setLobby((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== payload.playerId),
        }
      })
    })

    socket.on('lobby:player_ready', (payload) => {
      setLobby((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === payload.playerId ? { ...p, isReady: payload.isReady } : p
          ),
        }
      })
    })

    socket.on('lobby:player_color', (payload) => {
      setLobby((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === payload.playerId ? { ...p, color: payload.color as 'red' | 'blue' | 'orange' | 'white' } : p
          ),
        }
      })
    })

    socket.on('lobby:game_starting', (payload) => {
      setIsGameStarting(true)
      setCountdown(payload.countdown)
    })

    socket.on('lobby:error', (payload) => {
      setError(payload.message)
    })

    // Game events
    socket.on('game:state', (payload) => {
      actions.setGameState(payload.gameState)
    })

    socket.on('game:started', (payload) => {
      actions.setGameState(payload.gameState)
      setIsGameStarting(false)
      setCountdown(null)
    })

    socket.on('game:turn_changed', (payload) => {
      actions.setCurrentPlayer(payload.playerId, payload.turnPhase as 'pre_roll' | 'main')
    })

    socket.on('game:ended', (payload) => {
      actions.setWinner(payload.winnerId)
    })

    socket.on('dice:rolled', (payload) => {
      actions.setLastDiceRoll(payload.dice)
    })

    socket.on('trade:proposed', (payload) => {
      actions.setActiveTrade({
        id: payload.trade.id,
        proposerId: '', // Will be set from game state
        targetPlayerId: payload.trade.targetPlayerId ?? null,
        offering: payload.trade.offering,
        requesting: payload.trade.requesting,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000, // 60 second expiry
      })
    })

    socket.on('trade:accepted', () => {
      actions.setActiveTrade(null)
    })

    socket.on('trade:rejected', () => {
      actions.setActiveTrade(null)
    })

    socket.on('trade:cancelled', () => {
      actions.setActiveTrade(null)
    })

    socket.on('build:error', (payload) => {
      setError(payload.message)
    })

    socket.on('trade:error', (payload) => {
      setError(payload.message)
    })

    // Cleanup
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session, status, actions])

  // Lobby actions
  const createLobby = useCallback((maxPlayers: number = 4) => {
    if (!socketRef.current) {
      setError('Not connected to server')
      return
    }
    socketRef.current.emit('lobby:create', { maxPlayers })
  }, [])

  const joinLobby = useCallback((gameCode: string) => {
    if (!socketRef.current) {
      setError('Not connected to server')
      return
    }
    socketRef.current.emit('lobby:join', { gameCode })
  }, [])

  const leaveLobby = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('lobby:leave')
    setLobby(null)
  }, [])

  const setReady = useCallback((isReady: boolean) => {
    if (!socketRef.current) return
    socketRef.current.emit('lobby:ready', { isReady })
  }, [])

  const setColor = useCallback((color: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('lobby:set_color', { color })
  }, [])

  const startGame = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('lobby:start_game')
  }, [])

  // Game actions
  const rollDice = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('game:roll_dice')
  }, [])

  const rollForOrder = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('game:roll_for_order')
  }, [])

  const buildSettlement = useCallback((vertexId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('build:settlement', { vertexId })
  }, [])

  const buildCity = useCallback((vertexId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('build:city', { vertexId })
  }, [])

  const buildRoad = useCallback((edgeId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('build:road', { edgeId })
  }, [])

  const buyDevCard = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('build:dev_card')
  }, [])

  const endTurn = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('game:end_turn')
  }, [])

  const requestGameState = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('game:request_state')
  }, [])

  // Robber actions
  const moveRobber = useCallback((hexId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('robber:move', { hexId })
  }, [])

  const stealFromPlayer = useCallback((victimId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('robber:steal', { victimId })
  }, [])

  const discardResources = useCallback((resources: ResourceCount) => {
    if (!socketRef.current) return
    socketRef.current.emit('robber:discard', { resources })
  }, [])

  // Trade actions
  const proposeTrade = useCallback((offering: ResourceCount, requesting: ResourceCount, targetPlayerId?: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('trade:propose', { offering, requesting, targetPlayerId })
  }, [])

  const acceptTrade = useCallback((tradeId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('trade:accept', { tradeId })
  }, [])

  const rejectTrade = useCallback((tradeId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('trade:reject', { tradeId })
  }, [])

  const cancelTrade = useCallback((tradeId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('trade:cancel', { tradeId })
  }, [])

  // Chat
  const sendMessage = useCallback((message: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('chat:send', { message })
  }, [])

  // Leave the current game and clear state
  const leaveGame = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('lobby:leave')
    setLobby(null)
    // Clear stored playerId so next game gets a fresh one
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PLAYER_ID_KEY)
    }
    // Clear game state
    actions.clearGame()
  }, [actions])

  return {
    socket: socketRef.current,
    isConnected: useGameStore((state) => state.connection.isConnected),
    playerId,
    lobby,
    error,
    isGameStarting,
    countdown,

    // Lobby actions
    createLobby,
    joinLobby,
    leaveLobby,
    setReady,
    setColor,
    startGame,

    // Game actions
    rollDice,
    rollForOrder,
    buildSettlement,
    buildCity,
    buildRoad,
    buyDevCard,
    endTurn,
    requestGameState,
    leaveGame,

    // Robber actions
    moveRobber,
    stealFromPlayer,
    discardResources,

    // Trade actions
    proposeTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,

    // Chat
    sendMessage,

    // Clear error
    clearError: useCallback(() => setError(null), []),
  }
}
