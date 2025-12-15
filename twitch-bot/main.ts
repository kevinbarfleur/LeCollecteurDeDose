/**
 * Twitch Bot Service for Railway - Deno Version
 * 
 * Handles Twitch chat interactions using tmi.js (via npm)
 * Interacts with Supabase for collection queries and stats
 * Rewards are handled by Supabase Edge Functions
 */

import tmi from "npm:tmi.js@^1.8.5"
import { createClient } from "npm:@supabase/supabase-js@^2"

// Get environment variables
const TWITCH_BOT_USERNAME = Deno.env.get("TWITCH_BOT_USERNAME") || ""
const TWITCH_BOT_OAUTH_TOKEN = Deno.env.get("TWITCH_BOT_OAUTH_TOKEN") || ""
const TWITCH_CHANNEL_NAME = Deno.env.get("TWITCH_CHANNEL_NAME") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_KEY = Deno.env.get("SUPABASE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || ""
const PORT = parseInt(Deno.env.get("PORT") || Deno.env.get("WEBHOOK_PORT") || "3001")

// Initialize Supabase client
let supabase: ReturnType<typeof createClient> | null = null

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('✅ Supabase client initialized')
} else {
  console.warn('⚠️  Supabase credentials not found - chat commands requiring Supabase will be disabled')
}

// Initialize Twitch client
const client = new tmi.Client({
  identity: {
    username: TWITCH_BOT_USERNAME,
    password: TWITCH_BOT_OAUTH_TOKEN
  },
  channels: [TWITCH_CHANNEL_NAME]
})

let isConnected = false

// HTTP server for webhooks and health checks
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check endpoint for Railway
  if (req.method === 'GET' && url.pathname === '/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        bot: isConnected ? 'connected' : 'connecting',
        channel: TWITCH_CHANNEL_NAME || 'unknown',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Webhook endpoint for Edge Functions
  if (req.method === 'POST' && url.pathname === '/webhook/message') {
    try {
      const body = await req.json()
      const { message, channel } = body

      if (message && channel) {
        console.log(`📨 Received webhook message: ${message}`)
        client.say(`#${channel}`, message)
        return new Response(
          JSON.stringify({ ok: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Missing message or channel' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // 404 for other routes
  return new Response('Not Found', { status: 404, headers: corsHeaders })
}

// Start HTTP server
console.log('🤖 Twitch Bot Service starting...')
console.log(`   Channel: ${TWITCH_CHANNEL_NAME}`)
console.log(`   Username: ${TWITCH_BOT_USERNAME}`)

// Start HTTP server first (Railway needs this for health checks)
// Use AbortController for graceful shutdown
const abortController = new AbortController()
const server = Deno.serve({ 
  port: PORT, 
  hostname: '0.0.0.0',
  signal: abortController.signal 
}, handleRequest)
console.log(`📡 Webhook server listening on port ${PORT}`)
console.log(`   Endpoint: http://0.0.0.0:${PORT}/webhook/message`)
console.log(`   Health check: http://0.0.0.0:${PORT}/health`)
console.log('✅ HTTP server ready - Railway can now perform health checks')

// Small delay to ensure Railway sees the server is listening
await new Promise(resolve => setTimeout(resolve, 1000))

// Connect to Twitch
console.log('🔌 Connecting to Twitch...')
client.connect().catch(console.error)

// Twitch client event handlers
client.on('connected', () => {
  isConnected = true
  console.log(`✅ Bot connected to Twitch chat: ${TWITCH_CHANNEL_NAME}`)
})

client.on('disconnected', () => {
  isConnected = false
  console.log('❌ Bot disconnected from Twitch')
})

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

      const totalCards = user.user_collections?.reduce((sum: number, col: any) => sum + (col.quantity || 0), 0) || 0
      const totalFoil = user.user_collections?.reduce((sum: number, col: any) => sum + (col.foil_count || 0), 0) || 0
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

      const totalCards = user.user_collections?.reduce((sum: number, col: any) => sum + (col.quantity || 0), 0) || 0
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

// Handle process termination gracefully
Deno.addSignalListener('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, disconnecting bot...')
  isConnected = false
  client.disconnect()
  abortController.abort()
  await server.finished
  console.log('🛑 Server closed, exiting...')
  Deno.exit(0)
})

Deno.addSignalListener('SIGINT', async () => {
  console.log('🛑 SIGINT received, disconnecting bot...')
  isConnected = false
  client.disconnect()
  abortController.abort()
  await server.finished
  Deno.exit(0)
})

// Keep the process alive - prevent Railway from thinking the service is inactive
// Railway needs to see active network connections or HTTP activity
let heartbeatCount = 0
setInterval(() => {
  heartbeatCount++
  const uptime = Math.floor(performance.now() / 1000)
  console.log(`💓 Heartbeat #${heartbeatCount} - uptime: ${uptime}s, server: listening, twitch: ${isConnected ? 'connected' : 'connecting'}`)
  
  // Also log server status every 5 minutes
  if (uptime % 300 === 0) {
    console.log(`📊 Status check - Server listening: true, Port: ${PORT}, Twitch: ${isConnected ? 'connected' : 'disconnected'}`)
  }
}, 60000) // Every 60 seconds

console.log('✅ Service ready and listening for requests')
