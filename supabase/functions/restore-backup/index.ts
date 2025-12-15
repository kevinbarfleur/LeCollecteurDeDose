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
    const { backupId, restoreMode = 'permissive' } = await req.json()

    if (!backupId) {
      return new Response(JSON.stringify({ error: 'backupId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (restoreMode !== 'strict' && restoreMode !== 'permissive') {
      return new Response(JSON.stringify({ error: 'restoreMode must be either "strict" or "permissive"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`📥 Starting backup restoration for backup: ${backupId} (mode: ${restoreMode})`)

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
      users: { created: 0, updated: 0, deleted: 0, errors: [] as string[] },
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

    // 2.5. Collect all usernames from backup
    const usernamesInBackup = new Set<string>()
    if (backup.user_collection && typeof backup.user_collection === 'object') {
      for (const username of Object.keys(backup.user_collection)) {
        usernamesInBackup.add(username.toLowerCase())
      }
    }
    if (backup.user_cards && typeof backup.user_cards === 'object') {
      for (const usernameLower of Object.keys(backup.user_cards)) {
        usernamesInBackup.add(usernameLower.toLowerCase())
      }
    }

    // 2.6. STRICT MODE: Delete users not in backup
    if (restoreMode === 'strict') {
      console.log(`🗑️ STRICT MODE: Identifying users to delete...`)
      
      // Fetch all users from database
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, twitch_username')

      if (allUsersError) {
        console.error('❌ Error fetching all users:', allUsersError)
        restoreReport.users.errors.push(`Failed to fetch all users: ${allUsersError.message}`)
      } else if (allUsers) {
        // Identify users not in backup
        const usersToDelete = allUsers.filter(user => {
          const usernameLower = user.twitch_username?.toLowerCase()
          return usernameLower && !usernamesInBackup.has(usernameLower)
        })

        console.log(`🗑️ STRICT MODE: Found ${usersToDelete.length} users to delete (not in backup)`)

        // Delete users not in backup (CASCADE will delete collections and boosters)
        for (const userToDelete of usersToDelete) {
          try {
            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('id', userToDelete.id)

            if (deleteError) {
              restoreReport.users.errors.push(`User ${userToDelete.twitch_username}: ${deleteError.message}`)
              console.error(`❌ Error deleting user ${userToDelete.twitch_username}:`, deleteError)
            } else {
              restoreReport.users.deleted++
              console.log(`✓ Deleted user ${userToDelete.twitch_username} (not in backup)`)
            }
          } catch (error: any) {
            restoreReport.users.errors.push(`User ${userToDelete.twitch_username}: ${error.message}`)
            console.error(`❌ Error deleting user ${userToDelete.twitch_username}:`, error)
          }
        }
      }
    }

    // 2.7. Clean up existing data BEFORE restoring (critical step)
    // For users in backup, delete their existing collections and boosters
    console.log(`🧹 Cleaning up existing data for ${usernamesInBackup.size} users before restore...`)
    for (const username of usernamesInBackup) {
      try {
        // Get user ID
        const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
          p_twitch_username: username
        })

        if (userError || !userId) {
          console.warn(`⚠️ Could not get user ${username} for cleanup: ${userError?.message || 'Failed to get user'}`)
          continue
        }

        // Delete all existing boosters for this user (cascade will delete booster_cards)
        const { error: boostersDeleteError } = await supabase
          .from('user_boosters')
          .delete()
          .eq('user_id', userId)

        if (boostersDeleteError) {
          console.warn(`⚠️ Error deleting boosters for ${username}: ${boostersDeleteError.message}`)
        } else {
          console.log(`✓ Deleted existing boosters for ${username}`)
        }

        // Delete all existing collections for this user
        const { error: collectionsDeleteError } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', userId)

        if (collectionsDeleteError) {
          console.warn(`⚠️ Error deleting collections for ${username}: ${collectionsDeleteError.message}`)
        } else {
          console.log(`✓ Deleted existing collections for ${username}`)
        }
      } catch (error: any) {
        console.warn(`⚠️ Error during cleanup for ${username}: ${error.message}`)
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

            // Skip cards with 0 count (they shouldn't be in the backup, but just in case)
            if (normalCount === 0 && foilCount === 0) continue

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
