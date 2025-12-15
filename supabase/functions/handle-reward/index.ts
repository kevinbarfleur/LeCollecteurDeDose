// Edge Function: Handle Twitch Channel Points Rewards
// Processes reward redemptions and creates boosters, updates collections

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const VAAL_REWARD_ID = Deno.env.get('TWITCH_REWARD_VAAL_ID') || ''
const CHANNEL_NAME = Deno.env.get('TWITCH_CHANNEL_NAME') || ''

// Weighted random selection
function weightedRandom(items: any[]) {
  const total = items.reduce((s, i) => s + ((i.game_data as any)?.weight ?? 1), 0)
  let r = Math.random() * total

  for (const it of items) {
    r -= ((it.game_data as any)?.weight ?? 1)
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

// Weighted random with tier filtering
function weightedRandomTier(items: any[], tiers = ["T0", "T1", "T2"]) {
  const list = items.filter(i => tiers.includes(i.tier))
  if (!list.length) return null

  const boosted = list.map(i => ({
    ...i,
    weight: ((i.game_data as any)?.weight ?? 1) * (i.tier === "T2" ? 4 : 1)
  }))

  return weightedRandom(boosted)
}

// Create a booster with 5 cards
function createBooster(allCards: any[]) {
  const booster: any[] = []
  const guaranteed = weightedRandomTier(allCards)
  if (guaranteed) booster.push(guaranteed)

  while (booster.length < 5) {
    booster.push(weightedRandom(allCards))
  }

  return booster
}

// Determine if a card should be foil (with buff support)
async function isFoil(card: any, userId: string, supabase: any): Promise<boolean> {
  const tier = card.tier ?? "T0"
  let baseChances: Record<string, number> = { T3: 0.10, T2: 0.08, T1: 0.05, T0: 0.01 }
  let foilChance = baseChances[tier] ?? 0.01
  
  // Check for Atlas Influence buff
  try {
    const { data: buffsResult, error: buffsError } = await supabase.rpc('get_user_buffs', {
      p_user_id: userId
    })
    
    if (!buffsError && buffsResult?.success && buffsResult.buffs?.atlas_influence) {
      const atlasBuff = buffsResult.buffs.atlas_influence
      const expiresAt = new Date(atlasBuff.expires_at)
      
      if (expiresAt > new Date()) {
        const foilBoost = atlasBuff.data?.foil_chance_boost || 0
        foilChance = Math.min(1.0, foilChance + foilBoost)
      }
    }
  } catch (error) {
    console.error('Error checking buffs:', error)
    // Continue with base chance if buff check fails
  }
  
  return Math.random() < foilChance
}

async function sendTwitchMessage(message: string) {
  const botWebhookUrl = Deno.env.get('BOT_WEBHOOK_URL')
  if (botWebhookUrl) {
    try {
      await fetch(`${botWebhookUrl}/webhook/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, channel: CHANNEL_NAME })
      })
    } catch (error) {
      console.error('Failed to send message to bot:', error)
    }
  }
}

serve(async (req) => {
  try {
    const { username, input, rewardId } = await req.json()

    if (!username) {
      return new Response(JSON.stringify({ error: 'Username required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }


    // Handle Vaal Orbs reward
    if (rewardId === VAAL_REWARD_ID) {
      const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
        p_twitch_username: username
      })

      if (userError) {
        console.error('❌ Error getting user:', userError)
        return new Response(JSON.stringify({ error: 'Failed to get user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await supabase.rpc('update_vaal_orbs', {
        p_user_id: userId,
        p_amount: 5
      })

      await sendTwitchMessage(`✨ @${username} reçoit 5 Vaal Orbs !`)

      return new Response(JSON.stringify({ ok: true, type: 'vaal_orbs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle booster reward
    // Fetch all cards from database
    const { data: allCards, error: cardsError } = await supabase
      .from('unique_cards')
      .select('*')

    if (cardsError || !allCards || allCards.length === 0) {
      console.error('❌ Error fetching cards:', cardsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch cards' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create booster
    const booster = createBooster(allCards)
    const timestamp = new Date().toISOString()

    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username
    })

    if (userError) {
      console.error('❌ Error getting user:', userError)
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create booster record
    const { data: boosterRecord, error: boosterError } = await supabase
      .from('user_boosters')
      .insert({
        user_id: userId,
        opened_at: timestamp,
        booster_type: 'normal'
      })
      .select()
      .single()

    if (boosterError) {
      console.error('❌ Error creating booster:', boosterError)
      return new Response(JSON.stringify({ error: 'Failed to create booster' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Process each card in the booster
    const boosterCards: any[] = []
    const lootNames: string[] = []

    for (let i = 0; i < booster.length; i++) {
      const card = booster[i]
      const foil = await isFoil(card, userId, supabase)

      // Add to booster_cards
      boosterCards.push({
        booster_id: boosterRecord.id,
        card_uid: card.uid,
        is_foil: foil,
        position: i + 1
      })

      // Add to collection
      await supabase.rpc('add_card_to_collection', {
        p_user_id: userId,
        p_card_uid: card.uid,
        p_is_foil: foil
      })

      lootNames.push(card.name + (foil ? " ✨" : ""))
    }

    // Insert all booster cards
    const { error: cardsInsertError } = await supabase
      .from('booster_cards')
      .insert(boosterCards)

    if (cardsInsertError) {
      console.error('❌ Error inserting booster cards:', cardsInsertError)
      // Don't fail completely, but log the error
    }

    // Send Twitch message
    await sendTwitchMessage(`🎁 @${username}, tu as looté : ${lootNames.join(", ")} !`)

    console.log(`✅ Booster created for ${username} with ${booster.length} cards`)

    return new Response(JSON.stringify({ 
      ok: true, 
      type: 'booster',
      booster: booster.map((c, i) => ({
        ...c,
        foil: boosterCards[i].is_foil
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in handle-reward:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
