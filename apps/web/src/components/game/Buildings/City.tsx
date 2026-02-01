'use client'

import { useRef } from 'react'
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

interface CityProps {
  position: [number, number, number]
  color: PlayerColor
  isPreview?: boolean
  opacity?: number
}

export function City({ position, color, isPreview = false, opacity }: CityProps) {
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

  // Castle-style city like the reference image with circular base and towers
  return (
    <group ref={groupRef} position={position}>
      {/* Circular base platform */}
      <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.06, 16]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Main castle body - center */}
      <mesh castShadow receiveShadow position={[0, 0.16, 0]}>
        <boxGeometry args={[0.18, 0.20, 0.18]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Center tower roof */}
      <mesh position={[0, 0.32, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.12, 0.14, 4]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.6}
          metalness={0.05}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Front left tower */}
      <mesh castShadow position={[-0.10, 0.18, 0.10]}>
        <boxGeometry args={[0.10, 0.30, 0.10]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Front left tower roof */}
      <mesh position={[-0.10, 0.38, 0.10]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.07, 0.10, 4]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.6}
          metalness={0.05}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Front right tower */}
      <mesh castShadow position={[0.10, 0.18, 0.10]}>
        <boxGeometry args={[0.10, 0.30, 0.10]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Front right tower roof */}
      <mesh position={[0.10, 0.38, 0.10]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.07, 0.10, 4]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.6}
          metalness={0.05}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Back tower (taller, main keep) */}
      <mesh castShadow position={[0, 0.22, -0.08]}>
        <boxGeometry args={[0.12, 0.38, 0.12]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.5}
          metalness={0.1}
          transparent={isTransparent}
          opacity={actualOpacity}
        />
      </mesh>

      {/* Back tower roof */}
      <mesh position={[0, 0.46, -0.08]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.09, 0.12, 4]} />
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
