'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function OceanPlane() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Gentle wave animation with color shift
  useFrame((state) => {
    if (!materialRef.current) return

    // Subtle color oscillation between pastel blues
    const time = state.clock.elapsedTime * 0.3
    const hue = 0.55 + Math.sin(time) * 0.02
    const saturation = 0.35 + Math.sin(time * 0.7) * 0.05
    const lightness = 0.72 + Math.sin(time * 1.3) * 0.03
    materialRef.current.color.setHSL(hue, saturation, lightness)
  })

  return (
    <>
      {/* Main ocean surface */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#B4D8E8"
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Outer ring - deeper water */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.15, 0]}
      >
        <ringGeometry args={[12, 18, 64]} />
        <meshStandardMaterial
          color="#8AC4D8"
          roughness={0.3}
          metalness={0.05}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Subtle shore foam ring */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
      >
        <ringGeometry args={[4.8, 5.2, 64]} />
        <meshBasicMaterial
          color="#E8F4F8"
          transparent
          opacity={0.4}
        />
      </mesh>
    </>
  )
}
