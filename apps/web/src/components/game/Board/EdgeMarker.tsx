'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_WIDTH, ROAD_HEIGHT } from '@catan/shared'

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

  // Calculate position and rotation - position in the gap between tiles
  const { position, rotation, length } = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)

    const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)
    const direction = new THREE.Vector3().subVectors(endVec, startVec)
    const len = direction.length()
    direction.normalize()

    const angle = Math.atan2(direction.x, direction.z)

    return {
      // Position directly at midpoint - already at correct Y from InteractiveMarkers
      position: [midpoint.x, midpoint.y + ROAD_HEIGHT / 2, midpoint.z] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      length: len,
    }
  }, [start, end])

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

  const getColor = () => {
    if (!isAvailable) return '#888888'
    if (isSelected) return '#4AE88C'
    if (isHovered || localHover) return '#7DD3A8'
    return '#B8D8B8'
  }

  const getOpacity = () => {
    if (!isAvailable) return 0.15
    if (isSelected || isHovered || localHover) return 0.85
    return 0.5
  }

  // Road marker matches actual road dimensions
  const roadLength = length * 0.75

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <mesh>
        <boxGeometry args={[ROAD_WIDTH, ROAD_HEIGHT, roadLength]} />
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={getOpacity()}
          emissive={isHovered || localHover ? getColor() : '#000000'}
          emissiveIntensity={isHovered || localHover ? 0.3 : 0}
          roughness={0.6}
        />
      </mesh>
    </group>
  )
}
