'use client'

import { useMemo, useRef, useEffect, memo } from 'react'
import * as THREE from 'three'
import type { HexTile as HexTileType, TerrainType } from '@catan/shared'
import { axialToWorld, HEX_TILE_RADIUS } from '@catan/shared'
import { createToonMaterial, createOutlineMaterial } from './shaders/ToonShader'

// ============== TERRAIN COLORS ==============
// Vibrant, saturated colors for toon/cel-shading style

const TERRAIN_COLORS: Record<TerrainType, string> = {
  desert: '#F4D794',    // Warm sandy yellow
  hills: '#E86A3A',     // Vibrant brick orange
  mountains: '#5A6E7F', // Cool slate blue-gray
  forest: '#2E8B3E',    // Rich forest green
  pasture: '#7ED957',   // Bright lime green
  fields: '#F5C842',    // Golden wheat yellow
}

// ============== DECORATION COLORS ==============

const DECORATION_COLORS = {
  // Forest
  trunk: '#6D4C41',
  foliage1: '#2E7D32',
  foliage2: '#43A047',
  // Mountains
  stone: '#5C6BC0',
  snow: '#FFFFFF',
  stone2: '#7986CB',
  // Hills
  clay: '#E65100',
  brick1: '#BF360C',
  brick2: '#D84315',
  // Pasture
  grass: '#76FF03',
  sheep: '#FAFAFA',
  // Fields
  stalk: '#FFB300',
  wheatHead: '#FFC107',
  // Desert
  sand1: '#FFE082',
  sand2: '#FFD54F',
  cactus1: '#388E3C',
  cactus2: '#4CAF50',
}

// ============== GEOMETRY & MATERIAL CACHE ==============

class ToonResourceCache {
  private geometries = new Map<string, THREE.BufferGeometry>()
  private materials = new Map<string, THREE.Material>()
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

  getToonMaterial(color: string, steps: number = 3): THREE.Material {
    const key = `toon-${color}-${steps}`
    const cached = this.materials.get(key)
    if (cached) {
      return cached
    }
    const material = createToonMaterial(color, steps)
    this.materials.set(key, material)
    return material
  }

  getOutlineMaterial(color: string = '#1a1a2e', width: number = 0.025): THREE.Material {
    const key = `outline-${color}-${width}`
    const cached = this.materials.get(key)
    if (cached) {
      return cached
    }
    const material = createOutlineMaterial(color, width)
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

const toonResourceCache = new ToonResourceCache()

function useToonResourceCache(): void {
  useEffect(() => {
    toonResourceCache.addRef()
    return () => {
      toonResourceCache.release()
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

interface ToonHexBaseInstancesProps {
  hexes: HexTileType[]
}

const ToonHexBaseInstances = memo(function ToonHexBaseInstances({
  hexes,
}: ToonHexBaseInstancesProps) {
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
    () => toonResourceCache.getGeometry('hex-base', createHexGeometry),
    []
  )

  return (
    <>
      {Array.from(hexesByTerrain.entries()).map(([terrain, terrainHexes]) => (
        <ToonHexBaseTerrainGroup
          key={terrain}
          terrain={terrain}
          hexes={terrainHexes}
          geometry={geometry}
        />
      ))}
    </>
  )
})

interface ToonHexBaseTerrainGroupProps {
  terrain: TerrainType
  hexes: HexTileType[]
  geometry: THREE.BufferGeometry
}

function ToonHexBaseTerrainGroup({
  terrain,
  hexes,
  geometry,
}: ToonHexBaseTerrainGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const outlineMeshRef = useRef<THREE.InstancedMesh>(null)

  const material = useMemo(
    () => toonResourceCache.getToonMaterial(TERRAIN_COLORS[terrain]),
    [terrain]
  )

  const outlineMaterial = useMemo(
    () => toonResourceCache.getOutlineMaterial('#1a1a2e', 0.025),
    []
  )

  useEffect(() => {
    const mesh = meshRef.current
    const outlineMesh = outlineMeshRef.current
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

      if (outlineMesh) {
        outlineMesh.setMatrixAt(i, matrix)
      }
    })

    mesh.instanceMatrix.needsUpdate = true
    if (outlineMesh) {
      outlineMesh.instanceMatrix.needsUpdate = true
    }
  }, [hexes])

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, hexes.length]}
        receiveShadow
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={outlineMeshRef}
        args={[geometry, outlineMaterial, hexes.length]}
        frustumCulled={false}
      />
    </>
  )
}

// ============== FOREST DECORATIONS ==============

interface DecorationProps {
  hexes: HexTileType[]
}

const TREE_POSITIONS: [number, number][] = [
  [0, 0],
  [0.3, 0.2],
  [-0.3, 0.15],
  [0.15, -0.3],
  [-0.2, -0.25],
]

const ToonForestDecorations = memo(function ToonForestDecorations({ hexes }: DecorationProps) {
  const forestHexes = useMemo(() => hexes.filter((h) => h.terrain === 'forest'), [hexes])

  const trunkMeshRef = useRef<THREE.InstancedMesh>(null)
  const foliage1MeshRef = useRef<THREE.InstancedMesh>(null)
  const foliage2MeshRef = useRef<THREE.InstancedMesh>(null)

  const trunkGeometry = useMemo(
    () => toonResourceCache.getGeometry('trunk', () => new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6)),
    []
  )
  const foliage1Geometry = useMemo(
    () => toonResourceCache.getGeometry('foliage1', () => new THREE.ConeGeometry(0.12, 0.25, 6)),
    []
  )
  const foliage2Geometry = useMemo(
    () => toonResourceCache.getGeometry('foliage2', () => new THREE.ConeGeometry(0.08, 0.18, 6)),
    []
  )

  const trunkMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.trunk), [])
  const foliageMaterial1 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.foliage1), [])
  const foliageMaterial2 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.foliage2), [])

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
        position.set(worldPos.x + tx, 0.18 + 0.08, worldPos.z + tz)
        matrix.compose(position, quaternion, scale)
        trunkMeshRef.current.setMatrixAt(instanceIndex, matrix)

        position.set(worldPos.x + tx, 0.18 + 0.22, worldPos.z + tz)
        matrix.compose(position, quaternion, scale)
        foliage1MeshRef.current.setMatrixAt(instanceIndex, matrix)

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
    <group name="toon-forest-decorations">
      <instancedMesh ref={trunkMeshRef} args={[trunkGeometry, trunkMaterial, instanceCount]} castShadow />
      <instancedMesh ref={foliage1MeshRef} args={[foliage1Geometry, foliageMaterial1, instanceCount]} castShadow />
      <instancedMesh ref={foliage2MeshRef} args={[foliage2Geometry, foliageMaterial2, instanceCount]} castShadow />
    </group>
  )
})

// ============== MOUNTAIN DECORATIONS ==============

const ToonMountainDecorations = memo(function ToonMountainDecorations({ hexes }: DecorationProps) {
  const mountainHexes = useMemo(() => hexes.filter((h) => h.terrain === 'mountains'), [hexes])

  const mainPeakRef = useRef<THREE.InstancedMesh>(null)
  const snowCapRef = useRef<THREE.InstancedMesh>(null)
  const secondPeakRef = useRef<THREE.InstancedMesh>(null)

  const mainPeakGeometry = useMemo(
    () => toonResourceCache.getGeometry('mainPeak', () => new THREE.ConeGeometry(0.35, 0.4, 4)),
    []
  )
  const snowCapGeometry = useMemo(
    () => toonResourceCache.getGeometry('snowCap', () => new THREE.ConeGeometry(0.15, 0.15, 4)),
    []
  )
  const secondPeakGeometry = useMemo(
    () => toonResourceCache.getGeometry('secondPeak', () => new THREE.ConeGeometry(0.2, 0.25, 4)),
    []
  )

  const stoneMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.stone), [])
  const snowMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.snow), [])
  const stone2Material = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.stone2), [])

  useEffect(() => {
    if (!mainPeakRef.current || !snowCapRef.current || !secondPeakRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    mountainHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      position.set(worldPos.x, 0.18 + 0.15, worldPos.z)
      matrix.compose(position, quaternion, scale)
      mainPeakRef.current!.setMatrixAt(i, matrix)

      position.set(worldPos.x, 0.18 + 0.32, worldPos.z)
      matrix.compose(position, quaternion, scale)
      snowCapRef.current!.setMatrixAt(i, matrix)

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
    <group name="toon-mountain-decorations">
      <instancedMesh ref={mainPeakRef} args={[mainPeakGeometry, stoneMaterial, mountainHexes.length]} castShadow />
      <instancedMesh ref={snowCapRef} args={[snowCapGeometry, snowMaterial, mountainHexes.length]} castShadow />
      <instancedMesh ref={secondPeakRef} args={[secondPeakGeometry, stone2Material, mountainHexes.length]} castShadow />
    </group>
  )
})

// ============== HILLS DECORATIONS ==============

const ToonHillsDecorations = memo(function ToonHillsDecorations({ hexes }: DecorationProps) {
  const hillsHexes = useMemo(() => hexes.filter((h) => h.terrain === 'hills'), [hexes])

  const moundRef = useRef<THREE.InstancedMesh>(null)
  const brick1Ref = useRef<THREE.InstancedMesh>(null)
  const brick2Ref = useRef<THREE.InstancedMesh>(null)
  const brick3Ref = useRef<THREE.InstancedMesh>(null)

  const moundGeometry = useMemo(
    () => toonResourceCache.getGeometry('mound', () => new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const brickGeometry = useMemo(
    () => toonResourceCache.getGeometry('brick', () => new THREE.BoxGeometry(0.12, 0.08, 0.08)),
    []
  )

  const clayMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.clay), [])
  const brickMaterial1 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.brick1), [])
  const brickMaterial2 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.brick2), [])

  useEffect(() => {
    if (!moundRef.current || !brick1Ref.current || !brick2Ref.current || !brick3Ref.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    hillsHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      position.set(worldPos.x, 0.18 + 0.06, worldPos.z)
      matrix.compose(position, quaternion, scale)
      moundRef.current!.setMatrixAt(i, matrix)

      position.set(worldPos.x + 0.15, 0.18 + 0.1, worldPos.z + 0.1)
      matrix.compose(position, quaternion, scale)
      brick1Ref.current!.setMatrixAt(i, matrix)

      position.set(worldPos.x + 0.12, 0.18 + 0.18, worldPos.z + 0.08)
      matrix.compose(position, quaternion, scale)
      brick2Ref.current!.setMatrixAt(i, matrix)

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
    <group name="toon-hills-decorations">
      <instancedMesh ref={moundRef} args={[moundGeometry, clayMaterial, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick1Ref} args={[brickGeometry, brickMaterial1, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick2Ref} args={[brickGeometry, brickMaterial2, hillsHexes.length]} castShadow />
      <instancedMesh ref={brick3Ref} args={[brickGeometry, brickMaterial1, hillsHexes.length]} castShadow />
    </group>
  )
})

// ============== PASTURE DECORATIONS ==============

const GRASS_POSITIONS: [number, number][] = [
  [0.2, 0.15],
  [-0.25, 0.1],
  [0.1, -0.25],
  [-0.15, -0.2],
  [0.3, -0.1],
]

const ToonPastureDecorations = memo(function ToonPastureDecorations({ hexes }: DecorationProps) {
  const pastureHexes = useMemo(() => hexes.filter((h) => h.terrain === 'pasture'), [hexes])

  const grassRef = useRef<THREE.InstancedMesh>(null)
  const sheepBodyRef = useRef<THREE.InstancedMesh>(null)
  const sheepHeadRef = useRef<THREE.InstancedMesh>(null)

  const grassGeometry = useMemo(
    () => toonResourceCache.getGeometry('grass', () => new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const sheepBodyGeometry = useMemo(
    () => toonResourceCache.getGeometry('sheepBody', () => new THREE.SphereGeometry(0.08, 8, 6)),
    []
  )
  const sheepHeadGeometry = useMemo(
    () => toonResourceCache.getGeometry('sheepHead', () => new THREE.SphereGeometry(0.04, 6, 6)),
    []
  )

  const grassMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.grass), [])
  const sheepMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.sheep), [])

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

      for (const [gx, gz] of GRASS_POSITIONS) {
        position.set(worldPos.x + gx, 0.18 + 0.03, worldPos.z + gz)
        matrix.compose(position, quaternion, scale)
        grassRef.current!.setMatrixAt(grassIndex, matrix)
        grassIndex++
      }

      position.set(worldPos.x, 0.18 + 0.08, worldPos.z)
      matrix.compose(position, quaternion, scale)
      sheepBodyRef.current!.setMatrixAt(i, matrix)

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
    <group name="toon-pasture-decorations">
      <instancedMesh ref={grassRef} args={[grassGeometry, grassMaterial, grassInstanceCount]} castShadow />
      <instancedMesh ref={sheepBodyRef} args={[sheepBodyGeometry, sheepMaterial, pastureHexes.length]} castShadow />
      <instancedMesh ref={sheepHeadRef} args={[sheepHeadGeometry, sheepMaterial, pastureHexes.length]} castShadow />
    </group>
  )
})

// ============== FIELDS DECORATIONS ==============

const WHEAT_ROWS = [
  { z: -0.2, stalks: 5 },
  { z: 0, stalks: 6 },
  { z: 0.2, stalks: 5 },
]

const ToonFieldsDecorations = memo(function ToonFieldsDecorations({ hexes }: DecorationProps) {
  const fieldsHexes = useMemo(() => hexes.filter((h) => h.terrain === 'fields'), [hexes])

  const stalkRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  const stalkGeometry = useMemo(
    () => toonResourceCache.getGeometry('stalk', () => new THREE.CylinderGeometry(0.008, 0.01, 0.15, 4)),
    []
  )
  const headGeometry = useMemo(
    () => toonResourceCache.getGeometry('wheatHead', () => new THREE.SphereGeometry(0.025, 6, 4)),
    []
  )

  const stalkMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.stalk), [])
  const headMaterial = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.wheatHead), [])

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

          position.set(worldPos.x + x, 0.18, worldPos.z + row.z)
          matrix.compose(position, quaternion, scale)
          stalkRef.current!.setMatrixAt(instanceIndex, matrix)

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
    <group name="toon-fields-decorations">
      <instancedMesh ref={stalkRef} args={[stalkGeometry, stalkMaterial, instanceCount]} castShadow />
      <instancedMesh ref={headRef} args={[headGeometry, headMaterial, instanceCount]} castShadow />
    </group>
  )
})

// ============== DESERT DECORATIONS ==============

const ToonDesertDecorations = memo(function ToonDesertDecorations({ hexes }: DecorationProps) {
  const desertHexes = useMemo(() => hexes.filter((h) => h.terrain === 'desert'), [hexes])

  const dune1Ref = useRef<THREE.InstancedMesh>(null)
  const dune2Ref = useRef<THREE.InstancedMesh>(null)
  const cactusMainRef = useRef<THREE.InstancedMesh>(null)
  const cactusArmRef = useRef<THREE.InstancedMesh>(null)

  const duneGeometry1 = useMemo(
    () => toonResourceCache.getGeometry('dune1', () => new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const duneGeometry2 = useMemo(
    () => toonResourceCache.getGeometry('dune2', () => new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
    []
  )
  const cactusMainGeometry = useMemo(
    () => toonResourceCache.getGeometry('cactusMain', () => new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6)),
    []
  )
  const cactusArmGeometry = useMemo(
    () => toonResourceCache.getGeometry('cactusArm', () => new THREE.CylinderGeometry(0.025, 0.03, 0.1, 6)),
    []
  )

  const sandMaterial1 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.sand1), [])
  const sandMaterial2 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.sand2), [])
  const cactusMaterial1 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.cactus1), [])
  const cactusMaterial2 = useMemo(() => toonResourceCache.getToonMaterial(DECORATION_COLORS.cactus2), [])

  useEffect(() => {
    if (!dune1Ref.current || !dune2Ref.current || !cactusMainRef.current || !cactusArmRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const armQuaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    const euler = new THREE.Euler(0, 0, Math.PI / 4)
    armQuaternion.setFromEuler(euler)

    desertHexes.forEach((hex, i) => {
      const worldPos = axialToWorld(hex.coord)

      position.set(worldPos.x + 0.15, 0.18 + 0.04, worldPos.z + 0.1)
      matrix.compose(position, quaternion, scale)
      dune1Ref.current!.setMatrixAt(i, matrix)

      position.set(worldPos.x - 0.2, 0.18 + 0.03, worldPos.z - 0.1)
      matrix.compose(position, quaternion, scale)
      dune2Ref.current!.setMatrixAt(i, matrix)

      position.set(worldPos.x, 0.18 + 0.1, worldPos.z)
      matrix.compose(position, quaternion, scale)
      cactusMainRef.current!.setMatrixAt(i, matrix)

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
    <group name="toon-desert-decorations">
      <instancedMesh ref={dune1Ref} args={[duneGeometry1, sandMaterial1, desertHexes.length]} castShadow />
      <instancedMesh ref={dune2Ref} args={[duneGeometry2, sandMaterial2, desertHexes.length]} castShadow />
      <instancedMesh ref={cactusMainRef} args={[cactusMainGeometry, cactusMaterial1, desertHexes.length]} castShadow />
      <instancedMesh ref={cactusArmRef} args={[cactusArmGeometry, cactusMaterial2, desertHexes.length]} castShadow />
    </group>
  )
})

// ============== MAIN COMPONENT ==============

export interface ToonHexTilesProps {
  hexes: HexTileType[]
}

/**
 * ToonHexTiles - Cel-shaded hex tile rendering with outlines
 *
 * Features:
 * - Vibrant, saturated colors
 * - 3-band cel-shading (highlight, base, shadow)
 * - Dark outlines for comic book effect
 * - Instanced rendering for high performance (~25 draw calls)
 */
export function ToonHexTiles({ hexes }: ToonHexTilesProps) {
  useToonResourceCache()

  return (
    <group name="toon-hex-tiles">
      {/* Hex bases with outlines */}
      <ToonHexBaseInstances hexes={hexes} />

      {/* Terrain decorations */}
      <ToonForestDecorations hexes={hexes} />
      <ToonMountainDecorations hexes={hexes} />
      <ToonHillsDecorations hexes={hexes} />
      <ToonPastureDecorations hexes={hexes} />
      <ToonFieldsDecorations hexes={hexes} />
      <ToonDesertDecorations hexes={hexes} />
    </group>
  )
}
