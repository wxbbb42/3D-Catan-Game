import type { ResourceCount } from '../types/resources.js'

// Building costs
export const BUILDING_COSTS = {
  road: {
    brick: 1,
    lumber: 1,
    ore: 0,
    grain: 0,
    wool: 0
  } satisfies ResourceCount,

  settlement: {
    brick: 1,
    lumber: 1,
    ore: 0,
    grain: 1,
    wool: 1
  } satisfies ResourceCount,

  city: {
    brick: 0,
    lumber: 0,
    ore: 3,
    grain: 2,
    wool: 0
  } satisfies ResourceCount,

  devCard: {
    brick: 0,
    lumber: 0,
    ore: 1,
    grain: 1,
    wool: 1
  } satisfies ResourceCount
} as const

// Building limits per player
export const BUILDING_LIMITS = {
  roads: 15,
  settlements: 5,
  cities: 4
} as const

// Victory points required to win
export const VICTORY_POINTS_TO_WIN = 10

// Minimum road length for Longest Road
export const MINIMUM_LONGEST_ROAD = 5

// Minimum knights for Largest Army
export const MINIMUM_LARGEST_ARMY = 3

// Max hand size before discard on 7
export const MAX_HAND_SIZE_BEFORE_DISCARD = 7

// Bank trade ratio (without port)
export const BANK_TRADE_RATIO = 4

// Generic port trade ratio
export const GENERIC_PORT_RATIO = 3

// Specific port trade ratio
export const SPECIFIC_PORT_RATIO = 2
