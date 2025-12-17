/**
 * Script to setup Twitch EventSub Webhook
 * 
 * Configures EventSub to send webhooks to Supabase Edge Function
 * 
 * Usage: npx tsx tools/setup-eventsub-webhook.ts
 */

import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

const CLIENT_ID = process.env.TWITCH_CLIENT_ID
const USER_TOKEN = process.env.TWITCH_USER_TOKEN
const CHANNEL_ID = process.env.TWITCH_CHANNEL_ID
const SUPABASE_URL = process.env.SUPABASE_URL
const WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET

if (!CLIENT_ID || !USER_TOKEN || !CHANNEL_ID || !SUPABASE_URL || !WEBHOOK_SECRET) {
  console.error('❌ Missing required environment variables:')
  console.error('   Required: TWITCH_CLIENT_ID, TWITCH_USER_TOKEN, TWITCH_CHANNEL_ID, SUPABASE_URL, TWITCH_WEBHOOK_SECRET')
  process.exit(1)
}

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/twitch-eventsub`

async function setupEventSub() {
  console.log('🔧 Setting up Twitch EventSub Webhook...')
  console.log(`   Webhook URL: ${EDGE_FUNCTION_URL}`)
  console.log(`   Channel ID: ${CHANNEL_ID}\n`)

  // Check existing subscriptions first
  console.log('📋 Checking existing subscriptions...')
  const listRes = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    headers: {
      'Client-ID': CLIENT_ID!,
      'Authorization': `Bearer ${USER_TOKEN}`
    }
  })

  if (listRes.ok) {
    const data = await listRes.json() as any
    const existing = data.data?.filter((sub: any) => 
      sub.type === 'channel.channel_points_custom_reward_redemption.add' &&
      sub.transport?.method === 'webhook'
    )
    
    if (existing && existing.length > 0) {
      console.log(`   Found ${existing.length} existing subscription(s)`)
      for (const sub of existing) {
        console.log(`   - ID: ${sub.id}, Status: ${sub.status}`)
      }
      console.log('\n   To create a new subscription, delete existing ones first or use a different webhook URL\n')
    }
  }

  // Create new subscription
  console.log('📨 Creating new EventSub subscription...')
  
  const subscription = {
    type: 'channel.channel_points_custom_reward_redemption.add',
    version: '1',
    condition: {
      broadcaster_user_id: CHANNEL_ID
    },
    transport: {
      method: 'webhook',
      callback: EDGE_FUNCTION_URL,
      secret: WEBHOOK_SECRET
    }
  }

  const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Client-ID': CLIENT_ID!,
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  })

  const result = await res.json()

  if (res.ok) {
    console.log('✅ EventSub subscription created successfully!')
    console.log(`   Subscription ID: ${result.data[0].id}`)
    console.log(`   Status: ${result.data[0].status}`)
    console.log(`   Webhook URL: ${result.data[0].transport.callback}`)
  } else {
    console.error('❌ Failed to create subscription:')
    console.error(JSON.stringify(result, null, 2))
    process.exit(1)
  }
}

setupEventSub().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
