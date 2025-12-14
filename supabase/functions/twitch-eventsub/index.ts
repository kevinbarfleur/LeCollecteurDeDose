// Edge Function: Twitch EventSub Webhook Handler
// Receives webhook events from Twitch EventSub and routes them to handle-reward

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const WEBHOOK_SECRET = Deno.env.get('TWITCH_WEBHOOK_SECRET') || ''

// Verify Twitch webhook signature
function verifySignature(message: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.warn('⚠️  WEBHOOK_SECRET not set, skipping signature verification')
    return true
  }
  
  const crypto = globalThis.crypto
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  
  // Twitch uses HMAC SHA256
  // Note: This is a simplified check - in production, use proper HMAC verification
  return true // TODO: Implement proper HMAC verification
}

serve(async (req) => {
  const method = req.method
  const url = new URL(req.url)
  
  // Handle EventSub challenge (GET request)
  if (method === 'GET') {
    const challenge = url.searchParams.get('hub.challenge')
    const mode = url.searchParams.get('hub.mode')
    
    if (challenge && mode === 'subscribe') {
      console.log('✅ EventSub challenge received, responding with challenge')
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    
    return new Response('Invalid challenge request', { status: 400 })
  }

  // Handle EventSub notifications (POST request)
  if (method === 'POST') {
    try {
      const signature = req.headers.get('twitch-eventsub-message-signature') || ''
      const messageId = req.headers.get('twitch-eventsub-message-id') || ''
      const messageType = req.headers.get('twitch-eventsub-message-type') || ''
      const timestamp = req.headers.get('twitch-eventsub-message-timestamp') || ''
      
      const body = await req.text()
      
      // Verify signature
      if (!verifySignature(`${messageId}${timestamp}${body}`, signature, WEBHOOK_SECRET)) {
        console.error('❌ Invalid signature')
        return new Response('Invalid signature', { status: 403 })
      }
      
      const event = JSON.parse(body)
      
      // Handle notification
      if (messageType === 'notification') {
        const subscription = event.subscription
        const eventData = event.event
        
        if (subscription?.type === 'channel.channel_points_custom_reward_redemption.add') {
          const { user_name, user_input, reward } = eventData
          
          console.log(`📨 EventSub notification: ${user_name} redeemed ${reward.id}`)
          
          // Invoke handle-reward function
          const { data, error } = await supabase.functions.invoke('handle-reward', {
            body: {
              username: user_name,
              input: user_input || '',
              rewardId: reward.id
            }
          })
          
          if (error) {
            console.error('❌ Error invoking handle-reward:', error)
            return new Response(JSON.stringify({ error: 'Failed to process reward' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })
          }
          
          return new Response(JSON.stringify({ status: 'ok' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
      
      // Handle revocation
      if (messageType === 'revocation') {
        console.warn('⚠️  EventSub subscription revoked:', event.subscription?.id)
        return new Response(JSON.stringify({ status: 'acknowledged' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('❌ Error processing EventSub webhook:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  return new Response('Method not allowed', { status: 405 })
})
