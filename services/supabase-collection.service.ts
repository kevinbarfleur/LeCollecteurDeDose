/**
 * Supabase Collection Service
 * 
 * Direct Supabase service for collections, replacing JSON file-based API
 * Provides functions compatible with the existing API format
 * Routes to mock service in mock mode, real Supabase otherwise
 */

import { logError } from './logger.service'
import type { Database } from '~/types/database'
import * as MockService from './supabase-mock.service'
import { sanitizeCardForCatalogue } from '~/utils/dataTransform'
import type { Card } from '~/types/card'

/**
 * Check if we're in mock mode
 */
async function isMockMode(): Promise<boolean> {
  if (import.meta.server) {
    // Server-side: check environment variable
    return process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true'
  }
  
  // Client-side: check data source store
  try {
    const { useDataSourceStore } = await import('~/stores/dataSource.store')
    const store = useDataSourceStore()
    const source = typeof store.source === 'string' ? store.source : (store.source as any).value
    return source === 'mock'
  } catch {
    // Fallback: assume Supabase mode if we can't determine
    return false
  }
}

/**
 * Get Supabase client for reads (uses anon key from Nuxt config)
 */
function getSupabaseRead() {
  return useSupabaseClient<Database>()
}

/**
 * Get Supabase client for writes
 * Server-side: uses service key for elevated permissions
 * Client-side: uses anon key (relies on RLS policies and SECURITY DEFINER functions)
 */
async function getSupabaseWrite() {
  // On client-side, use the public Supabase client (anon key)
  // The RPC functions use SECURITY DEFINER, so they'll work with anon key
  if (import.meta.client) {
    return useSupabaseClient<Database>()
  }
  
  // On server-side, use service key for elevated permissions
  const config = useRuntimeConfig()
  const { createClient } = await import('@supabase/supabase-js')
  return createClient<Database>(
    config.public.supabase.url,
    config.supabaseServiceKey || config.supabaseKey || ''
  )
}

/**
 * Get all user collections
 * Returns format compatible with existing API: { [username]: { [cardUid]: cardData, vaalOrbs: number } }
 */
export async function getAllUserCollections(): Promise<Record<string, any>> {
  if (await isMockMode()) {
    return MockService.getAllUserCollections()
  }
  try {
    const supabase = getSupabaseRead()
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        twitch_username,
        vaal_orbs,
        user_collections (
          card_uid,
          quantity,
          normal_count,
          foil_count,
          unique_cards (*)
        )
      `)

    if (usersError) {
      logError('Failed to fetch users', usersError, { 
        service: 'SupabaseCollection',
        errorCode: usersError.code,
        errorMessage: usersError.message,
        errorDetails: usersError.details,
        errorHint: usersError.hint
      })
      return {}
    }

    const result: Record<string, any> = {}

    for (const user of users || []) {
      const username = user.twitch_username
      result[username] = { vaalOrbs: user.vaal_orbs ?? 0 }

      for (const col of user.user_collections || []) {
        const card = col.unique_cards
        if (!card) {
          logError('Missing card data', undefined, { 
            service: 'SupabaseCollection',
            username,
            cardUid: col.card_uid
          })
          continue
        }
        
        result[username][col.card_uid] = {
          uid: col.card_uid,
          id: card.id,
          name: card.name,
          itemClass: card.item_class,
          rarity: card.rarity,
          tier: card.tier,
          flavourText: card.flavour_text,
          wikiUrl: card.wiki_url,
          gameData: card.game_data,
          relevanceScore: card.relevance_score,
          quantity: col.quantity,
          normal: col.normal_count,
          foil: col.foil_count
        }
      }
    }

    return result
  } catch (error) {
    logError('Error fetching all user collections', error, { service: 'SupabaseCollection' })
    return {}
  }
}

/**
 * Get a specific user's collection
 * Returns format compatible with existing API: { [cardUid]: cardData, vaalOrbs: number }
 */
export async function getUserCollection(username: string): Promise<Record<string, any> | null> {
  if (await isMockMode()) {
    return MockService.getUserCollection(username)
  }
  try {
    const supabase = getSupabaseRead()
    const searchUsername = username.toLowerCase()
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        vaal_orbs,
        user_collections (
          card_uid,
          quantity,
          normal_count,
          foil_count,
          unique_cards (*)
        )
      `)
      .ilike('twitch_username', searchUsername)
      .maybeSingle()

    if (userError) {
      logError('Error fetching user collection', userError, { 
        service: 'SupabaseCollection', 
        username,
        errorCode: userError.code,
        errorMessage: userError.message,
        errorDetails: userError.details
      })
      return { vaalOrbs: 0 }
    }

    if (!user) {
      return { vaalOrbs: 0 }
    }

    const result: Record<string, any> = { vaalOrbs: user.vaal_orbs ?? 0 }

    for (const col of user.user_collections || []) {
      const card = col.unique_cards
      if (!card) {
        logError('Missing card data in collection', undefined, { 
          service: 'SupabaseCollection',
          username,
          cardUid: col.card_uid
        })
        continue
      }
      
      result[col.card_uid] = {
        uid: col.card_uid,
        id: card.id,
        name: card.name,
        itemClass: card.item_class,
        rarity: card.rarity,
        tier: card.tier,
        flavourText: card.flavour_text,
        wikiUrl: card.wiki_url,
        gameData: card.game_data,
        relevanceScore: card.relevance_score,
        quantity: col.quantity,
        normal: col.normal_count,
        foil: col.foil_count
      }
    }
    
    return result
  } catch (error) {
    logError('Error fetching user collection', error, { service: 'SupabaseCollection', username })
    return null
  }
}

/**
 * Get a specific user's booster history
 * Returns format compatible with existing API: Array<{ booster: true, timestamp: string, content: Card[] }>
 */
export async function getUserCards(username: string): Promise<any[] | null> {
  if (await isMockMode()) {
    return MockService.getUserCards(username)
  }
  try {
    const supabase = getSupabaseRead()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .ilike('twitch_username', username.toLowerCase())
      .maybeSingle()

    if (userError) {
      logError('Error fetching user', userError, { service: 'SupabaseCollection', username })
      return []
    }

    if (!user) {
      return []
    }

    const { data: boosters, error: boostersError } = await supabase
      .from('user_boosters')
      .select(`
        id,
        opened_at,
        booster_cards (
          position,
          is_foil,
          unique_cards (*)
        )
      `)
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })

    if (boostersError) {
      logError('Failed to fetch boosters', boostersError, { service: 'SupabaseCollection', username })
      return []
    }

    const result = (boosters || []).map(booster => {
      const cards = (booster.booster_cards || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((bc: any) => {
          const card = bc.unique_cards
          return {
            uid: card.uid,
            id: card.id,
            name: card.name,
            itemClass: card.item_class,
            rarity: card.rarity,
            tier: card.tier,
            flavourText: card.flavour_text,
            wikiUrl: card.wiki_url,
            gameData: card.game_data,
            relevanceScore: card.relevance_score,
            foil: bc.is_foil
          }
        })

      return {
        booster: true,
        timestamp: booster.opened_at,
        content: cards
      }
    })

    return result
  } catch (error) {
    logError('Error fetching user cards', error, { service: 'SupabaseCollection', username })
    return null
  }
}

/**
 * Get all unique cards (catalogue)
 * Returns format compatible with existing API: Array<Card>
 * 
 * @param userId - Optional user ID to filter owned cards. If provided, non-owned cards will have limited information (no name, img, wikiUrl)
 */
export async function getAllUniqueCards(userId?: string): Promise<any[] | null> {
  if (await isMockMode()) {
    return MockService.getAllUniqueCards()
  }
  try {
    const supabase = getSupabaseRead()
    
    // Fetch all cards
    const { data: cards, error } = await supabase
      .from('unique_cards')
      .select('*')
      .order('uid', { ascending: true })

    if (error) {
      logError('Failed to fetch unique cards', error, { 
        service: 'SupabaseCollection',
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      })
      return null
    }

    // If userId is provided (Twitch user ID), fetch owned cards to determine which ones to limit
    let ownedCardUids: Set<number> = new Set()
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('twitch_user_id', userId)
        .maybeSingle()

      if (!userError && user) {
        const { data: userCollections, error: collectionsError } = await supabase
          .from('user_collections')
          .select('card_uid')
          .eq('user_id', user.id)

        if (!collectionsError && userCollections) {
          ownedCardUids = new Set(userCollections.map(col => col.card_uid))
        }
      }
    }

    // Transform cards and apply sanitization for non-owned cards
    const result = (cards || []).map(card => {
      const transformedCard: Card = {
        uid: card.uid,
        id: card.id,
        name: card.name,
        itemClass: card.item_class,
        rarity: card.rarity,
        tier: card.tier,
        flavourText: card.flavour_text,
        wikiUrl: card.wiki_url,
        gameData: card.game_data,
        relevanceScore: card.relevance_score
      }

      // If userId is provided, sanitize non-owned cards
      if (userId) {
        const isOwned = ownedCardUids.has(card.uid)
        return sanitizeCardForCatalogue(transformedCard, isOwned)
      }

      return transformedCard
    })
    
    return result
  } catch (error) {
    logError('Error fetching unique cards', error, { service: 'SupabaseCollection' })
    return null
  }
}

/**
 * Update a user's collection
 * Accepts format: { [cardUid]: cardData, vaalOrbs: number }
 */
export async function updateUserCollection(
  username: string,
  collectionData: Record<string, any>
): Promise<boolean> {
  if (await isMockMode()) {
    return MockService.updateUserCollection(username, collectionData)
  }
  try {
    console.log(`[SupabaseCollection] updateUserCollection: Starting update for ${username}`);
    const supabase = await getSupabaseWrite()
    
    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username.toLowerCase()
    })

    if (userError) {
      console.error(`[SupabaseCollection] updateUserCollection: Failed to get/create user:`, userError);
      logError('Failed to get/create user', userError, { service: 'SupabaseCollection', username })
      return false
    }
    
    console.log(`[SupabaseCollection] updateUserCollection: Got user UUID ${userId}`);

    // Update vaal orbs if provided (use RPC function to bypass RLS)
    if (collectionData.vaalOrbs !== undefined) {
      console.log(`[SupabaseCollection] updateUserCollection: Setting vaal_orbs to ${collectionData.vaalOrbs}`);
      const { error: vaalError } = await supabase.rpc('set_vaal_orbs', {
        p_user_id: userId,
        p_count: collectionData.vaalOrbs
      })

      if (vaalError) {
        console.error(`[SupabaseCollection] updateUserCollection: Failed to set vaal_orbs:`, vaalError);
        logError('Failed to update vaal orbs', vaalError, { service: 'SupabaseCollection', username })
        // Don't return false here - continue with card updates
      } else {
        console.log(`[SupabaseCollection] updateUserCollection: Successfully set vaal_orbs`);
      }
    }

    // Update collections
    const cardEntries = Object.entries(collectionData).filter(([key]) => key !== 'vaalOrbs');
    console.log(`[SupabaseCollection] updateUserCollection: Updating ${cardEntries.length} card entries`);
    
    for (const [key, value] of cardEntries) {
      const cardUid = parseInt(key)
      if (isNaN(cardUid)) {
        console.warn(`[SupabaseCollection] updateUserCollection: Skipping invalid card UID: ${key}`);
        continue
      }

      const card = value as any
      const normalCount = card.normal || 0
      const foilCount = card.foil || 0

      console.log(`[SupabaseCollection] updateUserCollection: Setting card ${cardUid} counts - normal: ${normalCount}, foil: ${foilCount}`);

      // Use RPC function to set absolute counts (bypasses RLS via SECURITY DEFINER)
      const { error: colError } = await supabase.rpc('set_card_collection_counts', {
        p_user_id: userId,
        p_card_uid: cardUid,
        p_normal_count: normalCount,
        p_foil_count: foilCount
      })

      if (colError) {
        console.error(`[SupabaseCollection] updateUserCollection: Failed to set card ${cardUid} counts:`, colError);
        logError('Failed to update collection entry', colError, { 
          service: 'SupabaseCollection', 
          username, 
          cardUid 
        })
        // Don't return false here - continue with other cards
      } else {
        console.log(`[SupabaseCollection] updateUserCollection: Successfully set card ${cardUid} counts`);
      }
    }

    console.log(`[SupabaseCollection] updateUserCollection: Update completed successfully for ${username}`);
    return true
  } catch (error) {
    logError('Error updating user collection', error, { service: 'SupabaseCollection', username })
    return false
  }
}

/**
 * Get active buffs for a user
 * @param username - Twitch username (will be converted to Supabase user UUID)
 * @returns Object with buffs or null on error
 */
export async function getUserBuffs(username: string): Promise<{ atlas_influence?: { type: string; data: { foil_boost: number } } } | null> {
  if (await isMockMode()) {
    return null // No buffs in mock mode
  }

  try {
    const supabase = getSupabaseRead()

    // Get user UUID from username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .ilike('twitch_username', username)
      .maybeSingle()

    if (userError || !user) {
      logError('Failed to find user for buffs', userError, { service: 'SupabaseCollection', username })
      return null
    }

    // Get active buffs
    const { data: buffsResult, error: buffsError } = await supabase.rpc('get_user_buffs', {
      p_user_id: user.id
    })

    if (buffsError) {
      logError('Failed to get user buffs', buffsError, { service: 'SupabaseCollection', username })
      return null
    }

    return buffsResult?.buffs || null
  } catch (error) {
    logError('Error getting user buffs', error, { service: 'SupabaseCollection', username })
    return null
  }
}

/**
 * Consume a single-use buff for a user
 * @param username - Twitch username (will be converted to Supabase user UUID)
 * @param buffType - Type of buff to consume (e.g., 'atlas_influence')
 * @returns true if buff was consumed, false otherwise
 */
export async function consumeUserBuff(username: string, buffType: string): Promise<boolean> {
  if (await isMockMode()) {
    return true // Pretend success in mock mode
  }

  try {
    const supabase = await getSupabaseWrite()

    // Get user UUID from username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .ilike('twitch_username', username)
      .maybeSingle()

    if (userError || !user) {
      logError('Failed to find user for buff consumption', userError, { service: 'SupabaseCollection', username })
      return false
    }

    // Consume the buff
    const { data: result, error: consumeError } = await supabase.rpc('consume_buff', {
      p_user_id: user.id,
      p_buff_type: buffType
    })

    if (consumeError) {
      logError('Failed to consume buff', consumeError, { service: 'SupabaseCollection', username, buffType })
      return false
    }

    console.log(`[SupabaseCollection] consumeUserBuff: ${buffType} consumed for ${username}:`, result)
    return result?.consumed || false
  } catch (error) {
    logError('Error consuming user buff', error, { service: 'SupabaseCollection', username, buffType })
    return false
  }
}

/**
 * Form data interface for card editing
 */
export interface CardFormData {
  uid?: number | null
  id: string
  name: string
  itemClass: string
  rarity: string
  tier: string
  flavourText: string | null
  wikiUrl: string | null
  gameData: {
    weight: number
    img: string
    foilImg?: string
  }
  relevanceScore: number
}

/**
 * Upsert a unique card (create or update)
 * @param cardData - Card data to create or update
 * @returns The created/updated card or null on error
 */
export async function upsertUniqueCard(cardData: CardFormData): Promise<Card | null> {
  if (await isMockMode()) {
    logError('upsertUniqueCard not supported in mock mode', undefined, { service: 'SupabaseCollection' })
    return null
  }

  try {
    const supabase = await getSupabaseWrite()

    const { data, error } = await supabase.rpc('upsert_unique_card', {
      p_uid: cardData.uid ?? null,
      p_id: cardData.id,
      p_name: cardData.name,
      p_item_class: cardData.itemClass,
      p_rarity: cardData.rarity,
      p_tier: cardData.tier,
      p_flavour_text: cardData.flavourText,
      p_wiki_url: cardData.wikiUrl,
      p_game_data: cardData.gameData,
      p_relevance_score: cardData.relevanceScore
    })

    if (error) {
      logError('Failed to upsert card', error, {
        service: 'SupabaseCollection',
        cardId: cardData.id,
        errorCode: error.code,
        errorMessage: error.message
      })
      return null
    }

    // Transform DB result to Card type
    return {
      uid: data.uid,
      id: data.id,
      name: data.name,
      itemClass: data.item_class,
      rarity: data.rarity as Card['rarity'],
      tier: data.tier as Card['tier'],
      flavourText: data.flavour_text,
      wikiUrl: data.wiki_url || '',
      gameData: data.game_data as Card['gameData'],
      relevanceScore: data.relevance_score
    }
  } catch (error) {
    logError('Error upserting card', error, { service: 'SupabaseCollection', cardId: cardData.id })
    return null
  }
}

// ============================================================================
// Altar Outcome - Atomic sync function
// ============================================================================

/**
 * Payload for atomic altar outcome operation
 */
export interface AltarOutcomePayload {
  username: string
  cardUpdates: Array<{
    cardUid: number
    normalCount: number
    foilCount: number
  }>
  vaalOrbsDelta: number
  consumeAtlasInfluence?: boolean
}

/**
 * Result from atomic altar outcome operation
 */
export interface AltarOutcomeResult {
  success: boolean
  userId?: string
  vaalOrbs?: number
  vaalOrbsBefore?: number
  atlasInfluenceConsumed?: boolean
  cardsUpdated?: number
  error?: string
  errorCode?: string
}

/**
 * Apply altar outcome atomically in a single transaction
 * Replaces the sequential: get_or_create_user + set_vaal_orbs + set_card_collection_counts loop + consume_buff
 * This dramatically reduces latency from ~5-7 calls to exactly 1 call
 *
 * @param payload - All data for the altar outcome
 * @returns Result with success status and new vaal orbs count
 */
export async function applyAltarOutcome(payload: AltarOutcomePayload): Promise<AltarOutcomeResult> {
  if (await isMockMode()) {
    // In mock mode, simulate success
    console.log('[SupabaseCollection] applyAltarOutcome: Mock mode, simulating success')
    return {
      success: true,
      vaalOrbs: 0,
      atlasInfluenceConsumed: payload.consumeAtlasInfluence || false,
      cardsUpdated: payload.cardUpdates.length,
    }
  }

  try {
    console.log(`[SupabaseCollection] applyAltarOutcome: Starting atomic update for ${payload.username}`)
    console.log(`[SupabaseCollection] applyAltarOutcome: ${payload.cardUpdates.length} card updates, vaal delta: ${payload.vaalOrbsDelta}`)

    const supabase = await getSupabaseWrite()

    // Transform card updates to PostgreSQL JSONB format
    const cardUpdatesJsonb = payload.cardUpdates.map(update => ({
      card_uid: update.cardUid,
      normal_count: update.normalCount,
      foil_count: update.foilCount,
    }))

    const { data, error } = await supabase.rpc('apply_altar_outcome', {
      p_twitch_username: payload.username.toLowerCase(),
      p_card_updates: cardUpdatesJsonb,
      p_vaal_orbs_delta: payload.vaalOrbsDelta,
      p_consume_atlas_influence: payload.consumeAtlasInfluence || false,
    })

    if (error) {
      console.error('[SupabaseCollection] applyAltarOutcome: RPC error:', error)
      logError('Failed to apply altar outcome', error, {
        service: 'SupabaseCollection',
        username: payload.username,
        errorCode: error.code,
        errorMessage: error.message,
      })
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      }
    }

    // Check if the RPC returned an error in the response
    if (data && !data.success) {
      console.error('[SupabaseCollection] applyAltarOutcome: RPC returned error:', data)
      return {
        success: false,
        error: data.error || 'Unknown error',
        errorCode: data.error_code,
      }
    }

    console.log('[SupabaseCollection] applyAltarOutcome: Success:', data)

    return {
      success: data?.success || false,
      userId: data?.user_id,
      vaalOrbs: data?.vaal_orbs,
      vaalOrbsBefore: data?.vaal_orbs_before,
      atlasInfluenceConsumed: data?.atlas_influence_consumed,
      cardsUpdated: data?.cards_updated,
    }
  } catch (error) {
    logError('Error applying altar outcome', error, {
      service: 'SupabaseCollection',
      username: payload.username,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
