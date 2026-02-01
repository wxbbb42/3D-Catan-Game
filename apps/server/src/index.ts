import 'dotenv/config'
import { createServer } from 'http'
import { app } from './app.js'
import { setupSocketIO } from './socket/index.js'

const PORT = process.env.PORT ?? 4567

const httpServer = createServer(app)

// Set up Socket.io
setupSocketIO(httpServer)

httpServer.listen(PORT, () => {
  console.log(`🎲 Catan server running on port ${PORT}`)
  console.log(`   HTTP: http://localhost:${PORT}`)
  console.log(`   WebSocket: ws://localhost:${PORT}`)
})
