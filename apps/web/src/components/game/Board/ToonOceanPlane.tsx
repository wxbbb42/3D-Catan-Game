'use client'

import { useMemo, memo } from 'react'
import * as THREE from 'three'
import { createToonMaterial } from './shaders/ToonShader'

// Toon ocean colors - vibrant water tones
const DEEP_OCEAN_COLOR = '#2E6B9E'
const OCEAN_COLOR = '#4A90D9'
const SHORE_FOAM_COLOR = '#A8D8EA'

// ============== MATERIAL CACHE ==============

class OceanPlaneMaterialCache {
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

  getToonMaterial(color: string, steps: number = 3): THREE.Material {
    const key = `toon-${color}-${steps}`
    const cached = this.materials.get(key)
    if (cached) return cached
    const material = createToonMaterial(color, steps)
    this.materials.set(key, material)
    return material
  }

  private dispose(): void {
    this.materials.forEach((m) => m.dispose())
    this.materials.clear()
  }
}

const materialCache = new OceanPlaneMaterialCache()

// ============== TOON OCEAN PLANE ==============

export const ToonOceanPlane = memo(function ToonOceanPlane() {
  // Memoize geometries
  const mainOceanGeometry = useMemo(() => new THREE.CircleGeometry(12, 64), [])
  const deepOceanGeometry = useMemo(() => new THREE.RingGeometry(12, 18, 64), [])
  const shoreFoamGeometry = useMemo(() => new THREE.RingGeometry(4.8, 5.2, 64), [])

  // Memoize toon materials
  const oceanMaterial = useMemo(() => materialCache.getToonMaterial(OCEAN_COLOR, 3), [])
  const deepOceanMaterial = useMemo(() => materialCache.getToonMaterial(DEEP_OCEAN_COLOR, 3), [])
  const shoreFoamMaterial = useMemo(() => materialCache.getToonMaterial(SHORE_FOAM_COLOR, 2), [])

  return (
    <group name="toon-ocean-plane">
      {/* Main ocean surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <primitive object={mainOceanGeometry} attach="geometry" />
        <primitive object={oceanMaterial} attach="material" />
      </mesh>

      {/* Outer ring - deeper water */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.15, 0]}
      >
        <primitive object={deepOceanGeometry} attach="geometry" />
        <primitive object={deepOceanMaterial} attach="material" />
      </mesh>

      {/* Subtle shore foam ring */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
      >
        <primitive object={shoreFoamGeometry} attach="geometry" />
        <primitive object={shoreFoamMaterial} attach="material" />
      </mesh>
    </group>
  )
})
