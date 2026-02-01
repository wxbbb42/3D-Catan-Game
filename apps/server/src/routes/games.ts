import { Router, type IRouter } from 'express'

export const gamesRouter: IRouter = Router()

// GET /api/games/:code - Get game info by code
gamesRouter.get('/:code', async (req, res) => {
  const { code } = req.params

  // TODO: Implement game lookup from database
  res.json({
    code,
    status: 'waiting',
    playerCount: 0,
    maxPlayers: 4,
  })
})

// POST /api/games - Create new game
gamesRouter.post('/', async (_req, res) => {
  // TODO: Implement game creation
  const code = generateGameCode()

  res.status(201).json({
    code,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  })
})

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
