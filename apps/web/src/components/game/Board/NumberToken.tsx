'use client'

import { useMemo } from 'react'
import { Text, Billboard } from '@react-three/drei'

// Colors for number tokens based on probability
function getTokenColor(number: number): string {
  // 6 and 8 are highlighted (most common after 7)
  if (number === 6 || number === 8) {
    return '#D04040' // Stronger red for visibility
  }
  return '#3A3A4A' // Darker gray for better contrast
}

// Get dot count for probability indicator
function getDotCount(number: number): number {
  const probabilities: Record<number, number> = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1,
  }
  return probabilities[number] ?? 0
}

interface NumberTokenProps {
  number: number
  position: [number, number, number]
}

export function NumberToken({ number, position }: NumberTokenProps) {
  const textColor = getTokenColor(number)
  const dotCount = getDotCount(number)
  const isHighProbability = number === 6 || number === 8

  // Create dots as a string of bullet points for display
  const dotsString = useMemo(() => {
    return '•'.repeat(dotCount)
  }, [dotCount])

  return (
    <group position={position}>
      {/* Billboard group - always faces camera for easy reading */}
      <group position={[0, 0.5, 0]}>
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* Background circle for text */}
          <mesh>
            <circleGeometry args={[0.32, 32]} />
            <meshBasicMaterial color="#FDF8F0" transparent opacity={0.95} />
          </mesh>

          {/* Border ring */}
          <mesh position={[0, 0, 0.001]}>
            <ringGeometry args={[0.28, 0.32, 32]} />
            <meshBasicMaterial color={isHighProbability ? '#E8A0A0' : '#D8D4D0'} />
          </mesh>

          {/* Number text - now always facing camera */}
          <Text
            position={[0, 0.02, 0.002]}
            fontSize={0.28}
            color={textColor}
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
          >
            {number}
          </Text>

          {/* Probability dots as text */}
          <Text
            position={[0, -0.16, 0.002]}
            fontSize={0.08}
            color={textColor}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.05}
          >
            {dotsString}
          </Text>
        </Billboard>
      </group>
    </group>
  )
}
