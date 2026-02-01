'use client'

import { useGameStore } from '@/stores/gameStore'
import type { ResourceType } from '@catan/shared'

const RESOURCE_CONFIG: Record<ResourceType, { icon: string; label: string; colorClass: string }> = {
  brick: { icon: '🧱', label: 'Brick', colorClass: 'brick' },
  lumber: { icon: '🪵', label: 'Lumber', colorClass: 'lumber' },
  ore: { icon: '�ite', label: 'Ore', colorClass: 'ore' },
  grain: { icon: '🌾', label: 'Grain', colorClass: 'grain' },
  wool: { icon: '🐑', label: 'Wool', colorClass: 'wool' },
}

export function ResourcePanel() {
  const myResources = useGameStore((state) => state.myResources)
  const totalCards = Object.values(myResources).reduce((a, b) => a + b, 0)

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ui-text">Your Resources</h3>
        <span className="text-sm text-ui-text-muted">{totalCards} cards</span>
      </div>

      <div className="flex gap-3 justify-center">
        {(Object.keys(RESOURCE_CONFIG) as ResourceType[]).map((type) => {
          const config = RESOURCE_CONFIG[type]
          const count = myResources[type]

          return (
            <div
              key={type}
              className={`resource-card ${config.colorClass} relative group`}
            >
              <span className="text-2xl mb-1">{config.icon}</span>
              <span className="text-lg font-bold text-ui-text">{count}</span>

              {/* Tooltip */}
              <div className="tooltip -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap group-hover:opacity-100 group-hover:visible">
                {config.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
