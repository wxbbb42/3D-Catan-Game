'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlayerColor } from '@catan/shared'

// Brighter, more saturated player colors for better visibility
const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: '#D35F5F',
  blue: '#5F8FD3',
  orange: '#D3955F',
  white: '#E8E8E0',
}

const PLAYER_COLORS_DARK: Record<PlayerColor, string> = {
  red: '#A34545',
  blue: '#456FA3',
  orange: '#A37545',
  white: '#C8C8C0',
}

interface CityProps {
  position: [number, number, number]
  color: PlayerColor
  isPreview?: boolean
}

export function City({ position, color, isPreview = false }: CityProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Subtle floating animation for preview
  useFrame((state) => {
    if (groupRef.current && isPreview) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05
    }
  })

  const mainColor = PLAYER_COLORS[color]
  const roofColor = PLAYER_COLORS_DARK[color]

  // City sits at vertex slot - position is already at the gap level
  return (
    <group ref={groupRef} position={position}>
      {/* Base platform - sits in the vertex gap */}
      <mesh castShadow receiveShadow position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.20, 0.04, 6]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.8}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Main building base */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.6}
          metalness={0.1}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Main roof - pyramid style */}
      <mesh position={[0, 0.40, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.22, 0.18, 4]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.7}
          metalness={0.05}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Tower - distinctive city feature */}
      <mesh position={[0.12, 0.28, 0.12]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.40, 8]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.6}
          metalness={0.1}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Tower roof - cone */}
      <mesh position={[0.12, 0.52, 0.12]} castShadow>
        <coneGeometry args={[0.09, 0.12, 8]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.7}
          metalness={0.05}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Flag on tower */}
      <mesh position={[0.12, 0.62, 0.12]}>
        <boxGeometry args={[0.08, 0.05, 0.01]} />
        <meshStandardMaterial
          color={roofColor}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>

      {/* Window details on main building */}
      <mesh position={[0, 0.20, 0.145]} castShadow>
        <boxGeometry args={[0.08, 0.10, 0.01]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.9}
          transparent={isPreview}
          opacity={isPreview ? 0.7 : 1}
        />
      </mesh>
    </group>
  )
}
