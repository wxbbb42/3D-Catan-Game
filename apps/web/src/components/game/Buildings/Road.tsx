'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { PlayerColor } from '@catan/shared'
import { ROAD_WIDTH, ROAD_HEIGHT } from '@catan/shared'

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

interface RoadProps {
  start: [number, number, number]
  end: [number, number, number]
  color: PlayerColor
  isPreview?: boolean
}

export function Road({ start, end, color, isPreview = false }: RoadProps) {
  const mainColor = PLAYER_COLORS[color]
  const darkColor = PLAYER_COLORS_DARK[color]

  // Calculate road position and rotation
  const { position, rotation, length } = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)

    // Midpoint for position
    const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)

    // Calculate rotation to point from start to end
    const direction = new THREE.Vector3().subVectors(endVec, startVec)
    const len = direction.length()
    direction.normalize()

    // Calculate angle in the XZ plane
    const angle = Math.atan2(direction.x, direction.z)

    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      length: len,
    }
  }, [start, end])

  // Road length that fits nicely in the gap (slightly shorter than full edge)
  const roadLength = length * 0.75

  return (
    <group position={position} rotation={rotation}>
      {/* Main road body - rectangular wooden piece */}
      <mesh castShadow receiveShadow position={[0, ROAD_HEIGHT / 2, 0]}>
        <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, roadLength]} />
        <meshStandardMaterial
          color={mainColor}
          roughness={0.7}
          metalness={0.05}
          transparent={isPreview}
          opacity={isPreview ? 0.6 : 1}
        />
      </mesh>

      {/* Top ridge for visual interest */}
      <mesh castShadow position={[0, ROAD_HEIGHT + 0.015, 0]}>
        <boxGeometry args={[ROAD_WIDTH * 0.6, 0.03, roadLength * 0.9]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.6}
          transparent={isPreview}
          opacity={isPreview ? 0.6 : 1}
        />
      </mesh>

      {/* End caps to make it look more like a wooden piece */}
      <mesh castShadow position={[0, ROAD_HEIGHT / 2, roadLength / 2]}>
        <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, 0.02]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.8}
          transparent={isPreview}
          opacity={isPreview ? 0.6 : 1}
        />
      </mesh>
      <mesh castShadow position={[0, ROAD_HEIGHT / 2, -roadLength / 2]}>
        <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, 0.02]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.8}
          transparent={isPreview}
          opacity={isPreview ? 0.6 : 1}
        />
      </mesh>
    </group>
  )
}
