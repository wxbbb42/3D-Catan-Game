import type {
  GameState,
  PlayerState,
  SerializableBoardState,
  ResourceCount,
  TurnPhase,
  DevCardType,
  PendingDiscard,
} from '@catan/shared'
import {
  TERRAIN_TO_RESOURCE,
  createEmptyResources,
  addResources,
  subtractResources,
  canAfford,
  BUILDING_COSTS,
  calculateTotalVictoryPoints,
  countResources,
} from '@catan/shared'
import { generateBoard } from './BoardGenerator.js'

const VICTORY_POINTS_TO_WIN = 10

// Create initial player state
export function createPlayerState(
  id: string,
  userId: string,
  username: string,
  color: 'red' | 'blue' | 'orange' | 'white'
): PlayerState {
  return {
    id,
    userId,
    username,
    color,
    resources: createEmptyResources(),
    devCards: [],
    settlements: [],
    cities: [],
    roads: [],
    knightsPlayed: 0,
    longestRoadLength: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
    publicVictoryPoints: 0,
    isConnected: true,
  }
}

// Create a new game state
export function createGameState(
  gameId: string,
  code: string,
  players: PlayerState[]
): GameState {
  const board = generateBoard()
  const turnOrder = players.map((p) => p.id)

  return {
    id: gameId,
    code,
    status: 'playing',
    phase: 'roll_for_order',
    board,
    players,
    turnOrder,
    currentPlayerIndex: 0,
    turnNumber: 1,
    turnPhase: 'main',
    lastDiceRoll: null,
    devCardDeckCount: 25,
    rollForOrderState: {
      rolls: {},
      currentRollerIndex: 0,
      allRolled: false,
    },
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
  }
}

// Roll two dice
export function rollDice(): [number, number] {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  return [die1, die2]
}

// Distribute resources based on dice roll
export function distributeResources(
  game: GameState,
  diceTotal: number
): Map<string, Partial<ResourceCount>> {
  const distributions = new Map<string, Partial<ResourceCount>>()

  // Find all hexes with the rolled number
  const rolledHexes = game.board.hexes.filter(
    (h) => h.numberToken === diceTotal && h.id !== game.board.robberHexId
  )

  for (const hex of rolledHexes) {
    const resource = TERRAIN_TO_RESOURCE[hex.terrain]
    if (!resource) continue

    // Find all buildings adjacent to this hex
    for (const building of game.board.buildings) {
      // Check if building is adjacent to this hex
      // The vertex ID contains the adjacent hex IDs
      const vertexParts = building.vertexId.split('_')
      const adjacentHexIds = vertexParts.slice(1)

      if (adjacentHexIds.includes(hex.id.replace('hex_', ''))) {
        const amount = building.type === 'city' ? 2 : 1

        // Add to player's distribution
        const current = distributions.get(building.playerId) ?? {}
        current[resource] = (current[resource] ?? 0) + amount
        distributions.set(building.playerId, current)
      }
    }
  }

  return distributions
}

// Apply resource distributions to game state
export function applyResourceDistributions(
  game: GameState,
  distributions: Map<string, Partial<ResourceCount>>
): GameState {
  const updatedPlayers = game.players.map((player) => {
    const distribution = distributions.get(player.id)
    if (!distribution) return player

    return {
      ...player,
      resources: addResources(player.resources, distribution),
    }
  })

  return {
    ...game,
    players: updatedPlayers,
  }
}

// Handle rolling a 7 (robber activation)
export function handleRobber(game: GameState): GameState {
  // Find players with more than 7 cards who need to discard
  const pendingDiscards: PendingDiscard[] = game.players
    .filter((p) => countResources(p.resources) > 7)
    .map((p) => ({
      playerId: p.id,
      amountToDiscard: Math.floor(countResources(p.resources) / 2),
      discarded: false,
    }))

  const newTurnPhase: TurnPhase =
    pendingDiscards.length > 0 ? 'discard' : 'robber_move'

  return {
    ...game,
    turnPhase: newTurnPhase,
    pendingDiscards,
  }
}

// Discard resources for a player
export function discardResources(
  game: GameState,
  playerId: string,
  resources: ResourceCount
): GameState {
  const player = game.players.find((p) => p.id === playerId)
  if (!player) return game

  const pending = game.pendingDiscards.find((pd) => pd.playerId === playerId)
  if (!pending || pending.discarded) return game

  const totalDiscarding = countResources(resources)
  if (totalDiscarding !== pending.amountToDiscard) return game

  // Update player's resources
  const updatedPlayers = game.players.map((p) => {
    if (p.id !== playerId) return p
    return {
      ...p,
      resources: subtractResources(p.resources, resources),
    }
  })

  // Mark discard as complete
  const updatedPendingDiscards = game.pendingDiscards.map((pd) => {
    if (pd.playerId !== playerId) return pd
    return { ...pd, discarded: true }
  })

  // Check if all discards are complete
  const allDiscarded = updatedPendingDiscards.every((pd) => pd.discarded)
  const newTurnPhase: TurnPhase = allDiscarded ? 'robber_move' : 'discard'

  return {
    ...game,
    players: updatedPlayers,
    pendingDiscards: updatedPendingDiscards,
    turnPhase: newTurnPhase,
  }
}

// Move robber to a new hex
export function moveRobber(game: GameState, newHexId: string): GameState {
  // Can't move to the same hex
  if (newHexId === game.board.robberHexId) return game

  // Check if hex exists
  const hexExists = game.board.hexes.some((h) => h.id === newHexId)
  if (!hexExists) return game

  return {
    ...game,
    board: {
      ...game.board,
      robberHexId: newHexId,
    },
    turnPhase: 'robber_steal',
  }
}

// Steal a resource from another player
export function stealResource(
  game: GameState,
  thiefId: string,
  victimId: string
): { game: GameState; stolenResource: string | null } {
  const victim = game.players.find((p) => p.id === victimId)
  if (!victim || countResources(victim.resources) === 0) {
    return {
      game: { ...game, turnPhase: 'main' },
      stolenResource: null,
    }
  }

  // Build array of available resources to steal from
  const availableResources: string[] = []
  for (const [resource, count] of Object.entries(victim.resources)) {
    for (let i = 0; i < count; i++) {
      availableResources.push(resource)
    }
  }

  // Pick random resource
  const stolenResource =
    availableResources[Math.floor(Math.random() * availableResources.length)] ?? null
  if (!stolenResource) {
    return {
      game: { ...game, turnPhase: 'main' },
      stolenResource: null,
    }
  }

  // Transfer resource
  const updatedPlayers = game.players.map((p) => {
    if (p.id === thiefId) {
      return {
        ...p,
        resources: addResources(p.resources, { [stolenResource]: 1 }),
      }
    }
    if (p.id === victimId) {
      return {
        ...p,
        resources: subtractResources(p.resources, { [stolenResource]: 1 }),
      }
    }
    return p
  })

  return {
    game: {
      ...game,
      players: updatedPlayers,
      turnPhase: 'main',
    },
    stolenResource,
  }
}

// Check if a vertex is valid for settlement placement
export function canPlaceSettlement(
  game: GameState,
  playerId: string,
  vertexId: string,
  isSetupPhase: boolean = false
): boolean {
  // Check if vertex is already occupied
  const occupied = game.board.buildings.some((b) => b.vertexId === vertexId)
  if (occupied) return false

  // TODO: Check distance rule (no adjacent settlements)
  // TODO: Check if connected to player's road (unless setup phase)

  // Check if player can afford (unless setup phase)
  if (!isSetupPhase) {
    const player = game.players.find((p) => p.id === playerId)
    if (!player || !canAfford(player.resources, BUILDING_COSTS.settlement)) {
      return false
    }
  }

  return true
}

// Place a settlement
export function placeSettlement(
  game: GameState,
  playerId: string,
  vertexId: string
): GameState {
  const player = game.players.find((p) => p.id === playerId)
  if (!player) return game

  const isSetupPhase = game.phase === 'setup_first' || game.phase === 'setup_second'

  // Deduct resources (unless setup phase)
  const updatedPlayers = game.players.map((p) => {
    if (p.id !== playerId) return p
    return {
      ...p,
      resources: isSetupPhase
        ? p.resources
        : subtractResources(p.resources, BUILDING_COSTS.settlement),
      settlements: [...p.settlements, vertexId],
      publicVictoryPoints: p.publicVictoryPoints + 1,
    }
  })

  // Add building to board
  const updatedBoard: SerializableBoardState = {
    ...game.board,
    buildings: [
      ...game.board.buildings,
      { vertexId, playerId, type: 'settlement' },
    ],
  }

  return {
    ...game,
    players: updatedPlayers,
    board: updatedBoard,
  }
}

// Upgrade settlement to city
export function upgradeToCity(
  game: GameState,
  playerId: string,
  vertexId: string
): GameState {
  const player = game.players.find((p) => p.id === playerId)
  if (!player) return game

  // Check if player has a settlement at this vertex
  const buildingIndex = game.board.buildings.findIndex(
    (b) => b.vertexId === vertexId && b.playerId === playerId && b.type === 'settlement'
  )
  if (buildingIndex === -1) return game

  // Check if player can afford
  if (!canAfford(player.resources, BUILDING_COSTS.city)) return game

  // Update player resources
  const updatedPlayers = game.players.map((p) => {
    if (p.id !== playerId) return p
    return {
      ...p,
      resources: subtractResources(p.resources, BUILDING_COSTS.city),
      settlements: p.settlements.filter((s) => s !== vertexId),
      cities: [...p.cities, vertexId],
      publicVictoryPoints: p.publicVictoryPoints + 1, // +1 because settlement was already 1
    }
  })

  // Update building type
  const updatedBuildings = [...game.board.buildings]
  updatedBuildings[buildingIndex] = {
    ...updatedBuildings[buildingIndex]!,
    type: 'city',
  }

  return {
    ...game,
    players: updatedPlayers,
    board: {
      ...game.board,
      buildings: updatedBuildings,
    },
  }
}

// Place a road
export function placeRoad(
  game: GameState,
  playerId: string,
  edgeId: string
): GameState {
  const player = game.players.find((p) => p.id === playerId)
  if (!player) return game

  const isSetupPhase = game.phase === 'setup_first' || game.phase === 'setup_second'
  const isRoadBuilding = game.turnPhase === 'road_building'

  // Check if edge is already occupied
  const occupied = game.board.roads.some((r) => r.edgeId === edgeId)
  if (occupied) return game

  // Deduct resources (unless setup or road building)
  const updatedPlayers = game.players.map((p) => {
    if (p.id !== playerId) return p
    return {
      ...p,
      resources:
        isSetupPhase || isRoadBuilding
          ? p.resources
          : subtractResources(p.resources, BUILDING_COSTS.road),
      roads: [...p.roads, edgeId],
    }
  })

  // Add road to board
  const updatedBoard: SerializableBoardState = {
    ...game.board,
    roads: [...game.board.roads, { edgeId, playerId }],
  }

  let updatedGame: GameState = {
    ...game,
    players: updatedPlayers,
    board: updatedBoard,
  }

  // Handle road building card
  if (isRoadBuilding) {
    const roadsPlaced = game.roadBuildingRoadsPlaced + 1
    if (roadsPlaced >= 2) {
      updatedGame = {
        ...updatedGame,
        turnPhase: 'main',
        roadBuildingRoadsPlaced: 0,
      }
    } else {
      updatedGame = {
        ...updatedGame,
        roadBuildingRoadsPlaced: roadsPlaced,
      }
    }
  }

  return updatedGame
}

// Check and update longest road
export function updateLongestRoad(game: GameState): GameState {
  // TODO: Implement proper longest road calculation
  // For now, just count roads
  let longestPlayer: string | null = null
  let longestLength = game.longestRoadLength

  for (const player of game.players) {
    if (player.roads.length >= 5 && player.roads.length > longestLength) {
      longestPlayer = player.id
      longestLength = player.roads.length
    }
  }

  if (longestPlayer !== game.longestRoadHolder) {
    // Update victory points
    const updatedPlayers = game.players.map((p) => {
      const hadLongestRoad = p.id === game.longestRoadHolder
      const hasLongestRoad = p.id === longestPlayer

      if (hadLongestRoad === hasLongestRoad) return p

      return {
        ...p,
        hasLongestRoad,
        publicVictoryPoints: p.publicVictoryPoints + (hasLongestRoad ? 2 : -2),
      }
    })

    return {
      ...game,
      players: updatedPlayers,
      longestRoadHolder: longestPlayer,
      longestRoadLength: longestLength,
    }
  }

  return game
}

// Check and update largest army
export function updateLargestArmy(game: GameState): GameState {
  let largestPlayer: string | null = null
  let largestSize = game.largestArmySize

  for (const player of game.players) {
    if (player.knightsPlayed >= 3 && player.knightsPlayed > largestSize) {
      largestPlayer = player.id
      largestSize = player.knightsPlayed
    }
  }

  if (largestPlayer !== game.largestArmyHolder) {
    const updatedPlayers = game.players.map((p) => {
      const hadLargestArmy = p.id === game.largestArmyHolder
      const hasLargestArmy = p.id === largestPlayer

      if (hadLargestArmy === hasLargestArmy) return p

      return {
        ...p,
        hasLargestArmy,
        publicVictoryPoints: p.publicVictoryPoints + (hasLargestArmy ? 2 : -2),
      }
    })

    return {
      ...game,
      players: updatedPlayers,
      largestArmyHolder: largestPlayer,
      largestArmySize: largestSize,
    }
  }

  return game
}

// Check for winner
export function checkWinner(game: GameState): GameState {
  for (const player of game.players) {
    const totalVP = calculateTotalVictoryPoints(player)
    if (totalVP >= VICTORY_POINTS_TO_WIN) {
      return {
        ...game,
        status: 'finished',
        phase: 'finished',
        winnerId: player.id,
        finishedAt: Date.now(),
      }
    }
  }
  return game
}

// End current turn
export function endTurn(game: GameState): GameState {
  const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length
  const isNewRound = nextPlayerIndex === 0

  return {
    ...game,
    currentPlayerIndex: nextPlayerIndex,
    turnNumber: isNewRound ? game.turnNumber + 1 : game.turnNumber,
    turnPhase: 'pre_roll',
    lastDiceRoll: null,
  }
}

// Buy development card
export function buyDevCard(game: GameState, playerId: string): GameState {
  const player = game.players.find((p) => p.id === playerId)
  if (!player) return game

  if (!canAfford(player.resources, BUILDING_COSTS.devCard)) return game
  if (game.devCardDeckCount <= 0) return game

  // Determine card type (simplified distribution)
  const cardTypes: DevCardType[] = [
    'knight', 'knight', 'knight', 'knight', 'knight',
    'knight', 'knight', 'knight', 'knight', 'knight',
    'knight', 'knight', 'knight', 'knight',
    'victory_point', 'victory_point', 'victory_point', 'victory_point', 'victory_point',
    'road_building', 'road_building',
    'year_of_plenty', 'year_of_plenty',
    'monopoly', 'monopoly',
  ]

  const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)]!

  const updatedPlayers = game.players.map((p) => {
    if (p.id !== playerId) return p
    return {
      ...p,
      resources: subtractResources(p.resources, BUILDING_COSTS.devCard),
      devCards: [
        ...p.devCards,
        {
          id: `card_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: cardType,
          purchasedOnTurn: game.turnNumber,
          played: false,
        },
      ],
    }
  })

  return {
    ...game,
    players: updatedPlayers,
    devCardDeckCount: game.devCardDeckCount - 1,
  }
}
