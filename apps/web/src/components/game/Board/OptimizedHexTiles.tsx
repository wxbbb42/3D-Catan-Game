'use client'

import { useMemo, useRef, useEffect, memo } from 'react'
import * as THREE from 'three'
import type { HexTile as HexTileType, TerrainType } from '@catan/shared'
import { axialToWorld, HEX_TILE_RADIUS } from '@catan/shared'

// ============== TERRAIN COLORS ==============

const TERRAIN_COLORS: Record<TerrainType, string> = {
  desert: '#E8D4A8',
  hills: '#C45C3B',
  mountains: '#6B7B8C',
  forest: '#2D7A4F',
  pasture: '#7DC95E',
  fields: '#E8C43D',
}

// ============== GEOMETRY & MATERIAL CACHE ==============
// Singleton caches that persist for the application lifetime
// Disposed when the last component using them unmounts

class ResourceCache {
  private geometries = new Map<string, THREE.BufferGeometry>()
  private materials = new Map<string, THREE.MeshStandardMaterial>()
  private refCount = 0

  addRef(): void {
    this.refCount++
  }

  release(): void {
    this.refCount--
    if (this.refCount === 0) {
      this.dispose()
    }
  }

  getGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    const cached = this.geometries.get(key)
    if (cached) {
      return cached
    }
    const geometry = factory()
    this.geometries.set(key, geometry)
    return geometry
  }

  getMaterial(color: string, roughness = 0.6): THREE.MeshStandardMaterial {
    const key = `${color}-${roughness}`
    const cached = this.materials.get(key)
    if (cached) {
      return cached
    }
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.05,
    })
    this.materials.set(key, material)
    return material
  }

  private dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.geometries.clear()
    this.materials.forEach((m) => m.dispose())
    this.materials.clear()
  }
}

const resourceCache = new ResourceCache()

// Helper functions for cleaner code
function getOrCreateGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  return resourceCache.getGeometry(key, factory)
}

function getOrCreateMaterial(color: string, roughness = 0.6): THREE.MeshStandardMaterial {
  return resourceCache.getMaterial(color, roughness)
}

// Hook for resource cleanup
function useResourceCache(): void {
  useEffect(() => {
    resourceCache.addRef()
    return () => {
      resourceCache.release()
    }
  }, [])
}

// ============== BASE HEX GEOMETRY ==============

function createHexGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const radius = HEX_TILE_RADIUS

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)

    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// ============== INSTANCED HEX BASES ==============

interface HexBaseInstancesProps {
  hexes: HexTileType[]
}

const HexBaseInstances = memo(function HexBaseInstances({ hexes }: HexBaseInstancesProps) {
  // Group hexes by terrain for separate materials
  const hexesByTerrain = useMemo(() => {
    const groups = new Map<TerrainType, HexTileType[]>()
    for (const hex of hexes) {
      const list = groups.get(hex.terrain) ?? []
      list.push(hex)
      groups.set(hex.terrain, list)
    }
    return groups
  }, [hexes])

  const geometry = useMemo(
    () => getOrCreateGeometry('hex-base', createHexGeometry),
    []
  )

  return (
    <>
      {Array.from(hexesByTerrain.entries()).map(([terrain, terrainHexes]) => (
        <HexBaseTerrainGroup
          key={terrain}
          terrain={terrain}
          hexes={terrainHexes}
          geometry={geometry}
        />
      ))}
    </>
  )
})

interface HexBaseTerrainGroupProps {
  terrain: TerrainType
  hexes: HexTileType[]
  geometry: THREE.BufferGeometry
}

function HexBaseTerrainGroup({ terrain, hexes, geometry }: HexBaseTerrainGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => getOrCreateMaterial(TERRAIN_COLORS[terrain]), [terrain])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    hexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)
      position.set(worldPos.x, 0, worldPos.z)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }, [hexes])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, hexes.length]}
      receiveShadow
      castShadow
      frustumCulled={false}
    />
  )
}

// ============== FOREST DECORATIONS (INSTANCED) ==============
// Trees: 5 per forest tile × 4 forest tiles = 20 trees
// Each tree has: trunk (brown) + 2 foliage cones (green)
// This batches ALL trunks together (1 draw call) and ALL foliage together (1 draw call)

interface ForestDecorationsProps {
  hexes: HexTileType[]
}

const TREE_POSITIONS: [number, number][] = [
  [0, 0],
  [0.3, 0.2],
  [-0.3, 0.15],
  [0.15, -0.3],
  [-0.2, -0.25],
]

const ForestDecorations = memo(function ForestDecorations({ hexes }: ForestDecorationsProps) {
  const forestHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'forest'),
    [hexes]
  )

  const trunkMeshRef = useRef<THREE.InstancedMesh>(null)
  const foliage1MeshRef = useRef<THREE.InstancedMesh>(null)
  const foliage2MeshRef = useRef<THREE.InstancedMesh>(null)

  const trunkGeometry = useMemo(
    () => getOrCreateGeometry('trunk', () => new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6)),
    []
  )
  const foliage1Geometry = useMemo(
    () => getOrCreateGeometry('foliage1', () => new THREE.ConeGeometry(0.12, 0.25, 6)),
    []
  )
  const foliage2Geometry = useMemo(
    () => getOrCreateGeometry('foliage2', () => new THREE.ConeGeometry(0.08, 0.18, 6)),
    []
  )

  const trunkMaterial = useMemo(() => getOrCreateMaterial('#5D4037', 0.9), [])
  const foliageMaterial1 = useMemo(() => getOrCreateMaterial('#1B5E20', 0.8), [])
  const foliageMaterial2 = useMemo(() => getOrCreateMaterial('#2E7D32', 0.8), [])

  const instanceCount = forestHexes.length * TREE_POSITIONS.length

  useEffect(() => {
    if (!trunkMeshRef.current || !foliage1MeshRef.current || !foliage2MeshRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    let instanceIndex = 0

    for (const hex of forestHexes) {
      const worldPos = axialToWorld(hex.coord)

      for (const [tx, tz] of TREE_POSITIONS) {
        // Trunk
        position.set(worldPos.x + tx, 0.18 + 0.08, worldPos.z + tz)
        matrix.compose(position, quaternion, scale)
        trunkMeshRef.current.setMatrixAt(instanceIndex, matrix)

        // Foliage 1
        position.set(worldPos.x + tx, 0.18 + 0.22, worldPos.z + tz)
        matrix.compose(position, quaternion, scale)
        foliage1MeshRef.current.setMatrixAt(instanceIndex, matrix)

        // Foliage 2
        position.set(worldPos.x + tx, 0.18 + 0.35, worldPos.z + tz)
        matrix.compose(position, quaternion, scale)
        foliage2MeshRef.current.setMatrixAt(instanceIndex, matrix)

        instanceIndex++
      }
    }

    trunkMeshRef.current.instanceMatrix.needsUpdate = true
    foliage1MeshRef.current.instanceMatrix.needsUpdate = true
    foliage2MeshRef.current.instanceMatrix.needsUpdate = true
  }, [forestHexes])

  if (forestHexes.length === 0) return null

  return (
    <group name="forest-decorations">
      <instancedMesh ref={trunkMeshRef} args={[trunkGeometry, trunkMaterial, instanceCount]} castShadow />
      <instancedMesh ref={foliage1MeshRef} args={[foliage1Geometry, foliageMaterial1, instanceCount]} castShadow />
      <instancedMesh ref={foliage2MeshRef} args={[foliage2Geometry, foliageMaterial2, instanceCount]} castShadow />
    </group>
  )
})

// ============== MOUNTAIN DECORATIONS (INSTANCED) ==============

interface MountainDecorationsProps {
  hexes: HexTileType[]
}

const MountainDecorations = memo(function MountainDecorations({ hexes }: MountainDecorationsProps) {
  const mountainHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'mountains'),
    [hexes]
  )

  const mainPeakRef = useRef<THREE.InstancedMesh>(null)
  const snowCapRef = useRef<THREE.InstancedMesh>(null)
  const secondPeakRef = useRef<THREE.InstancedMesh>(null)

  const mainPeakGeometry = useMemo(
    () => getOrCreateGeometry('mainPeak', () => new THREE.ConeGeometry(0.35, 0.4, 4)),
    []
  )
  const snowCapGeometry = useMemo(
    () => getOrCreateGeometry('snowCap', () => new THREE.ConeGeometry(0.15, 0.15, 4)),
    []
  )
  const secondPeakGeometry = useMemo(
    () => getOrCreateGeometry('secondPeak', () => new THREE.ConeGeometry(0.2, 0.25, 4)),
    []
  )

  const stoneMaterial = useMemo(() => getOrCreateMaterial('#546E7A', 0.7), [])
  const snowMaterial = useMemo(() => getOrCreateMaterial('#ECEFF1', 0.5), [])
  const stone2Material = useMemo(() => getOrCreateMaterial('#607D8B', 0.7), [])

  useEffect(() => {
    if (!mainPeakRef.current || !snowCapRef.current || !secondPeakRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    mountainHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      // Main peak
      position.set(worldPos.x, 0.18 + 0.15, worldPos.z)
      matrix.compose(position, quaternion, scale)
      mainPeakRef.current!.setMatrixAt(i, matrix)

      // Snow cap
      position.set(worldPos.x, 0.18 + 0.32, worldPos.z)
      matrix.compose(position, quaternion, scale)
      snowCapRef.current!.setMatrixAt(i, matrix)

      // Secondary peak
      position.set(worldPos.x + 0.25, 0.18 + 0.1, worldPos.z + 0.15)
      matrix.compose(position, quaternion, scale)
      secondPeakRef.current!.setMatrixAt(i, matrix)
    })

    mainPeakRef.current.instanceMatrix.needsUpdate = true
    snowCapRef.current.instanceMatrix.needsUpdate = true
    secondPeakRef.current.instanceMatrix.needsUpdate = true
  }, [mountainHexes])

  if (mountainHexes.length === 0) return null

  return (
    <group name="mountain-decorations">
      <instancedMesh ref={mainPeakRef} args={[mainPeakGeometry, stoneMaterial, mountainHexes.length]} castShadow />
      <instancedMesh ref={snowCapRef} args={[snowCapGeometry, snowMaterial, mountainHexes.length]} castShadow />
      <instancedMesh ref={secondPeakRef} args={[secondPeakGeometry, stone2Material, mountainHexes.length]} castShadow />
    </group>
  )
})

// ============== HILLS DECORATIONS (INSTANCED) ==============

interface HillsDecorationsProps {
  hexes: HexTileType[]
}

const HillsDecorations = memo(function HillsDecorations({ hexes }: HillsDecorationsProps) {
  const hillsHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'hills'),
    [hexes]
  )

  const moundRef = useRef<THREE.InstancedMesh>(null)
  const brick1Ref = useRef<THREE.InstancedMesh>(null)
  const brick2Ref = useRef<THREE.InstancedMesh>(null)
  const brick3Ref = useRef<THREE.InstancedMesh>(null)

  const moundGeometry = useMemo(
    () => getOrCreateGeometry('mound', () => new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const brick1Geometry = useMemo(
    () => getOrCreateGeometry('brick1', () => new THREE.BoxGeometry(0.12, 0.08, 0.08)),
    []
  )
  const brick2Geometry = useMemo(
    () => getOrCreateGeometry('brick2', () => new THREE.BoxGeometry(0.1, 0.08, 0.08)),
    []
  )
  const brick3Geometry = useMemo(
    () => getOrCreateGeometry('brick3', () => new THREE.BoxGeometry(0.1, 0.06, 0.1)),
    []
  )

  const clayMaterial = useMemo(() => getOrCreateMaterial('#A1503A', 0.8), [])
  const brickMaterial1 = useMemo(() => getOrCreateMaterial('#8B3A2A', 0.7), [])
  const brickMaterial2 = useMemo(() => getOrCreateMaterial('#9C4332', 0.7), [])

  useEffect(() => {
    if (!moundRef.current || !brick1Ref.current || !brick2Ref.current || !brick3Ref.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    hillsHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      // Mound
      position.set(worldPos.x, 0.18 + 0.06, worldPos.z)
      matrix.compose(position, quaternion, scale)
      moundRef.current!.setMatrixAt(i, matrix)

      // Brick 1
      position.set(worldPos.x + 0.15, 0.18 + 0.1, worldPos.z + 0.1)
      matrix.compose(position, quaternion, scale)
      brick1Ref.current!.setMatrixAt(i, matrix)

      // Brick 2
      position.set(worldPos.x + 0.12, 0.18 + 0.18, worldPos.z + 0.08)
      matrix.compose(position, quaternion, scale)
      brick2Ref.current!.setMatrixAt(i, matrix)

      // Brick 3
      position.set(worldPos.x - 0.2, 0.18 + 0.08, worldPos.z - 0.1)
      matrix.compose(position, quaternion, scale)
      brick3Ref.current!.setMatrixAt(i, matrix)
    })

    moundRef.current.instanceMatrix.needsUpdate = true
    brick1Ref.current.instanceMatrix.needsUpdate = true
    brick2Ref.current.instanceMatrix.needsUpdate = true
    brick3Ref.current.instanceMatrix.needsUpdate = true
  }, [hillsHexes])

  if (hillsHexes.length === 0) return null

  return (
    <group name="hills-decorations">
      <instancedMesh ref={moundRef} args={[moundGeometry, clayMaterial, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick1Ref} args={[brick1Geometry, brickMaterial1, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick2Ref} args={[brick2Geometry, brickMaterial2, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick3Ref} args={[brick3Geometry, brickMaterial1, hillsHexes.length]} castShadow />
    </group>
  )
})

// ============== PASTURE DECORATIONS (INSTANCED) ==============

interface PastureDecorationsProps {
  hexes: HexTileType[]
}

const GRASS_POSITIONS: [number, number][] = [
  [0.2, 0.15],
  [-0.25, 0.1],
  [0.1, -0.25],
  [-0.15, -0.2],
  [0.3, -0.1],
]

const PastureDecorations = memo(function PastureDecorations({ hexes }: PastureDecorationsProps) {
  const pastureHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'pasture'),
    [hexes]
  )

  const grassRef = useRef<THREE.InstancedMesh>(null)
  const sheepBodyRef = useRef<THREE.InstancedMesh>(null)
  const sheepHeadRef = useRef<THREE.InstancedMesh>(null)

  const grassGeometry = useMemo(
    () => getOrCreateGeometry('grass', () => new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const sheepBodyGeometry = useMemo(
    () => getOrCreateGeometry('sheepBody', () => new THREE.SphereGeometry(0.08, 8, 6)),
    []
  )
  const sheepHeadGeometry = useMemo(
    () => getOrCreateGeometry('sheepHead', () => new THREE.SphereGeometry(0.04, 6, 6)),
    []
  )

  const grassMaterial1 = useMemo(() => getOrCreateMaterial('#66BB6A', 0.9), [])
  // Note: grassMaterial2 available for alternating colors if needed
  const sheepMaterial = useMemo(() => getOrCreateMaterial('#F5F5F5', 0.9), [])

  const grassInstanceCount = pastureHexes.length * GRASS_POSITIONS.length

  useEffect(() => {
    if (!grassRef.current || !sheepBodyRef.current || !sheepHeadRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    let grassIndex = 0

    pastureHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      // Grass patches
      for (const [gx, gz] of GRASS_POSITIONS) {
        position.set(worldPos.x + gx, 0.18 + 0.03, worldPos.z + gz)
        matrix.compose(position, quaternion, scale)
        grassRef.current!.setMatrixAt(grassIndex, matrix)
        grassIndex++
      }

      // Sheep body
      position.set(worldPos.x, 0.18 + 0.08, worldPos.z)
      matrix.compose(position, quaternion, scale)
      sheepBodyRef.current!.setMatrixAt(i, matrix)

      // Sheep head
      position.set(worldPos.x + 0.07, 0.18 + 0.1, worldPos.z)
      matrix.compose(position, quaternion, scale)
      sheepHeadRef.current!.setMatrixAt(i, matrix)
    })

    grassRef.current.instanceMatrix.needsUpdate = true
    sheepBodyRef.current.instanceMatrix.needsUpdate = true
    sheepHeadRef.current.instanceMatrix.needsUpdate = true
  }, [pastureHexes])

  if (pastureHexes.length === 0) return null

  return (
    <group name="pasture-decorations">
      <instancedMesh ref={grassRef} args={[grassGeometry, grassMaterial1, grassInstanceCount]} castShadow />
      <instancedMesh ref={sheepBodyRef} args={[sheepBodyGeometry, sheepMaterial, pastureHexes.length]} castShadow />
      <instancedMesh ref={sheepHeadRef} args={[sheepHeadGeometry, sheepMaterial, pastureHexes.length]} castShadow />
    </group>
  )
})

// ============== FIELDS DECORATIONS (INSTANCED) ==============

interface FieldsDecorationsProps {
  hexes: HexTileType[]
}

const WHEAT_ROWS = [
  { z: -0.2, stalks: 5 },
  { z: 0, stalks: 6 },
  { z: 0.2, stalks: 5 },
]

const FieldsDecorations = memo(function FieldsDecorations({ hexes }: FieldsDecorationsProps) {
  const fieldsHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'fields'),
    [hexes]
  )

  const stalkRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  const stalkGeometry = useMemo(
    () => getOrCreateGeometry('stalk', () => new THREE.CylinderGeometry(0.008, 0.01, 0.15, 4)),
    []
  )
  const headGeometry = useMemo(
    () => getOrCreateGeometry('wheatHead', () => new THREE.SphereGeometry(0.025, 6, 4)),
    []
  )

  const stalkMaterial = useMemo(() => getOrCreateMaterial('#C5A028', 0.8), [])
  const headMaterial = useMemo(() => getOrCreateMaterial('#D4AF37', 0.7), [])

  // Calculate total wheat instances
  const stalksPerHex = WHEAT_ROWS.reduce((sum, row) => sum + row.stalks, 0)
  const instanceCount = fieldsHexes.length * stalksPerHex

  useEffect(() => {
    if (!stalkRef.current || !headRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    let instanceIndex = 0

    for (const hex of fieldsHexes) {
      const worldPos = axialToWorld(hex.coord)

      for (const row of WHEAT_ROWS) {
        for (let i = 0; i < row.stalks; i++) {
          const x = (i - row.stalks / 2 + 0.5) * 0.12

          // Stalk
          position.set(worldPos.x + x, 0.18, worldPos.z + row.z)
          matrix.compose(position, quaternion, scale)
          stalkRef.current!.setMatrixAt(instanceIndex, matrix)

          // Wheat head
          position.set(worldPos.x + x, 0.18 + 0.1, worldPos.z + row.z)
          matrix.compose(position, quaternion, scale)
          headRef.current!.setMatrixAt(instanceIndex, matrix)

          instanceIndex++
        }
      }
    }

    stalkRef.current.instanceMatrix.needsUpdate = true
    headRef.current.instanceMatrix.needsUpdate = true
  }, [fieldsHexes])

  if (fieldsHexes.length === 0) return null

  return (
    <group name="fields-decorations">
      <instancedMesh ref={stalkRef} args={[stalkGeometry, stalkMaterial, instanceCount]} castShadow />
      <instancedMesh ref={headRef} args={[headGeometry, headMaterial, instanceCount]} castShadow />
    </group>
  )
})

// ============== DESERT DECORATIONS (INSTANCED) ==============

interface DesertDecorationsProps {
  hexes: HexTileType[]
}

const DesertDecorations = memo(function DesertDecorations({ hexes }: DesertDecorationsProps) {
  const desertHexes = useMemo(
    () => hexes.filter((h) => h.terrain === 'desert'),
    [hexes]
  )

  const dune1Ref = useRef<THREE.InstancedMesh>(null)
  const dune2Ref = useRef<THREE.InstancedMesh>(null)
  const cactusMainRef = useRef<THREE.InstancedMesh>(null)
  const cactusArmRef = useRef<THREE.InstancedMesh>(null)

  const duneGeometry1 = useMemo(
    () => getOrCreateGeometry('dune1', () => new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const duneGeometry2 = useMemo(
    () => getOrCreateGeometry('dune2', () => new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const cactusMainGeometry = useMemo(
    () => getOrCreateGeometry('cactusMain', () => new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6)),
    []
  )
  const cactusArmGeometry = useMemo(
    () => getOrCreateGeometry('cactusArm', () => new THREE.CylinderGeometry(0.025, 0.03, 0.1, 6)),
    []
  )

  const sandMaterial1 = useMemo(() => getOrCreateMaterial('#D4C4A8', 0.9), [])
  const sandMaterial2 = useMemo(() => getOrCreateMaterial('#C9B896', 0.9), [])
  const cactusMaterial1 = useMemo(() => getOrCreateMaterial('#2E7D32', 0.8), [])
  const cactusMaterial2 = useMemo(() => getOrCreateMaterial('#388E3C', 0.8), [])

  useEffect(() => {
    if (!dune1Ref.current || !dune2Ref.current || !cactusMainRef.current || !cactusArmRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const armQuaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    // Set arm rotation
    const euler = new THREE.Euler(0, 0, Math.PI / 4)
    armQuaternion.setFromEuler(euler)

    desertHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      // Dune 1
      position.set(worldPos.x + 0.15, 0.18 + 0.04, worldPos.z + 0.1)
      matrix.compose(position, quaternion, scale)
      dune1Ref.current!.setMatrixAt(i, matrix)

      // Dune 2
      position.set(worldPos.x - 0.2, 0.18 + 0.03, worldPos.z - 0.1)
      matrix.compose(position, quaternion, scale)
      dune2Ref.current!.setMatrixAt(i, matrix)

      // Cactus main
      position.set(worldPos.x, 0.18 + 0.1, worldPos.z)
      matrix.compose(position, quaternion, scale)
      cactusMainRef.current!.setMatrixAt(i, matrix)

      // Cactus arm (rotated)
      position.set(worldPos.x + 0.06, 0.18 + 0.12, worldPos.z)
      matrix.compose(position, armQuaternion, scale)
      cactusArmRef.current!.setMatrixAt(i, matrix)
    })

    dune1Ref.current.instanceMatrix.needsUpdate = true
    dune2Ref.current.instanceMatrix.needsUpdate = true
    cactusMainRef.current.instanceMatrix.needsUpdate = true
    cactusArmRef.current.instanceMatrix.needsUpdate = true
  }, [desertHexes])

  if (desertHexes.length === 0) return null

  return (
    <group name="desert-decorations">
      <instancedMesh ref={dune1Ref} args={[duneGeometry1, sandMaterial1, desertHexes.length]} castShadow />
      <instancedMesh ref={dune2Ref} args={[duneGeometry2, sandMaterial2, desertHexes.length]} castShadow />
      <instancedMesh ref={cactusMainRef} args={[cactusMainGeometry, cactusMaterial1, desertHexes.length]} castShadow />
      <instancedMesh ref={cactusArmRef} args={[cactusArmGeometry, cactusMaterial2, desertHexes.length]} castShadow />
    </group>
  )
})

// ============== MAIN COMPONENT ==============

export interface OptimizedHexTilesProps {
  hexes: HexTileType[]
}

/**
 * OptimizedHexTiles - High-performance instanced rendering for hex tiles
 *
 * Performance comparison (standard 19-tile Catan board):
 *
 * BEFORE (SimpleHexTile × 19 + decorations):
 * - Hex bases: 19 draw calls
 * - Forest decorations: ~60 draw calls (5 trees × 4 tiles × 3 meshes)
 * - Mountain decorations: ~9 draw calls
 * - Hills decorations: ~12 draw calls
 * - Pasture decorations: ~28 draw calls
 * - Fields decorations: ~64 draw calls (16 stalks × 4 tiles)
 * - Desert decorations: ~4 draw calls
 * - TOTAL: ~196 draw calls 😱
 *
 * AFTER (Instanced meshes):
 * - Hex bases: 6 draw calls (1 per terrain type)
 * - Forest: 3 draw calls (trunks, foliage1, foliage2)
 * - Mountains: 3 draw calls
 * - Hills: 4 draw calls
 * - Pasture: 3 draw calls
 * - Fields: 2 draw calls
 * - Desert: 4 draw calls
 * - TOTAL: 25 draw calls ✨
 *
 * That's a ~87% reduction in draw calls!
 *
 * Each terrain type has UNIQUE decorations:
 * - Forest: Trees with brown trunks and green foliage
 * - Mountains: Gray peaks with white snow caps
 * - Hills: Clay mounds with brick stacks
 * - Pasture: Grass patches with fluffy white sheep
 * - Fields: Golden wheat stalks
 * - Desert: Sand dunes with green cacti
 */
export function OptimizedHexTiles({ hexes }: OptimizedHexTilesProps) {
  // Manage Three.js resource lifecycle
  useResourceCache()

  return (
    <group name="optimized-hex-tiles">
      {/* Hex bases - 6 draw calls */}
      <HexBaseInstances hexes={hexes} />

      {/* Terrain decorations - 19 draw calls total */}
      <ForestDecorations hexes={hexes} />
      <MountainDecorations hexes={hexes} />
      <HillsDecorations hexes={hexes} />
      <PastureDecorations hexes={hexes} />
      <FieldsDecorations hexes={hexes} />
      <DesertDecorations hexes={hexes} />
    </group>
  )
}
