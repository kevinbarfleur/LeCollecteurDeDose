/**
 * Data API Server Route
 * 
 * Direct Supabase implementation replacing external bot API server
 * Provides compatible endpoints for collections and cards
 */

import {
  getAllUserCollections,
  getUserCollection,
  getUserCards,
  getAllUniqueCards,
  updateUserCollection
} from '~/services/supabase-collection.service'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.dataApiKey || ''
  
  // Get the path from the request (catch-all route parameter)
  const pathParam = getRouterParam(event, '_')
  const path = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '')
  const method = getMethod(event)
  
  try {
    // GET /api/userCollection - Get all user collections
    if (path === 'userCollection' && method === 'GET') {
      const collections = await getAllUserCollections()
      return collections
    }
    
    // GET /api/userCollection/:user - Get specific user collection
    if (path.startsWith('userCollection/') && method === 'GET') {
      const username = path.split('/')[1]
      if (!username) {
        throw createError({ statusCode: 400, message: 'Username required' })
      }
      const collection = await getUserCollection(username)
      return collection || { vaalOrbs: 0 }
    }
    
    // GET /api/usercards/:user - Get user's booster history
    if (path.startsWith('usercards/') && method === 'GET') {
      const username = path.split('/')[1]
      if (!username) {
        throw createError({ statusCode: 400, message: 'Username required' })
      }
      const cards = await getUserCards(username)
      return cards || []
    }
    
    // GET /api/uniques - Get all unique cards (catalogue)
    if (path === 'uniques' && method === 'GET') {
      const uniques = await getAllUniqueCards()
      return uniques || []
    }
    
    // POST /api/userCollection/update - Update user collection (requires API key)
    if (path === 'userCollection/update' && method === 'POST') {
      // Verify API key
      const providedKey = getHeader(event, 'x-api-key')
      if (!apiKey || providedKey !== apiKey) {
        throw createError({ statusCode: 403, message: 'Invalid API key' })
      }
      
      const body = await readBody(event)
      if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, message: 'Invalid request body' })
      }
      
      // Body format: { [username]: { [cardUid]: cardData, vaalOrbs: number } }
      const entries = Object.entries(body)
      const results: Record<string, boolean> = {}
      
      for (const [username, collectionData] of entries) {
        const success = await updateUserCollection(username, collectionData as Record<string, any>)
        results[username] = success
      }
      
      return { ok: true, results }
  }
  
    // POST /api/usercards/update - Update user cards (requires API key)
    if (path === 'usercards/update' && method === 'POST') {
      // Verify API key
      const providedKey = getHeader(event, 'x-api-key')
      if (!apiKey || providedKey !== apiKey) {
        throw createError({ statusCode: 403, message: 'Invalid API key' })
      }
      
      // This endpoint is less critical - booster creation is handled by Edge Functions
      // But we can implement it if needed for manual updates
      return { ok: true, message: 'Use Edge Functions for booster creation' }
    }
    
    // POST /api/uniques/update - Update unique cards (requires API key)
    if (path === 'uniques/update' && method === 'POST') {
      // Verify API key
      const providedKey = getHeader(event, 'x-api-key')
      if (!apiKey || providedKey !== apiKey) {
        throw createError({ statusCode: 403, message: 'Invalid API key' })
      }
      
      const body = await readBody(event)
      if (!Array.isArray(body)) {
        throw createError({ statusCode: 400, message: 'Expected array of cards' })
      }
      
      // Bulk update unique cards
      const config = useRuntimeConfig()
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        config.public.supabase.url,
        config.supabaseServiceKey || config.supabaseKey || ''
      )
      const cardsToUpsert = body.map((card: any) => ({
        uid: card.uid,
        id: card.id,
        name: card.name,
        item_class: card.itemClass,
        rarity: card.rarity,
        tier: card.tier,
        flavour_text: card.flavourText || null,
        wiki_url: card.wikiUrl || null,
        game_data: card.gameData || {},
        relevance_score: card.relevanceScore || 0
      }))
      
      const { error } = await supabase
        .from('unique_cards')
        .upsert(cardsToUpsert, { onConflict: 'uid' })
      
      if (error) {
        throw createError({ statusCode: 500, message: error.message })
      }
      
      return { ok: true }
    }
    
    // 404 for unknown routes
    throw createError({ statusCode: 404, message: 'Not found' })
    
  } catch (error: any) {
    // Log the error
    try {
      const { logApiError } = await import('~/services/errorLogger.service')
      await logApiError(
        `Data API error: ${method} ${path}`,
        path,
        error.statusCode || 500,
        error,
        {
          component: 'DataAPI',
          action: 'api.error',
          method,
          path,
        }
      ).catch(() => {
        // Silently fail if logging fails
      })
    } catch (logError) {
      // Silently fail if import fails
    }
    
    // Return appropriate error response
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error',
      data: error,
    })
  }
})


