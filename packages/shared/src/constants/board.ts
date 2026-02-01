import type { TerrainType } from '../types/resources.js'
import type { DevCardType } from '../types/player.js'

// Standard Catan board has 19 hex tiles
export const BOARD_HEX_COUNT = 19

// Terrain distribution on standard board
export const TERRAIN_DISTRIBUTION: Record<TerrainType, number> = {
  desert: 1,
  hills: 3,      // brick
  mountains: 3,  // ore
  forest: 4,     // lumber
  pasture: 4,    // wool
  fields: 4      // grain
} as const

// Number token distribution (excludes 7)
// Standard distribution: 2 appears once, 12 appears once, others appear twice
export const NUMBER_TOKEN_DISTRIBUTION: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
]

// Number token probabilities (out of 36 dice combinations)
export const NUMBER_PROBABILITIES: Record<number, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1
} as const

// Development card distribution (25 total)
export const DEV_CARD_DISTRIBUTION: Record<DevCardType, number> = {
  knight: 14,
  victory_point: 5,
  road_building: 2,
  year_of_plenty: 2,
  monopoly: 2
} as const

// Total development cards
export const TOTAL_DEV_CARDS = 25

// Hex ring sizes for standard board
// Ring 0: center (1 hex)
// Ring 1: 6 hexes
// Ring 2: 12 hexes
export const HEX_RING_SIZES = [1, 6, 12] as const

// Axial directions for hex neighbors
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 }    // Southeast
] as const

// Port positions around the board (edge indices)
export const PORT_COUNT = 9

// ============== VISUAL LAYOUT CONSTANTS ==============
// These control the physical appearance of the board

// Visual tile radius.
// NOTE: This controls the *rendered* hex geometry size. The board layout math
// (axialToWorld) uses HEX_SIZE=1 as the center-to-center spacing baseline.
//
// If you want tiles to be tightly packed (edges touching), keep this ~= 1.
// If you want visible gaps for roads/rails, reduce it (e.g. 0.82).
export const HEX_TILE_RADIUS = 1

// Road dimensions (sits on the edge between tiles)
export const ROAD_WIDTH = 0.14
export const ROAD_HEIGHT = 0.08

// Rail dimensions (base that roads sit on)
export const RAIL_HEIGHT = 0.06

// Road base Y position (sits on top of rail)
export const ROAD_BASE_Y = RAIL_HEIGHT + ROAD_HEIGHT / 2

// Building base Y positions (sit in gaps, not float above)
export const SETTLEMENT_BASE_Y = 0.08
export const CITY_BASE_Y = 0.08
