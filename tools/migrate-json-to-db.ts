/**
 * Migration Script: Convert JSON files to Supabase Database
 * 
 * This script migrates:
 * - uniques.json → unique_cards table
 * - userCollection.json → users + user_collections tables
 * - userCards.json → user_boosters + booster_cards tables
 * 
 * Usage: npx tsx tools/migrate-json-to-db.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Paths to JSON files (adjust based on your bot location)
// Default path: C:\Users\kbarf\Downloads\twitch-card-bot\twitch-card-bot
// Or set JSON_BASE_PATH environment variable to override
const JSON_BASE_PATH = process.env.JSON_BASE_PATH || 'C:\\Users\\kbarf\\Downloads\\twitch-card-bot\\twitch-card-bot'

interface UniqueCard {
  uid: number
  id: string
  name: string
  itemClass: string
  rarity: string
  tier: string
  flavourText?: string
  wikiUrl?: string
  gameData: any
  relevanceScore?: number
}

interface UserCollection {
  [username: string]: {
    [cardUid: string]: {
      uid: number
      id: string
      name: string
      itemClass: string
      rarity: string
      tier: string
      flavourText?: string
      wikiUrl?: string
      gameData: any
      relevanceScore?: number
      quantity: number
      normal: number
      foil: number
    } | { vaalOrbs: number }
  }
}

interface UserCards {
  [username: string]: Array<{
    booster: boolean
    timestamp: string
    content: Array<{
      uid: number
      id: string
      name: string
      itemClass: string
      rarity: string
      tier: string
      flavourText?: string
      wikiUrl?: string
      gameData: any
      relevanceScore?: number
      foil?: boolean
      weight?: number
    }>
  }>
}

async function migrateUniques() {
  console.log('📦 Migrating uniques.json → unique_cards...')
  console.log(`   Looking for files in: ${JSON_BASE_PATH}`)
  
  const uniquesPath = path.join(JSON_BASE_PATH, 'uniques.json')
  if (!fs.existsSync(uniquesPath)) {
    console.error(`❌ File not found: ${uniquesPath}`)
    console.error(`   Tip: Set JSON_BASE_PATH environment variable to specify the correct path`)
    return false
  }

  // Read file and remove BOM if present
  let fileContent = fs.readFileSync(uniquesPath, 'utf-8')
  // Remove UTF-8 BOM if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1)
  }
  const uniques: UniqueCard[] = JSON.parse(fileContent)
  console.log(`   Found ${uniques.length} unique cards`)

  // Batch insert (Supabase has a limit of 1000 rows per insert)
  const batchSize = 500
  for (let i = 0; i < uniques.length; i += batchSize) {
    const batch = uniques.slice(i, i + batchSize)
    const cardsToInsert = batch.map(card => ({
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
      .upsert(cardsToInsert, { onConflict: 'uid' })

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
      return false
    }
    console.log(`   ✓ Inserted batch ${i / batchSize + 1}/${Math.ceil(uniques.length / batchSize)}`)
  }

  console.log('✅ Successfully migrated unique cards')
  return true
}

async function migrateUserCollections() {
  console.log('👥 Migrating userCollection.json → users + user_collections...')
  
  const collectionPath = path.join(JSON_BASE_PATH, 'userCollection.json')
  if (!fs.existsSync(collectionPath)) {
    console.error(`❌ File not found: ${collectionPath}`)
    console.error(`   Tip: Set JSON_BASE_PATH environment variable to specify the correct path`)
    return false
  }

  // Read file and remove BOM if present
  let fileContent = fs.readFileSync(collectionPath, 'utf-8')
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1)
  }
  const userCollection: UserCollection = JSON.parse(fileContent)
  const usernames = Object.keys(userCollection).filter(u => u !== 'vaalOrbs')
  console.log(`   Found ${usernames.length} users`)

  for (const username of usernames) {
    const userData = userCollection[username]
    const vaalOrbs = (userData as any).vaalOrbs || 1

    // Get or create user
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username,
      p_twitch_user_id: null,
      p_display_name: null,
      p_avatar_url: null
    })

    if (userError) {
      console.error(`❌ Error creating user ${username}:`, userError)
      continue
    }

    // Update vaal orbs
    await supabase.rpc('update_vaal_orbs', {
      p_user_id: userId,
      p_amount: vaalOrbs - 1 // Subtract 1 because default is 1
    })

    // Migrate collections
    const cardEntries = Object.entries(userData).filter(([key]) => key !== 'vaalOrbs')
    
    for (const [cardUidStr, cardData] of cardEntries) {
      const cardUid = parseInt(cardUidStr)
      if (isNaN(cardUid)) continue

      const card = cardData as any
      const normalCount = card.normal || 0
      const foilCount = card.foil || 0

      // Insert collection entry
      const { error } = await supabase
        .from('user_collections')
        .upsert({
          user_id: userId,
          card_uid: cardUid,
          quantity: card.quantity || (normalCount + foilCount),
          normal_count: normalCount,
          foil_count: foilCount
        }, { onConflict: 'user_id,card_uid' })

      if (error) {
        console.error(`❌ Error inserting collection for ${username}, card ${cardUid}:`, error)
      }
    }

    console.log(`   ✓ Migrated ${username} (${cardEntries.length} cards, ${vaalOrbs} vaal orbs)`)
  }

  console.log('✅ Successfully migrated user collections')
  return true
}

async function migrateUserCards() {
  console.log('🎴 Migrating userCards.json → user_boosters + booster_cards...')
  
  const cardsPath = path.join(JSON_BASE_PATH, 'userCards.json')
  if (!fs.existsSync(cardsPath)) {
    console.error(`❌ File not found: ${cardsPath}`)
    console.error(`   Tip: Set JSON_BASE_PATH environment variable to specify the correct path`)
    return false
  }

  // Read file and remove BOM if present
  let fileContent = fs.readFileSync(cardsPath, 'utf-8')
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1)
  }
  const userCards: UserCards = JSON.parse(fileContent)
  const usernames = Object.keys(userCards)
  console.log(`   Found ${usernames.length} users with booster history`)

  for (const username of usernames) {
    const boosters = userCards[username]
    if (!Array.isArray(boosters)) continue

    // Get or create user using the PostgreSQL function (handles case-insensitive matching)
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: username
    })

    if (userError || !userId) {
      console.warn(`⚠️  User ${username} not found/created, skipping boosters:`, userError?.message)
      continue
    }

    for (const booster of boosters) {
      if (!booster.booster || !booster.content) continue

      // Create booster record
      const { data: boosterRecord, error: boosterError } = await supabase
        .from('user_boosters')
        .insert({
          user_id: userId,
          opened_at: booster.timestamp || new Date().toISOString(),
          booster_type: 'normal'
        })
        .select()
        .single()

      if (boosterError) {
        console.error(`❌ Error creating booster for ${username}:`, boosterError)
        continue
      }

      // Insert booster cards
      const boosterCards = booster.content.map((card, index) => ({
        booster_id: boosterRecord.id,
        card_uid: card.uid,
        is_foil: card.foil === true,
        position: index + 1
      }))

      const { error: cardsError } = await supabase
        .from('booster_cards')
        .insert(boosterCards)

      if (cardsError) {
        console.error(`❌ Error inserting booster cards for ${username}:`, cardsError)
      }
    }

    console.log(`   ✓ Migrated ${boosters.length} boosters for ${username}`)
  }

  console.log('✅ Successfully migrated user cards')
  return true
}

async function main() {
  console.log('🚀 Starting migration from JSON to Supabase Database\n')

  try {
    const results = await Promise.all([
      migrateUniques(),
      migrateUserCollections(),
      migrateUserCards()
    ])

    if (results.every(r => r)) {
      console.log('\n✅ Migration completed successfully!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Migration completed with errors')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
