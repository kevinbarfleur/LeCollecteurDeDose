/**
 * Supabase Collection Service
 * 
 * Direct Supabase service for collections, replacing JSON file-based API
 * Provides functions compatible with the existing API format
 */

import { logInfo, logError } from './logger.service'
import type { Database } from '~/types/database'

/**
 * Get Supabase client for reads (uses anon key from Nuxt config)
 */
function getSupabaseRead() {
  const client = useSupabaseClient<Database>()
  const config = useRuntimeConfig()
  logInfo('Getting Supabase read client', { 
    service: 'SupabaseCollection', 
    hasUrl: !!config.public.supabase?.url,
    url: config.public.supabase?.url || 'missing'
  })
  return client
}

/**
 * Get Supabase client for writes (uses service key)
 * Server-side only - creates a new client with service role key
 */
async function getSupabaseWrite() {
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
  try {
    logInfo('🔵 [SUPABASE] Starting getAllUserCollections', { service: 'SupabaseCollection' })

    const supabase = getSupabaseRead()
    
    logInfo('🔵 [SUPABASE] Executing query: users with collections', { service: 'SupabaseCollection' })
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

    logInfo('🔵 [SUPABASE] Query completed', { 
      service: 'SupabaseCollection',
      hasError: !!usersError,
      error: usersError ? usersError.message : null,
      usersCount: users?.length || 0,
      rawData: users ? `Found ${users.length} users` : 'No users'
    })

    if (usersError) {
      logError('❌ [SUPABASE] Failed to fetch users', usersError, { 
        service: 'SupabaseCollection',
        errorCode: usersError.code,
        errorMessage: usersError.message,
        errorDetails: usersError.details,
        errorHint: usersError.hint
      })
      return {}
    }

    const result: Record<string, any> = {}

    logInfo('🔵 [SUPABASE] Processing users', { 
      service: 'SupabaseCollection',
      usersToProcess: users?.length || 0
    })

    for (const user of users || []) {
      const username = user.twitch_username
      result[username] = { vaalOrbs: user.vaal_orbs || 1 }
      
      const collectionCount = user.user_collections?.length || 0
      logInfo('🔵 [SUPABASE] Processing user', { 
        service: 'SupabaseCollection',
        username,
        vaalOrbs: user.vaal_orbs,
        collectionCount
      })

      for (const col of user.user_collections || []) {
        const card = col.unique_cards
        if (!card) {
          logError('⚠️ [SUPABASE] Missing card data', undefined, { 
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

    const totalCards = Object.values(result).reduce((sum: number, userData: any) => {
      return sum + Object.keys(userData).filter(k => k !== 'vaalOrbs').length
    }, 0)

    logInfo('✅ [SUPABASE] User collections fetched successfully', { 
      service: 'SupabaseCollection', 
      userCount: Object.keys(result).length,
      totalCards,
      usernames: Object.keys(result).slice(0, 5) // Log first 5 usernames
    })

    return result
  } catch (error) {
    logError('❌ [SUPABASE] Error fetching all user collections', error, { service: 'SupabaseCollection' })
    return {}
  }
}

/**
 * Get a specific user's collection
 * Returns format compatible with existing API: { [cardUid]: cardData, vaalOrbs: number }
 */
export async function getUserCollection(username: string): Promise<Record<string, any> | null> {
  try {
    logInfo('🔵 [SUPABASE] Starting getUserCollection', { service: 'SupabaseCollection', username })

    const supabase = getSupabaseRead()
    const searchUsername = username.toLowerCase()
    
    logInfo('🔵 [SUPABASE] Querying user', { 
      service: 'SupabaseCollection', 
      username,
      searchUsername
    })
    
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
      .eq('twitch_username', searchUsername)
      .maybeSingle()

    logInfo('🔵 [SUPABASE] User query completed', { 
      service: 'SupabaseCollection',
      username,
      hasError: !!userError,
      error: userError ? userError.message : null,
      found: !!user,
      userId: user?.id,
      vaalOrbs: user?.vaal_orbs,
      collectionCount: user?.user_collections?.length || 0
    })

    if (userError) {
      logError('❌ [SUPABASE] Error fetching user collection', userError, { 
        service: 'SupabaseCollection', 
        username,
        errorCode: userError.code,
        errorMessage: userError.message,
        errorDetails: userError.details
      })
      return { vaalOrbs: 0 }
    }

    if (!user) {
      logInfo('⚠️ [SUPABASE] User collection not found', { 
        service: 'SupabaseCollection', 
        username, 
        found: false 
      })
      return { vaalOrbs: 0 }
    }

    const result: Record<string, any> = { vaalOrbs: user.vaal_orbs || 1 }

    logInfo('🔵 [SUPABASE] Processing collections', { 
      service: 'SupabaseCollection',
      username,
      collectionCount: user.user_collections?.length || 0
    })

    for (const col of user.user_collections || []) {
      const card = col.unique_cards
      if (!card) {
        logError('⚠️ [SUPABASE] Missing card data in collection', undefined, { 
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

    const cardCount = Object.keys(result).filter(k => k !== 'vaalOrbs').length
    logInfo('✅ [SUPABASE] User collection fetched successfully', { 
      service: 'SupabaseCollection', 
      username, 
      cardCount,
      vaalOrbs: result.vaalOrbs,
      cardUids: Object.keys(result).filter(k => k !== 'vaalOrbs').slice(0, 5)
    })
    
    return result
  } catch (error) {
    logError('❌ [SUPABASE] Error fetching user collection', error, { service: 'SupabaseCollection', username })
    return null
  }
}

/**
 * Get a specific user's booster history
 * Returns format compatible with existing API: Array<{ booster: true, timestamp: string, content: Card[] }>
 */
export async function getUserCards(username: string): Promise<any[] | null> {
  try {
    logInfo('Fetching user cards', { service: 'SupabaseCollection', username })

    const supabase = getSupabaseRead()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('twitch_username', username.toLowerCase())
      .maybeSingle()

    if (userError) {
      logError('Error fetching user', userError, { service: 'SupabaseCollection', username })
      return []
    }

    if (!user) {
      logInfo('User not found', { service: 'SupabaseCollection', username, found: false })
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

    logInfo('User cards fetched', { service: 'SupabaseCollection', username, boosterCount: result.length })
    return result
  } catch (error) {
    logError('Error fetching user cards', error, { service: 'SupabaseCollection', username })
    return null
  }
}

/**
 * Get all unique cards (catalogue)
 * Returns format compatible with existing API: Array<Card>
 */
export async function getAllUniqueCards(): Promise<any[] | null> {
  try {
    logInfo('🔵 [SUPABASE] Starting getAllUniqueCards', { service: 'SupabaseCollection' })

    const supabase = getSupabaseRead()
    
    logInfo('🔵 [SUPABASE] Querying unique_cards table', { service: 'SupabaseCollection' })
    const { data: cards, error } = await supabase
      .from('unique_cards')
      .select('*')
      .order('uid', { ascending: true })

    logInfo('🔵 [SUPABASE] Unique cards query completed', { 
      service: 'SupabaseCollection',
      hasError: !!error,
      error: error ? error.message : null,
      cardsCount: cards?.length || 0
    })

    if (error) {
      logError('❌ [SUPABASE] Failed to fetch unique cards', error, { 
        service: 'SupabaseCollection',
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      })
      return null
    }

    const result = (cards || []).map(card => ({
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
    }))

    logInfo('✅ [SUPABASE] Unique cards fetched successfully', { 
      service: 'SupabaseCollection', 
      count: result.length,
      sampleCards: result.slice(0, 3).map(c => ({ uid: c.uid, name: c.name }))
    })
    
    return result
  } catch (error) {
    logError('❌ [SUPABASE] Error fetching unique cards', error, { service: 'SupabaseCollection' })
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
  try {
    const cardCount = Object.keys(collectionData).filter(k => k !== 'vaalOrbs').length
    logInfo('Updating user collection', { 
      service: 'SupabaseCollection', 
      username, 
      cardCount, 
      vaalOrbs: collectionData.vaalOrbs 
    })

    const supabase = await getSupabaseWrite()
    
    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username.toLowerCase()
    })

    if (userError) {
      logError('Failed to get/create user', userError, { service: 'SupabaseCollection', username })
      return false
    }

    // Update vaal orbs if provided
    if (collectionData.vaalOrbs !== undefined) {
      const currentVaalOrbs = collectionData.vaalOrbs
      // This is a bit tricky - we'd need to fetch current value first
      // For now, assume the value passed is the absolute value
      const { error: vaalError } = await supabase
        .from('users')
        .update({ vaal_orbs: collectionData.vaalOrbs })
        .eq('id', userId)

      if (vaalError) {
        logError('Failed to update vaal orbs', vaalError, { service: 'SupabaseCollection', username })
      }
    }

    // Update collections
    for (const [key, value] of Object.entries(collectionData)) {
      if (key === 'vaalOrbs') continue

      const cardUid = parseInt(key)
      if (isNaN(cardUid)) continue

      const card = value as any
      const normalCount = card.normal || 0
      const foilCount = card.foil || 0

      // Upsert collection entry
      const { error: colError } = await supabase
        .from('user_collections')
        .upsert({
          user_id: userId,
          card_uid: cardUid,
          quantity: card.quantity || (normalCount + foilCount),
          normal_count: normalCount,
          foil_count: foilCount
        }, { onConflict: 'user_id,card_uid' })

      if (colError) {
        logError('Failed to update collection entry', colError, { 
          service: 'SupabaseCollection', 
          username, 
          cardUid 
        })
      }
    }

    logInfo('User collection updated', { service: 'SupabaseCollection', username, success: true })
    return true
  } catch (error) {
    logError('Error updating user collection', error, { service: 'SupabaseCollection', username })
    return false
  }
}
