'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { HexTile as HexTileType, TerrainType } from '@catan/shared'
import { HEX_TILE_RADIUS } from '@catan/shared'
import { useGameStore } from '@/stores/gameStore'

// More vibrant terrain colors
const TERRAIN_COLORS: Record<TerrainType, string> = {
  desert: '#E8D4A8',    // Sandy gold
  hills: '#C45C3B',     // Brick red/terracotta
  mountains: '#6B7B8C', // Stone gray
  forest: '#2D7A4F',    // Forest green
  pasture: '#7DC95E',   // Grass green
  fields: '#E8C43D',    // Wheat gold
}

// Darker side colors for depth
const TERRAIN_SIDE_COLORS: Record<TerrainType, string> = {
  desert: '#C4B08A',
  hills: '#8C3A28',
  mountains: '#4A5560',
  forest: '#1D5A3A',
  pasture: '#5A9E45',
  fields: '#B8962D',
}

// Terrain icons/emojis for labels
const TERRAIN_ICONS: Record<TerrainType, string> = {
  desert: '🏜️',
  hills: '🧱',
  mountains: '⛰️',
  forest: '🌲',
  pasture: '🐑',
  fields: '🌾',
}

// Terrain names
const TERRAIN_NAMES: Record<TerrainType, string> = {
  desert: 'Desert',
  hills: 'Brick',
  mountains: 'Ore',
  forest: 'Wood',
  pasture: 'Wool',
  fields: 'Grain',
}

interface HexTileProps {
  hex: HexTileType
  position: [number, number, number]
}

// 3D terrain decoration components
function TerrainDecoration({ terrain, position }: { terrain: TerrainType; position: [number, number, number] }) {
  switch (terrain) {
    case 'forest':
      return <ForestTrees position={position} />
    case 'mountains':
      return <MountainPeaks position={position} />
    case 'hills':
      return <HillMounds position={position} />
    case 'pasture':
      return <GrassPatches position={position} />
    case 'fields':
      return <WheatStalks position={position} />
    case 'desert':
      return <DesertDunes position={position} />
    default:
      return null
  }
}

// Forest - cone trees
function ForestTrees({ position }: { position: [number, number, number] }) {
  const treePositions: [number, number][] = [
    [0, 0],
    [0.3, 0.2],
    [-0.3, 0.15],
    [0.15, -0.3],
    [-0.2, -0.25],
  ]

  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {treePositions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Trunk */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.15, 6]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <coneGeometry args={[0.12, 0.25, 6]} />
            <meshStandardMaterial color="#1B5E20" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <coneGeometry args={[0.08, 0.18, 6]} />
            <meshStandardMaterial color="#2E7D32" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Mountains - pyramid peaks
function MountainPeaks({ position }: { position: [number, number, number] }) {
  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {/* Main peak */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <coneGeometry args={[0.35, 0.4, 4]} />
        <meshStandardMaterial color="#546E7A" roughness={0.7} />
      </mesh>
      {/* Snow cap */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <coneGeometry args={[0.15, 0.15, 4]} />
        <meshStandardMaterial color="#ECEFF1" roughness={0.5} />
      </mesh>
      {/* Secondary peak */}
      <mesh position={[0.25, 0.1, 0.15]} castShadow>
        <coneGeometry args={[0.2, 0.25, 4]} />
        <meshStandardMaterial color="#607D8B" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Hills - brick mounds
function HillMounds({ position }: { position: [number, number, number] }) {
  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {/* Clay mound */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <sphereGeometry args={[0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#A1503A" roughness={0.8} />
      </mesh>
      {/* Brick stack */}
      <mesh position={[0.15, 0.1, 0.1]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.08]} />
        <meshStandardMaterial color="#8B3A2A" roughness={0.7} />
      </mesh>
      <mesh position={[0.12, 0.18, 0.08]} castShadow>
        <boxGeometry args={[0.1, 0.08, 0.08]} />
        <meshStandardMaterial color="#9C4332" roughness={0.7} />
      </mesh>
      <mesh position={[-0.2, 0.08, -0.1]} castShadow>
        <boxGeometry args={[0.1, 0.06, 0.1]} />
        <meshStandardMaterial color="#8B3A2A" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Pasture - grass tufts
function GrassPatches({ position }: { position: [number, number, number] }) {
  const patchPositions: [number, number][] = [
    [0.2, 0.15],
    [-0.25, 0.1],
    [0.1, -0.25],
    [-0.15, -0.2],
    [0.3, -0.1],
  ]

  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {patchPositions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} castShadow>
          <sphereGeometry args={[0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#66BB6A' : '#81C784'} roughness={0.9} />
        </mesh>
      ))}
      {/* Small sheep shape */}
      <group position={[0, 0.08, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#F5F5F5" roughness={0.9} />
        </mesh>
        <mesh position={[0.07, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#F5F5F5" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

// Fields - wheat stalks
function WheatStalks({ position }: { position: [number, number, number] }) {
  const rows = [
    { z: -0.2, stalks: 5 },
    { z: 0, stalks: 6 },
    { z: 0.2, stalks: 5 },
  ]

  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {rows.map((row, ri) => (
        <group key={ri}>
          {Array.from({ length: row.stalks }).map((_, i) => {
            const x = (i - row.stalks / 2 + 0.5) * 0.12
            return (
              <group key={i} position={[x, 0, row.z]}>
                {/* Stalk */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.008, 0.01, 0.15, 4]} />
                  <meshStandardMaterial color="#C5A028" roughness={0.8} />
                </mesh>
                {/* Wheat head */}
                <mesh position={[0, 0.1, 0]} castShadow>
                  <sphereGeometry args={[0.025, 6, 4]} />
                  <meshStandardMaterial color="#D4AF37" roughness={0.7} />
                </mesh>
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

// Desert - sand dunes
function DesertDunes({ position }: { position: [number, number, number] }) {
  return (
    <group position={[position[0], position[1] + 0.18, position[2]]}>
      {/* Sand dunes */}
      <mesh position={[0.15, 0.04, 0.1]} castShadow>
        <sphereGeometry args={[0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#D4C4A8" roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 0.03, -0.1]} castShadow>
        <sphereGeometry args={[0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#C9B896" roughness={0.9} />
      </mesh>
      {/* Cactus */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 6]} />
          <meshStandardMaterial color="#2E7D32" roughness={0.8} />
        </mesh>
        <mesh position={[0.06, 0.12, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.1, 6]} />
          <meshStandardMaterial color="#388E3C" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

export function HexTile({ hex, position }: HexTileProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { ui } = useGameStore()

  const isHovered = ui.hoveredHexId === hex.id
  const isSelected = ui.selectedHexId === hex.id

  // Create hexagonal geometry with beveled edges
  // Uses HEX_TILE_RADIUS (0.82) to create gaps between tiles for roads
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const radius = HEX_TILE_RADIUS

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

    const extrudeSettings = {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    }

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geom.rotateX(-Math.PI / 2)
    return geom
  }, [])

  // Smooth hover animation
  useFrame((state) => {
    if (!meshRef.current) return

    const targetY = isHovered || isSelected ? 0.08 : 0
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetY + (isHovered ? Math.sin(state.clock.elapsedTime * 2) * 0.02 : 0),
      0.1
    )
  })

  const handlePointerEnter = () => {
    useGameStore.getState().actions.hoverHex(hex.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerLeave = () => {
    useGameStore.getState().actions.hoverHex(null)
    document.body.style.cursor = 'default'
  }

  const handleClick = () => {
    useGameStore.getState().actions.selectHex(hex.id)
  }

  const topColor = TERRAIN_COLORS[hex.terrain]
  const sideColor = TERRAIN_SIDE_COLORS[hex.terrain]

  return (
    <group position={position}>
      {/* Main hex tile */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          color={topColor}
          roughness={0.6}
          metalness={0.05}
          emissive={isHovered ? topColor : '#000000'}
          emissiveIntensity={isHovered ? 0.2 : 0}
        />
      </mesh>

      {/* Side ring for depth effect */}
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HEX_TILE_RADIUS - 0.04, HEX_TILE_RADIUS, 6]} />
        <meshStandardMaterial color={sideColor} roughness={0.7} />
      </mesh>

      {/* 3D Terrain decorations */}
      <TerrainDecoration terrain={hex.terrain} position={[0, 0, 0]} />

      {/* Terrain label (icon + name) - shown at edge of hex */}
      <Text
        position={[0, 0.22, 0.55]}
        rotation={[-Math.PI / 4, 0, 0]}
        fontSize={0.12}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {TERRAIN_ICONS[hex.terrain]}
      </Text>

      {/* Resource name label */}
      <Text
        position={[0, 0.2, 0.72]}
        rotation={[-Math.PI / 4, 0, 0]}
        fontSize={0.08}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#333333"
      >
        {TERRAIN_NAMES[hex.terrain]}
      </Text>

      {/* Subtle glow ring when selected */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HEX_TILE_RADIUS + 0.03, HEX_TILE_RADIUS + 0.13, 6]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  )
}
