'use client'

import { useMemo, memo } from 'react'
import type { HexTile as HexTileType } from '@catan/shared'
import { axialToWorld, HEX_TILE_RADIUS, getHexNeighbor, hexId } from '@catan/shared'

// Rail dimensions - sits along the edge of tiles (parallel to edge)
const RAIL_WIDTH = 0.08
const RAIL_HEIGHT = 0.05
const RAIL_LENGTH_FACTOR = 0.95 // How much of the edge length to cover

// Warm wood color for the rails
const RAIL_COLOR = '#9B8565'
const RAIL_COLOR_DARK = '#7B6545'

interface EdgePosition {
  position: [number, number, number]
  rotation: number
  length: number
  isCoastal?: boolean
}

// Calculate edge positions - rails go along the edges of hex tiles
// For each shared edge between two hexes, place a rail on it
// Also place rails on outer edges (coastal roads for ports)
function calculateEdgePositions(hexes: HexTileType[]): EdgePosition[] {
  const hexSet = new Set(hexes.map((h) => hexId(h.coord)))
  const processedEdges = new Set<string>()
  const edgePositions: EdgePosition[] = []

  for (const hex of hexes) {
    const hexCenter = axialToWorld(hex.coord)

    // Check all 6 neighbor directions
    for (let dir = 0; dir < 6; dir++) {
      const neighborCoord = getHexNeighbor(hex.coord, dir)
      const neighborId = hexId(neighborCoord)
      
      // Create a unique edge ID (sorted to avoid duplicates)
      const edgeKey = [hexId(hex.coord), neighborId].sort().join('_')
      if (processedEdges.has(edgeKey)) continue
      processedEdges.add(edgeKey)

      const isNeighborLand = hexSet.has(neighborId)

      // Get neighbor center (even if it's ocean, we need it for positioning)
      const neighborCenter = axialToWorld(neighborCoord)

      // The edge midpoint is exactly between the two hex centers
      const midX = (hexCenter.x + neighborCenter.x) / 2
      const midZ = (hexCenter.z + neighborCenter.z) / 2

      // Direction from this hex to neighbor
      const dx = neighborCenter.x - hexCenter.x
      const dz = neighborCenter.z - hexCenter.z

      // The edge is PERPENDICULAR to the line connecting centers
      // So we rotate by 90 degrees
      const centerToCenterAngle = Math.atan2(dx, dz)
      const edgeAngle = centerToCenterAngle + Math.PI / 2

      // Edge length for a regular hexagon: side length = radius
      const edgeLength = HEX_TILE_RADIUS

      edgePositions.push({
        position: [midX, 0.20, midZ],
        rotation: edgeAngle,
        length: edgeLength * RAIL_LENGTH_FACTOR,
        isCoastal: !isNeighborLand, // Mark coastal edges
      })
    }
  }

  return edgePositions
}

interface EdgeRailsProps {
  hexes: HexTileType[]
}

// Single rail piece component
const RailPiece = memo(function RailPiece({
  position,
  rotation,
  length,
}: EdgePosition) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main rail body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[RAIL_WIDTH, RAIL_HEIGHT, length]} />
        <meshStandardMaterial
          color={RAIL_COLOR}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Rail top detail - darker stripe */}
      <mesh position={[0, RAIL_HEIGHT / 2 + 0.003, 0]} castShadow>
        <boxGeometry args={[RAIL_WIDTH * 0.6, 0.008, length * 0.9]} />
        <meshStandardMaterial
          color={RAIL_COLOR_DARK}
          roughness={0.7}
        />
      </mesh>
    </group>
  )
})

// EdgeRails component - renders rails along all edges between hex tiles
export const EdgeRails = memo(function EdgeRails({ hexes }: EdgeRailsProps) {
  const edgePositions = useMemo(() => calculateEdgePositions(hexes), [hexes])

  return (
    <group name="edge-rails">
      {edgePositions.map((edge, i) => (
        <RailPiece
          key={i}
          position={edge.position}
          rotation={edge.rotation}
          length={edge.length}
        />
      ))}
    </group>
  )
})
