'use client'

import { useMemo, useCallback } from 'react'
import { useGameStore, useBoard, useMyPlayer, useIsMyTurn } from '@/stores/gameStore'
import { useSocketContext } from '@/components/SocketProvider'
import { VertexMarker } from './VertexMarker'
import { EdgeMarker } from './EdgeMarker'
import { axialToWorld, getHexCorners, HEX_SIZE, getHexNeighbors, hexId, createVertexId, createEdgeId, SETTLEMENT_BASE_Y, ROAD_HEIGHT } from '@catan/shared'
import type { AxialCoord, VertexBuilding } from '@catan/shared'

interface VertexPosition {
  id: string
  position: [number, number, number]
  adjacentHexIds: string[]
}

interface EdgePosition {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  adjacentHexIds: string[]
}

// Compute all valid vertex positions on the board
function computeVertexPositions(hexCoords: AxialCoord[]): VertexPosition[] {
  const hexSet = new Set(hexCoords.map(hexId))
  const vertexMap = new Map<string, VertexPosition>()

  for (const coord of hexCoords) {
    const center = axialToWorld(coord)
    const corners = getHexCorners(center, HEX_SIZE)
    const neighbors = getHexNeighbors(coord)

    // Each corner is shared by up to 3 hexes
    // Corner i is shared with neighbors at directions (i-1+6)%6 and i
    for (let i = 0; i < 6; i++) {
      const corner = corners[i]
      if (!corner) continue

      const neighbor1 = neighbors[(i + 5) % 6]
      const neighbor2 = neighbors[i]

      // Collect adjacent hexes that exist on the board
      const adjacentCoords: AxialCoord[] = [coord]
      if (neighbor1 && hexSet.has(hexId(neighbor1))) {
        adjacentCoords.push(neighbor1)
      }
      if (neighbor2 && hexSet.has(hexId(neighbor2))) {
        adjacentCoords.push(neighbor2)
      }

      // Only create vertex if it has at least 2 adjacent hexes (on the board)
      if (adjacentCoords.length >= 2) {
        const vId = createVertexId(adjacentCoords)

        if (!vertexMap.has(vId)) {
          vertexMap.set(vId, {
            id: vId,
            // Position at gap level where settlements sit
            position: [corner.x, SETTLEMENT_BASE_Y, corner.z],
            adjacentHexIds: adjacentCoords.map(hexId),
          })
        }
      }
    }
  }

  return Array.from(vertexMap.values())
}

// Compute all valid edge positions on the board
function computeEdgePositions(hexCoords: AxialCoord[]): EdgePosition[] {
  const hexSet = new Set(hexCoords.map(hexId))
  const edgeMap = new Map<string, EdgePosition>()

  for (const coord of hexCoords) {
    const center = axialToWorld(coord)
    const corners = getHexCorners(center, HEX_SIZE)
    const neighbors = getHexNeighbors(coord)

    // Each edge is shared by 2 hexes
    for (let i = 0; i < 6; i++) {
      const neighbor = neighbors[i]
      if (!neighbor) continue

      // Only process each edge once (where current hex ID < neighbor hex ID)
      const currentId = hexId(coord)
      const neighborId = hexId(neighbor)

      if (hexSet.has(neighborId) && currentId < neighborId) {
        const corner1 = corners[i]
        const corner2 = corners[(i + 1) % 6]
        if (!corner1 || !corner2) continue

        const eId = createEdgeId(coord, neighbor)

        // Position edges at road height level (in the gap)
        edgeMap.set(eId, {
          id: eId,
          start: [corner1.x, ROAD_HEIGHT / 2, corner1.z],
          end: [corner2.x, ROAD_HEIGHT / 2, corner2.z],
          adjacentHexIds: [currentId, neighborId],
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
  const buildMode = useGameStore((state) => state.ui.buildMode)
  const hoveredVertexId = useGameStore((state) => state.ui.hoveredVertexId)
  const hoveredEdgeId = useGameStore((state) => state.ui.hoveredEdgeId)
  const selectedVertexId = useGameStore((state) => state.ui.selectedVertexId)
  const selectedEdgeId = useGameStore((state) => state.ui.selectedEdgeId)
  const actions = useGameStore((state) => state.actions)
  const myPlayer = useMyPlayer()
  const isMyTurn = useIsMyTurn()

  // Get socket functions for building
  const { buildSettlement, buildCity, buildRoad } = useSocketContext()

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
      // Send build request to server
      if (buildMode === 'settlement') {
        buildSettlement(vertexId)
      } else if (buildMode === 'city') {
        buildCity(vertexId)
      }
      // Reset build mode after placing
      actions.setBuildMode('none')
    },
    [actions, buildMode, buildSettlement, buildCity]
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
      // Send build request to server
      buildRoad(edgeId)
      // Reset build mode after placing
      actions.setBuildMode('none')
    },
    [actions, buildRoad]
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

          return (
            <VertexMarker
              key={vertex.id}
              vertexId={vertex.id}
              position={vertex.position}
              isAvailable={isAvailable && isMyTurn}
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
          // TODO: Add proper road placement validation (must connect to existing network)
          const isAvailable = !occupiedEdges.has(edge.id)

          return (
            <EdgeMarker
              key={edge.id}
              edgeId={edge.id}
              start={edge.start}
              end={edge.end}
              isAvailable={isAvailable && isMyTurn}
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
