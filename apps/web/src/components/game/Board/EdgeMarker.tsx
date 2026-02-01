'use client'

import { useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Road } from '../Buildings'

interface EdgeMarkerProps {
  edgeId: string
  start: [number, number, number]
  end: [number, number, number]
  isAvailable: boolean
  isSelected: boolean
  isHovered: boolean
  onHover: (edgeId: string | null) => void
  onClick: (edgeId: string) => void
}

export function EdgeMarker({
  edgeId,
  start,
  end,
  isAvailable,
  isSelected,
  isHovered,
  onHover,
  onClick,
}: EdgeMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [localHover, setLocalHover] = useState(false)

  // Subtle pulse animation
  useFrame((state) => {
    if (groupRef.current && isAvailable) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + 0.5) * 0.08
      groupRef.current.scale.set(1, scale, 1)
    }
  })

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isAvailable) {
      setLocalHover(true)
      onHover(edgeId)
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
      onClick(edgeId)
    }
  }

  // Calculate opacity based on state
  const showHighlight = isHovered || localHover || isSelected
  const opacity = isAvailable ? (showHighlight ? 0.8 : 0.4) : 0.15

  return (
    <group
      ref={groupRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Use the actual Road model as marker */}
      <Road
        start={start}
        end={end}
        color="white"
        isPreview={true}
        opacity={opacity}
      />
    </group>
  )
}
