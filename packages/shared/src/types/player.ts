import type { ResourceCount } from './resources.js'

// Player colors
export type PlayerColor = 'red' | 'blue' | 'orange' | 'white'

export const PLAYER_COLORS: readonly PlayerColor[] = ['red', 'blue', 'orange', 'white'] as const

// Development card types
export type DevCardType =
  | 'knight'
  | 'victory_point'
  | 'road_building'
  | 'year_of_plenty'
  | 'monopoly'

// A development card in hand
export interface DevCard {
  id: string
  type: DevCardType
  purchasedOnTurn: number
  played: boolean
}

// Player state in a game
export interface PlayerState {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  color: PlayerColor

  // Resources
  resources: ResourceCount

  // Development cards
  devCards: DevCard[]

  // Buildings placed (vertex/edge IDs)
  settlements: string[]
  cities: string[]
  roads: string[]

  // Stats
  knightsPlayed: number
  longestRoadLength: number

  // Achievements
  hasLongestRoad: boolean
  hasLargestArmy: boolean

  // Victory points (visible + hidden from VP cards)
  publicVictoryPoints: number

  // Connection status
  isConnected: boolean
}

// Calculate public victory points
export function calculatePublicVictoryPoints(player: PlayerState): number {
  let points = 0

  // Settlements: 1 VP each
  points += player.settlements.length

  // Cities: 2 VP each
  points += player.cities.length * 2

  // Longest Road: 2 VP
  if (player.hasLongestRoad) {
    points += 2
  }

  // Largest Army: 2 VP
  if (player.hasLargestArmy) {
    points += 2
  }

  return points
}

// Calculate total victory points (including hidden VP cards)
export function calculateTotalVictoryPoints(player: PlayerState): number {
  let points = calculatePublicVictoryPoints(player)

  // Victory Point cards
  points += player.devCards.filter(
    card => card.type === 'victory_point' && !card.played
  ).length

  return points
}

// Lobby player info (before game starts)
export interface LobbyPlayer {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  color: PlayerColor
  isReady: boolean
  isHost: boolean
  isConnected: boolean
}
