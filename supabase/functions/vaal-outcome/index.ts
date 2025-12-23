// Edge Function: Vaal Outcome
// Calculates and applies Vaal Orb outcomes server-side for reliability and security
// This replaces client-side outcome calculation to prevent manipulation and ensure consistency

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================================
// Types
// ============================================================================

type VaalOutcome = 'nothing' | 'foil' | 'destroyed' | 'transform' | 'duplicate'
type FoilVaalOutcome = 'synthesised' | 'lose_foil' | 'destroyed'
type AnyVaalOutcome = VaalOutcome | FoilVaalOutcome
type CardTier = 'T0' | 'T1' | 'T2' | 'T3'

interface VaalOutcomeRequest {
  username: string
  cardUid: number
  cardTier: CardTier
  isFoil: boolean
}

interface CardData {
  uid: number
  id: string
  name: string
  tier: string
  game_data: {
    img?: string
    foilImg?: string
    weight?: number
  }
}

interface VaalOutcomeResponse {
  success: boolean
  outcome?: AnyVaalOutcome
  newCard?: CardData
  vaalOrbs?: number
  atlasInfluenceConsumed?: boolean
  isFoilOutcome?: boolean  // True if this was a foil card outcome
  error?: string
  errorCode?: 'INSUFFICIENT_ORBS' | 'CARD_NOT_FOUND' | 'INVALID_USER' | 'INTERNAL_ERROR'
}

// ============================================================================
// Outcome Probabilities (same as client-side for consistency)
// ============================================================================

const VAAL_OUTCOMES: Record<VaalOutcome, number> = {
  nothing: 40,
  foil: 20,
  destroyed: 15,
  transform: 15,
  duplicate: 10,
}

// Foil Vaal outcomes: 10% synthesised, 50% lose foil, 40% destroyed
const FOIL_VAAL_OUTCOMES: Record<FoilVaalOutcome, number> = {
  synthesised: 10,  // Rarest - card becomes synthesised
  lose_foil: 50,    // Most common - card loses foil, becomes normal
  destroyed: 40,    // Risky - card is destroyed
}

// ============================================================================
// Outcome Calculation
// ============================================================================

function rollVaalOutcome(foilBoost: number = 0): VaalOutcome {
  const weights = { ...VAAL_OUTCOMES }

  // Apply foil boost (convert decimal to weight: 0.10 = +10 weight)
  if (foilBoost > 0) {
    weights.foil = weights.foil + (foilBoost * 100)
    console.log(`[VaalOutcome] Foil boost applied: +${Math.round(foilBoost * 100)} weight`)
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (const [outcome, weight] of Object.entries(weights)) {
    random -= weight
    if (random <= 0) {
      return outcome as VaalOutcome
    }
  }

  return 'nothing' // Fallback
}

/**
 * Roll outcome for a FOIL card
 * 10% synthesised, 50% lose foil, 40% destroyed
 */
function rollFoilVaalOutcome(): FoilVaalOutcome {
  const totalWeight = Object.values(FOIL_VAAL_OUTCOMES).reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (const [outcome, weight] of Object.entries(FOIL_VAAL_OUTCOMES)) {
    random -= weight
    if (random <= 0) {
      return outcome as FoilVaalOutcome
    }
  }

  return 'lose_foil' // Fallback
}

// ============================================================================
// Weighted Random Selection (for transform outcome)
// ============================================================================

function weightedRandom(cards: CardData[]): CardData {
  const total = cards.reduce((sum, card) => sum + (card.game_data?.weight ?? 1), 0)
  let random = Math.random() * total

  for (const card of cards) {
    random -= (card.game_data?.weight ?? 1)
    if (random <= 0) return card
  }

  return cards[cards.length - 1]
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // CORS headers for browser requests
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const body: VaalOutcomeRequest = await req.json()
    const { username, cardUid, cardTier, isFoil } = body

    console.log(`[VaalOutcome] Processing for ${username}, card UID ${cardUid}, tier ${cardTier}`)

    // ========================================================================
    // Validation
    // ========================================================================

    if (!username || typeof username !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Username is required',
        errorCode: 'INVALID_USER',
      } as VaalOutcomeResponse), { status: 400, headers })
    }

    if (!cardUid || typeof cardUid !== 'number') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid card UID is required',
        errorCode: 'CARD_NOT_FOUND',
      } as VaalOutcomeResponse), { status: 400, headers })
    }

    // Note: Foil cards can now be Vaal'd with different outcomes:
    // 10% synthesised, 50% lose foil, 40% destroyed

    // ========================================================================
    // Step 1: Get user and verify they have orbs
    // ========================================================================

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, vaal_orbs, temporary_buffs')
      .eq('twitch_username', username.toLowerCase())
      .single()

    if (userError || !user) {
      console.error('[VaalOutcome] User not found:', userError)
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found',
        errorCode: 'INVALID_USER',
      } as VaalOutcomeResponse), { status: 404, headers })
    }

    if ((user.vaal_orbs ?? 0) < 1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not enough Vaal Orbs',
        errorCode: 'INSUFFICIENT_ORBS',
      } as VaalOutcomeResponse), { status: 400, headers })
    }

    // ========================================================================
    // Step 2: Verify user owns the card
    // ========================================================================

    const { data: collection, error: collectionError } = await supabase
      .from('user_collections')
      .select('normal_count, foil_count')
      .eq('user_id', user.id)
      .eq('card_uid', cardUid)
      .single()

    if (collectionError || !collection) {
      console.error('[VaalOutcome] Card not in collection:', collectionError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Card not found in collection',
        errorCode: 'CARD_NOT_FOUND',
      } as VaalOutcomeResponse), { status: 404, headers })
    }

    // Verify they have at least one copy of the appropriate type
    const hasNormalCopy = (collection.normal_count ?? 0) >= 1
    const hasFoilCopy = (collection.foil_count ?? 0) >= 1

    // If trying to vaal a foil, check foil count; otherwise check normal count
    if (isFoil && !hasFoilCopy) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No foil copies available',
        errorCode: 'CARD_NOT_FOUND',
      } as VaalOutcomeResponse), { status: 400, headers })
    }

    if (!isFoil && !hasNormalCopy) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No normal copies available',
        errorCode: 'CARD_NOT_FOUND',
      } as VaalOutcomeResponse), { status: 400, headers })
    }

    // ========================================================================
    // Step 3: Check Atlas Influence buff
    // ========================================================================

    const buffs = user.temporary_buffs ?? {}
    const atlasInfluence = buffs.atlas_influence
    const foilBoost = atlasInfluence?.foilBoost ?? 0
    const hasAtlasInfluence = foilBoost > 0

    // ========================================================================
    // Step 4: Roll the outcome (different outcomes for foil vs normal cards)
    // ========================================================================

    let outcome: AnyVaalOutcome
    const isFoilOutcome = isFoil

    if (isFoil) {
      // Foil cards have special outcomes: 10% synthesised, 50% lose foil, 40% destroyed
      outcome = rollFoilVaalOutcome()
      console.log(`[VaalOutcome] Rolled FOIL outcome: ${outcome}`)
    } else {
      // Normal cards have standard outcomes
      outcome = rollVaalOutcome(foilBoost)
      console.log(`[VaalOutcome] Rolled outcome: ${outcome}${hasAtlasInfluence ? ' (with Atlas Influence)' : ''}`)
    }

    // ========================================================================
    // Step 5: Prepare card updates based on outcome
    // ========================================================================

    let cardUpdates: Array<{ card_uid: number; normal_count: number; foil_count: number; synthesised_count?: number }> = []
    let newCard: CardData | undefined = undefined

    const currentNormal = collection.normal_count ?? 0
    const currentFoil = collection.foil_count ?? 0

    switch (outcome) {
      case 'nothing':
        // No card changes
        break

      case 'foil':
        // Normal -1, Foil +1
        cardUpdates.push({
          card_uid: cardUid,
          normal_count: currentNormal - 1,
          foil_count: currentFoil + 1,
        })
        break

      case 'destroyed':
        // Remove card (normal or foil depending on isFoil flag)
        if (isFoil) {
          // Foil -1
          cardUpdates.push({
            card_uid: cardUid,
            normal_count: currentNormal,
            foil_count: currentFoil - 1,
          })
        } else {
          // Normal -1
          cardUpdates.push({
            card_uid: cardUid,
            normal_count: currentNormal - 1,
            foil_count: currentFoil,
          })
        }
        break

      // ===== FOIL CARD OUTCOMES =====

      case 'synthesised':
        // Foil -1, Synthesised +1
        // Need to get current synthesised count first
        const { data: currentCollection } = await supabase
          .from('user_collections')
          .select('synthesised_count')
          .eq('user_id', user.id)
          .eq('card_uid', cardUid)
          .single()

        const currentSynthesised = currentCollection?.synthesised_count ?? 0

        cardUpdates.push({
          card_uid: cardUid,
          normal_count: currentNormal,
          foil_count: currentFoil - 1,
          synthesised_count: currentSynthesised + 1,
        })
        console.log(`[VaalOutcome] Synthesised! Card ${cardUid} is now synthesised`)
        break

      case 'lose_foil':
        // Foil -1, Normal +1
        cardUpdates.push({
          card_uid: cardUid,
          normal_count: currentNormal + 1,
          foil_count: currentFoil - 1,
        })
        console.log(`[VaalOutcome] Lost foil! Card ${cardUid} is now normal`)
        break

      case 'transform':
        // Get a random card of the same tier (excluding current card)
        const { data: sameTierCards, error: cardsError } = await supabase
          .from('unique_cards')
          .select('uid, id, name, tier, game_data')
          .eq('tier', cardTier)
          .neq('uid', cardUid)

        if (cardsError || !sameTierCards || sameTierCards.length === 0) {
          console.error('[VaalOutcome] No same-tier cards found:', cardsError)
          // Fallback to 'nothing' if no cards available
          break
        }

        newCard = weightedRandom(sameTierCards as CardData[])
        console.log(`[VaalOutcome] Transform: ${cardUid} -> ${newCard.uid} (${newCard.name})`)

        // Remove old card
        cardUpdates.push({
          card_uid: cardUid,
          normal_count: currentNormal - 1,
          foil_count: currentFoil,
        })

        // Add new card (need to get current count first)
        const { data: newCardCollection } = await supabase
          .from('user_collections')
          .select('normal_count, foil_count')
          .eq('user_id', user.id)
          .eq('card_uid', newCard.uid)
          .single()

        const newNormalCount = (newCardCollection?.normal_count ?? 0) + 1
        const newFoilCount = newCardCollection?.foil_count ?? 0

        cardUpdates.push({
          card_uid: newCard.uid,
          normal_count: newNormalCount,
          foil_count: newFoilCount,
        })
        break

      case 'duplicate':
        // Normal +1 (keep existing, add copy)
        cardUpdates.push({
          card_uid: cardUid,
          normal_count: currentNormal + 1,
          foil_count: currentFoil,
        })
        break
    }

    // ========================================================================
    // Step 6: Apply changes atomically via RPC
    // ========================================================================

    const { data: result, error: rpcError } = await supabase.rpc('apply_altar_outcome', {
      p_twitch_username: username.toLowerCase(),
      p_card_updates: cardUpdates,
      p_vaal_orbs_delta: -1, // Always consume 1 orb
      p_consume_atlas_influence: hasAtlasInfluence,
    })

    if (rpcError || !result?.success) {
      console.error('[VaalOutcome] RPC failed:', rpcError, result)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to apply outcome',
        errorCode: 'INTERNAL_ERROR',
      } as VaalOutcomeResponse), { status: 500, headers })
    }

    // ========================================================================
    // Step 7: Log activity (handled by frontend with proper card names and avatar)
    // ========================================================================
    // Note: Activity logging is done by the frontend (useReplayRecorder.ts)
    // which has access to the proper card_id (name), user_avatar, and replay_id

    // ========================================================================
    // Return success response
    // ========================================================================

    const response: VaalOutcomeResponse = {
      success: true,
      outcome,
      vaalOrbs: result.vaal_orbs,
      atlasInfluenceConsumed: result.atlas_influence_consumed ?? false,
      isFoilOutcome,
    }

    if (newCard) {
      response.newCard = newCard
    }

    console.log(`[VaalOutcome] Success: ${outcome} for ${username}`)

    return new Response(JSON.stringify(response), { status: 200, headers })

  } catch (error) {
    console.error('[VaalOutcome] Unhandled error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    } as VaalOutcomeResponse), { status: 500, headers })
  }
})
