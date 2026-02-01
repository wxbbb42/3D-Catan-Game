import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: '3D Catan - Play Online',
  description: 'Play Settlers of Catan in 3D with friends online',
  keywords: ['catan', 'settlers', 'board game', 'multiplayer', '3d', 'online'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
