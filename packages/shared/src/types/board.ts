import type { TerrainType } from './resources.js'

// Axial coordinate system for hexagonal grids
export interface AxialCoord {
  q: number // column
  r: number // row
}

// Cube coordinate system (useful for hex math)
export interface CubeCoord {
  x: number
  y: number
  z: number // x + y + z = 0 always
}

// A hex tile on the board
export interface HexTile {
  id: string
  coord: AxialCoord
  terrain: TerrainType
  numberToken: number | null // null for desert
}

// Port types
export type PortType = 'generic' | 'brick' | 'lumber' | 'ore' | 'grain' | 'wool'

// Port on the board edge
export interface Port {
  id: string
  type: PortType
  // The two vertices this port is connected to
  vertices: [string, string]
  // Position for rendering (direction from board center)
  position: {
    angle: number // radians from center
    distance: number
  }
}

// A vertex where settlements/cities can be placed
// Identified by the 3 hex IDs that touch it (sorted)
export interface Vertex {
  id: string
  adjacentHexes: string[]
  adjacentEdges: string[]
  adjacentVertices: string[]
}

// An edge where roads can be placed
// Identified by the 2 hex IDs it borders (sorted)
export interface Edge {
  id: string
  adjacentHexes: string[]
  vertices: [string, string]
  adjacentEdges: string[]
}

// Building on a vertex
export interface VertexBuilding {
  vertexId: string
  playerId: string
  type: 'settlement' | 'city'
}

// Road on an edge
export interface Road {
  edgeId: string
  playerId: string
}

// Complete board state
export interface BoardState {
  hexes: HexTile[]
  ports: Port[]
  vertices: Map<string, Vertex>
  edges: Map<string, Edge>
  buildings: VertexBuilding[]
  roads: Road[]
  robberHexId: string
}

// Serializable version for transmission
export interface SerializableBoardState {
  hexes: HexTile[]
  ports: Port[]
  vertices: Array<[string, Vertex]>
  edges: Array<[string, Edge]>
  buildings: VertexBuilding[]
  roads: Road[]
  robberHexId: string
}

// Convert to serializable format
export function serializeBoardState(board: BoardState): SerializableBoardState {
  return {
    hexes: board.hexes,
    ports: board.ports,
    vertices: Array.from(board.vertices.entries()),
    edges: Array.from(board.edges.entries()),
    buildings: board.buildings,
    roads: board.roads,
    robberHexId: board.robberHexId
  }
}

// Convert from serializable format
export function deserializeBoardState(data: SerializableBoardState): BoardState {
  return {
    hexes: data.hexes,
    ports: data.ports,
    vertices: new Map(data.vertices),
    edges: new Map(data.edges),
    buildings: data.buildings,
    roads: data.roads,
    robberHexId: data.robberHexId
  }
}
