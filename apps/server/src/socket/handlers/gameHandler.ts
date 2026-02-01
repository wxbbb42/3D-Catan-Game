import type { GameSocket } from '../index.js'
import { getIO } from '../index.js'
import {
  getGame,
  getPlayerGameCode,
  handleDiceRoll,
  handleDiscard,
  handleMoveRobber,
  handleSteal,
  handleBuildSettlement,
  handleBuildCity,
  handleBuildRoad,
  handleBuyDevCard,
  handleEndTurn,
  handleRollForOrder,
  isPlayerTurn,
  getCurrentPlayer,
} from '../../game/GameManager.js'

export function handleGameEvents(socket: GameSocket, playerId: string) {
  const io = getIO()

  // Roll for turn order (at game start)
  socket.on('game:roll_for_order', () => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) {
      socket.emit('build:error', { code: 'NOT_IN_GAME', message: 'You are not in a game' })
      return
    }

    const result = handleRollForOrder(gameCode, playerId)

    if (!result.success) {
      socket.emit('build:error', { code: 'ROLL_FAILED', message: result.error ?? 'Failed to roll' })
      return
    }

    // Emit roll result to all players
    io.to(gameCode).emit('game:roll_for_order_result', {
      playerId,
      dice: result.dice!,
      total: result.total!,
      allRolled: result.allRolled,
      turnOrder: result.turnOrder,
    })

    // Send updated game state
    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }

    // If all rolled, notify phase change
    if (result.allRolled) {
      io.to(gameCode).emit('game:phase_changed', { phase: 'setup_first' })
    }
  })

  // Roll dice
  socket.on('game:roll_dice', () => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) {
      socket.emit('build:error', { code: 'NOT_IN_GAME', message: 'You are not in a game' })
      return
    }

    const result = handleDiceRoll(gameCode, playerId)

    if (!result.success) {
      socket.emit('build:error', { code: 'ROLL_FAILED', message: result.error ?? 'Failed to roll dice' })
      return
    }

    // Emit dice roll to all players
    io.to(gameCode).emit('dice:rolled', {
      playerId,
      dice: result.dice!,
      total: result.total!,
    })

    // If resources were distributed
    if (result.distributions && result.distributions.size > 0) {
      const distributionsArray = Array.from(result.distributions.entries()).map(
        ([pid, resources]) => ({ playerId: pid, resources })
      )
      io.to(gameCode).emit('dice:resources_distributed', {
        distributions: distributionsArray,
      })
    }

    // If discard is needed (rolled 7 with players having > 7 cards)
    if (result.needsDiscard && result.gameState?.pendingDiscards) {
      io.to(gameCode).emit('robber:discard_required', {
        players: result.gameState.pendingDiscards.map(pd => ({
          playerId: pd.playerId,
          amountToDiscard: pd.amountToDiscard,
        })),
      })
    } else if (result.total === 7) {
      // No discard needed, but robber must be moved
      io.to(gameCode).emit('robber:activated', { playerId })
    }

    // Send updated game state
    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }
  })

  // Discard resources (when 7 is rolled)
  socket.on('robber:discard', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleDiscard(gameCode, playerId, payload.resources)

    if (!result.success) {
      socket.emit('build:error', { code: 'DISCARD_FAILED', message: result.error ?? 'Failed to discard' })
      return
    }

    io.to(gameCode).emit('robber:player_discarded', { playerId })

    if (result.allDiscarded) {
      // All players have discarded, current player must move robber
      const game = getGame(gameCode)
      if (game) {
        io.to(gameCode).emit('robber:activated', { playerId: getCurrentPlayer(game) })
      }
    }

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }
  })

  // Move robber
  socket.on('robber:move', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleMoveRobber(gameCode, playerId, payload.hexId)

    if (!result.success) {
      socket.emit('build:error', { code: 'MOVE_ROBBER_FAILED', message: result.error ?? 'Failed to move robber' })
      return
    }

    io.to(gameCode).emit('robber:moved', {
      playerId,
      hexId: payload.hexId,
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }
  })

  // Steal from player
  socket.on('robber:steal', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleSteal(gameCode, playerId, payload.victimId)

    if (!result.success) {
      socket.emit('build:error', { code: 'STEAL_FAILED', message: result.error ?? 'Failed to steal' })
      return
    }

    // Send steal notification (resource hidden from others)
    io.to(gameCode).emit('robber:steal', {
      thiefId: playerId,
      victimId: payload.victimId,
      stolenResource: result.stolenResource as 'brick' | 'lumber' | 'ore' | 'grain' | 'wool' | undefined,
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }
  })

  // Build settlement
  socket.on('build:settlement', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleBuildSettlement(gameCode, playerId, payload.vertexId)

    if (!result.success) {
      socket.emit('build:error', { code: 'BUILD_SETTLEMENT_FAILED', message: result.error ?? 'Failed to build settlement' })
      return
    }

    io.to(gameCode).emit('build:settlement_placed', {
      playerId,
      vertexId: payload.vertexId,
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })

      // Check for winner
      if (result.gameState.winnerId) {
        io.to(gameCode).emit('game:ended', {
          winnerId: result.gameState.winnerId,
          finalState: result.gameState,
        })
      }
    }
  })

  // Build city
  socket.on('build:city', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleBuildCity(gameCode, playerId, payload.vertexId)

    if (!result.success) {
      socket.emit('build:error', { code: 'BUILD_CITY_FAILED', message: result.error ?? 'Failed to build city' })
      return
    }

    io.to(gameCode).emit('build:city_placed', {
      playerId,
      vertexId: payload.vertexId,
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })

      if (result.gameState.winnerId) {
        io.to(gameCode).emit('game:ended', {
          winnerId: result.gameState.winnerId,
          finalState: result.gameState,
        })
      }
    }
  })

  // Build road
  socket.on('build:road', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleBuildRoad(gameCode, playerId, payload.edgeId)

    if (!result.success) {
      socket.emit('build:error', { code: 'BUILD_ROAD_FAILED', message: result.error ?? 'Failed to build road' })
      return
    }

    io.to(gameCode).emit('build:road_placed', {
      playerId,
      edgeId: payload.edgeId,
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })

      // Check if phase changed (setup to playing)
      if (result.gameState.phase === 'playing') {
        io.to(gameCode).emit('game:phase_changed', { phase: 'playing' })
      }
    }
  })

  // Buy development card
  socket.on('build:dev_card', () => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleBuyDevCard(gameCode, playerId)

    if (!result.success) {
      socket.emit('build:error', { code: 'BUY_DEVCARD_FAILED', message: result.error ?? 'Failed to buy dev card' })
      return
    }

    io.to(gameCode).emit('devcard:purchased', { playerId })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })

      if (result.gameState.winnerId) {
        io.to(gameCode).emit('game:ended', {
          winnerId: result.gameState.winnerId,
          finalState: result.gameState,
        })
      }
    }
  })

  // End turn
  socket.on('game:end_turn', () => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const result = handleEndTurn(gameCode, playerId)

    if (!result.success) {
      socket.emit('build:error', { code: 'END_TURN_FAILED', message: result.error ?? 'Failed to end turn' })
      return
    }

    io.to(gameCode).emit('game:turn_changed', {
      playerId: result.nextPlayerId!,
      turnPhase: 'pre_roll',
    })

    if (result.gameState) {
      io.to(gameCode).emit('game:state', { gameState: result.gameState })
    }
  })

  // Request state sync
  socket.on('game:request_state', () => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const game = getGame(gameCode)
    if (game) {
      socket.emit('game:state', { gameState: game })
    }
  })

  // Trade proposal
  socket.on('trade:propose', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const game = getGame(gameCode)
    if (!game) return

    if (!isPlayerTurn(game, playerId)) {
      socket.emit('trade:error', { code: 'NOT_YOUR_TURN', message: 'You can only propose trades on your turn' })
      return
    }

    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2)}`

    io.to(gameCode).emit('trade:proposed', {
      trade: {
        id: tradeId,
        targetPlayerId: payload.targetPlayerId,
        offering: payload.offering,
        requesting: payload.requesting,
      },
    })
  })

  // Accept trade
  socket.on('trade:accept', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    io.to(gameCode).emit('trade:accepted', {
      tradeId: payload.tradeId,
      acceptedBy: playerId,
    })

    // TODO: Actually transfer resources
  })

  // Reject trade
  socket.on('trade:reject', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    io.to(gameCode).emit('trade:rejected', {
      tradeId: payload.tradeId,
      rejectedBy: playerId,
    })
  })

  // Cancel trade
  socket.on('trade:cancel', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    io.to(gameCode).emit('trade:cancelled', { tradeId: payload.tradeId })
  })

  // Bank trade (4:1)
  socket.on('trade:bank', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    // TODO: Implement bank trading logic
    console.log(`${playerId} attempting bank trade`, payload)
  })

  // Port trade
  socket.on('trade:port', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    // TODO: Implement port trading logic
    console.log(`${playerId} attempting port trade`, payload)
  })

  // Dev card: Knight
  socket.on('devcard:play_knight', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    // TODO: Play knight card, then move robber
    console.log(`${playerId} playing knight to hex ${payload.hexId}`)
  })

  // Chat message
  socket.on('chat:send', (payload) => {
    const gameCode = getPlayerGameCode(playerId)
    if (!gameCode) return

    const game = getGame(gameCode)
    const player = game?.players.find(p => p.id === playerId)

    io.to(gameCode).emit('chat:message', {
      playerId,
      username: player?.username ?? 'Unknown',
      message: payload.message,
      timestamp: Date.now(),
    })
  })
}
