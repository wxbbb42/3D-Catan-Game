import type { AxialCoord, CubeCoord } from '../types/board.js'
import { HEX_DIRECTIONS } from '../constants/board.js'

// ============== COORDINATE CONVERSIONS ==============

// Convert axial to cube coordinates
export function axialToCube(hex: AxialCoord): CubeCoord {
  return {
    x: hex.q,
    z: hex.r,
    y: -hex.q - hex.r
  }
}

// Convert cube to axial coordinates
export function cubeToAxial(cube: CubeCoord): AxialCoord {
  return {
    q: cube.x,
    r: cube.z
  }
}

// Round cube coordinates to nearest hex
export function cubeRound(cube: { x: number; y: number; z: number }): CubeCoord {
  let rx = Math.round(cube.x)
  let ry = Math.round(cube.y)
  let rz = Math.round(cube.z)

  const xDiff = Math.abs(rx - cube.x)
  const yDiff = Math.abs(ry - cube.y)
  const zDiff = Math.abs(rz - cube.z)

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }

  return { x: rx, y: ry, z: rz }
}

// Round axial coordinates to nearest hex
export function axialRound(hex: { q: number; r: number }): AxialCoord {
  const cube = axialToCube({ q: hex.q, r: hex.r })
  const rounded = cubeRound(cube)
  return cubeToAxial(rounded)
}

// ============== WORLD POSITION CONVERSIONS ==============

// Hex size constant (distance from center to corner)
export const HEX_SIZE = 1

// Convert axial coordinates to world position (x, z plane)
export function axialToWorld(
  hex: AxialCoord,
  size: number = HEX_SIZE
): { x: number; z: number } {
  const x = size * (3 / 2) * hex.q
  const z = size * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r)
  return { x, z }
}

// Convert world position to axial coordinates
export function worldToAxial(
  worldX: number,
  worldZ: number,
  size: number = HEX_SIZE
): AxialCoord {
  const q = ((2 / 3) * worldX) / size
  const r = ((-1 / 3) * worldX + (Math.sqrt(3) / 3) * worldZ) / size
  return axialRound({ q, r })
}

// ============== HEX NEIGHBORS ==============

// Get all 6 neighbors of a hex
export function getHexNeighbors(hex: AxialCoord): AxialCoord[] {
  return HEX_DIRECTIONS.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }))
}

// Get neighbor in a specific direction (0-5)
export function getHexNeighbor(hex: AxialCoord, direction: number): AxialCoord {
  const dir = HEX_DIRECTIONS[direction % 6]
  if (!dir) {
    throw new Error(`Invalid direction: ${direction}`)
  }
  return {
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }
}

// ============== HEX DISTANCE ==============

// Calculate distance between two hexes
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const ac = axialToCube(a)
  const bc = axialToCube(b)
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z)
  )
}

// ============== HEX RING GENERATION ==============

// Generate hexes in a ring at given radius
export function hexRing(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius === 0) {
    return [center]
  }

  const results: AxialCoord[] = []

  // Start at the hex radius steps in direction 4 (southwest)
  let hex: AxialCoord = {
    q: center.q + HEX_DIRECTIONS[4]!.q * radius,
    r: center.r + HEX_DIRECTIONS[4]!.r * radius
  }

  // Walk around the ring
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(hex)
      hex = getHexNeighbor(hex, i)
    }
  }

  return results
}

// Generate all hexes in a spiral up to given radius
export function hexSpiral(center: AxialCoord, radius: number): AxialCoord[] {
  const results: AxialCoord[] = []

  for (let r = 0; r <= radius; r++) {
    results.push(...hexRing(center, r))
  }

  return results
}

// ============== VERTEX AND EDGE IDENTIFICATION ==============

// Create a unique ID for a hex based on coordinates
export function hexId(coord: AxialCoord): string {
  return `hex_${coord.q}_${coord.r}`
}

// Parse hex ID back to coordinates
export function parseHexId(id: string): AxialCoord {
  const match = id.match(/^hex_(-?\d+)_(-?\d+)$/)
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid hex ID: ${id}`)
  }
  return {
    q: parseInt(match[1], 10),
    r: parseInt(match[2], 10)
  }
}

// Create vertex ID from the 3 adjacent hex coordinates (sorted for consistency)
export function createVertexId(hexCoords: AxialCoord[]): string {
  const ids = hexCoords.map(hexId).sort()
  return `v_${ids.join('_')}`
}

// Create edge ID from the 2 adjacent hex coordinates (sorted for consistency)
export function createEdgeId(hex1: AxialCoord, hex2: AxialCoord): string {
  const ids = [hexId(hex1), hexId(hex2)].sort()
  return `e_${ids.join('_')}`
}

// ============== VERTEX CORNERS ==============

// Get the 6 corner positions of a hex in world coordinates
export function getHexCorners(
  center: { x: number; z: number },
  size: number = HEX_SIZE
): Array<{ x: number; z: number }> {
  const corners: Array<{ x: number; z: number }> = []

  for (let i = 0; i < 6; i++) {
    // Angle for pointy-top hexagons (30 degree offset)
    const angle = (Math.PI / 3) * i - Math.PI / 6
    corners.push({
      x: center.x + size * Math.cos(angle),
      z: center.z + size * Math.sin(angle)
    })
  }

  return corners
}

// Get corner position at specific index (0-5)
export function getHexCorner(
  center: { x: number; z: number },
  cornerIndex: number,
  size: number = HEX_SIZE
): { x: number; z: number } {
  const angle = (Math.PI / 3) * (cornerIndex % 6) - Math.PI / 6
  return {
    x: center.x + size * Math.cos(angle),
    z: center.z + size * Math.sin(angle)
  }
}

// Get edge midpoint position at specific index (0-5)
export function getHexEdgeMidpoint(
  center: { x: number; z: number },
  edgeIndex: number,
  size: number = HEX_SIZE
): { x: number; z: number } {
  const corner1 = getHexCorner(center, edgeIndex, size)
  const corner2 = getHexCorner(center, (edgeIndex + 1) % 6, size)
  return {
    x: (corner1.x + corner2.x) / 2,
    z: (corner1.z + corner2.z) / 2
  }
}

// ============== VERTEX/EDGE POSITION CALCULATIONS ==============

// Parse vertex ID to extract hex coordinates
// Vertex ID format: "v_hex_q1_r1_hex_q2_r2_hex_q3_r3" (2 or 3 hexes, sorted)
export function parseVertexId(vertexId: string): AxialCoord[] {
  if (!vertexId.startsWith('v_')) {
    throw new Error(`Invalid vertex ID: ${vertexId}`)
  }

  const hexPart = vertexId.slice(2) // Remove "v_"
  const hexMatches = hexPart.match(/hex_-?\d+_-?\d+/g)

  if (!hexMatches || hexMatches.length < 2) {
    throw new Error(`Invalid vertex ID format: ${vertexId}`)
  }

  return hexMatches.map(h => parseHexId(h))
}

// Parse edge ID to extract hex coordinates
// Edge ID format: "e_hex_q1_r1_hex_q2_r2" (always 2 hexes, sorted)
export function parseEdgeId(edgeId: string): [AxialCoord, AxialCoord] {
  if (!edgeId.startsWith('e_')) {
    throw new Error(`Invalid edge ID: ${edgeId}`)
  }

  const hexPart = edgeId.slice(2) // Remove "e_"
  const hexMatches = hexPart.match(/hex_-?\d+_-?\d+/g)

  if (!hexMatches || hexMatches.length !== 2) {
    throw new Error(`Invalid edge ID format: ${edgeId}`)
  }

  return [parseHexId(hexMatches[0]!), parseHexId(hexMatches[1]!)]
}

// Get world position of a vertex (where settlements are placed)
// Vertices are at hex corners where 2-3 hexes meet
export function getVertexWorldPosition(
  vertexId: string,
  size: number = HEX_SIZE
): { x: number; z: number } {
  const hexCoords = parseVertexId(vertexId)

  // Find the corner that is shared by all these hexes
  // Strategy: Get corners of first hex, find one that's equidistant from all hex centers
  const firstHexCenter = axialToWorld(hexCoords[0]!, size)
  const corners = getHexCorners(firstHexCenter, size)

  // For each corner of the first hex, check if it's at the correct distance from all other hexes
  for (const corner of corners) {
    let isValidCorner = true

    for (let i = 1; i < hexCoords.length; i++) {
      const otherCenter = axialToWorld(hexCoords[i]!, size)
      const distSq = (corner.x - otherCenter.x) ** 2 + (corner.z - otherCenter.z) ** 2
      // Corner should be at distance `size` from each hex center (within tolerance)
      const expectedDistSq = size * size
      if (Math.abs(distSq - expectedDistSq) > 0.01) {
        isValidCorner = false
        break
      }
    }

    if (isValidCorner) {
      return corner
    }
  }

  // Fallback: average the hex centers (less accurate but won't crash)
  let totalX = 0
  let totalZ = 0
  for (const coord of hexCoords) {
    const pos = axialToWorld(coord, size)
    totalX += pos.x
    totalZ += pos.z
  }
  return { x: totalX / hexCoords.length, z: totalZ / hexCoords.length }
}

// Get the two corner positions of an edge (where roads are placed)
// Edges are between 2 adjacent hexes
export function getEdgeWorldPositions(
  edgeId: string,
  size: number = HEX_SIZE
): { start: { x: number; z: number }; end: { x: number; z: number } } {
  const [hex1, hex2] = parseEdgeId(edgeId)

  const center1 = axialToWorld(hex1, size)
  const center2 = axialToWorld(hex2, size)
  const corners1 = getHexCorners(center1, size)
  const corners2 = getHexCorners(center2, size)

  // Find the two corners that are shared (within tolerance)
  const sharedCorners: Array<{ x: number; z: number }> = []
  const tolerance = 0.01

  for (const c1 of corners1) {
    for (const c2 of corners2) {
      const distSq = (c1.x - c2.x) ** 2 + (c1.z - c2.z) ** 2
      if (distSq < tolerance) {
        sharedCorners.push(c1)
        break
      }
    }
  }

  if (sharedCorners.length >= 2) {
    return { start: sharedCorners[0]!, end: sharedCorners[1]! }
  }

  // Fallback: use midpoint between hex centers
  const midX = (center1.x + center2.x) / 2
  const midZ = (center1.z + center2.z) / 2
  // Approximate edge endpoints perpendicular to the line between hex centers
  const dx = center2.x - center1.x
  const dz = center2.z - center1.z
  const len = Math.sqrt(dx * dx + dz * dz)
  const perpX = (-dz / len) * size * 0.5
  const perpZ = (dx / len) * size * 0.5

  return {
    start: { x: midX + perpX, z: midZ + perpZ },
    end: { x: midX - perpX, z: midZ - perpZ }
  }
}
