import type {
  HexTile,
  TerrainType,
  SerializableBoardState,
  Port,
  PortType,
} from '@catan/shared'
import {
  hexSpiral,
  hexId,
  axialToWorld,
  HEX_SIZE,
} from '@catan/shared'

// Standard Catan terrain distribution
const TERRAIN_DISTRIBUTION: TerrainType[] = [
  'desert',
  'hills', 'hills', 'hills',
  'mountains', 'mountains', 'mountains',
  'forest', 'forest', 'forest', 'forest',
  'pasture', 'pasture', 'pasture', 'pasture',
  'fields', 'fields', 'fields', 'fields',
]

// Standard number token distribution
const NUMBER_DISTRIBUTION = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]

// Port types distribution (9 ports total: 4 generic 3:1, 5 specific 2:1)
const PORT_TYPES: PortType[] = [
  'generic', 'generic', 'generic', 'generic',
  'brick', 'lumber', 'ore', 'grain', 'wool',
]

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

// Check if 6 and 8 are adjacent (they shouldn't be for balanced gameplay)
function hasAdjacentHighNumbers(hexes: HexTile[]): boolean {
  const highNumberHexes = hexes.filter(
    (h) => h.numberToken === 6 || h.numberToken === 8
  )

  for (const hex of highNumberHexes) {
    const worldPos = axialToWorld(hex.coord)

    for (const other of highNumberHexes) {
      if (hex.id === other.id) continue

      const otherPos = axialToWorld(other.coord)
      const distance = Math.sqrt(
        Math.pow(worldPos.x - otherPos.x, 2) +
        Math.pow(worldPos.z - otherPos.z, 2)
      )

      // If distance is less than 2 hex sizes, they're adjacent
      if (distance < HEX_SIZE * 2) {
        return true
      }
    }
  }

  return false
}

// Generate port positions around the board
function generatePorts(): Port[] {
  const shuffledPortTypes = shuffle(PORT_TYPES)
  const ports: Port[] = []

  // 9 ports around the board at roughly even intervals
  const portAngles = [
    0,
    Math.PI * 0.22,
    Math.PI * 0.44,
    Math.PI * 0.66,
    Math.PI * 0.88,
    Math.PI * 1.1,
    Math.PI * 1.32,
    Math.PI * 1.54,
    Math.PI * 1.76,
  ]

  for (let i = 0; i < 9; i++) {
    const portType = shuffledPortTypes[i]
    if (!portType) continue

    const angle = portAngles[i] ?? 0

    ports.push({
      id: `port_${i}`,
      type: portType,
      vertices: [`port_v_${i}_a`, `port_v_${i}_b`], // Placeholder vertex IDs
      position: {
        angle,
        distance: 5.5, // Just outside the board
      },
    })
  }

  return ports
}

// Generate a random balanced Catan board
export function generateBoard(): SerializableBoardState {
  // Generate hex coordinates (spiral from center, radius 2)
  const coords = hexSpiral({ q: 0, r: 0 }, 2)

  let hexes: HexTile[] = []
  let attempts = 0
  const maxAttempts = 100

  // Keep generating until we get a balanced board (no adjacent 6/8)
  do {
    const shuffledTerrains = shuffle(TERRAIN_DISTRIBUTION)
    const shuffledNumbers = shuffle(NUMBER_DISTRIBUTION)

    let numberIndex = 0
    hexes = coords.map((coord, index) => {
      const terrain = shuffledTerrains[index] ?? 'desert'
      const numberToken =
        terrain === 'desert' ? null : (shuffledNumbers[numberIndex++] ?? null)

      return {
        id: hexId(coord),
        coord,
        terrain,
        numberToken,
      }
    })

    attempts++
  } while (hasAdjacentHighNumbers(hexes) && attempts < maxAttempts)

  if (attempts >= maxAttempts) {
    console.warn('Could not generate board without adjacent 6/8 after max attempts')
  }

  // Find desert hex for robber starting position
  const desertHex = hexes.find((h) => h.terrain === 'desert')
  const robberHexId = desertHex?.id ?? hexes[0]?.id ?? ''

  // Generate ports
  const ports = generatePorts()

  return {
    hexes,
    ports,
    vertices: [],
    edges: [],
    buildings: [],
    roads: [],
    robberHexId,
  }
}

// Validate that a board configuration is legal
export function isValidBoard(board: SerializableBoardState): boolean {
  // Check hex count
  if (board.hexes.length !== 19) {
    return false
  }

  // Check exactly one desert
  const desertCount = board.hexes.filter((h) => h.terrain === 'desert').length
  if (desertCount !== 1) {
    return false
  }

  // Check number token count (18 non-desert hexes)
  const numberedHexes = board.hexes.filter((h) => h.numberToken !== null)
  if (numberedHexes.length !== 18) {
    return false
  }

  // Check no adjacent 6/8
  if (hasAdjacentHighNumbers(board.hexes)) {
    return false
  }

  return true
}
