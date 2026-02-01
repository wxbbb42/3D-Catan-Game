'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera, ContactShadows, Sky } from '@react-three/drei'
import { Suspense } from 'react'
import { NumberToken } from './NumberToken'
import { OceanPlane } from './OceanPlane'
import { InteractiveMarkers } from './InteractiveMarkers'
import { OptimizedHexTiles } from './OptimizedHexTiles'
import { OceanHexTiles } from './OceanHexTiles'
import { Settlement, City, Road, Robber } from '../Buildings'
import { useBoard, usePlayers } from '@/stores/gameStore'
import { axialToWorld } from '@catan/shared'

// Parse position ID (format: "x,z" where values are *100)
function parsePositionId(id: string): { x: number; z: number } | null {
  const parts = id.split(',')
  if (parts.length !== 2) return null
  const x = parseInt(parts[0]!, 10) / 100
  const z = parseInt(parts[1]!, 10) / 100
  if (isNaN(x) || isNaN(z)) return null
  return { x, z }
}

// Parse edge ID (format: "x1,z1|x2,z2")
function parseEdgeId(id: string): { start: { x: number; z: number }; end: { x: number; z: number } } | null {
  const parts = id.split('|')
  if (parts.length !== 2) return null
  const start = parsePositionId(parts[0]!)
  const end = parsePositionId(parts[1]!)
  if (!start || !end) return null
  return { start, end }
}

// Loading placeholder while 3D assets load
function BoardLoader() {
  return (
    <mesh position={[0, 0, 0]}>
      <cylinderGeometry args={[4, 4, 0.1, 32]} />
      <meshStandardMaterial color="#E8E4E0" />
    </mesh>
  )
}

// The actual board content
function BoardContent() {
  const board = useBoard()
  const players = usePlayers()

  if (!board) {
    return <BoardLoader />
  }

  // Get robber hex position
  const robberHex = board.hexes.find((h) => h.id === board.robberHexId)
  const robberPos = robberHex ? axialToWorld(robberHex.coord) : { x: 0, z: 0 }

  return (
    <group name="game-board">
      {/* Optimized instanced hex tiles with terrain decorations */}
      {/* Reduces draw calls from ~196 to ~25 (87% reduction) */}
      <OptimizedHexTiles hexes={board.hexes} />

      {/* Ocean hex tiles surrounding the island */}
      <OceanHexTiles hexes={board.hexes} />

      {/* Ocean base */}
      <OceanPlane />

      {/* Number tokens */}
      <group name="number-tokens">
        {board.hexes
          .filter((hex) => hex.numberToken !== null)
          .map((hex) => {
            const worldPos = axialToWorld(hex.coord)
            return (
              <NumberToken
                key={`token-${hex.id}`}
                number={hex.numberToken!}
                position={[worldPos.x, 0.22, worldPos.z]}
              />
            )
          })}
      </group>

      {/* Robber */}
      <Robber position={[robberPos.x, 0.25, robberPos.z]} />

      {/* Buildings - settlements and cities */}
      <group name="buildings">
        {board.buildings.map((building, i) => {
          // Find player color
          const player = players.find((p) => p.id === building.playerId)
          const color = player?.color ?? 'white'

          // Parse position from vertex ID (format: "x,z" where values are *100)
          const vertexPos = parsePositionId(building.vertexId)
          if (!vertexPos) return null
          
          const buildingY = 0.22

          if (building.type === 'settlement') {
            return (
              <Settlement
                key={`building-${i}`}
                position={[vertexPos.x, buildingY, vertexPos.z]}
                color={color}
              />
            )
          } else {
            return (
              <City
                key={`building-${i}`}
                position={[vertexPos.x, buildingY, vertexPos.z]}
                color={color}
              />
            )
          }
        })}
      </group>

      {/* Roads */}
      <group name="roads">
        {board.roads.map((road, i) => {
          const player = players.find((p) => p.id === road.playerId)
          const color = player?.color ?? 'white'

          // Parse edge positions from edge ID (format: "x1,z1|x2,z2")
          const edgePos = parseEdgeId(road.edgeId)
          if (!edgePos) return null
          
          const roadY = 0.28

          return (
            <Road
              key={`road-${i}`}
              start={[edgePos.start.x, roadY, edgePos.start.z]}
              end={[edgePos.end.x, roadY, edgePos.end.z]}
              color={color}
            />
          )
        })}
      </group>

      {/* Interactive placement markers */}
      <InteractiveMarkers />
    </group>
  )
}

export interface Board3DProps {
  className?: string
}

export function Board3D({ className }: Board3DProps) {
  return (
    <div className={className}>
      <Canvas shadows>
        {/* Soft pastel background */}
        <color attach="background" args={['#E8F0F4']} />

        {/* Soft sky gradient */}
        <Sky
          distance={450000}
          sunPosition={[5, 1, 8]}
          inclination={0.6}
          azimuth={0.25}
          mieCoefficient={0.001}
          mieDirectionalG={0.8}
          rayleigh={0.5}
        />

        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[0, 14, 12]}
          fov={45}
        />

        {/* Controls - orbit around the board */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={30}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.3}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Soft, warm lighting for pastel aesthetic */}
        <ambientLight intensity={0.6} color="#FFF8F0" />

        {/* Main sun light - warm and soft */}
        <directionalLight
          position={[8, 15, 5]}
          intensity={0.8}
          color="#FFF4E8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={40}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0001}
        />

        {/* Fill light - cool blue tint */}
        <directionalLight
          position={[-8, 8, -5]}
          intensity={0.3}
          color="#E0E8F0"
        />

        {/* Rim light for depth */}
        <directionalLight
          position={[0, 5, -10]}
          intensity={0.2}
          color="#F8F0E8"
        />

        {/* Soft environment for reflections */}
        <Environment preset="dawn" />

        {/* Ground contact shadows */}
        <ContactShadows
          position={[0, -0.1, 0]}
          opacity={0.25}
          scale={25}
          blur={2.5}
          far={8}
          color="#8090A0"
        />

        {/* Main content */}
        <Suspense fallback={<BoardLoader />}>
          <BoardContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
