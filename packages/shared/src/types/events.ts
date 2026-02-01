import type { ResourceCount, ResourceType } from './resources.js'
import type { DevCardType, LobbyPlayer } from './player.js'
import type { GameState, LobbyState } from './game.js'

// ============== SERVER TO CLIENT EVENTS ==============

export interface ServerToClientEvents {
  // Connection
  'connection:established': (payload: { playerId: string }) => void
  'connection:error': (payload: { code: string; message: string }) => void

  // Lobby Events
  'lobby:state': (payload: { lobby: LobbyState }) => void
  'lobby:player_joined': (payload: { player: LobbyPlayer }) => void
  'lobby:player_left': (payload: { playerId: string }) => void
  'lobby:player_ready': (payload: { playerId: string; isReady: boolean }) => void
  'lobby:player_color': (payload: { playerId: string; color: string }) => void
  'lobby:game_starting': (payload: { countdown: number }) => void
  'lobby:error': (payload: { code: string; message: string }) => void

  // Game State Events
  'game:state': (payload: { gameState: GameState }) => void
  'game:started': (payload: { gameState: GameState }) => void
  'game:turn_changed': (payload: { playerId: string; turnPhase: string }) => void
  'game:phase_changed': (payload: { phase: string }) => void
  'game:ended': (payload: { winnerId: string; finalState: GameState }) => void

  // Dice Events
  'dice:rolled': (payload: DiceRolledPayload) => void
  'dice:resources_distributed': (payload: ResourcesDistributedPayload) => void

  // Building Events
  'build:settlement_placed': (payload: BuildingPlacedPayload) => void
  'build:city_placed': (payload: BuildingPlacedPayload) => void
  'build:road_placed': (payload: RoadPlacedPayload) => void
  'build:error': (payload: { code: string; message: string }) => void

  // Robber Events
  'robber:activated': (payload: { playerId: string }) => void
  'robber:moved': (payload: { playerId: string; hexId: string }) => void
  'robber:steal': (payload: RobberStealPayload) => void
  'robber:discard_required': (payload: DiscardRequiredPayload) => void
  'robber:player_discarded': (payload: { playerId: string }) => void

  // Trade Events
  'trade:proposed': (payload: { trade: TradeProposalPayload }) => void
  'trade:accepted': (payload: { tradeId: string; acceptedBy: string }) => void
  'trade:rejected': (payload: { tradeId: string; rejectedBy: string }) => void
  'trade:cancelled': (payload: { tradeId: string }) => void
  'trade:completed': (payload: TradeCompletedPayload) => void
  'trade:error': (payload: { code: string; message: string }) => void

  // Development Card Events
  'devcard:purchased': (payload: { playerId: string }) => void
  'devcard:played': (payload: DevCardPlayedPayload) => void

  // Achievement Events
  'achievement:longest_road': (payload: { playerId: string | null; length: number }) => void
  'achievement:largest_army': (payload: { playerId: string | null; size: number }) => void

  // Player State Events
  'player:resources_updated': (payload: { playerId: string; resources: ResourceCount }) => void
  'player:victory_points': (payload: { playerId: string; publicPoints: number }) => void
  'player:disconnected': (payload: { playerId: string }) => void
  'player:reconnected': (payload: { playerId: string }) => void

  // Chat
  'chat:message': (payload: ChatMessagePayload) => void
}

// ============== CLIENT TO SERVER EVENTS ==============

export interface ClientToServerEvents {
  // Lobby
  'lobby:create': (payload: { maxPlayers?: number }) => void
  'lobby:join': (payload: { gameCode: string }) => void
  'lobby:leave': () => void
  'lobby:ready': (payload: { isReady: boolean }) => void
  'lobby:set_color': (payload: { color: string }) => void
  'lobby:start_game': () => void

  // Game Actions
  'game:roll_dice': () => void
  'game:end_turn': () => void
  'game:request_state': () => void

  // Building Actions
  'build:settlement': (payload: { vertexId: string }) => void
  'build:city': (payload: { vertexId: string }) => void
  'build:road': (payload: { edgeId: string }) => void
  'build:dev_card': () => void

  // Robber Actions
  'robber:move': (payload: { hexId: string }) => void
  'robber:steal': (payload: { victimId: string }) => void
  'robber:discard': (payload: { resources: ResourceCount }) => void

  // Trade Actions
  'trade:propose': (payload: TradeProposalPayload) => void
  'trade:accept': (payload: { tradeId: string }) => void
  'trade:reject': (payload: { tradeId: string }) => void
  'trade:cancel': (payload: { tradeId: string }) => void
  'trade:bank': (payload: BankTradePayload) => void
  'trade:port': (payload: PortTradePayload) => void

  // Development Cards
  'devcard:play_knight': (payload: { hexId: string }) => void
  'devcard:knight_steal': (payload: { victimId: string }) => void
  'devcard:play_road_building': () => void
  'devcard:road_building_place': (payload: { edgeId: string }) => void
  'devcard:play_year_of_plenty': (payload: { resources: [ResourceType, ResourceType] }) => void
  'devcard:play_monopoly': (payload: { resource: ResourceType }) => void

  // Chat
  'chat:send': (payload: { message: string }) => void
}

// ============== EVENT PAYLOADS ==============

// Note: LobbyState is defined in game.ts

export interface DiceRolledPayload {
  playerId: string
  dice: [number, number]
  total: number
}

export interface ResourcesDistributedPayload {
  distributions: Array<{
    playerId: string
    resources: Partial<ResourceCount>
  }>
}

export interface BuildingPlacedPayload {
  playerId: string
  vertexId: string
}

export interface RoadPlacedPayload {
  playerId: string
  edgeId: string
}

export interface RobberStealPayload {
  thiefId: string
  victimId: string
  // Resource type is hidden from other players
  stolenResource?: ResourceType
}

export interface DiscardRequiredPayload {
  players: Array<{
    playerId: string
    amountToDiscard: number
  }>
}

export interface TradeProposalPayload {
  id?: string
  targetPlayerId?: string | null
  offering: ResourceCount
  requesting: ResourceCount
}

export interface TradeCompletedPayload {
  tradeId: string
  proposerId: string
  acceptorId: string
  offering: ResourceCount
  requesting: ResourceCount
}

export interface BankTradePayload {
  giving: ResourceCount
  receiving: ResourceCount
}

export interface PortTradePayload {
  portType: string
  giving: ResourceCount
  receiving: ResourceCount
}

export interface DevCardPlayedPayload {
  playerId: string
  cardType: DevCardType
  // Effect-specific data
  effect?: {
    hexId?: string
    victimId?: string
    resources?: ResourceType[]
    resource?: ResourceType
    monopolyGains?: Array<{ fromPlayerId: string; amount: number }>
  }
}

export interface ChatMessagePayload {
  playerId: string
  username: string
  message: string
  timestamp: number
}
