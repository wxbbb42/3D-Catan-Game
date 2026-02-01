'use client'

import { useMemo, memo, useRef } from 'react'
import * as THREE from 'three'
import type { HexTile as HexTileType, AxialCoord } from '@catan/shared'
import { axialToWorld, hexRing, hexId, HEX_TILE_RADIUS } from '@catan/shared'

// Ocean hex visual radius (same as land tiles for consistency)
const OCEAN_HEX_RADIUS = HEX_TILE_RADIUS

// Ocean colors - pastel water tones
const OCEAN_COLOR_LIGHT = '#A8D4E8'
const OCEAN_FRAME_COLOR = '#6B8FA8'

// Wave animation color variations
const WAVE_COLORS = ['#7EB8D8', '#8AC4E0', '#7AB4D4', '#86C0DC']

interface OceanHexProps {
  coord: AxialCoord
  index: number
}

// Create hex shape geometry
function createOceanHexGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const radius = OCEAN_HEX_RADIUS

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)

    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12, // Slightly thinner than land tiles
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// Create frame/border geometry for ocean hex
function createFrameGeometry(): THREE.BufferGeometry {
  const radius = OCEAN_HEX_RADIUS + 0.02
  const innerRadius = OCEAN_HEX_RADIUS - 0.06
  
  const shape = new THREE.Shape()
  
  // Outer hex
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  
  // Inner hex (hole)
  const hole = new THREE.Path()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = innerRadius * Math.cos(angle)
    const y = innerRadius * Math.sin(angle)
    if (i === 0) hole.moveTo(x, y)
    else hole.lineTo(x, y)
  }
  hole.closePath()
  shape.holes.push(hole)
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// Single ocean hex with wave pattern
const OceanHex = memo(function OceanHex({ coord, index }: OceanHexProps) {
  const worldPos = axialToWorld(coord)
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  
  // Create geometries (memoized)
  const hexGeometry = useMemo(() => createOceanHexGeometry(), [])
  const frameGeometry = useMemo(() => createFrameGeometry(), [])
  
  // Vary the wave pattern based on position
  const wavePhaseOffset = useMemo(() => {
    return (coord.q * 0.7 + coord.r * 1.1) % (Math.PI * 2)
  }, [coord.q, coord.r])
  
  return (
    <group position={[worldPos.x, -0.08, worldPos.z]}>
      {/* Main ocean surface */}
      <mesh castShadow receiveShadow ref={meshRef}>
        <primitive object={hexGeometry.clone()} attach="geometry" />
        <meshStandardMaterial
          ref={materialRef}
          color={WAVE_COLORS[index % WAVE_COLORS.length]}
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={0.92}
        />
      </mesh>
      
      {/* Frame/border on top */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <primitive object={frameGeometry.clone()} attach="geometry" />
        <meshStandardMaterial
          color={OCEAN_FRAME_COLOR}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      
      {/* Wave decorations - small raised sections */}
      <WaveDecorations phase={wavePhaseOffset} />
    </group>
  )
})

// Wave decoration on ocean tiles
function WaveDecorations({ phase }: { phase: number }) {
  const wavePositions = useMemo(() => {
    const positions: [number, number][] = []
    // Create 2-3 wave ridges per tile
    for (let i = 0; i < 3; i++) {
      const angle = phase + (i * Math.PI * 2) / 3
      const dist = 0.25 + Math.sin(angle) * 0.15
      positions.push([
        dist * Math.cos(angle + Math.PI / 6),
        dist * Math.sin(angle + Math.PI / 6),
      ])
    }
    return positions
  }, [phase])
  
  return (
    <group position={[0, 0.13, 0]}>
      {wavePositions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.01, z]} rotation={[0, phase + i, 0]}>
          <capsuleGeometry args={[0.03, 0.15, 4, 8]} />
          <meshStandardMaterial
            color={OCEAN_COLOR_LIGHT}
            roughness={0.4}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

interface OceanHexTilesProps {
  hexes: HexTileType[] // Land hexes - we'll create ocean around them
}

export const OceanHexTiles = memo(function OceanHexTiles({ hexes }: OceanHexTilesProps) {
  // Generate ocean hex positions - ring around the land
  const oceanCoords = useMemo(() => {
    const landHexIds = new Set(hexes.map((h) => hexId(h.coord)))
    
    // Get ring 3 (outermost land is ring 2, so ring 3 is first ocean ring)
    const ring3 = hexRing({ q: 0, r: 0 }, 3)
    
    // Filter to only include hexes not in land
    const oceanRing = ring3.filter((coord) => !landHexIds.has(hexId(coord)))
    
    return oceanRing
  }, [hexes])
  
  return (
    <group name="ocean-hex-tiles">
      {oceanCoords.map((coord, i) => (
        <OceanHex
          key={hexId(coord)}
          coord={coord}
          index={i}
        />
      ))}
    </group>
  )
})
