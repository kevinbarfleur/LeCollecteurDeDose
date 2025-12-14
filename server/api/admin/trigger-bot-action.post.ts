/**
 * Admin API: Trigger Bot Actions
 * 
 * Allows admins to manually trigger bot actions for testing:
 * - Open a booster for a user
 * - Add vaal orbs to a user
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { action, username } = body

  // Verify user session
  const { user } = await requireUserSession(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify admin status
  const supabase = createClient<Database>(
    config.public.supabase.url,
    config.supabaseServiceKey || config.supabaseKey || ''
  )

  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('is_active')
    .eq('twitch_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (adminError || !adminData) {
    throw createError({ statusCode: 403, message: 'Forbidden: Admin access required' })
  }

  if (!username || typeof username !== 'string') {
    throw createError({ statusCode: 400, message: 'Username required' })
  }

  if (!action || !['booster', 'vaal_orbs'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Invalid action. Must be "booster" or "vaal_orbs"' })
  }

  try {
    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username.toLowerCase()
    })

    if (userError || !userId) {
      throw createError({ 
        statusCode: 500, 
        message: `Failed to get/create user: ${userError?.message || 'Unknown error'}` 
      })
    }

    if (action === 'vaal_orbs') {
      // Add 5 vaal orbs
      const { error: vaalError } = await supabase.rpc('update_vaal_orbs', {
        p_user_id: userId,
        p_amount: 5
      })

      if (vaalError) {
        throw createError({ 
          statusCode: 500, 
          message: `Failed to update vaal orbs: ${vaalError.message}` 
        })
      }

      return { 
        ok: true, 
        action: 'vaal_orbs',
        username,
        message: `✨ ${username} reçoit 5 Vaal Orbs !`
      }
    }

    if (action === 'booster') {
      // Fetch all cards
      const { data: allCards, error: cardsError } = await supabase
        .from('unique_cards')
        .select('*')

      if (cardsError || !allCards || allCards.length === 0) {
        throw createError({ 
          statusCode: 500, 
          message: `Failed to fetch cards: ${cardsError?.message || 'No cards available'}` 
        })
      }

      // Create booster logic (same as Edge Function)
      function weightedRandom(items: any[]) {
        const total = items.reduce((s, i) => s + ((i.game_data as any)?.weight ?? 1), 0)
        let r = Math.random() * total
        for (const it of items) {
          r -= ((it.game_data as any)?.weight ?? 1)
          if (r <= 0) return it
        }
        return items[items.length - 1]
      }

      function weightedRandomTier(items: any[], tiers = ["T0", "T1", "T2"]) {
        const list = items.filter(i => tiers.includes(i.tier))
        if (!list.length) return null
        const boosted = list.map(i => ({
          ...i,
          weight: ((i.game_data as any)?.weight ?? 1) * (i.tier === "T2" ? 4 : 1)
        }))
        return weightedRandom(boosted)
      }

      function createBooster(cards: any[]) {
        const booster: any[] = []
        const guaranteed = weightedRandomTier(cards)
        if (guaranteed) booster.push(guaranteed)
        while (booster.length < 5) {
          booster.push(weightedRandom(cards))
        }
        return booster
      }

      function isFoil(card: any): boolean {
        const tier = card.tier ?? "T0"
        const chances: Record<string, number> = { T3: 0.10, T2: 0.08, T1: 0.05, T0: 0.01 }
        return Math.random() < (chances[tier] ?? 0.01)
      }

      // Create booster
      const booster = createBooster(allCards)
      const timestamp = new Date().toISOString()

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
        throw createError({ 
          statusCode: 500, 
          message: `Failed to create booster: ${boosterError.message}` 
        })
      }

      // Process each card in the booster
      const boosterCards: any[] = []
      const lootNames: string[] = []

      for (let i = 0; i < booster.length; i++) {
        const card = booster[i]
        const foil = isFoil(card)

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
        console.error('Error inserting booster cards:', cardsInsertError)
        // Don't fail completely, but log the error
      }

      return {
        ok: true,
        action: 'booster',
        username,
        cards: lootNames,
        message: `🎁 ${username}, tu as looté : ${lootNames.join(", ")} !`
      }
    }

    throw createError({ statusCode: 400, message: 'Invalid action' })
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Internal server error' 
    })
  }
})
