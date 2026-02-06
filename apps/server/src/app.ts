import express, { type Express } from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.js'
import { gamesRouter } from './routes/games.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app: Express = express()

// Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean) as string[]

app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/health', healthRouter)
app.use('/api/games', gamesRouter)

// Error handler
app.use(errorHandler)
