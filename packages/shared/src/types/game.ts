import type { PlayerState, LobbyPlayer } from './player.js'
import type { SerializableBoardState } from './board.js'
import type { ResourceCount } from './resources.js'

// Game status
export type GameStatus = 'waiting' | 'setup' | 'playing' | 'finished' | 'abandoned'

// Game phases
export type GamePhase = 'roll_for_order' | 'setup_first' | 'setup_second' | 'playing' | 'finished'

// Roll for turn order state
export interface RollForOrderState {
  rolls: Record<string, number> // playerId -> total roll
  currentRollerIndex: number // who is currently rolling
  allRolled: boolean
}

// Turn phases during gameplay
export type TurnPhase =
  | 'pre_roll'      // Must roll dice
  | 'post_roll'     // After rolling, before main actions
  | 'robber_move'   // Must move robber (rolled 7)
  | 'robber_steal'  // Must choose who to steal from
  | 'discard'       // Players with >7 cards must discard
  | 'main'          // Can build, trade, play dev cards
  | 'road_building' // Playing road building card (place 2 roads)
  | 'year_of_plenty' // Playing year of plenty card (take 2 resources)
  | 'monopoly'      // Playing monopoly card (name a resource)

// Setup phase state (initial placement)
export interface SetupPhaseState {
  currentRound: 1 | 2
  placementType: 'settlement' | 'road'
  // Track which settlements need road placement (playerId -> settlementVertexId)
  settlementsNeedingRoads: Record<string, string>
}

// Active trade proposal
export interface TradeProposal {
  id: string
  proposerId: string
  targetPlayerId: string | null // null = open to all
  offering: ResourceCount
  requesting: ResourceCount
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
  createdAt: number
  expiresAt: number
}

// Pending discard for players with >7 cards
export interface PendingDiscard {
  playerId: string
  amountToDiscard: number
  discarded: boolean
}

// Full game state
export interface GameState {
  id: string
  code: string
  status: GameStatus
  phase: GamePhase

  // Board
  board: SerializableBoardState

  // Players
  players: PlayerState[]
  turnOrder: string[] // player IDs in turn order
  currentPlayerIndex: number

  // Turn state
  turnNumber: number
  turnPhase: TurnPhase
  lastDiceRoll: [number, number] | null

  // Development cards remaining in deck
  devCardDeckCount: number

  // Active special states
  rollForOrderState: RollForOrderState | null
  setupState: SetupPhaseState | null
  activeTrade: TradeProposal | null
  pendingDiscards: PendingDiscard[]

  // Road building card state
  roadBuildingRoadsPlaced: number

  // Achievement holders
  longestRoadHolder: string | null
  longestRoadLength: number
  largestArmyHolder: string | null
  largestArmySize: number

  // Winner
  winnerId: string | null

  // Timestamps
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
}

// Lobby state (before game starts)
export interface LobbyState {
  id: string
  code: string
  hostId: string
  players: LobbyPlayer[]
  maxPlayers: number
  status: 'waiting' | 'starting' | 'started'
  createdAt: number
}

// Get current player from game state
export function getCurrentPlayer(state: GameState): PlayerState | undefined {
  const playerId = state.turnOrder[state.currentPlayerIndex]
  return state.players.find(p => p.id === playerId)
}

// Check if it's a player's turn
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return state.turnOrder[state.currentPlayerIndex] === playerId
}

// Check if game is over
export function isGameOver(state: GameState): boolean {
  return state.status === 'finished' || state.status === 'abandoned'
}
