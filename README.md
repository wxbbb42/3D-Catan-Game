# 3D Catan Game

A full-featured 3D web-based Settlers of Catan game with real-time multiplayer, user authentication, and shareable session links.

## Features

- **3D Game Board** - Interactive hexagonal board with orbit camera controls (rotate, zoom, pan)
- **Full Catan Rules** - Resources, buildings, development cards, robber, trading
- **Real-time Multiplayer** - 2-4 players via WebSocket with shareable game links
- **User Authentication** - Sign in with Google or GitHub (OAuth)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js, React Three Fiber, @react-three/drei
- **State Management**: Zustand
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod

## Project Structure

```
3d-catan/
├── apps/
│   ├── web/           # Next.js frontend
│   └── server/        # Node.js backend
└── packages/
    └── shared/        # Shared types, constants, utils
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (optional, for persistence)

### Installation

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm build
```

### Development

```bash
# Start both frontend and backend in dev mode
pnpm dev

# Or run separately:
cd apps/web && pnpm dev      # Frontend at http://localhost:3000
cd apps/server && pnpm dev   # Backend at http://localhost:4000
```

### Testing the 3D Board

Visit `http://localhost:3000/test` to see the 3D board with sample data.

## Environment Variables

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Backend (`apps/server/.env`)

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catan
JWT_SECRET=your-secret
```

## Game Rules

### Resources
- **Brick** (Hills) - For roads and settlements
- **Lumber** (Forest) - For roads and settlements
- **Ore** (Mountains) - For cities and development cards
- **Grain** (Fields) - For settlements, cities, and development cards
- **Wool** (Pasture) - For settlements and development cards

### Building Costs
- **Road**: 1 Brick + 1 Lumber
- **Settlement**: 1 Brick + 1 Lumber + 1 Grain + 1 Wool
- **City**: 3 Ore + 2 Grain
- **Development Card**: 1 Ore + 1 Grain + 1 Wool

### Victory
First player to reach 10 victory points wins!

## License

MIT
