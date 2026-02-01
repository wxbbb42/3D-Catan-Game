'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSocket } from '@/hooks/useSocket'

type SocketContextType = ReturnType<typeof useSocket>

const SocketContext = createContext<SocketContextType | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = useSocket()

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context
}
