/**
 * Minimal Twitch Bot Service for Railway
 * 
 * Handles Twitch chat interactions using TMI.js
 * Very lightweight - only manages chat, rewards are handled by Supabase Edge Functions
 */

import tmi from 'tmi.js'

// Railway injects environment variables automatically, no need for dotenv in production
// But we keep it for local development
try {
  const dotenv = await import('dotenv')
  dotenv.config()
} catch (e) {
  // dotenv not available in production, that's fine
}

const client = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_BOT_OAUTH_TOKEN
  },
  channels: [process.env.TWITCH_CHANNEL_NAME]
})

// Webhook URL to receive messages from Edge Functions (optional)
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001
let webhookServer = null

// Setup webhook server to receive messages from Edge Functions
if (process.env.ENABLE_WEBHOOK === 'true') {
  import('http').then((http) => {
    webhookServer = http.createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/webhook/message') {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const { message, channel } = JSON.parse(body)
            if (message && channel) {
              client.say(`#${channel}`, message)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            console.error('Error processing webhook:', error)
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid request' }))
          }
        })
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    webhookServer.listen(WEBHOOK_PORT, () => {
      console.log(`📡 Webhook server listening on port ${WEBHOOK_PORT}`)
    })
  })
}

client.connect()

client.on('message', async (channel, tags, message, self) => {
  // Ignore messages from the bot itself
  if (self) return

  const command = message.toLowerCase().trim()

  // Simple ping command
  if (command === '!ping') {
    client.say(channel, 'Pong!')
    return
  }

  // Add more chat commands here as needed
  // Example: !collection, !stats, etc.
})

client.on('connected', () => {
  console.log(`✅ Bot connected to Twitch chat: ${process.env.TWITCH_CHANNEL_NAME}`)
})

client.on('disconnected', (reason) => {
  console.log(`❌ Bot disconnected: ${reason}`)
  // TMI.js will automatically try to reconnect
})

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, disconnecting bot...')
  client.disconnect()
  if (webhookServer) {
    webhookServer.close()
  }
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, disconnecting bot...')
  client.disconnect()
  if (webhookServer) {
    webhookServer.close()
  }
  process.exit(0)
})

console.log('🤖 Twitch Bot Service starting...')
console.log(`   Channel: ${process.env.TWITCH_CHANNEL_NAME}`)
console.log(`   Username: ${process.env.TWITCH_BOT_USERNAME}`)
