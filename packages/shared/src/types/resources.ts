// Resource types in Catan
export type ResourceType = 'brick' | 'lumber' | 'ore' | 'grain' | 'wool'

// Array of all resource types for iteration
export const RESOURCE_TYPES: ResourceType[] = ['brick', 'lumber', 'ore', 'grain', 'wool']

// Terrain types for hex tiles
export type TerrainType = 'desert' | 'hills' | 'mountains' | 'forest' | 'pasture' | 'fields'

// Map terrain to resource
export const TERRAIN_TO_RESOURCE: Record<TerrainType, ResourceType | null> = {
  desert: null,
  hills: 'brick',
  mountains: 'ore',
  forest: 'lumber',
  pasture: 'wool',
  fields: 'grain'
} as const

// Resource count object
export interface ResourceCount {
  brick: number
  lumber: number
  ore: number
  grain: number
  wool: number
}

// Create empty resource count
export function createEmptyResources(): ResourceCount {
  return {
    brick: 0,
    lumber: 0,
    ore: 0,
    grain: 0,
    wool: 0
  }
}

// Count total resources
export function countResources(resources: ResourceCount): number {
  return (
    resources.brick +
    resources.lumber +
    resources.ore +
    resources.grain +
    resources.wool
  )
}

// Add resources (immutable)
export function addResources(
  current: ResourceCount,
  toAdd: Partial<ResourceCount>
): ResourceCount {
  return {
    brick: current.brick + (toAdd.brick ?? 0),
    lumber: current.lumber + (toAdd.lumber ?? 0),
    ore: current.ore + (toAdd.ore ?? 0),
    grain: current.grain + (toAdd.grain ?? 0),
    wool: current.wool + (toAdd.wool ?? 0)
  }
}

// Subtract resources (immutable)
export function subtractResources(
  current: ResourceCount,
  toSubtract: Partial<ResourceCount>
): ResourceCount {
  return {
    brick: current.brick - (toSubtract.brick ?? 0),
    lumber: current.lumber - (toSubtract.lumber ?? 0),
    ore: current.ore - (toSubtract.ore ?? 0),
    grain: current.grain - (toSubtract.grain ?? 0),
    wool: current.wool - (toSubtract.wool ?? 0)
  }
}

// Check if player can afford a cost
export function canAfford(
  resources: ResourceCount,
  cost: Partial<ResourceCount>
): boolean {
  return (
    resources.brick >= (cost.brick ?? 0) &&
    resources.lumber >= (cost.lumber ?? 0) &&
    resources.ore >= (cost.ore ?? 0) &&
    resources.grain >= (cost.grain ?? 0) &&
    resources.wool >= (cost.wool ?? 0)
  )
}
