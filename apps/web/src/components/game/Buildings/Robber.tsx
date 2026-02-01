'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RobberProps {
  position: [number, number, number]
}

export function Robber({ position }: RobberProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Subtle bobbing animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Body - dark hooded figure */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
        <meshStandardMaterial color="#3A3A4A" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#4A4A5A" roughness={0.7} />
      </mesh>

      {/* Hood */}
      <mesh position={[0, 0.38, -0.02]} castShadow>
        <sphereGeometry args={[0.12, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2A2A3A" roughness={0.9} />
      </mesh>

      {/* Eyes - menacing red glow */}
      <mesh position={[-0.03, 0.36, 0.08]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#FF6060" />
      </mesh>
      <mesh position={[0.03, 0.36, 0.08]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color="#FF6060" />
      </mesh>

      {/* Shadow on ground */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}
