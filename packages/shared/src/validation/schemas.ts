import { z } from 'zod'

// Resource type enum
export const ResourceTypeSchema = z.enum(['brick', 'lumber', 'ore', 'grain', 'wool'])

// Resource count schema
export const ResourceCountSchema = z.object({
  brick: z.number().int().min(0),
  lumber: z.number().int().min(0),
  ore: z.number().int().min(0),
  grain: z.number().int().min(0),
  wool: z.number().int().min(0)
})

// Player color schema
export const PlayerColorSchema = z.enum(['red', 'blue', 'orange', 'white'])

// Dev card type schema
export const DevCardTypeSchema = z.enum([
  'knight',
  'victory_point',
  'road_building',
  'year_of_plenty',
  'monopoly'
])

// Axial coordinate schema
export const AxialCoordSchema = z.object({
  q: z.number().int(),
  r: z.number().int()
})

// Game code schema (e.g., "CATAN-ABC123")
export const GameCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{6}$/, 'Game code must be 6 alphanumeric characters')

// Username schema
export const UsernameSchema = z
  .string()
  .min(2, 'Username must be at least 2 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')

// ============== ACTION SCHEMAS ==============

// Build settlement action
export const BuildSettlementSchema = z.object({
  vertexId: z.string().min(1)
})

// Build city action
export const BuildCitySchema = z.object({
  vertexId: z.string().min(1)
})

// Build road action
export const BuildRoadSchema = z.object({
  edgeId: z.string().min(1)
})

// Move robber action
export const MoveRobberSchema = z.object({
  hexId: z.string().min(1)
})

// Steal from player action
export const StealFromPlayerSchema = z.object({
  victimId: z.string().min(1)
})

// Discard resources action
export const DiscardResourcesSchema = z.object({
  resources: ResourceCountSchema
})

// Trade proposal schema
export const TradeProposalSchema = z.object({
  targetPlayerId: z.string().nullable().optional(),
  offering: ResourceCountSchema,
  requesting: ResourceCountSchema
})

// Bank trade schema
export const BankTradeSchema = z.object({
  giving: ResourceCountSchema,
  receiving: ResourceCountSchema
})

// Port trade schema
export const PortTradeSchema = z.object({
  portType: z.enum(['generic', 'brick', 'lumber', 'ore', 'grain', 'wool']),
  giving: ResourceCountSchema,
  receiving: ResourceCountSchema
})

// Year of Plenty action
export const YearOfPlentySchema = z.object({
  resources: z.tuple([ResourceTypeSchema, ResourceTypeSchema])
})

// Monopoly action
export const MonopolySchema = z.object({
  resource: ResourceTypeSchema
})

// Chat message schema
export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(500)
})

// Lobby create schema
export const LobbyCreateSchema = z.object({
  maxPlayers: z.number().int().min(2).max(4).optional().default(4)
})

// Lobby join schema
export const LobbyJoinSchema = z.object({
  gameCode: GameCodeSchema
})

// Set color schema
export const SetColorSchema = z.object({
  color: PlayerColorSchema
})

// Set ready schema
export const SetReadySchema = z.object({
  isReady: z.boolean()
})
