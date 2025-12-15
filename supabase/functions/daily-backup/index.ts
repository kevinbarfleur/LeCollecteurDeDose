// Edge Function: Daily Backup
// Creates a backup of all Supabase data in the backup table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    console.log('📦 Starting backup creation...')

    // Fetch all users with their collections
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
      console.error('❌ Error fetching users:', usersError)
      return new Response(JSON.stringify({ error: 'Failed to fetch users', details: usersError.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Transform users to the backup format: { [username]: { [cardUid]: cardData, vaalOrbs: number } }
    const userCollections: Record<string, any> = {}
    
    for (const user of users || []) {
      const username = user.twitch_username
      userCollections[username] = { vaalOrbs: user.vaal_orbs || 1 }
      
      for (const col of user.user_collections || []) {
        const card = col.unique_cards
        if (!card) continue
        
        userCollections[username][col.card_uid] = {
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

    // Fetch all unique cards
    const { data: uniqueCards, error: cardsError } = await supabase
      .from('unique_cards')
      .select('*')
      .order('uid', { ascending: true })

    if (cardsError) {
      console.error('❌ Error fetching unique cards:', cardsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch unique cards', details: cardsError.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Transform unique cards to the backup format
    const uniques = (uniqueCards || []).map(card => ({
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

    // Fetch all user cards (boosters) - optimized: fetch all at once
    const userCardsMap: Record<string, any[]> = {}
    
    // Fetch all boosters with their cards in one query
    const { data: allBoosters, error: boostersError } = await supabase
      .from('user_boosters')
      .select(`
        id,
        opened_at,
        users!inner(twitch_username),
        booster_cards (
          position,
          is_foil,
          unique_cards (*)
        )
      `)
      .order('opened_at', { ascending: false })

    if (boostersError) {
      console.warn('⚠️ Error fetching boosters:', boostersError)
    } else {
      // Group boosters by username
      for (const booster of allBoosters || []) {
        const username = (booster.users as any).twitch_username
        if (!username) continue

        const usernameLower = username.toLowerCase()
        if (!userCardsMap[usernameLower]) {
          userCardsMap[usernameLower] = []
        }

        // Transform booster to the backup format
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

        userCardsMap[usernameLower].push({
          booster: true,
          timestamp: booster.opened_at,
          content: cards
        })
      }
    }

    // Ensure all users have an entry (even if empty)
    for (const user of users || []) {
      const usernameLower = user.twitch_username.toLowerCase()
      if (!userCardsMap[usernameLower]) {
        userCardsMap[usernameLower] = []
      }
    }

    // Fetch bot_config (important configuration)
    const { data: botConfig, error: botConfigError } = await supabase
      .from('bot_config')
      .select('*')
      .order('key', { ascending: true })

    if (botConfigError) {
      console.warn('⚠️ Error fetching bot_config:', botConfigError)
    }

    // Transform bot_config to simple key-value pairs
    const botConfigMap: Record<string, string> = {}
    if (botConfig) {
      for (const config of botConfig) {
        botConfigMap[config.key] = config.value
      }
    }

    // Fetch app_settings (important application settings)
    const { data: appSettings, error: appSettingsError } = await supabase
      .from('app_settings')
      .select('*')
      .order('key', { ascending: true })

    if (appSettingsError) {
      console.warn('⚠️ Error fetching app_settings:', appSettingsError)
    }

    // Transform app_settings to key-value pairs with data_mode
    const appSettingsMap: Record<string, any> = {}
    if (appSettings) {
      for (const setting of appSettings) {
        const key = `${setting.key}_${setting.data_mode || 'api'}`
        appSettingsMap[key] = {
          key: setting.key,
          value: setting.value,
          data_mode: setting.data_mode || 'api',
          updated_at: setting.updated_at,
          updated_by: setting.updated_by
        }
      }
    }

    // Insert backup into the backup table
    const { data: backupData, error: backupError } = await supabase
      .from('backup')
      .insert({
        user_collection: userCollections,
        user_cards: userCardsMap,
        uniques: uniques,
        bot_config: botConfigMap,
        app_settings: appSettingsMap
      })
      .select()
      .single()

    if (backupError) {
      console.error('❌ Error creating backup:', backupError)
      return new Response(JSON.stringify({ error: 'Failed to create backup', details: backupError.message }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    const stats = {
      usersCount: Object.keys(userCollections).length,
      uniquesCount: uniques.length,
      userCardsCount: Object.keys(userCardsMap).length,
      botConfigCount: Object.keys(botConfigMap).length,
      appSettingsCount: Object.keys(appSettingsMap).length
    }

    console.log(`✅ Backup created successfully:`, stats)

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Backup created successfully',
      backupId: backupData.id,
      stats
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in daily-backup:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }
})
