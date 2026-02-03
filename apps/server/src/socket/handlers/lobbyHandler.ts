import type { GameSocket, LobbyData } from '../index.js'
import { activeLobbies, getIO } from '../index.js'
import { PLAYER_COLORS } from '@catan/shared'
import { createGame } from '../../game/GameManager.js'

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Get next available color
function getNextAvailableColor(lobby: LobbyData): string {
  const usedColors = new Set(lobby.players.map((p) => p.color))
  for (const color of PLAYER_COLORS) {
    if (!usedColors.has(color)) {
      return color
    }
  }
  return PLAYER_COLORS[0] ?? 'red'
}

export function handleLobbyEvents(socket: GameSocket, playerId: string) {
  const io = getIO()

  // Create a new lobby
  socket.on('lobby:create', (payload) => {
    const maxPlayers = payload?.maxPlayers ?? 4
    const username = payload?.username ?? `Player ${playerId.slice(-4)}`

    // Generate unique code
    let code = generateGameCode()
    while (activeLobbies.has(code)) {
      code = generateGameCode()
    }

    const lobby: LobbyData = {
      id: `lobby_${code}`,
      code,
      hostId: playerId,
      players: [
        {
          id: playerId,
          socketId: socket.id,
          username,
          color: 'red',
          isReady: false,
          isHost: true,
        },
      ],
      maxPlayers,
      status: 'waiting',
      createdAt: Date.now(),
    }

    activeLobbies.set(code, lobby)
    socket.join(code)

    console.log(`Lobby created: ${code} by ${playerId} (${username})`)

    socket.emit('lobby:state', {
      lobby: {
        id: lobby.id,
        code: lobby.code,
        hostId: lobby.hostId,
        players: lobby.players.map((p) => ({
          id: p.id,
          userId: p.id, // Using playerId as userId for now
          username: p.username,
          avatarUrl: p.avatarUrl,
          color: p.color as 'red' | 'blue' | 'orange' | 'white',
          isReady: p.isReady,
          isHost: p.isHost,
          isConnected: true,
        })),
        maxPlayers: lobby.maxPlayers,
        status: lobby.status,
        createdAt: lobby.createdAt,
      },
    })
  })

  // Join an existing lobby
  socket.on('lobby:join', (payload) => {
    const { gameCode, username: providedUsername } = payload
    const username = providedUsername ?? `Player ${playerId.slice(-4)}`
    const lobby = activeLobbies.get(gameCode)

    if (!lobby) {
      socket.emit('lobby:error', {
        code: 'LOBBY_NOT_FOUND',
        message: 'Game not found. Check the code and try again.',
      })
      return
    }

    if (lobby.status !== 'waiting') {
      socket.emit('lobby:error', {
        code: 'GAME_STARTED',
        message: 'This game has already started.',
      })
      return
    }

    // Check if player already in lobby (reconnection case)
    const existingPlayer = lobby.players.find((p) => p.id === playerId)
    if (existingPlayer) {
      // Update socket ID for reconnected player
      existingPlayer.socketId = socket.id
      socket.join(gameCode)

      console.log(`Player ${playerId} reconnected to lobby: ${gameCode}`)

      // Send full state to the reconnecting player
      socket.emit('lobby:state', {
        lobby: {
          id: lobby.id,
          code: lobby.code,
          hostId: lobby.hostId,
          players: lobby.players.map((p) => ({
            id: p.id,
            userId: p.id,
            username: p.username,
            avatarUrl: p.avatarUrl,
            color: p.color as 'red' | 'blue' | 'orange' | 'white',
            isReady: p.isReady,
            isHost: p.isHost,
            isConnected: true,
          })),
          maxPlayers: lobby.maxPlayers,
          status: lobby.status,
          createdAt: lobby.createdAt,
        },
      })

      // Notify other players about reconnection
      socket.to(gameCode).emit('player:reconnected', { playerId })
      return
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('lobby:error', {
        code: 'LOBBY_FULL',
        message: 'This game is full.',
      })
      return
    }

    const newPlayer = {
      id: playerId,
      socketId: socket.id,
      username,
      color: getNextAvailableColor(lobby),
      isReady: false,
      isHost: false,
    }

    lobby.players.push(newPlayer)
    socket.join(gameCode)

    console.log(`Player ${playerId} (${username}) joined lobby: ${gameCode}`)

    // Notify all players in lobby
    io.to(gameCode).emit('lobby:player_joined', {
      player: {
        id: newPlayer.id,
        userId: newPlayer.id,
        username: newPlayer.username,
        color: newPlayer.color as 'red' | 'blue' | 'orange' | 'white',
        isReady: newPlayer.isReady,
        isHost: newPlayer.isHost,
        isConnected: true,
      },
    })

    // Send full state to the joining player
    socket.emit('lobby:state', {
      lobby: {
        id: lobby.id,
        code: lobby.code,
        hostId: lobby.hostId,
        players: lobby.players.map((p) => ({
          id: p.id,
          userId: p.id, // Using playerId as userId for now
          username: p.username,
          avatarUrl: p.avatarUrl,
          color: p.color as 'red' | 'blue' | 'orange' | 'white',
          isReady: p.isReady,
          isHost: p.isHost,
          isConnected: true,
        })),
        maxPlayers: lobby.maxPlayers,
        status: lobby.status,
        createdAt: lobby.createdAt,
      },
    })
  })

  // Leave lobby
  socket.on('lobby:leave', () => {
    // Find which lobby the player is in
    for (const [code, lobby] of activeLobbies) {
      const playerIndex = lobby.players.findIndex((p) => p.id === playerId)

      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1)
        socket.leave(code)

        console.log(`Player ${playerId} left lobby: ${code}`)

        // If lobby is empty, delete it
        if (lobby.players.length === 0) {
          activeLobbies.delete(code)
          console.log(`Lobby ${code} deleted (empty)`)
          return
        }

        // If host left, assign new host
        if (lobby.hostId === playerId && lobby.players.length > 0) {
          const newHost = lobby.players[0]
          if (newHost) {
            lobby.hostId = newHost.id
            newHost.isHost = true
          }
        }

        // Notify remaining players
        io.to(code).emit('lobby:player_left', { playerId })
        return
      }
    }
  })

  // Set ready state
  socket.on('lobby:ready', (payload) => {
    const { isReady } = payload

    for (const [code, lobby] of activeLobbies) {
      const player = lobby.players.find((p) => p.id === playerId)

      if (player) {
        player.isReady = isReady
        io.to(code).emit('lobby:player_ready', { playerId, isReady })
        return
      }
    }
  })

  // Set color
  socket.on('lobby:set_color', (payload) => {
    const { color } = payload

    for (const [code, lobby] of activeLobbies) {
      const player = lobby.players.find((p) => p.id === playerId)

      if (player) {
        // Check if color is taken
        if (lobby.players.some((p) => p.id !== playerId && p.color === color)) {
          socket.emit('lobby:error', {
            code: 'COLOR_TAKEN',
            message: 'This color is already taken.',
          })
          return
        }

        player.color = color
        io.to(code).emit('lobby:player_color', { playerId, color })
        return
      }
    }
  })

  // Start game (host only)
  socket.on('lobby:start_game', () => {
    console.log(`[lobby:start_game] Player ${playerId} attempting to start game`)
    console.log(`[lobby:start_game] Active lobbies count: ${activeLobbies.size}`)

    let foundLobby = false
    for (const [code, lobby] of activeLobbies) {
      console.log(`[lobby:start_game] Checking lobby ${code}: hostId=${lobby.hostId}, players=${lobby.players.length}`)

      if (lobby.hostId === playerId) {
        foundLobby = true
        console.log(`[lobby:start_game] Found lobby ${code} for host ${playerId}`)
        console.log(`[lobby:start_game] Players in lobby: ${JSON.stringify(lobby.players.map(p => ({ id: p.id, isReady: p.isReady, isHost: p.isHost })))}`)

        // Check minimum players
        if (lobby.players.length < 2) {
          console.log(`[lobby:start_game] ERROR: Not enough players (${lobby.players.length})`)
          socket.emit('lobby:error', {
            code: 'NOT_ENOUGH_PLAYERS',
            message: 'Need at least 2 players to start.',
          })
          return
        }

        // Check all ready
        const allReady = lobby.players.every((p) => p.isReady || p.isHost)
        if (!allReady) {
          socket.emit('lobby:error', {
            code: 'NOT_ALL_READY',
            message: 'All players must be ready to start.',
          })
          return
        }

        // Start countdown
        lobby.status = 'starting'
        io.to(code).emit('lobby:game_starting', { countdown: 3 })

        // After countdown, create and start the game
        setTimeout(() => {
          // Create the game state
          const gameState = createGame(lobby)

          // Mark lobby as started
          lobby.status = 'started'

          // Notify all players the game has started
          io.to(code).emit('game:started', { gameState })

          console.log(`Game started in lobby: ${code}`)
        }, 3000) // 3 second countdown

        return
      }
    }

    if (!foundLobby) {
      console.log(`[lobby:start_game] ERROR: No lobby found where ${playerId} is host`)
    }
  })
}
