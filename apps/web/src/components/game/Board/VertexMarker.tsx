'use client'

import { useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

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

  // Different appearance based on state
  const getColor = () => {
    if (!isAvailable) return '#888888'
    if (isSelected) return '#4AE88C'
    if (isHovered || localHover) return '#7DD3A8'
    return buildMode === 'settlement' ? '#A8D8A8' : '#D8A8D8'
  }

  const getOpacity = () => {
    if (!isAvailable) return 0.2
    if (isSelected || isHovered || localHover) return 0.9
    return 0.6
  }

  // Marker is a hexagonal platform that shows where settlement will sit
  const markerSize = buildMode === 'settlement' ? 0.16 : 0.20

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      {/* Base platform marker - hexagonal to match settlement base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[markerSize, markerSize * 1.1, 0.04, 6]} />
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={getOpacity()}
          emissive={isHovered || localHover ? getColor() : '#000000'}
          emissiveIntensity={isHovered || localHover ? 0.3 : 0}
          roughness={0.5}
        />
      </mesh>

      {/* Ghost building preview */}
      {(isHovered || localHover) && isAvailable && (
        <group position={[0, 0.04, 0]}>
          {buildMode === 'settlement' ? (
            <>
              {/* Mini house preview */}
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[0.12, 0.10, 0.12]} />
                <meshStandardMaterial
                  color={getColor()}
                  transparent
                  opacity={0.5}
                />
              </mesh>
              <mesh position={[0, 0.16, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[0.10, 0.08, 4]} />
                <meshStandardMaterial
                  color={getColor()}
                  transparent
                  opacity={0.5}
                />
              </mesh>
            </>
          ) : (
            <>
              {/* Mini city preview */}
              <mesh position={[0, 0.10, 0]}>
                <boxGeometry args={[0.14, 0.14, 0.14]} />
                <meshStandardMaterial
                  color={getColor()}
                  transparent
                  opacity={0.5}
                />
              </mesh>
              <mesh position={[0, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[0.12, 0.10, 4]} />
                <meshStandardMaterial
                  color={getColor()}
                  transparent
                  opacity={0.5}
                />
              </mesh>
            </>
          )}
        </group>
      )}
    </group>
  )
}
