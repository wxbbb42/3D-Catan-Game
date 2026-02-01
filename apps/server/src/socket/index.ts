import { Server as HTTPServer } from 'http'
import { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@catan/shared'
import { handleLobbyEvents } from './handlers/lobbyHandler.js'
import { handleGameEvents } from './handlers/gameHandler.js'

export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>
export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>

// Store for active games and lobbies (in-memory for now, will use Redis later)
export const activeLobbies = new Map<string, LobbyData>()
export const activeGames = new Map<string, GameData>()
export const playerSockets = new Map<string, string>() // socketId -> playerId
export const socketPlayers = new Map<string, string>() // playerId -> socketId

export interface LobbyData {
  id: string
  code: string
  hostId: string
  players: Array<{
    id: string
    socketId: string
    username: string
    avatarUrl?: string
    color: string
    isReady: boolean
    isHost: boolean
  }>
  maxPlayers: number
  status: 'waiting' | 'starting' | 'started'
  createdAt: number
}

export interface GameData {
  id: string
  code: string
  // Full game state will be added here
}

let io: GameServer

export function getIO(): GameServer {
  return io
}

export function setupSocketIO(httpServer: HTTPServer) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket: GameSocket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Check if client sent an existing playerId for reconnection
    const existingPlayerId = socket.handshake.auth?.playerId as string | undefined

    // Use existing playerId if valid, otherwise generate a new one
    let playerId: string
    if (existingPlayerId && existingPlayerId.startsWith('player_')) {
      // Reuse existing playerId - this allows reconnection to same player
      playerId = existingPlayerId
      console.log(`Player reconnected with existing ID: ${playerId}`)

      // Clean up old socket mapping if exists
      const oldSocketId = socketPlayers.get(playerId)
      if (oldSocketId && oldSocketId !== socket.id) {
        playerSockets.delete(oldSocketId)
      }
    } else {
      // Generate new player ID
      playerId = `player_${socket.id.slice(0, 8)}_${Date.now()}`
      console.log(`New player connected: ${playerId}`)
    }

    playerSockets.set(socket.id, playerId)
    socketPlayers.set(playerId, socket.id)

    // Emit connection established
    socket.emit('connection:established', { playerId })

    // Set up event handlers
    handleLobbyEvents(socket, playerId)
    handleGameEvents(socket, playerId)

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)

      const disconnectedPlayerId = playerSockets.get(socket.id)
      if (disconnectedPlayerId) {
        playerSockets.delete(socket.id)
        socketPlayers.delete(disconnectedPlayerId)

        // Notify rooms about disconnection
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            io.to(room).emit('player:disconnected', { playerId: disconnectedPlayerId })
          }
        })
      }
    })
  })

  console.log('Socket.IO initialized')
}
