'use client'

import { useMemo, useCallback } from 'react'
import { useGameStore, useBoard, useMyPlayer, useIsMyTurn, useIsTestMode, useTestPlayerColor } from '@/stores/gameStore'
import { useSocketContext } from '@/components/SocketProvider'
import { VertexMarker } from './VertexMarker'
import { EdgeMarker } from './EdgeMarker'
import { axialToWorld, HEX_TILE_RADIUS, getHexCorners } from '@catan/shared'
import type { AxialCoord, VertexBuilding, SerializableBoardState, Road } from '@catan/shared'

interface VertexPosition {
  id: string
  position: [number, number, number]
}

interface EdgePosition {
  id: string
  start: [number, number, number]
  end: [number, number, number]
}

// NOTE: We use getHexCorners() from @catan/shared so markers/IDs match the shared math.
// Use HEX_TILE_RADIUS (visual tile radius) so edges sit in the visible gaps between tiles.

// Round position to grid key for deduplication (tolerance-based)
function positionKey(x: number, z: number): string {
  return `${Math.round(x * 100)},${Math.round(z * 100)}`
}

function edgeKey(x1: number, z1: number, x2: number, z2: number): string {
  const key1 = positionKey(x1, z1)
  const key2 = positionKey(x2, z2)
  // Sort to ensure same edge always has same key regardless of direction
  return key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`
}

// Compute all 54 vertex positions on a standard Catan board
// Simply collect all corners from all hexes and deduplicate by position
function computeVertexPositions(hexCoords: AxialCoord[]): VertexPosition[] {
  const vertexMap = new Map<string, VertexPosition>()

  for (const coord of hexCoords) {
    const center = axialToWorld(coord)
    const corners = getHexCorners(center, HEX_TILE_RADIUS)

    for (let i = 0; i < 6; i++) {
      const corner = corners[i]
      if (!corner) continue

      const key = positionKey(corner.x, corner.z)
      
      if (!vertexMap.has(key)) {
        // Use rounded coordinates (same as what parsePositionId will return)
        const roundedX = Math.round(corner.x * 100) / 100
        const roundedZ = Math.round(corner.z * 100) / 100
        vertexMap.set(key, {
          id: key,
          position: [roundedX, 0.22, roundedZ],
        })
      }
    }
  }

  return Array.from(vertexMap.values())
}

// Compute all 72 edge positions on a standard Catan board
// Simply collect all edges from all hexes and deduplicate by position
function computeEdgePositions(hexCoords: AxialCoord[]): EdgePosition[] {
  const edgeMap = new Map<string, EdgePosition>()

  for (const coord of hexCoords) {
    const center = axialToWorld(coord)
    const corners = getHexCorners(center, HEX_TILE_RADIUS)


    // Each hex has 6 edges connecting adjacent corners
    for (let i = 0; i < 6; i++) {
      const corner1 = corners[i]
      const corner2 = corners[(i + 1) % 6]
      if (!corner1 || !corner2) continue

      const key = edgeKey(corner1.x, corner1.z, corner2.x, corner2.z)
      
      if (!edgeMap.has(key)) {
        // Use rounded coordinates (same as what parseEdgeId will return)
        const roundedX1 = Math.round(corner1.x * 100) / 100
        const roundedZ1 = Math.round(corner1.z * 100) / 100
        const roundedX2 = Math.round(corner2.x * 100) / 100
        const roundedZ2 = Math.round(corner2.z * 100) / 100
        edgeMap.set(key, {
          id: key,
          start: [roundedX1, 0.22, roundedZ1],
          end: [roundedX2, 0.22, roundedZ2],
        })
      }
    }
  }

  return Array.from(edgeMap.values())
}

// Check if a vertex is available for building
function isVertexAvailable(
  vertexId: string,
  buildings: VertexBuilding[],
  buildMode: 'settlement' | 'city',
  myPlayerId: string | null
): boolean {
  const existingBuilding = buildings.find((b) => b.vertexId === vertexId)

  if (buildMode === 'settlement') {
    // Can only build settlement on empty vertex
    return !existingBuilding
  } else {
    // Can only upgrade own settlement to city
    return (
      existingBuilding?.type === 'settlement' &&
      existingBuilding.playerId === myPlayerId
    )
  }
}

export function InteractiveMarkers() {
  const board = useBoard()
  const game = useGameStore((state) => state.game)
  const buildMode = useGameStore((state) => state.ui.buildMode)
  const hoveredVertexId = useGameStore((state) => state.ui.hoveredVertexId)
  const hoveredEdgeId = useGameStore((state) => state.ui.hoveredEdgeId)
  const selectedVertexId = useGameStore((state) => state.ui.selectedVertexId)
  const selectedEdgeId = useGameStore((state) => state.ui.selectedEdgeId)
  const actions = useGameStore((state) => state.actions)
  const myPlayer = useMyPlayer()
  const isMyTurn = useIsMyTurn()

  // Get socket functions for building (may not be available in test mode)
  let buildSettlement: ((vertexId: string) => void) | undefined
  let buildCity: ((vertexId: string) => void) | undefined
  let buildRoad: ((edgeId: string) => void) | undefined
  
  try {
    const socketContext = useSocketContext()
    buildSettlement = socketContext.buildSettlement
    buildCity = socketContext.buildCity
    buildRoad = socketContext.buildRoad
  } catch {
    // Socket not available (test mode) - we'll handle placement locally
  }

  // Check if we're in test mode
  const isTestMode = useIsTestMode()
  const testPlayerColor = useTestPlayerColor()

  // Local placement functions for test mode
  const localPlaceSettlement = useCallback((vertexId: string) => {
    if (!game?.board) return
    const playerId = `test-${testPlayerColor}`
    
    // Check if building already exists
    const existingIndex = game.board.buildings.findIndex(b => b.vertexId === vertexId)
    
    let newBuildings: VertexBuilding[]
    if (existingIndex >= 0) {
      newBuildings = [...game.board.buildings]
      newBuildings[existingIndex] = { vertexId, playerId, type: 'settlement' }
    } else {
      newBuildings = [...game.board.buildings, { vertexId, playerId, type: 'settlement' }]
    }

    const updatedBoard: SerializableBoardState = {
      ...game.board,
      buildings: newBuildings,
    }
    actions.setGameState({ ...game, board: updatedBoard })
  }, [game, actions, testPlayerColor])

  const localPlaceCity = useCallback((vertexId: string) => {
    if (!game?.board) return
    const playerId = `test-${testPlayerColor}`
    
    // Check if building already exists
    const existingIndex = game.board.buildings.findIndex(b => b.vertexId === vertexId)
    
    let newBuildings: VertexBuilding[]
    if (existingIndex >= 0) {
      newBuildings = [...game.board.buildings]
      newBuildings[existingIndex] = { vertexId, playerId, type: 'city' }
    } else {
      newBuildings = [...game.board.buildings, { vertexId, playerId, type: 'city' }]
    }

    const updatedBoard: SerializableBoardState = {
      ...game.board,
      buildings: newBuildings,
    }
    actions.setGameState({ ...game, board: updatedBoard })
  }, [game, actions, testPlayerColor])

  const localPlaceRoad = useCallback((edgeId: string) => {
    if (!game?.board) return
    const playerId = `test-${testPlayerColor}`
    
    // Check if road already exists
    if (game.board.roads.some(r => r.edgeId === edgeId)) return

    const newRoads: Road[] = [...game.board.roads, { edgeId, playerId }]

    const updatedBoard: SerializableBoardState = {
      ...game.board,
      roads: newRoads,
    }
    actions.setGameState({ ...game, board: updatedBoard })
  }, [game, actions, testPlayerColor])

  // Compute vertex positions
  const vertexPositions = useMemo(() => {
    if (!board) return []
    return computeVertexPositions(board.hexes.map((h) => h.coord))
  }, [board])

  // Compute edge positions
  const edgePositions = useMemo(() => {
    if (!board) return []
    return computeEdgePositions(board.hexes.map((h) => h.coord))
  }, [board])

  // Handlers
  const handleVertexHover = useCallback(
    (vertexId: string | null) => {
      actions.hoverVertex(vertexId)
    },
    [actions]
  )

  const handleVertexClick = useCallback(
    (vertexId: string) => {
      actions.selectVertex(vertexId)
      
      if (isTestMode) {
        // Local placement in test mode
        if (buildMode === 'settlement') {
          localPlaceSettlement(vertexId)
        } else if (buildMode === 'city') {
          localPlaceCity(vertexId)
        }
      } else {
        // Send build request to server
        if (buildMode === 'settlement' && buildSettlement) {
          buildSettlement(vertexId)
        } else if (buildMode === 'city' && buildCity) {
          buildCity(vertexId)
        }
      }
      // Reset build mode after placing
      actions.setBuildMode('none')
    },
    [actions, buildMode, buildSettlement, buildCity, isTestMode, localPlaceSettlement, localPlaceCity]
  )

  const handleEdgeHover = useCallback(
    (edgeId: string | null) => {
      actions.hoverEdge(edgeId)
    },
    [actions]
  )

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      actions.selectEdge(edgeId)
      
      if (isTestMode) {
        // Local placement in test mode
        localPlaceRoad(edgeId)
      } else {
        // Send build request to server
        if (buildRoad) {
          buildRoad(edgeId)
        }
      }
      // Reset build mode after placing
      actions.setBuildMode('none')
    },
    [actions, buildRoad, isTestMode, localPlaceRoad]
  )

  // Don't render markers if not in build mode
  if (buildMode === 'none' || !board) {
    return null
  }

  // Render vertex markers for settlement/city placement
  if (buildMode === 'settlement' || buildMode === 'city') {
    return (
      <group name="vertex-markers">
        {vertexPositions.map((vertex) => {
          const isAvailable = isVertexAvailable(
            vertex.id,
            board.buildings,
            buildMode,
            myPlayer?.id ?? null
          )

          // In test mode, all empty vertices are available
          const canPlace = isTestMode ? !board.buildings.some(b => b.vertexId === vertex.id) : (isAvailable && isMyTurn)

          return (
            <VertexMarker
              key={vertex.id}
              vertexId={vertex.id}
              position={vertex.position}
              isAvailable={canPlace}
              isSelected={vertex.id === selectedVertexId}
              isHovered={vertex.id === hoveredVertexId}
              buildMode={buildMode}
              onHover={handleVertexHover}
              onClick={handleVertexClick}
            />
          )
        })}
      </group>
    )
  }

  // Render edge markers for road placement
  if (buildMode === 'road') {
    // Check which edges are available (not occupied and connected to player's network)
    const occupiedEdges = new Set(board.roads.map((r) => r.edgeId))

    return (
      <group name="edge-markers">
        {edgePositions.map((edge) => {
          // In test mode, all unoccupied edges are available
          const isAvailable = !occupiedEdges.has(edge.id)

          return (
            <EdgeMarker
              key={edge.id}
              edgeId={edge.id}
              start={edge.start}
              end={edge.end}
              isAvailable={isTestMode ? isAvailable : (isAvailable && isMyTurn)}
              isSelected={edge.id === selectedEdgeId}
              isHovered={edge.id === hoveredEdgeId}
              onHover={handleEdgeHover}
              onClick={handleEdgeClick}
            />
          )
        })}
      </group>
    )
  }

  return null
}
