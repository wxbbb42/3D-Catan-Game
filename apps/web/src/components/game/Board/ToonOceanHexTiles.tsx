'use client'

import { useMemo, memo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { HexTile as HexTileType } from '@catan/shared'
import { axialToWorld, hexRing, hexId, HEX_TILE_RADIUS } from '@catan/shared'
import { createToonMaterial, createOutlineMaterial } from './shaders/ToonShader'

// Ocean hex visual radius (same as land tiles for consistency)
const OCEAN_HEX_RADIUS = HEX_TILE_RADIUS

// Toon ocean colors - vibrant water blue
const OCEAN_COLOR = '#4A90D9'
const OCEAN_FRAME_COLOR = '#2E5E8C'
const WAVE_COLOR = '#6BB3E8'

// ============== GEOMETRY CACHE ==============

class OceanResourceCache {
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
    if (cached) return cached
    const geometry = factory()
    this.geometries.set(key, geometry)
    return geometry
  }

  getToonMaterial(color: string, steps: number = 3): THREE.Material {
    const key = `toon-${color}-${steps}`
    const cached = this.materials.get(key)
    if (cached) return cached
    const material = createToonMaterial(color, steps)
    this.materials.set(key, material)
    return material
  }

  getOutlineMaterial(color: string = '#1a1a2e', width: number = 0.025): THREE.Material {
    const key = `outline-${color}-${width}`
    const cached = this.materials.get(key)
    if (cached) return cached
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

const oceanResourceCache = new OceanResourceCache()

function useOceanResourceCache(): void {
  useEffect(() => {
    oceanResourceCache.addRef()
    return () => {
      oceanResourceCache.release()
    }
  }, [])
}

// ============== GEOMETRY FACTORIES ==============

function createOceanHexGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const radius = OCEAN_HEX_RADIUS

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
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

function createFrameGeometry(): THREE.BufferGeometry {
  const radius = OCEAN_HEX_RADIUS + 0.02
  const innerRadius = OCEAN_HEX_RADIUS - 0.06

  const shape = new THREE.Shape()

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()

  const hole = new THREE.Path()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = innerRadius * Math.cos(angle)
    const y = innerRadius * Math.sin(angle)
    if (i === 0) hole.moveTo(x, y)
    else hole.lineTo(x, y)
  }
  hole.closePath()
  shape.holes.push(hole)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: false,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// ============== INSTANCED OCEAN HEXES ==============

interface ToonOceanHexTilesProps {
  hexes: HexTileType[]
}

export const ToonOceanHexTiles = memo(function ToonOceanHexTiles({ hexes }: ToonOceanHexTilesProps) {
  useOceanResourceCache()

  const oceanCoords = useMemo(() => {
    const landHexIds = new Set(hexes.map((h) => hexId(h.coord)))
    const ring3 = hexRing({ q: 0, r: 0 }, 3)
    return ring3.filter((coord) => !landHexIds.has(hexId(coord)))
  }, [hexes])

  const hexMeshRef = useRef<THREE.InstancedMesh>(null)
  const outlineMeshRef = useRef<THREE.InstancedMesh>(null)
  const frameMeshRef = useRef<THREE.InstancedMesh>(null)
  const waveMeshRef = useRef<THREE.InstancedMesh>(null)

  const hexGeometry = useMemo(
    () => oceanResourceCache.getGeometry('ocean-hex', createOceanHexGeometry),
    []
  )
  const frameGeometry = useMemo(
    () => oceanResourceCache.getGeometry('ocean-frame', createFrameGeometry),
    []
  )
  const waveGeometry = useMemo(
    () => oceanResourceCache.getGeometry('wave', () => new THREE.CapsuleGeometry(0.03, 0.15, 4, 8)),
    []
  )

  const oceanMaterial = useMemo(() => oceanResourceCache.getToonMaterial(OCEAN_COLOR), [])
  const outlineMaterial = useMemo(() => oceanResourceCache.getOutlineMaterial('#1a1a2e', 0.02), [])
  const frameMaterial = useMemo(() => oceanResourceCache.getToonMaterial(OCEAN_FRAME_COLOR), [])
  const waveMaterial = useMemo(() => oceanResourceCache.getToonMaterial(WAVE_COLOR), [])

  // 3 waves per hex
  const waveInstanceCount = oceanCoords.length * 3

  useEffect(() => {
    if (!hexMeshRef.current || !outlineMeshRef.current || !frameMeshRef.current || !waveMeshRef.current) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)

    let waveIndex = 0

    oceanCoords.forEach((coord, i) => {
      const worldPos = axialToWorld(coord)

      // Ocean hex base
      position.set(worldPos.x, -0.08, worldPos.z)
      matrix.compose(position, quaternion, scale)
      hexMeshRef.current!.setMatrixAt(i, matrix)
      outlineMeshRef.current!.setMatrixAt(i, matrix)

      // Frame on top
      position.set(worldPos.x, -0.08 + 0.12, worldPos.z)
      matrix.compose(position, quaternion, scale)
      frameMeshRef.current!.setMatrixAt(i, matrix)

      // Wave decorations
      const phase = (coord.q * 0.7 + coord.r * 1.1) % (Math.PI * 2)
      for (let w = 0; w < 3; w++) {
        const angle = phase + (w * Math.PI * 2) / 3
        const dist = 0.25 + Math.sin(angle) * 0.15
        const wx = worldPos.x + dist * Math.cos(angle + Math.PI / 6)
        const wz = worldPos.z + dist * Math.sin(angle + Math.PI / 6)

        position.set(wx, -0.08 + 0.14, wz)
        const waveQuaternion = new THREE.Quaternion()
        waveQuaternion.setFromEuler(new THREE.Euler(0, phase + w, 0))
        matrix.compose(position, waveQuaternion, scale)
        waveMeshRef.current!.setMatrixAt(waveIndex, matrix)
        waveIndex++
      }
    })

    hexMeshRef.current.instanceMatrix.needsUpdate = true
    outlineMeshRef.current.instanceMatrix.needsUpdate = true
    frameMeshRef.current.instanceMatrix.needsUpdate = true
    waveMeshRef.current.instanceMatrix.needsUpdate = true
  }, [oceanCoords])

  if (oceanCoords.length === 0) return null

  return (
    <group name="toon-ocean-hex-tiles">
      <instancedMesh
        ref={hexMeshRef}
        args={[hexGeometry, oceanMaterial, oceanCoords.length]}
        receiveShadow
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={outlineMeshRef}
        args={[hexGeometry, outlineMaterial, oceanCoords.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={frameMeshRef}
        args={[frameGeometry, frameMaterial, oceanCoords.length]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={waveMeshRef}
        args={[waveGeometry, waveMaterial, waveInstanceCount]}
        castShadow
        frustumCulled={false}
      />
    </group>
  )
})
