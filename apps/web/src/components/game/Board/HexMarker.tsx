'use client'

import { useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

interface HexMarkerProps {
  hexId: string
  position: [number, number, number]
  isCurrentRobberHex: boolean
  isHovered: boolean
  onHover: (hexId: string | null) => void
  onClick: (hexId: string) => void
}

export function HexMarker({
  hexId,
  position,
  isCurrentRobberHex,
  isHovered,
  onHover,
  onClick,
}: HexMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)

  // Subtle pulse animation for hovered marker
  useFrame((state) => {
    if (meshRef.current && (isHovered || localHover)) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05
      meshRef.current.scale.setScalar(scale)
    }
  })

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!isCurrentRobberHex) {
      setLocalHover(true)
      onHover(hexId)
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerLeave = () => {
    setLocalHover(false)
    onHover(null)
    document.body.style.cursor = 'auto'
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isCurrentRobberHex) {
      onClick(hexId)
    }
  }

  const getColor = () => {
    if (isCurrentRobberHex) return '#666666'
    if (isHovered || localHover) return '#FF6060'
    return '#FFB0B0'
  }

  const getOpacity = () => {
    if (isCurrentRobberHex) return 0.2
    if (isHovered || localHover) return 0.7
    return 0.4
  }

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <circleGeometry args={[0.7, 6]} />
      <meshStandardMaterial
        color={getColor()}
        transparent
        opacity={getOpacity()}
        emissive={isHovered || localHover ? '#FF3030' : '#000000'}
        emissiveIntensity={isHovered || localHover ? 0.3 : 0}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

interface RobberHexMarkersProps {
  onHexSelect: (hexId: string) => void
}

export function RobberHexMarkers({ onHexSelect: _onHexSelect }: RobberHexMarkersProps) {
  // This component would be rendered inside the Board3D
  // and would receive hex positions from the board state
  // For now, it's just a placeholder that shows the API

  return (
    <group name="robber-hex-markers">
      {/* Hex markers would be rendered here based on board.hexes */}
      {/* When implemented, use HexMarker for each hex */}
    </group>
  )
}
