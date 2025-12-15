// Edge Function: Handle Twitch Channel Points Rewards
// Processes reward redemptions and creates boosters, updates collections

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const VAAL_REWARD_ID = Deno.env.get('TWITCH_REWARD_VAAL_ID') || ''
const CHANNEL_NAME = Deno.env.get('TWITCH_CHANNEL_NAME') || ''
const BOT_WEBHOOK_URL = Deno.env.get('BOT_WEBHOOK_URL') || ''

// Validate environment variables at startup
if (!CHANNEL_NAME) {
  console.warn('⚠️  TWITCH_CHANNEL_NAME not set - messages may fail')
}
if (!BOT_WEBHOOK_URL) {
  console.warn('⚠️  BOT_WEBHOOK_URL not set - messages will not be sent to bot')
}

// Helper function to log diagnostic information
async function logRewardDiagnostic(
  username: string,
  userId: string | null,
  rewardType: 'booster' | 'vaal_orbs',
  stateBefore: any,
  stateAfter: any,
  actionDetails: any,
  validationStatus: 'ok' | 'warning' | 'error',
  validationNotes?: string
): Promise<void> {
  try {
    await supabase.from('diagnostic_logs').insert({
      category: 'reward',
      action_type: rewardType === 'booster' ? 'booster_purchase' : 'vaal_orbs_purchase',
      user_id: userId || null,
      username: username || null,
      state_before: stateBefore,
      state_after: stateAfter,
      action_details: actionDetails,
      validation_status: validationStatus,
      validation_notes: validationNotes || null,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Failed to log reward diagnostic:', error)
    // Don't fail the reward processing if logging fails
  }
}

// Helper function to get user state for diagnostics
async function getUserState(userId: string): Promise<any> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        vaal_orbs,
        user_collections (quantity),
        user_boosters (id)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user state:', error)
      return { vaal_orbs_count: 0, total_cards_count: 0, booster_count: 0 }
    }

    const totalCards = user.user_collections?.reduce((sum: number, col: any) => sum + (col.quantity || 0), 0) || 0
    const boosterCount = user.user_boosters?.length || 0

    return {
      vaal_orbs_count: user.vaal_orbs || 0,
      total_cards_count: totalCards,
      booster_count: boosterCount
    }
  } catch (error) {
    console.error('Error in getUserState:', error)
    return { vaal_orbs_count: 0, total_cards_count: 0, booster_count: 0 }
  }
}

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

async function sendTwitchMessage(message: string): Promise<{ success: boolean; error?: string }> {
  if (!BOT_WEBHOOK_URL) {
    return { success: false, error: 'BOT_WEBHOOK_URL not configured' }
  }

  if (!CHANNEL_NAME) {
    return { success: false, error: 'TWITCH_CHANNEL_NAME not configured' }
  }

  try {
    const response = await fetch(`${BOT_WEBHOOK_URL}/webhook/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, channel: CHANNEL_NAME })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`)
      return { success: false, error: `Bot webhook failed: ${errorText}` }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Failed to send message to bot: ${errorMessage}` }
  }
}

serve(async (req) => {
  const startTime = Date.now()
  let userId: string | null = null
  let stateBefore: any = null
  let stateAfter: any = null

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
      // Get or create user
      const { data: userIdResult, error: userError } = await supabase.rpc('get_or_create_user', {
        p_twitch_username: username
      })

      if (userError || !userIdResult) {
        console.error('❌ Error getting user:', userError)
        return new Response(JSON.stringify({ error: 'Failed to get user' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      userId = userIdResult

      // Get state before
      stateBefore = await getUserState(userId)

      // Update Vaal Orbs with error checking
      const { error: vaalError } = await supabase.rpc('update_vaal_orbs', {
        p_user_id: userId,
        p_amount: 5
      })

      if (vaalError) {
        console.error('❌ Error updating vaal orbs:', vaalError)
        
        // Log diagnostic with error
        await logRewardDiagnostic(
          username,
          userId,
          'vaal_orbs',
          stateBefore,
          stateBefore, // No change on error
          { reward_id: rewardId, vaal_orbs_added: 0, error: vaalError.message },
          'error',
          `Failed to update vaal orbs: ${vaalError.message}`
        )

        return new Response(JSON.stringify({ error: 'Failed to update vaal orbs' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Get state after
      stateAfter = await getUserState(userId)

      // Send Twitch message
      const messageResult = await sendTwitchMessage(`✨ @${username} reçoit 5 Vaal Orbs !`)

      // Log diagnostic
      await logRewardDiagnostic(
        username,
        userId,
        'vaal_orbs',
        stateBefore,
        stateAfter,
        {
          reward_id: rewardId,
          reward_type: 'vaal_orbs',
          vaal_orbs_added: 5,
          bot_message_sent: messageResult.success,
          bot_message_error: messageResult.error || undefined
        },
        messageResult.success ? 'ok' : 'warning',
        messageResult.error ? `Bot message failed: ${messageResult.error}` : undefined
      )

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
    const { data: userIdResult, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username
    })

    if (userError || !userIdResult) {
      console.error('❌ Error getting user:', userError)
      return new Response(JSON.stringify({ error: 'Failed to get user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    userId = userIdResult

    // Get state before
    stateBefore = await getUserState(userId)

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
      
      // Log diagnostic with error
      await logRewardDiagnostic(
        username,
        userId,
        'booster',
        stateBefore,
        stateBefore, // No change on error
        { reward_id: rewardId, error: boosterError.message },
        'error',
        `Failed to create booster: ${boosterError.message}`
      )

      return new Response(JSON.stringify({ error: 'Failed to create booster' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Process each card in the booster
    const boosterCards: any[] = []
    const lootNames: string[] = []
    const cardsReceived: Array<{ card_uid: number; card_name: string; is_foil: boolean }> = []
    let collectionErrors: string[] = []

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

      // Add to collection with error checking
      const { error: collectionError } = await supabase.rpc('add_card_to_collection', {
        p_user_id: userId,
        p_card_uid: card.uid,
        p_is_foil: foil
      })

      if (collectionError) {
        console.error(`❌ Error adding card ${card.uid} to collection:`, collectionError)
        collectionErrors.push(`Card ${card.uid}: ${collectionError.message}`)
      } else {
        cardsReceived.push({
          card_uid: card.uid,
          card_name: card.name,
          is_foil: foil
        })
      }

      lootNames.push(card.name + (foil ? " ✨" : ""))
    }

    // Insert all booster cards with error checking
    const { error: cardsInsertError } = await supabase
      .from('booster_cards')
      .insert(boosterCards)

    if (cardsInsertError) {
      console.error('❌ Error inserting booster cards:', cardsInsertError)
      // This is a critical error - booster exists but cards aren't linked
      // Log as error but don't fail completely
    }

    // Get state after
    stateAfter = await getUserState(userId)

    // Send Twitch message
    const messageResult = await sendTwitchMessage(`🎁 @${username}, tu as looté : ${lootNames.join(", ")} !`)

    // Determine validation status
    let validationStatus: 'ok' | 'warning' | 'error' = 'ok'
    const validationNotes: string[] = []

    if (cardsInsertError) {
      validationStatus = 'error'
      validationNotes.push(`Failed to insert booster_cards: ${cardsInsertError.message}`)
    }

    if (collectionErrors.length > 0) {
      validationStatus = validationStatus === 'error' ? 'error' : 'warning'
      validationNotes.push(`Collection errors: ${collectionErrors.join('; ')}`)
    }

    if (!messageResult.success) {
      validationStatus = validationStatus === 'error' ? 'error' : 'warning'
      validationNotes.push(`Bot message failed: ${messageResult.error}`)
    }

    // Log diagnostic
    await logRewardDiagnostic(
      username,
      userId,
      'booster',
      stateBefore,
      stateAfter,
      {
        reward_id: rewardId,
        reward_type: 'booster',
        cards_received: cardsReceived,
        booster_id: boosterRecord.id,
        bot_message_sent: messageResult.success,
        bot_message_error: messageResult.error || undefined
      },
      validationStatus,
      validationNotes.length > 0 ? validationNotes.join('; ') : undefined
    )

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
    
    // Log diagnostic with error if we have user info
    if (userId) {
      await logRewardDiagnostic(
        (req as any).username || 'unknown',
        userId,
        'booster', // Default to booster if we can't determine
        stateBefore || {},
        stateAfter || stateBefore || {},
        { error: error instanceof Error ? error.message : String(error) },
        'error',
        `Unhandled exception: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
