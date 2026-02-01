'use client'

import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface DieProps {
    value: number
    isRolling: boolean
    position: [number, number, number]
    onRollComplete?: () => void
    delay?: number
}

// Dot positions for each face (relative to face center)
const DOT_PATTERNS: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-0.25, -0.25], [0.25, 0.25]],
    3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
    4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
    5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
    6: [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0], [0.25, 0], [-0.25, 0.3], [0.25, 0.3]],
}

// Face rotations to show each number on top
// Die layout: 1-front, 6-back, 2-bottom, 5-top, 3-right, 4-left
// To show value N on top, we need to rotate appropriately:
const FACE_ROTATIONS: Record<number, [number, number, number]> = {
    1: [-Math.PI / 2, 0, 0],  // Rotate front (1) to top
    2: [Math.PI, 0, 0],       // Rotate bottom (2) to top  
    3: [0, 0, Math.PI / 2],   // Rotate right (3) to top
    4: [0, 0, -Math.PI / 2],  // Rotate left (4) to top
    5: [0, 0, 0],             // 5 is already on top
    6: [Math.PI / 2, 0, 0],   // Rotate back (6) to top
}

function DieDots({ value, faceRotation, facePosition }: {
    value: number
    faceRotation: [number, number, number]
    facePosition: [number, number, number]
}) {
    const dots = DOT_PATTERNS[value] ?? []

    return (
        <group position={facePosition} rotation={faceRotation}>
            {dots.map((pos, i) => (
                <mesh key={i} position={[pos[0], pos[1], 0.01]}>
                    <circleGeometry args={[0.08, 16]} />
                    <meshStandardMaterial color="#1a1a2e" />
                </mesh>
            ))}
        </group>
    )
}

function Die({ value, isRolling, position, onRollComplete, delay = 0 }: DieProps) {
    const meshRef = useRef<THREE.Group>(null)
    const [rollPhase, setRollPhase] = useState<'idle' | 'spinning' | 'settling'>('idle')
    const rollTimeRef = useRef(0)
    const targetRotation = useRef<THREE.Euler>(new THREE.Euler(...FACE_ROTATIONS[value]!))
    const spinSpeedRef = useRef({ x: 0, y: 0, z: 0 })
    const bounceRef = useRef(0)

    useEffect(() => {
        if (isRolling) {
            // Start rolling after delay
            const timeout = setTimeout(() => {
                setRollPhase('spinning')
                rollTimeRef.current = 0
                // Random spin speeds
                spinSpeedRef.current = {
                    x: (Math.random() - 0.5) * 20 + 10,
                    y: (Math.random() - 0.5) * 20 + 10,
                    z: (Math.random() - 0.5) * 15,
                }
                bounceRef.current = 0.5 + Math.random() * 0.3
            }, delay)
            return () => clearTimeout(timeout)
        }
        // Not rolling - go to idle
        setRollPhase('idle')
        targetRotation.current = new THREE.Euler(...FACE_ROTATIONS[value]!)
        return undefined
    }, [isRolling, delay, value])

    useFrame((_, delta) => {
        if (!meshRef.current) return

        if (rollPhase === 'spinning') {
            rollTimeRef.current += delta

            // Spin the die
            meshRef.current.rotation.x += spinSpeedRef.current.x * delta
            meshRef.current.rotation.y += spinSpeedRef.current.y * delta
            meshRef.current.rotation.z += spinSpeedRef.current.z * delta

            // Bounce effect
            const bounce = Math.abs(Math.sin(rollTimeRef.current * 8)) * bounceRef.current
            meshRef.current.position.y = position[1] + bounce

            // Slow down over time
            spinSpeedRef.current.x *= 0.98
            spinSpeedRef.current.y *= 0.98
            spinSpeedRef.current.z *= 0.98
            bounceRef.current *= 0.97

            // After 1.5 seconds, start settling
            if (rollTimeRef.current > 1.5) {
                setRollPhase('settling')
                targetRotation.current = new THREE.Euler(...FACE_ROTATIONS[value]!)
            }
        } else if (rollPhase === 'settling') {
            rollTimeRef.current += delta

            // Smoothly rotate to target
            meshRef.current.rotation.x = THREE.MathUtils.lerp(
                meshRef.current.rotation.x,
                targetRotation.current.x,
                0.1
            )
            meshRef.current.rotation.y = THREE.MathUtils.lerp(
                meshRef.current.rotation.y,
                targetRotation.current.y,
                0.1
            )
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                targetRotation.current.z,
                0.1
            )

            // Return to base position
            meshRef.current.position.y = THREE.MathUtils.lerp(
                meshRef.current.position.y,
                position[1],
                0.1
            )

            // Check if settled
            if (rollTimeRef.current > 2.5) {
                setRollPhase('idle')
                onRollComplete?.()
            }
        } else {
            // Idle - subtle hover animation
            meshRef.current.position.y = position[1] + Math.sin(Date.now() / 500) * 0.02

            // Ensure correct rotation for current value
            meshRef.current.rotation.x = THREE.MathUtils.lerp(
                meshRef.current.rotation.x,
                FACE_ROTATIONS[value]![0],
                0.1
            )
            meshRef.current.rotation.y = THREE.MathUtils.lerp(
                meshRef.current.rotation.y,
                FACE_ROTATIONS[value]![1],
                0.1
            )
            meshRef.current.rotation.z = THREE.MathUtils.lerp(
                meshRef.current.rotation.z,
                FACE_ROTATIONS[value]![2],
                0.1
            )
        }
    })

    return (
        <group ref={meshRef} position={position}>
            {/* Die body */}
            <RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial
                    color="#f5f5f5"
                    roughness={0.3}
                    metalness={0.1}
                />
            </RoundedBox>

            {/* Face 1 - front face */}
            <DieDots value={1} facePosition={[0, 0, 0.51]} faceRotation={[0, 0, 0]} />

            {/* Face 6 - back face */}
            <DieDots value={6} facePosition={[0, 0, -0.51]} faceRotation={[0, Math.PI, 0]} />

            {/* Face 2 - bottom face */}
            <DieDots value={2} facePosition={[0, -0.51, 0]} faceRotation={[Math.PI / 2, 0, 0]} />

            {/* Face 5 - top face */}
            <DieDots value={5} facePosition={[0, 0.51, 0]} faceRotation={[-Math.PI / 2, 0, 0]} />

            {/* Face 3 - right face */}
            <DieDots value={3} facePosition={[0.51, 0, 0]} faceRotation={[0, Math.PI / 2, 0]} />

            {/* Face 4 - left face */}
            <DieDots value={4} facePosition={[-0.51, 0, 0]} faceRotation={[0, -Math.PI / 2, 0]} />
        </group>
    )
}

interface Dice3DProps {
    values: [number, number]
    isRolling: boolean
    onRollComplete?: () => void
    size?: 'small' | 'medium' | 'large'
}

export function Dice3D({ values, isRolling, onRollComplete, size = 'medium' }: Dice3DProps) {
    const completedCountRef = useRef(0)

    const sizeConfig = {
        small: { width: 120, height: 80 },
        medium: { width: 200, height: 120 },
        large: { width: 300, height: 180 },
    }

    const config = sizeConfig[size]

    useEffect(() => {
        if (isRolling) {
            completedCountRef.current = 0
        }
    }, [isRolling])

    const handleDieComplete = () => {
        completedCountRef.current += 1
        if (completedCountRef.current >= 2) {
            onRollComplete?.()
        }
    }

    return (
        <div style={{ width: config.width, height: config.height }}>
            <Canvas
                camera={{ position: [0, 2, 4], fov: 45 }}
                shadows
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 5, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[512, 512]}
                />
                <pointLight position={[-3, 3, 2]} intensity={0.5} color="#fff5e6" />

                <Die
                    value={values[0]}
                    isRolling={isRolling}
                    position={[-0.8, 0, 0]}
                    onRollComplete={handleDieComplete}
                    delay={0}
                />
                <Die
                    value={values[1]}
                    isRolling={isRolling}
                    position={[0.8, 0, 0]}
                    onRollComplete={handleDieComplete}
                    delay={100}
                />

                {/* Ground plane for shadows */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                    <planeGeometry args={[10, 10]} />
                    <shadowMaterial opacity={0.2} />
                </mesh>
            </Canvas>
        </div>
    )
}

// Full-screen dice roll overlay for roll-for-order phase
interface RollForOrderOverlayProps {
    currentRoller: {
        id: string
        username: string
        color: string
    }
    isMyTurn: boolean
    rolls: Record<string, number>
    players: Array<{ id: string; username: string; color: string }>
    onRoll: () => void
}

export function RollForOrderOverlay({
    currentRoller,
    isMyTurn,
    rolls,
    players,
    onRoll
}: RollForOrderOverlayProps) {
    const [isRolling, setIsRolling] = useState(false)
    const [diceValues, setDiceValues] = useState<[number, number]>([1, 1])
    const [showResult, setShowResult] = useState(false)

    // Debug: log the state
    console.log('[RollForOrderOverlay] isMyTurn:', isMyTurn, 'isRolling:', isRolling, 'showResult:', showResult)

    const handleRoll = () => {
        if (!isMyTurn || isRolling) return

        setIsRolling(true)
        setShowResult(false)

        // Generate random dice values
        const die1 = Math.floor(Math.random() * 6) + 1
        const die2 = Math.floor(Math.random() * 6) + 1
        setDiceValues([die1, die2])
    }

    // Keyboard shortcut: Space to roll
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isMyTurn && !isRolling && !showResult) {
                e.preventDefault()
                handleRoll()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMyTurn, isRolling, showResult])

    const handleRollComplete = () => {
        setIsRolling(false)
        setShowResult(true)

        // Notify parent after showing result briefly
        setTimeout(() => {
            onRoll()
        }, 1500)
    }

    const playerColorClass = (color: string) => {
        const classes: Record<string, string> = {
            red: 'bg-player-red',
            blue: 'bg-player-blue',
            orange: 'bg-player-orange',
            white: 'bg-player-white border border-gray-300',
        }
        return classes[color] ?? 'bg-gray-400'
    }

    // Sort players by roll (highest first), unrolled at end
    const sortedPlayers = [...players].sort((a, b) => {
        const rollA = rolls[a.id] ?? -1
        const rollB = rolls[b.id] ?? -1
        return rollB - rollA
    })

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 z-50 flex flex-col items-center justify-center">
            {/* Title */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">🎲 Roll for First Turn!</h1>
                <p className="text-slate-300">Highest roll goes first in the setup phase</p>
            </div>

            {/* Current roller indicator */}
            <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur px-6 py-3 rounded-xl">
                    <span className={`w-4 h-4 rounded-full ${playerColorClass(currentRoller.color)}`} />
                    <span className="text-xl text-white font-medium">
                        {isMyTurn ? "Your turn to roll!" : `${currentRoller.username}'s turn`}
                    </span>
                </div>
            </div>

            {/* 3D Dice */}
            <div className="mb-8">
                <Dice3D
                    values={diceValues}
                    isRolling={isRolling}
                    onRollComplete={handleRollComplete}
                    size="large"
                />
            </div>

            {/* Roll result */}
            {showResult && !isRolling && (
                <div className="mb-8 animate-bounce">
                    <div className="text-6xl font-bold text-yellow-400">
                        {diceValues[0] + diceValues[1]}
                    </div>
                </div>
            )}

            {/* Roll button - always show but disabled when not your turn */}
            {!isRolling && !showResult && (
                <button
                    onClick={handleRoll}
                    disabled={!isMyTurn}
                    className={`px-8 py-4 text-white text-xl font-bold rounded-xl shadow-lg transition-all ${isMyTurn
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
                            : 'bg-gray-500/50 cursor-not-allowed'
                        }`}
                >
                    {isMyTurn ? '🎲 Roll Dice! (or press Space)' : `Waiting for ${currentRoller.username}...`}
                </button>
            )}

            {/* Players' rolls */}
            <div className="mt-8 w-full max-w-md">
                <h3 className="text-white text-sm uppercase tracking-wide mb-3 text-center">Roll Results</h3>
                <div className="space-y-2">
                    {sortedPlayers.map((player, index) => {
                        const roll = rolls[player.id]
                        const hasRolled = roll !== undefined
                        return (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between px-4 py-2 rounded-lg ${hasRolled ? 'bg-white/20' : 'bg-white/5'
                                    } ${player.id === currentRoller.id && !hasRolled ? 'ring-2 ring-yellow-400' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    {hasRolled && index === 0 && (
                                        <span className="text-yellow-400">👑</span>
                                    )}
                                    <span className={`w-3 h-3 rounded-full ${playerColorClass(player.color)}`} />
                                    <span className="text-white">{player.username}</span>
                                </div>
                                <div className="text-white font-bold">
                                    {hasRolled ? roll : '—'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default Dice3D
