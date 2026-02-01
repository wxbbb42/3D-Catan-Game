'use client'

import { useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Settlement, City } from '../Buildings'

interface VertexMarkerProps {
  vertexId: string
  position: [number, number, number]
  isAvailable: boolean
  isSelected: boolean
  isHovered: boolean
  buildMode: 'settlement' | 'city'
  onHover: (vertexId: string | null) => void
  onClick: (vertexId: string) => void
}

export function VertexMarker({
  vertexId,
  position,
  isAvailable,
  isSelected,
  isHovered,
  buildMode,
  onHover,
  onClick,
}: VertexMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [localHover, setLocalHover] = useState(false)

  // Subtle pulse animation for available markers
  useFrame((state) => {
    if (groupRef.current && isAvailable) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
      groupRef.current.scale.setScalar(scale)
    }
  })

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isAvailable) {
      setLocalHover(true)
      onHover(vertexId)
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
    if (isAvailable) {
      onClick(vertexId)
    }
  }

  // Calculate opacity based on state
  const showHighlight = isHovered || localHover || isSelected
  const opacity = isAvailable ? (showHighlight ? 0.8 : 0.4) : 0.15

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Use the actual Settlement or City model as marker */}
      {buildMode === 'settlement' ? (
        <Settlement
          position={[0, 0, 0]}
          color="white"
          isPreview={true}
          opacity={opacity}
        />
      ) : (
        <City
          position={[0, 0, 0]}
          color="white"
          isPreview={true}
          opacity={opacity}
        />
      )}
    </group>
  )
}
