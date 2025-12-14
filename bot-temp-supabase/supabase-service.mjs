// supabase-service.mjs
// Service pour gérer toutes les opérations Supabase
// Remplace les opérations sur les fichiers JSON

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Cache pour les cartes uniques (chargées une fois au démarrage)
let cachedUniqueCards = null

/**
 * Charge toutes les cartes uniques depuis la DB (cache)
 */
export async function loadUniqueCards() {
  if (cachedUniqueCards) return cachedUniqueCards

  console.log('📦 Chargement des cartes uniques depuis Supabase...')
  const { data, error } = await supabase
    .from('unique_cards')
    .select('*')
    .order('uid', { ascending: true })

  if (error) {
    console.error('❌ Erreur chargement cartes:', error)
    return []
  }

  // Convertir au format attendu par le bot
  cachedUniqueCards = (data || []).map(card => ({
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

  console.log(`✅ ${cachedUniqueCards.length} cartes chargées`)
  return cachedUniqueCards
}

/**
 * Obtient ou crée un utilisateur
 */
export async function getOrCreateUser(username) {
  const { data: userId, error } = await supabase.rpc('get_or_create_user', {
    p_twitch_username: username.toLowerCase()
  })

  if (error) {
    console.error(`❌ Erreur get_or_create_user pour ${username}:`, error)
    return null
  }

  return userId
}

/**
 * Ajoute une carte à la collection d'un utilisateur
 */
export async function addCardToCollection(username, card, isFoil = false) {
  const userId = await getOrCreateUser(username)
  if (!userId) return false

  const { error } = await supabase.rpc('add_card_to_collection', {
    p_user_id: userId,
    p_card_uid: card.uid,
    p_is_foil: isFoil
  })

  if (error) {
    console.error(`❌ Erreur add_card_to_collection pour ${username}, carte ${card.uid}:`, error)
    return false
  }

  return true
}

/**
 * Met à jour les Vaal Orbs d'un utilisateur
 */
export async function updateVaalOrbs(username, amount) {
  const userId = await getOrCreateUser(username)
  if (!userId) return false

  const { error } = await supabase.rpc('update_vaal_orbs', {
    p_user_id: userId,
    p_amount: amount
  })

  if (error) {
    console.error(`❌ Erreur update_vaal_orbs pour ${username}:`, error)
    return false
  }

  return true
}

/**
 * Crée un booster et enregistre les cartes
 */
export async function createBoosterRecord(username, cards) {
  const userId = await getOrCreateUser(username)
  if (!userId) return null

  const timestamp = new Date().toISOString()

  // Créer le booster
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
    console.error(`❌ Erreur création booster pour ${username}:`, boosterError)
    return null
  }

  // Ajouter les cartes du booster
  const boosterCards = cards.map((card, index) => ({
    booster_id: boosterRecord.id,
    card_uid: card.uid,
    is_foil: card.foil === true,
    position: index + 1
  }))

  const { error: cardsError } = await supabase
    .from('booster_cards')
    .insert(boosterCards)

  if (cardsError) {
    console.error(`❌ Erreur insertion cartes booster pour ${username}:`, cardsError)
  }

  return boosterRecord
}

/**
 * Récupère la collection complète d'un utilisateur (format compatible avec l'ancien JSON)
 */
export async function getUserCollection(username) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      vaal_orbs,
      user_collections (
        card_uid,
        quantity,
        normal_count,
        foil_count,
        unique_cards (*)
      )
    `)
    .eq('twitch_username', username.toLowerCase())
    .single()

  if (userError || !user) {
    return { vaalOrbs: 0 }
  }

  const result = { vaalOrbs: user.vaal_orbs || 1 }

  for (const col of user.user_collections || []) {
    const card = col.unique_cards
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
}

/**
 * Récupère tous les boosters d'un utilisateur (format compatible avec l'ancien JSON)
 */
export async function getUserCards(username) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('twitch_username', username.toLowerCase())
    .single()

  if (userError || !user) {
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
    console.error(`❌ Erreur récupération boosters pour ${username}:`, boostersError)
    return []
  }

  return (boosters || []).map(booster => {
    const cards = (booster.booster_cards || [])
      .sort((a, b) => a.position - b.position)
      .map(bc => {
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
}

/**
 * Récupère toutes les collections (format compatible avec l'ancien JSON)
 */
export async function getAllUserCollections() {
  const { data: users, error } = await supabase
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

  if (error) {
    console.error('❌ Erreur récupération collections:', error)
    return {}
  }

  const result = {}

  for (const user of users || []) {
    const username = user.twitch_username
    result[username] = { vaalOrbs: user.vaal_orbs || 1 }

    for (const col of user.user_collections || []) {
      const card = col.unique_cards
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
}

/**
 * Récupère toutes les cartes uniques (format compatible avec l'ancien JSON)
 */
export async function getAllUniqueCards() {
  if (!cachedUniqueCards) {
    await loadUniqueCards()
  }
  return cachedUniqueCards || []
}

console.log('✅ Supabase service chargé')
