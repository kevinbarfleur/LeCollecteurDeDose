// Edge Function: Restore Backup
// Restores data from a backup to the database

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
    const { backupId } = await req.json()

    if (!backupId) {
      return new Response(JSON.stringify({ error: 'backupId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`📥 Starting backup restoration for backup: ${backupId}`)

    // Fetch the backup
    const { data: backup, error: backupError } = await supabase
      .from('backup')
      .select('*')
      .eq('id', backupId)
      .single()

    if (backupError || !backup) {
      console.error('❌ Error fetching backup:', backupError)
      return new Response(JSON.stringify({ error: 'Backup not found', details: backupError?.message }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    const restoreReport = {
      users: { created: 0, updated: 0, errors: [] as string[] },
      collections: { restored: 0, errors: [] as string[] },
      boosters: { created: 0, errors: [] as string[] },
      uniqueCards: { restored: 0, errors: [] as string[] },
      botConfig: { restored: 0, errors: [] as string[] },
      appSettings: { restored: 0, errors: [] as string[] }
    }

    // 1. Restore unique_cards first (they are referenced by collections)
    if (backup.uniques && Array.isArray(backup.uniques)) {
      console.log(`📦 Restoring ${backup.uniques.length} unique cards...`)
      for (const card of backup.uniques) {
        try {
          const { error } = await supabase
            .from('unique_cards')
            .upsert({
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
            }, { onConflict: 'uid' })

          if (error) {
            restoreReport.uniqueCards.errors.push(`Card ${card.uid}: ${error.message}`)
          } else {
            restoreReport.uniqueCards.restored++
          }
        } catch (error: any) {
          restoreReport.uniqueCards.errors.push(`Card ${card.uid}: ${error.message}`)
        }
      }
    }

    // 2. Restore users and their vaal_orbs
    if (backup.user_collection && typeof backup.user_collection === 'object') {
      console.log(`👥 Restoring ${Object.keys(backup.user_collection).length} users...`)
      for (const [username, userData] of Object.entries(backup.user_collection)) {
        try {
          const userDataObj = userData as any
          const vaalOrbs = userDataObj.vaalOrbs || 1

          // Get or create user
          const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
            p_twitch_username: username
          })

          if (userError || !userId) {
            restoreReport.users.errors.push(`User ${username}: ${userError?.message || 'Failed to get/create user'}`)
            continue
          }

          // Update vaal_orbs
          const { error: vaalError } = await supabase.rpc('set_vaal_orbs', {
            p_user_id: userId,
            p_count: vaalOrbs
          })

          if (vaalError) {
            restoreReport.users.errors.push(`User ${username} vaal_orbs: ${vaalError.message}`)
          } else {
            restoreReport.users.updated++
          }
        } catch (error: any) {
          restoreReport.users.errors.push(`User ${username}: ${error.message}`)
        }
      }
    }

    // 3. Restore user_collections
    if (backup.user_collection && typeof backup.user_collection === 'object') {
      console.log(`🃏 Restoring collections...`)
      for (const [username, userData] of Object.entries(backup.user_collection)) {
        try {
          const userDataObj = userData as any
          
          // Get user ID
          const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
            p_twitch_username: username
          })

          if (userError || !userId) {
            restoreReport.collections.errors.push(`User ${username}: ${userError?.message || 'Failed to get user'}`)
            continue
          }

          // Restore each card in the collection
          for (const [key, value] of Object.entries(userDataObj)) {
            if (key === 'vaalOrbs') continue // Skip vaalOrbs, already handled

            const cardUid = parseInt(key)
            if (isNaN(cardUid)) continue

            const cardData = value as any
            const normalCount = cardData.normal || 0
            const foilCount = cardData.foil || 0

            try {
              const { error } = await supabase.rpc('set_card_collection_counts', {
                p_user_id: userId,
                p_card_uid: cardUid,
                p_normal_count: normalCount,
                p_foil_count: foilCount
              })

              if (error) {
                restoreReport.collections.errors.push(`User ${username}, card ${cardUid}: ${error.message}`)
              } else {
                restoreReport.collections.restored++
              }
            } catch (error: any) {
              restoreReport.collections.errors.push(`User ${username}, card ${cardUid}: ${error.message}`)
            }
          }
        } catch (error: any) {
          restoreReport.collections.errors.push(`User ${username}: ${error.message}`)
        }
      }
    }

    // 4. Restore user_boosters and booster_cards
    if (backup.user_cards && typeof backup.user_cards === 'object') {
      console.log(`🎁 Restoring boosters...`)
      for (const [usernameLower, boosters] of Object.entries(backup.user_cards)) {
        try {
          // Get user ID
          const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
            p_twitch_username: usernameLower
          })

          if (userError || !userId) {
            restoreReport.boosters.errors.push(`User ${usernameLower}: ${userError?.message || 'Failed to get user'}`)
            continue
          }

          const boostersArray = boosters as any[]
          for (const boosterData of boostersArray) {
            if (!boosterData.booster || !boosterData.timestamp || !boosterData.content) continue

            try {
              // Create booster record
              const { data: boosterRecord, error: boosterError } = await supabase
                .from('user_boosters')
                .insert({
                  user_id: userId,
                  opened_at: boosterData.timestamp,
                  booster_type: 'normal'
                })
                .select()
                .single()

              if (boosterError || !boosterRecord) {
                restoreReport.boosters.errors.push(`User ${usernameLower}, booster ${boosterData.timestamp}: ${boosterError?.message || 'Failed to create booster'}`)
                continue
              }

              // Create booster_cards
              const cards = boosterData.content as any[]
              const boosterCards = cards.map((card, index) => ({
                booster_id: boosterRecord.id,
                card_uid: card.uid,
                is_foil: card.foil || false,
                position: index + 1
              }))

              if (boosterCards.length > 0) {
                const { error: cardsError } = await supabase
                  .from('booster_cards')
                  .insert(boosterCards)

                if (cardsError) {
                  restoreReport.boosters.errors.push(`User ${usernameLower}, booster ${boosterRecord.id}: ${cardsError.message}`)
                } else {
                  restoreReport.boosters.created++
                }
              }
            } catch (error: any) {
              restoreReport.boosters.errors.push(`User ${usernameLower}, booster: ${error.message}`)
            }
          }
        } catch (error: any) {
          restoreReport.boosters.errors.push(`User ${usernameLower}: ${error.message}`)
        }
      }
    }

    // 5. Restore bot_config (if present)
    if (backup.bot_config && typeof backup.bot_config === 'object') {
      console.log(`🤖 Restoring bot_config...`)
      for (const [key, value] of Object.entries(backup.bot_config)) {
        try {
          const { error } = await supabase.rpc('set_bot_config', {
            p_key: key,
            p_value: value as string,
            p_description: null
          })

          if (error) {
            restoreReport.botConfig.errors.push(`Key ${key}: ${error.message}`)
          } else {
            restoreReport.botConfig.restored++
          }
        } catch (error: any) {
          restoreReport.botConfig.errors.push(`Key ${key}: ${error.message}`)
        }
      }
    }

    // 6. Restore app_settings (if present)
    if (backup.app_settings && typeof backup.app_settings === 'object') {
      console.log(`⚙️ Restoring app_settings...`)
      for (const [key, setting] of Object.entries(backup.app_settings)) {
        try {
          const settingData = setting as any
          // Note: app_settings restoration requires admin user ID, skip for now or use a system user
          // We'll restore via direct insert with service role key
          const { error } = await supabase
            .from('app_settings')
            .upsert({
              key: settingData.key,
              value: settingData.value,
              data_mode: settingData.data_mode || 'api',
              updated_at: settingData.updated_at || new Date().toISOString(),
              updated_by: settingData.updated_by || null
            }, { onConflict: 'key,data_mode' })

          if (error) {
            restoreReport.appSettings.errors.push(`Setting ${settingData.key}: ${error.message}`)
          } else {
            restoreReport.appSettings.restored++
          }
        } catch (error: any) {
          restoreReport.appSettings.errors.push(`Setting: ${error.message}`)
        }
      }
    }

    const totalErrors = 
      restoreReport.users.errors.length +
      restoreReport.collections.errors.length +
      restoreReport.boosters.errors.length +
      restoreReport.uniqueCards.errors.length +
      restoreReport.botConfig.errors.length +
      restoreReport.appSettings.errors.length

    console.log(`✅ Backup restoration completed. Errors: ${totalErrors}`)

    return new Response(JSON.stringify({
      ok: totalErrors === 0,
      message: totalErrors === 0 ? 'Backup restored successfully' : 'Backup restored with some errors',
      report: restoreReport
    }), {
      status: totalErrors === 0 ? 200 : 207, // 207 = Multi-Status (partial success)
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in restore-backup:', error)
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
