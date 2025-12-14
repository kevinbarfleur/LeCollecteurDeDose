/**
 * Twitch Bot Service for Railway
 * 
 * Handles Twitch chat interactions using TMI.js
 * Interacts with Supabase for collection queries and stats
 * Rewards are handled by Supabase Edge Functions
 */

import tmi from 'tmi.js'
import { createClient } from '@supabase/supabase-js'

// Railway injects environment variables automatically, no need for dotenv in production
// But we keep it for local development
try {
  const dotenv = await import('dotenv')
  dotenv.config()
} catch (e) {
  // dotenv not available in production, that's fine
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
let supabase = null

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
  console.log('✅ Supabase client initialized')
} else {
  console.warn('⚠️  Supabase credentials not found - chat commands requiring Supabase will be disabled')
}

const client = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_BOT_OAUTH_TOKEN
  },
  channels: [process.env.TWITCH_CHANNEL_NAME]
})

// Webhook server to receive messages from Edge Functions
// Railway exposes the PORT environment variable - use it for the webhook server
const PORT = process.env.PORT || process.env.WEBHOOK_PORT || 3001
let webhookServer = null

// Always setup webhook server to receive messages from Edge Functions
// This is required for handle-reward to send messages to chat
import('http').then((http) => {
  webhookServer = http.createServer(async (req, res) => {
    // CORS headers for Edge Functions
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url === '/webhook/message') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const { message, channel } = JSON.parse(body)
          if (message && channel) {
            console.log(`📨 Received webhook message: ${message}`)
            client.say(`#${channel}`, message)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Missing message or channel' }))
          }
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

  webhookServer.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Webhook server listening on port ${PORT}`)
    console.log(`   Endpoint: http://0.0.0.0:${PORT}/webhook/message`)
  })
})

client.connect()

client.on('message', async (channel, tags, message, self) => {
  // Ignore messages from the bot itself
  if (self) return

  const username = tags.username
  const command = message.toLowerCase().trim()
  const parts = command.split(' ')

  // Simple ping command
  if (command === '!ping') {
    client.say(channel, 'Pong!')
    return
  }

  // !collection - Show user's collection stats
  if (command === '!collection' || command.startsWith('!collection ')) {
    if (!supabase) {
      client.say(channel, '❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          twitch_username,
          vaal_orbs,
          user_collections (
            quantity,
            normal_count,
            foil_count
          )
        `)
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching collection:', error)
        client.say(channel, `❌ Erreur lors de la récupération de la collection`)
        return
      }

      if (!user) {
        client.say(channel, `@${targetUser} n'a pas encore de collection`)
        return
      }

      const totalCards = user.user_collections?.reduce((sum, col) => sum + (col.quantity || 0), 0) || 0
      const totalFoil = user.user_collections?.reduce((sum, col) => sum + (col.foil_count || 0), 0) || 0
      const vaalOrbs = user.vaal_orbs || 0

      client.say(channel, `📦 @${targetUser} : ${totalCards} cartes (${totalFoil} ✨) | ${vaalOrbs} Vaal Orbs`)
    } catch (error) {
      console.error('Error in !collection command:', error)
      client.say(channel, '❌ Erreur lors de la récupération de la collection')
    }
    return
  }

  // !stats - Show user's stats
  if (command === '!stats' || command.startsWith('!stats ')) {
    if (!supabase) {
      client.say(channel, '❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          twitch_username,
          vaal_orbs,
          user_collections (quantity),
          user_boosters (id)
        `)
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching stats:', error)
        client.say(channel, `❌ Erreur lors de la récupération des stats`)
        return
      }

      if (!user) {
        client.say(channel, `@${targetUser} n'a pas encore de stats`)
        return
      }

      const totalCards = user.user_collections?.reduce((sum, col) => sum + (col.quantity || 0), 0) || 0
      const totalBoosters = user.user_boosters?.length || 0
      const vaalOrbs = user.vaal_orbs || 0

      client.say(channel, `📊 @${targetUser} : ${totalCards} cartes | ${totalBoosters} boosters ouverts | ${vaalOrbs} Vaal Orbs`)
    } catch (error) {
      console.error('Error in !stats command:', error)
      client.say(channel, '❌ Erreur lors de la récupération des stats')
    }
    return
  }

  // !vaal - Show user's Vaal Orbs
  if (command === '!vaal' || command.startsWith('!vaal ')) {
    if (!supabase) {
      client.say(channel, '❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('twitch_username, vaal_orbs')
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching vaal orbs:', error)
        client.say(channel, `❌ Erreur lors de la récupération des Vaal Orbs`)
        return
      }

      if (!user) {
        client.say(channel, `@${targetUser} n'a pas encore de Vaal Orbs`)
        return
      }

      const vaalOrbs = user.vaal_orbs || 0
      client.say(channel, `💎 @${targetUser} a ${vaalOrbs} Vaal Orbs`)
    } catch (error) {
      console.error('Error in !vaal command:', error)
      client.say(channel, '❌ Erreur lors de la récupération des Vaal Orbs')
    }
    return
  }
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
