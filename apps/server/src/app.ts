import express, { type Express } from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.js'
import { gamesRouter } from './routes/games.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app: Express = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/health', healthRouter)
app.use('/api/games', gamesRouter)

// Error handler
app.use(errorHandler)
