import type { GameState, ResourceCount } from '@catan/shared'
import {
  createGameState,
  createPlayerState,
  rollDice,
  distributeResources,
  applyResourceDistributions,
  handleRobber,
  discardResources,
  moveRobber,
  stealResource,
  placeSettlement,
  upgradeToCity,
  placeRoad,
  updateLongestRoad,
  updateLargestArmy,
  checkWinner,
  endTurn,
  buyDevCard,
} from './engine/GameEngine.js'
import type { LobbyData } from '../socket/index.js'

// In-memory storage for active games
const activeGames = new Map<string, GameState>()

// Player ID to game code mapping
const playerGameMap = new Map<string, string>()

/**
 * Create a new game from a lobby
 */
export function createGame(lobby: LobbyData): GameState {
  const colors: Array<'red' | 'blue' | 'orange' | 'white'> = ['red', 'blue', 'orange', 'white']

  const players = lobby.players.map((lobbyPlayer, index) => {
    const color = (lobbyPlayer.color as 'red' | 'blue' | 'orange' | 'white') || colors[index] || 'red'
    return createPlayerState(
      lobbyPlayer.id,
      lobbyPlayer.id, // Using socket-based ID as userId for now
      lobbyPlayer.username,
      color
    )
  })

  const gameState = createGameState(
    `game_${lobby.code}`,
    lobby.code,
    players
  )

  // Store the game
  activeGames.set(lobby.code, gameState)

  // Map players to this game
  for (const player of players) {
    playerGameMap.set(player.id, lobby.code)
  }

  return gameState
}

/**
 * Get a game by code
 */
export function getGame(code: string): GameState | undefined {
  return activeGames.get(code)
}

/**
 * Get game code for a player
 */
export function getPlayerGameCode(playerId: string): string | undefined {
  return playerGameMap.get(playerId)
}

/**
 * Update and store game state
 */
function updateGame(code: string, newState: GameState): GameState {
  activeGames.set(code, newState)
  return newState
}

/**
 * Get current player for a game
 */
export function getCurrentPlayer(game: GameState): string {
  const currentPlayerId = game.turnOrder[game.currentPlayerIndex]
  return currentPlayerId ?? game.turnOrder[0] ?? ''
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(game: GameState, playerId: string): boolean {
  return getCurrentPlayer(game) === playerId
}

/**
 * Handle roll for turn order (at start of game)
 */
export function handleRollForOrder(code: string, playerId: string): {
  success: boolean
  error?: string
  dice?: [number, number]
  total?: number
  gameState?: GameState
  allRolled?: boolean
  turnOrder?: string[]
} {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (game.phase !== 'roll_for_order') {
    return { success: false, error: 'Not in roll for order phase' }
  }

  if (!game.rollForOrderState) {
    return { success: false, error: 'Invalid game state' }
  }

  // Check if it's this player's turn to roll
  const currentRollerId = game.turnOrder[game.rollForOrderState.currentRollerIndex]
  if (currentRollerId !== playerId) {
    return { success: false, error: 'Not your turn to roll' }
  }

  // Check if player already rolled
  if (game.rollForOrderState.rolls[playerId] !== undefined) {
    return { success: false, error: 'You already rolled' }
  }

  // Roll dice
  const dice = rollDice()
  const total = dice[0] + dice[1]

  // Update rolls
  const newRolls = { ...game.rollForOrderState.rolls, [playerId]: total }
  const nextRollerIndex = game.rollForOrderState.currentRollerIndex + 1
  const allRolled = nextRollerIndex >= game.players.length

  let updatedGame: GameState

  if (allRolled) {
    // Sort players by roll (highest first)
    const sortedPlayers = [...game.players].sort((a, b) => {
      const rollA = newRolls[a.id] ?? 0
      const rollB = newRolls[b.id] ?? 0
      return rollB - rollA
    })

    const newTurnOrder = sortedPlayers.map((p) => p.id)

    // Transition to setup phase
    updatedGame = {
      ...game,
      phase: 'setup_first',
      turnOrder: newTurnOrder,
      currentPlayerIndex: 0,
      rollForOrderState: {
        rolls: newRolls,
        currentRollerIndex: nextRollerIndex,
        allRolled: true,
      },
      setupState: {
        currentRound: 1,
        placementType: 'settlement',
        settlementsNeedingRoads: {},
      },
    }

    updateGame(code, updatedGame)

    return {
      success: true,
      dice,
      total,
      gameState: updatedGame,
      allRolled: true,
      turnOrder: newTurnOrder,
    }
  } else {
    // Move to next player
    updatedGame = {
      ...game,
      rollForOrderState: {
        rolls: newRolls,
        currentRollerIndex: nextRollerIndex,
        allRolled: false,
      },
    }

    updateGame(code, updatedGame)

    return {
      success: true,
      dice,
      total,
      gameState: updatedGame,
      allRolled: false,
    }
  }
}

/**
 * Handle dice roll action
 */
export function handleDiceRoll(code: string, playerId: string): {
  success: boolean
  error?: string
  dice?: [number, number]
  total?: number
  distributions?: Map<string, Partial<ResourceCount>>
  needsDiscard?: boolean
  gameState?: GameState
} {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'pre_roll') {
    return { success: false, error: 'Cannot roll dice now' }
  }

  const dice = rollDice()
  const total = dice[0] + dice[1]

  let updatedGame: GameState = {
    ...game,
    lastDiceRoll: dice,
  }

  if (total === 7) {
    // Handle robber
    updatedGame = handleRobber(updatedGame)
    updateGame(code, updatedGame)

    return {
      success: true,
      dice,
      total,
      needsDiscard: updatedGame.turnPhase === 'discard',
      gameState: updatedGame,
    }
  }

  // Distribute resources
  const distributions = distributeResources(updatedGame, total)
  updatedGame = applyResourceDistributions(updatedGame, distributions)
  updatedGame = { ...updatedGame, turnPhase: 'main' }

  updateGame(code, updatedGame)

  return {
    success: true,
    dice,
    total,
    distributions,
    gameState: updatedGame,
  }
}

/**
 * Handle resource discard (when 7 is rolled)
 */
export function handleDiscard(
  code: string,
  playerId: string,
  resources: ResourceCount
): { success: boolean; error?: string; allDiscarded?: boolean; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (game.turnPhase !== 'discard') {
    return { success: false, error: 'Not in discard phase' }
  }

  const updatedGame = discardResources(game, playerId, resources)
  updateGame(code, updatedGame)

  const allDiscarded = updatedGame.turnPhase !== 'discard'

  return {
    success: true,
    allDiscarded,
    gameState: updatedGame,
  }
}

/**
 * Handle robber movement
 */
export function handleMoveRobber(
  code: string,
  playerId: string,
  hexId: string
): { success: boolean; error?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'robber_move') {
    return { success: false, error: 'Cannot move robber now' }
  }

  const updatedGame = moveRobber(game, hexId)
  updateGame(code, updatedGame)

  return {
    success: true,
    gameState: updatedGame,
  }
}

/**
 * Handle stealing from a player
 */
export function handleSteal(
  code: string,
  thiefId: string,
  victimId: string
): { success: boolean; error?: string; stolenResource?: string | null; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, thiefId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'robber_steal') {
    return { success: false, error: 'Cannot steal now' }
  }

  const { game: updatedGame, stolenResource } = stealResource(game, thiefId, victimId)
  updateGame(code, updatedGame)

  return {
    success: true,
    stolenResource,
    gameState: updatedGame,
  }
}

/**
 * Handle settlement placement
 */
export function handleBuildSettlement(
  code: string,
  playerId: string,
  vertexId: string
): { success: boolean; error?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  const isSetup = game.phase === 'setup_first' || game.phase === 'setup_second'

  if (!isSetup && game.turnPhase !== 'main') {
    return { success: false, error: 'Cannot build now' }
  }

  let updatedGame = placeSettlement(game, playerId, vertexId)

  // Check for setup phase advancement
  if (isSetup && game.setupState) {
    // Track that this settlement needs a road
    const newSettlementsNeedingRoads = {
      ...game.setupState.settlementsNeedingRoads,
      [playerId]: vertexId,
    }

    updatedGame = {
      ...updatedGame,
      setupState: {
        ...game.setupState,
        placementType: 'road',
        settlementsNeedingRoads: newSettlementsNeedingRoads,
      },
    }
  }

  updatedGame = updateLongestRoad(updatedGame)
  updatedGame = checkWinner(updatedGame)
  updateGame(code, updatedGame)

  return {
    success: true,
    gameState: updatedGame,
  }
}

/**
 * Handle city upgrade
 */
export function handleBuildCity(
  code: string,
  playerId: string,
  vertexId: string
): { success: boolean; error?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'main') {
    return { success: false, error: 'Cannot build now' }
  }

  let updatedGame = upgradeToCity(game, playerId, vertexId)
  updatedGame = checkWinner(updatedGame)
  updateGame(code, updatedGame)

  return {
    success: true,
    gameState: updatedGame,
  }
}

/**
 * Handle road placement
 */
export function handleBuildRoad(
  code: string,
  playerId: string,
  edgeId: string
): { success: boolean; error?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  const isSetup = game.phase === 'setup_first' || game.phase === 'setup_second'
  const isRoadBuilding = game.turnPhase === 'road_building'

  if (!isSetup && !isRoadBuilding && game.turnPhase !== 'main') {
    return { success: false, error: 'Cannot build road now' }
  }

  let updatedGame = placeRoad(game, playerId, edgeId)

  // Handle setup phase advancement
  if (isSetup && game.setupState) {
    // Clear the road requirement for this player
    const { [playerId]: _, ...newSettlementsNeedingRoads } = game.setupState.settlementsNeedingRoads

    // Move to next player or phase
    const nextPlayerIndex = (game.currentPlayerIndex + (game.phase === 'setup_second' ? -1 : 1)) % game.turnOrder.length
    const isRoundComplete = game.phase === 'setup_first'
      ? nextPlayerIndex === 0 && game.currentPlayerIndex === game.turnOrder.length - 1
      : nextPlayerIndex === game.turnOrder.length - 1 && game.currentPlayerIndex === 0

    if (isRoundComplete) {
      if (game.phase === 'setup_first') {
        // Move to setup_second, reverse direction
        updatedGame = {
          ...updatedGame,
          phase: 'setup_second',
          currentPlayerIndex: game.turnOrder.length - 1, // Start from last player
          setupState: {
            currentRound: 2,
            placementType: 'settlement',
            settlementsNeedingRoads: {},
          },
        }
      } else {
        // Setup complete, start normal play
        updatedGame = {
          ...updatedGame,
          phase: 'playing',
          currentPlayerIndex: 0,
          turnPhase: 'pre_roll',
          setupState: null,
        }
      }
    } else {
      updatedGame = {
        ...updatedGame,
        currentPlayerIndex: game.phase === 'setup_second'
          ? (game.currentPlayerIndex - 1 + game.turnOrder.length) % game.turnOrder.length
          : nextPlayerIndex,
        setupState: {
          ...game.setupState,
          placementType: 'settlement',
          settlementsNeedingRoads: newSettlementsNeedingRoads,
        },
      }
    }
  }

  updatedGame = updateLongestRoad(updatedGame)
  updateGame(code, updatedGame)

  return {
    success: true,
    gameState: updatedGame,
  }
}

/**
 * Handle buying a development card
 */
export function handleBuyDevCard(
  code: string,
  playerId: string
): { success: boolean; error?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'main') {
    return { success: false, error: 'Cannot buy dev card now' }
  }

  let updatedGame = buyDevCard(game, playerId)
  updatedGame = updateLargestArmy(updatedGame)
  updatedGame = checkWinner(updatedGame)
  updateGame(code, updatedGame)

  return {
    success: true,
    gameState: updatedGame,
  }
}

/**
 * Handle ending turn
 */
export function handleEndTurn(
  code: string,
  playerId: string
): { success: boolean; error?: string; nextPlayerId?: string; gameState?: GameState } {
  const game = activeGames.get(code)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  if (!isPlayerTurn(game, playerId)) {
    return { success: false, error: 'Not your turn' }
  }

  if (game.turnPhase !== 'main') {
    return { success: false, error: 'Cannot end turn now' }
  }

  const updatedGame = endTurn(game)
  updateGame(code, updatedGame)

  const nextPlayerId = getCurrentPlayer(updatedGame)

  return {
    success: true,
    nextPlayerId,
    gameState: updatedGame,
  }
}

/**
 * Remove a player from their game
 */
export function removePlayerFromGame(playerId: string): void {
  const gameCode = playerGameMap.get(playerId)
  if (gameCode) {
    playerGameMap.delete(playerId)

    const game = activeGames.get(gameCode)
    if (game) {
      // Mark player as disconnected
      const updatedPlayers = game.players.map(p =>
        p.id === playerId ? { ...p, isConnected: false } : p
      )
      updateGame(gameCode, { ...game, players: updatedPlayers })
    }
  }
}

/**
 * Delete a game
 */
export function deleteGame(code: string): void {
  const game = activeGames.get(code)
  if (game) {
    // Remove all player mappings
    for (const player of game.players) {
      playerGameMap.delete(player.id)
    }
    activeGames.delete(code)
  }
}
