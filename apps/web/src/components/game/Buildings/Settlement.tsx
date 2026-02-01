'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlayerColor } from '@catan/shared'

// Brighter, more saturated player colors for better visibility
const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#E25555',
  blue: '#4A7FD0',
  orange: '#E89540',
  white: '#F0F0E8',
}

const PLAYER_COLORS_DARK: Record<PlayerColor, string> = {
  red: '#B54040',
  blue: '#3A5FA0',
  orange: '#B87530',
  white: '#D0D0C8',
}

interface SettlementProps {
  position: [number, number, number]
  color: PlayerColor
  isPreview?: boolean
  opacity?: number
}

// Create triangular prism geometry for the roof
function createRoofGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  // Triangle cross-section
  shape.moveTo(-0.14, 0)
  shape.lineTo(0.14, 0)
  shape.lineTo(0, 0.12)
  shape.closePath()

  const extrudeSettings = {
    depth: 0.22,
    bevelEnabled: false,
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geometry.translate(0, 0, -0.11) // Center it
  return geometry
}

export function Settlement({ position, color, isPreview = false, opacity }: SettlementProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Subtle floating animation for preview
  useFrame((state) => {
    if (groupRef.current && isPreview) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05
    }
  })

  const mainColor = PLAYER_COLORS[color]
  const darkColor = PLAYER_COLORS_DARK[color]
  const actualOpacity = opacity ?? (isPreview ? 0.7 : 1)
  const isTransparent = actualOpacity < 1

  const roofGeometry = useMemo(() => createRoofGeometry(), [])

  // Simple house like the classic Catan settlement piece
  return (
    <group ref={groupRef} position={position}>
      {/* House base - rectangular box */}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.24, 0.16, 0.20]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Triangular roof - like the reference image */}
      <mesh 
        position={[0, 0.16, 0]} 
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        geometry={roofGeometry}
      >
        <meshStandardMaterial
          color={darkColor}
          roughness={0.6}
          metalness={0.05}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>
    </group>
  )
}
