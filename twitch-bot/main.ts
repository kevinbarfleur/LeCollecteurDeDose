/**
 * Twitch Bot Service for Railway - Deno Version
 * 
 * Handles Twitch chat interactions using tmi.js (via npm)
 * Interacts with Supabase for collection queries and stats
 * Rewards are handled by Supabase Edge Functions
 */

import tmi from "npm:tmi.js@^1.8.5"
import { createClient } from "npm:@supabase/supabase-js@^2"
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts"

// Load .env file for local development (only if file exists)
// On Railway, environment variables are already set, so this won't override them
// Try multiple locations: current directory, parent directory
try {
  // Try current directory first (twitch-bot/.env)
  const env = await load({ export: true })
  console.log('📄 Loaded .env file from current directory')
} catch {
  try {
    // Try parent directory (.env at project root)
    const env = await load({ 
      envPath: '../.env',
      export: true 
    })
    console.log('📄 Loaded .env file from parent directory')
  } catch {
    // .env file not found, that's okay - we'll use system environment variables
    // This is normal on Railway where env vars are set directly
    console.log('ℹ️  No .env file found, using system environment variables')
  }
}

// Get environment variables
const TWITCH_BOT_USERNAME = Deno.env.get("TWITCH_BOT_USERNAME") || ""
const TWITCH_BOT_OAUTH_TOKEN = Deno.env.get("TWITCH_BOT_OAUTH_TOKEN") || ""
const TWITCH_CHANNEL_NAME = Deno.env.get("TWITCH_CHANNEL_NAME") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_KEY = Deno.env.get("SUPABASE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || ""
const PORT = parseInt(Deno.env.get("PORT") || Deno.env.get("WEBHOOK_PORT") || "3001")

// Debug: Log environment variables status (only in development)
if (!Deno.env.get("RAILWAY_ENVIRONMENT")) {
  console.log('🔍 Environment check:')
  console.log(`   TWITCH_BOT_USERNAME: ${TWITCH_BOT_USERNAME ? '✅ Set' : '❌ Missing'}`)
  console.log(`   TWITCH_BOT_OAUTH_TOKEN: ${TWITCH_BOT_OAUTH_TOKEN ? '✅ Set' : '❌ Missing'}`)
  console.log(`   TWITCH_CHANNEL_NAME: ${TWITCH_CHANNEL_NAME ? '✅ Set' : '❌ Missing'}`)
  console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
  console.log(`   SUPABASE_KEY: ${SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`)
}

// Initialize Supabase client
let supabase: ReturnType<typeof createClient> | null = null

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('✅ Supabase client initialized')
} else {
  console.warn('⚠️  Supabase credentials not found - chat commands requiring Supabase will be disabled')
}

// Initialize Twitch client
const client = new tmi.Client({
  identity: {
    username: TWITCH_BOT_USERNAME,
    password: TWITCH_BOT_OAUTH_TOKEN
  },
  channels: [TWITCH_CHANNEL_NAME]
})

let isConnected = false

// ============================================================================
// AUTO TRIGGERS SYSTEM - Random events for chat activity
// ============================================================================

interface RecentUser {
  username: string
  timestamp: number
}

interface TargetedUser {
  username: string
  timestamp: number
  triggerType?: string
}

interface TriggerConfig {
  enabled: boolean
  minInterval: number
  maxInterval: number
  probabilities: Record<string, number>
  buffs: {
    atlasInfluence: {
      duration: number
      foilBoost: number
    }
  }
  targetCooldown: number
  minUsersForCooldown: number
  userActivityWindow: number
}

const recentUsers: RecentUser[] = []
const targetedUsers: TargetedUser[] = []
const allTrackedUsers: Set<string> = new Set() // All unique users tracked since bot start
const MAX_RECENT_USERS = 50

// Load trigger configuration from Supabase
async function loadTriggerConfig(): Promise<TriggerConfig> {
  // Default values (fallback if Supabase is not available)
  const defaults: TriggerConfig = {
    enabled: false,
    minInterval: 300,
    maxInterval: 900,
    probabilities: {
      blessingRNGesus: 0.20,
      cartographersGift: 0.20,
      mirrorTier: 0.05,
      einharApproved: 0.15,
      heistTax: 0.10,
      sirusVoice: 0.03,
      alchMisclick: 0.10,
      tradeScam: 0.05,
      chrisVision: 0.05,
      atlasInfluence: 0.07,
    },
    buffs: {
      atlasInfluence: {
        duration: 30,
        foilBoost: 0.10,
      }
    },
    targetCooldown: 600000,
    minUsersForCooldown: 3,
    userActivityWindow: 3600000,
  }

  if (!supabase) {
    console.log('⚠️  Supabase not initialized, using default config')
    return defaults
  }

  try {
    // Load all config from Supabase
    const { data: configData, error } = await supabase.rpc('get_all_bot_config')
    
    if (error || !configData) {
      console.error('Error loading bot config from Supabase:', error)
      console.log('⚠️  Falling back to default config')
      return defaults
    }

    // Helper function to get config value with fallback
    const getConfig = (key: string, fallback: string): string => {
      return configData[key] || fallback
    }

    // Helper function to get boolean config
    const getBoolConfig = (key: string, fallback: boolean): boolean => {
      const value = getConfig(key, fallback.toString())
      return value === 'true' || value === '1'
    }

    // Helper function to get int config
    const getIntConfig = (key: string, fallback: number): number => {
      const value = getConfig(key, fallback.toString())
      return parseInt(value) || fallback
    }

    // Helper function to get float config
    const getFloatConfig = (key: string, fallback: number): number => {
      const value = getConfig(key, fallback.toString())
      return parseFloat(value) || fallback
    }

    return {
      enabled: getBoolConfig('auto_triggers_enabled', defaults.enabled),
      minInterval: getIntConfig('auto_triggers_min_interval', defaults.minInterval),
      maxInterval: getIntConfig('auto_triggers_max_interval', defaults.maxInterval),
      probabilities: {
        blessingRNGesus: getFloatConfig('trigger_blessing_rngesus', defaults.probabilities.blessingRNGesus),
        cartographersGift: getFloatConfig('trigger_cartographers_gift', defaults.probabilities.cartographersGift),
        mirrorTier: getFloatConfig('trigger_mirror_tier', defaults.probabilities.mirrorTier),
        einharApproved: getFloatConfig('trigger_einhar_approved', defaults.probabilities.einharApproved),
        heistTax: getFloatConfig('trigger_heist_tax', defaults.probabilities.heistTax),
        sirusVoice: getFloatConfig('trigger_sirus_voice', defaults.probabilities.sirusVoice),
        alchMisclick: getFloatConfig('trigger_alch_misclick', defaults.probabilities.alchMisclick),
        tradeScam: getFloatConfig('trigger_trade_scam', defaults.probabilities.tradeScam),
        chrisVision: getFloatConfig('trigger_chris_vision', defaults.probabilities.chrisVision),
        atlasInfluence: getFloatConfig('trigger_atlas_influence', defaults.probabilities.atlasInfluence),
      },
      buffs: {
        atlasInfluence: {
          duration: getIntConfig('atlas_influence_duration', defaults.buffs.atlasInfluence.duration),
          foilBoost: getFloatConfig('atlas_influence_foil_boost', defaults.buffs.atlasInfluence.foilBoost),
        }
      },
      targetCooldown: getIntConfig('auto_triggers_target_cooldown', defaults.targetCooldown),
      minUsersForCooldown: getIntConfig('auto_triggers_min_users_for_cooldown', defaults.minUsersForCooldown),
      userActivityWindow: getIntConfig('auto_triggers_user_activity_window', defaults.userActivityWindow),
    }
  } catch (error) {
    console.error('Error loading trigger config:', error)
    console.log('⚠️  Falling back to default config')
    return defaults
  }
}

// Load config (will be reloaded from Supabase after connection)
// Initialize with defaults first
let triggerConfig: TriggerConfig = {
  enabled: false,
  minInterval: 300,
  maxInterval: 900,
  probabilities: {
    blessingRNGesus: 0.20,
    cartographersGift: 0.20,
    mirrorTier: 0.05,
    einharApproved: 0.15,
    heistTax: 0.10,
    sirusVoice: 0.03,
    alchMisclick: 0.10,
    tradeScam: 0.05,
    chrisVision: 0.05,
    atlasInfluence: 0.07,
  },
  buffs: {
    atlasInfluence: {
      duration: 30,
      foilBoost: 0.10,
    }
  },
  targetCooldown: 600000,
  minUsersForCooldown: 3,
  userActivityWindow: 3600000,
}

// Track user activity
function trackUserActivity(username: string) {
  // Ignore bot itself
  if (username.toLowerCase() === TWITCH_BOT_USERNAME.toLowerCase()) return
  
  const now = Date.now()
  const existingIndex = recentUsers.findIndex(u => u.username.toLowerCase() === username.toLowerCase())
  
  if (existingIndex >= 0) {
    recentUsers[existingIndex].timestamp = now
  } else {
    recentUsers.push({ username, timestamp: now })
    // Keep list size manageable
    if (recentUsers.length > MAX_RECENT_USERS) {
      recentUsers.shift()
    }
  }
  
  // Cleanup old users
  const cutoff = now - triggerConfig.userActivityWindow
  const filtered = recentUsers.filter(u => u.timestamp > cutoff)
  recentUsers.length = 0
  recentUsers.push(...filtered)
}

// Cleanup old targets
function cleanupOldTargets() {
  const now = Date.now()
  const filtered = targetedUsers.filter(
    target => (now - target.timestamp) < triggerConfig.targetCooldown
  )
  targetedUsers.length = 0
  targetedUsers.push(...filtered)
}

// Check if user can be targeted
function canTargetUser(username: string): boolean {
  cleanupOldTargets()
  
  const now = Date.now()
  const recentTarget = targetedUsers.find(
    t => t.username.toLowerCase() === username.toLowerCase()
  )
  
  if (!recentTarget) return true
  
  // If few active users, cooldown is strict
  const activeCount = recentUsers.length
  if (activeCount < triggerConfig.minUsersForCooldown) {
    return (now - recentTarget.timestamp) >= triggerConfig.targetCooldown
  }
  
  return (now - recentTarget.timestamp) >= triggerConfig.targetCooldown
}

// Get random active user (with anti-focus)
function getRandomActiveUser(): string | null {
  cleanupOldTargets()
  
  // Filter targetable users (not in cooldown)
  const targetableUsers = recentUsers.filter(
    u => canTargetUser(u.username)
  )
  
  if (targetableUsers.length === 0) {
    // If no targetable users, return last active user (fallback)
    if (recentUsers.length === 0) return null
    return recentUsers[recentUsers.length - 1].username
  }
  
  // Random selection among targetable users
  const randomIndex = Math.floor(Math.random() * targetableUsers.length)
  return targetableUsers[randomIndex].username
}

// Get random user for manual trigger (all tracked users, no cooldown)
function getRandomUserForManualTrigger(): string | null {
  // Convert Set to Array
  const trackedArray = Array.from(allTrackedUsers)
  
  if (trackedArray.length === 0) {
    // Fallback to recent users if no tracked users yet
    if (recentUsers.length === 0) return null
    const randomIndex = Math.floor(Math.random() * recentUsers.length)
    return recentUsers[randomIndex].username
  }
  
  // Random selection from all tracked users
  const randomIndex = Math.floor(Math.random() * trackedArray.length)
  return trackedArray[randomIndex]
}

// Mark user as targeted
function markUserAsTargeted(username: string, triggerType: string) {
  const now = Date.now()
  const existingIndex = targetedUsers.findIndex(
    t => t.username.toLowerCase() === username.toLowerCase()
  )
  
  if (existingIndex >= 0) {
    targetedUsers[existingIndex].timestamp = now
    targetedUsers[existingIndex].triggerType = triggerType
  } else {
    targetedUsers.push({ username, timestamp: now, triggerType })
  }
}

// Random number between min and max
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Select random trigger based on probabilities
function selectRandomTrigger(probabilities: Record<string, number>): string {
  const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0)
  let random = Math.random() * total
  
  for (const [trigger, prob] of Object.entries(probabilities)) {
    random -= prob
    if (random <= 0) return trigger
  }
  
  // Fallback
  return Object.keys(probabilities)[0]
}

// Command handler function (reusable for both Twitch chat and console)
async function handleCommand(
  username: string,
  message: string,
  sendResponse: (response: string) => void
) {
  const command = message.toLowerCase().trim()
  const parts = command.split(' ')

  // Simple ping command
  if (command === '!ping') {
    sendResponse('Pong!')
    return
  }

  // !collection - Show user's collection stats
  if (command === '!collection' || command.startsWith('!collection ')) {
    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          twitch_username,
          vaal_orbs,
          user_collections (
            quantity,
            normal_count,
            foil_count
          )
        `)
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching collection:', error)
        sendResponse(`❌ Erreur lors de la récupération de la collection`)
        return
      }

      if (!user) {
        sendResponse(`@${targetUser} n'a pas encore de collection`)
        return
      }

      const totalCards = user.user_collections?.reduce((sum: number, col: any) => sum + (col.quantity || 0), 0) || 0
      const totalFoil = user.user_collections?.reduce((sum: number, col: any) => sum + (col.foil_count || 0), 0) || 0
      const vaalOrbs = user.vaal_orbs || 0

      sendResponse(`📦 @${targetUser} : ${totalCards} cartes (${totalFoil} ✨) | ${vaalOrbs} Vaal Orbs`)
    } catch (error) {
      console.error('Error in !collection command:', error)
      sendResponse('❌ Erreur lors de la récupération de la collection')
    }
    return
  }

  // !stats - Show user's stats
  if (command === '!stats' || command.startsWith('!stats ')) {
    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          twitch_username,
          vaal_orbs,
          user_collections (quantity),
          user_boosters (id)
        `)
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching stats:', error)
        sendResponse(`❌ Erreur lors de la récupération des stats`)
        return
      }

      if (!user) {
        sendResponse(`@${targetUser} n'a pas encore de stats`)
        return
      }

      const totalCards = user.user_collections?.reduce((sum: number, col: any) => sum + (col.quantity || 0), 0) || 0
      const totalBoosters = user.user_boosters?.length || 0
      const vaalOrbs = user.vaal_orbs || 0

      sendResponse(`📊 @${targetUser} : ${totalCards} cartes | ${totalBoosters} boosters ouverts | ${vaalOrbs} Vaal Orbs`)
    } catch (error) {
      console.error('Error in !stats command:', error)
      sendResponse('❌ Erreur lors de la récupération des stats')
    }
    return
  }

  // !vaalorb - Use a Vaal Orb on a random card (Path of Exile style)
  if (command === '!vaalorb') {
    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    try {
      // Get or create user
      const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
        p_twitch_username: username,
        p_twitch_user_id: null,
        p_display_name: null,
        p_avatar_url: null
      })

      if (userError || !userId) {
        console.error('Error getting user:', userError)
        sendResponse(`❌ Erreur lors de la récupération de votre profil`)
        return
      }

      // Use Vaal Orb
      const { data: result, error: vaalError } = await supabase.rpc('use_vaal_orb', {
        p_user_id: userId
      })

      if (vaalError) {
        console.error('Error using vaal orb:', vaalError)
        sendResponse(`❌ Erreur lors de l'utilisation du Vaal Orb`)
        return
      }

      if (!result || !result.success) {
        sendResponse(result?.message || '❌ Erreur lors de l\'utilisation du Vaal Orb')
        return
      }

      // Send result message
      const remaining = result.remaining_vaal_orbs || 0
      sendResponse(`${result.message} (${remaining} Vaal Orb${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''})`)
    } catch (error) {
      console.error('Error in !vaalorb command:', error)
      sendResponse('❌ Erreur lors de l\'utilisation du Vaal Orb')
    }
    return
  }

  // !vaal - Show user's Vaal Orbs
  if (command === '!vaal' || command.startsWith('!vaal ')) {
    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    const targetUser = parts[1] ? parts[1].replace('@', '').toLowerCase() : username.toLowerCase()

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('twitch_username, vaal_orbs')
        .eq('twitch_username', targetUser)
        .maybeSingle()

      if (error) {
        console.error('Error fetching vaal orbs:', error)
        sendResponse(`❌ Erreur lors de la récupération des Vaal Orbs`)
        return
      }

      if (!user) {
        sendResponse(`@${targetUser} n'a pas encore de Vaal Orbs`)
        return
      }

      const vaalOrbs = user.vaal_orbs || 0
      sendResponse(`💎 @${targetUser} a ${vaalOrbs} Vaal Orb${vaalOrbs > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error in !vaal command:', error)
      sendResponse('❌ Erreur lors de la récupération des Vaal Orbs')
    }
    return
  }

  // DEV ONLY: !booster - Buy a booster (local development only)
  if (command === '!booster') {
    // Only available in local development
    if (Deno.env.get("RAILWAY_ENVIRONMENT")) {
      sendResponse('❌ Cette commande n\'est disponible qu\'en développement local')
      return
    }

    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    try {
      // Get or create user
      const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
        p_twitch_username: username,
        p_twitch_user_id: null,
        p_display_name: null,
        p_avatar_url: null
      })

      if (userError || !userId) {
        console.error('Error getting user:', userError)
        sendResponse(`❌ Erreur lors de la récupération de votre profil`)
        return
      }

      // Use Supabase function to create booster (bypasses RLS)
      const { data: result, error: boosterError } = await supabase.rpc('create_booster_for_user', {
        p_user_id: userId
      })

      if (boosterError) {
        console.error('Error creating booster:', boosterError)
        sendResponse('❌ Erreur lors de la création du booster')
        return
      }

      if (!result || !result.success) {
        sendResponse(result?.message || '❌ Erreur lors de la création du booster')
        return
      }

      sendResponse(`🎁 @${username}, tu as looté : ${result.message} !`)
    } catch (error) {
      console.error('Error in !booster command:', error)
      sendResponse('❌ Erreur lors de l\'achat du booster')
    }
    return
  }

  // DEV ONLY: !orb - Buy 5 Vaal Orbs (local development only)
  if (command === '!orb') {
    // Only available in local development
    if (Deno.env.get("RAILWAY_ENVIRONMENT")) {
      sendResponse('❌ Cette commande n\'est disponible qu\'en développement local')
      return
    }

    if (!supabase) {
      sendResponse('❌ Service non disponible')
      return
    }

    try {
      // Get or create user
      const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
        p_twitch_username: username,
        p_twitch_user_id: null,
        p_display_name: null,
        p_avatar_url: null
      })

      if (userError || !userId) {
        console.error('Error getting user:', userError)
        sendResponse(`❌ Erreur lors de la récupération de votre profil`)
        return
      }

      // Add 5 Vaal Orbs
      const { error: vaalError } = await supabase.rpc('update_vaal_orbs', {
        p_user_id: userId,
        p_amount: 5
      })

      if (vaalError) {
        console.error('Error updating vaal orbs:', vaalError)
        sendResponse('❌ Erreur lors de l\'achat des Vaal Orbs')
        return
      }

      // Get updated count
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('vaal_orbs')
        .eq('id', userId)
        .single()

      const vaalOrbs = user?.vaal_orbs || 0
      sendResponse(`✨ @${username} reçoit 5 Vaal Orbs ! (Total: ${vaalOrbs})`)
    } catch (error) {
      console.error('Error in !orb command:', error)
      sendResponse('❌ Erreur lors de l\'achat des Vaal Orbs')
    }
    return
  }
}

// ============================================================================
// AUTO TRIGGER EFFECTS IMPLEMENTATION
// ============================================================================

// Blessing of RNGesus - Give +1 Vaal Orb (always possible)
async function blessingOfRNGesus(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { error } = await supabase.rpc('update_vaal_orbs', {
    p_user_id: userId,
    p_amount: 1
  })

  if (error) {
    console.error('Error in blessingOfRNGesus:', error)
    return { success: false, message: '❌ Erreur lors de la bénédiction de RNGesus' }
  }

  return { success: true, message: `✨ @${username} reçoit la bénédiction de RNGesus ! +1 Vaal Orb` }
}

// Cartographer's Gift - Give 1 random card (non-foil) (always possible)
async function cartographersGift(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('give_random_card_to_user', {
    p_user_id: userId,
    p_is_foil: false
  })

  if (error || !result?.success) {
    console.error('Error in cartographersGift:', error)
    return { success: false, message: '❌ Erreur lors du cadeau du Cartographe' }
  }

  return { success: true, message: `🗺️ @${username} reçoit un cadeau du Cartographe ! +1 carte` }
}

// Mirror-tier Moment - Duplicate a card (checks if user has cards)
async function mirrorTierMoment(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('duplicate_random_card', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in mirrorTierMoment:', error)
    return { success: false, message: `💎 @${username} cherche un miroir... mais sa collection est vide.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `💎 @${username} cherche un miroir... mais sa collection est vide.` }
  }

  return { success: true, message: `💎 @${username} vit un moment Mirror-tier ! Une carte a été dupliquée !` }
}

// Einhar Approved - Convert normal card to foil (checks if user has normal cards)
async function einharApproved(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('convert_card_to_foil', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in einharApproved:', error)
    return { success: false, message: `🦎 Einhar regarde @${username}... mais ne trouve rien à approuver.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `🦎 Einhar regarde @${username}... mais ne trouve rien à approuver.` }
  }

  return { success: true, message: `🦎 Einhar approuve @${username} ! Une carte devient foil !` }
}

// Heist Tax - Steal 1 Vaal Orb (checks if user has Vaal Orbs)
async function heistTax(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('steal_vaal_orb', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in heistTax:', error)
    return { success: false, message: `💰 @${username} n'a rien à voler... Heist repart bredouille.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `💰 @${username} n'a rien à voler... Heist repart bredouille.` }
  }

  return { success: true, message: `💰 @${username} a été taxé par Heist ! -1 Vaal Orb` }
}

// Sirus Voice Line - Destroy a random card (checks if user has cards)
async function sirusVoiceLine(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('destroy_random_card', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in sirusVoiceLine:', error)
    return { success: false, message: `💀 Sirus regarde @${username}... "Tu n'as rien à perdre."` }
  }

  if (!result || !result.success) {
    return { success: false, message: `💀 Sirus regarde @${username}... "Tu n'as rien à perdre."` }
  }

  return { success: true, message: `💀 "Die." - Sirus détruit une carte de @${username}` }
}

// Alch & Go Misclick - Reroll a card (checks if user has cards)
async function alchGoMisclick(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('reroll_card', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in alchGoMisclick:', error)
    return { success: false, message: `⚗️ @${username} cherche une carte à reroll... mais sa collection est vide.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `⚗️ @${username} cherche une carte à reroll... mais sa collection est vide.` }
  }

  return { success: true, message: `⚗️ @${username} a fait un misclick ! Une carte a été rerollée` }
}

// Trade Scam - Transfer card to another user (checks if source has cards)
async function tradeScam(userId: string, username: string, isManual: boolean = false): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  // Get another random user as target (use manual selection if manual trigger)
  const targetUsername = isManual ? getRandomUserForManualTrigger() : getRandomActiveUser()
  if (!targetUsername || targetUsername.toLowerCase() === username.toLowerCase()) {
    return { success: false, message: `🤝 @${username} n'a personne à scammer... le scam échoue.` }
  }

  // Get or create target user
  const { data: targetUserId, error: targetError } = await supabase.rpc('get_or_create_user', {
    p_twitch_username: targetUsername,
    p_twitch_user_id: null,
    p_display_name: null,
    p_avatar_url: null
  })

  if (targetError || !targetUserId) {
    return { success: false, message: `🤝 @${username} n'a rien à échanger... le scam échoue.` }
  }

  const { data: result, error } = await supabase.rpc('transfer_card', {
    p_from_user_id: userId,
    p_to_user_id: targetUserId
  })

  if (error) {
    console.error('Error in tradeScam:', error)
    return { success: false, message: `🤝 @${username} n'a rien à échanger... le scam échoue.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `🤝 @${username} n'a rien à échanger... le scam échoue.` }
  }

  return { success: true, message: `🤝 @${username} s'est fait scammer ! Une carte transférée à @${targetUsername}` }
}

// Chris Wilson's Vision - Remove foil from a foil card (checks if user has foil cards)
async function chrisWilsonsVision(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('remove_foil_from_card', {
    p_user_id: userId
  })

  if (error) {
    console.error('Error in chrisWilsonsVision:', error)
    return { success: false, message: `👓 Chris Wilson regarde @${username}... mais ne voit aucun foil à nerfer.` }
  }

  if (!result || !result.success) {
    return { success: false, message: `👓 Chris Wilson regarde @${username}... mais ne voit aucun foil à nerfer.` }
  }

  return { success: true, message: `👓 La vision de Chris Wilson frappe @${username} ! Le foil d'une carte a été retiré` }
}

// Atlas Influence - Add temporary buff (always possible)
async function atlasInfluence(userId: string, username: string): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  const { data: result, error } = await supabase.rpc('add_temporary_buff', {
    p_user_id: userId,
    p_buff_type: 'atlas_influence',
    p_duration_minutes: triggerConfig.buffs.atlasInfluence.duration,
    p_data: { foil_chance_boost: triggerConfig.buffs.atlasInfluence.foilBoost }
  })

  if (error) {
    console.error('Error in atlasInfluence:', error)
    return { success: false, message: '❌ Erreur lors de l\'influence de l\'Atlas' }
  }

  if (!result || !result.success) {
    return { success: false, message: '❌ Erreur lors de l\'influence de l\'Atlas' }
  }

  const boostPercent = Math.round(triggerConfig.buffs.atlasInfluence.foilBoost * 100)
  return { 
    success: true, 
    message: `🗺️ @${username} reçoit l'influence de l'Atlas ! +${boostPercent}% chance de foil pendant ${triggerConfig.buffs.atlasInfluence.duration}min` 
  }
}

// Execute trigger
async function executeTrigger(triggerType: string, username: string, isManual: boolean = false): Promise<{ success: boolean, message: string }> {
  if (!supabase) {
    return { success: false, message: '❌ Service non disponible' }
  }

  // Get or create user first
  const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
    p_twitch_username: username,
    p_twitch_user_id: null,
    p_display_name: null,
    p_avatar_url: null
  })

  if (userError || !userId) {
    return { success: false, message: `❌ Erreur lors de la récupération du profil de @${username}` }
  }

  // Log manual triggers for debugging
  if (isManual) {
    console.log(`🎮 Manual trigger "${triggerType}" executed on @${username}`)
  }

  switch (triggerType) {
    case 'blessingRNGesus':
      return await blessingOfRNGesus(userId, username)
    case 'cartographersGift':
      return await cartographersGift(userId, username)
    case 'mirrorTier':
      return await mirrorTierMoment(userId, username)
    case 'einharApproved':
      return await einharApproved(userId, username)
    case 'heistTax':
      return await heistTax(userId, username)
    case 'sirusVoice':
      return await sirusVoiceLine(userId, username)
    case 'alchMisclick':
      return await alchGoMisclick(userId, username)
    case 'tradeScam':
      return await tradeScam(userId, username, isManual)
    case 'chrisVision':
      return await chrisWilsonsVision(userId, username)
    case 'atlasInfluence':
      return await atlasInfluence(userId, username)
    default:
      return { success: false, message: '❌ Trigger inconnu' }
  }
}

// Schedule next trigger
let triggerTimer: ReturnType<typeof setTimeout> | null = null

function scheduleNextTrigger() {
  if (!triggerConfig.enabled) return

  const delay = randomBetween(triggerConfig.minInterval, triggerConfig.maxInterval) * 1000
  triggerTimer = setTimeout(() => {
    executeRandomTrigger()
    scheduleNextTrigger()
  }, delay)
}

// Execute random trigger
async function executeRandomTrigger() {
  cleanupOldTargets()

  const targetUser = getRandomActiveUser()
  if (!targetUser) {
    console.log('⚠️  No targetable users available for trigger')
    return
  }

  const triggerType = selectRandomTrigger(triggerConfig.probabilities)
  const result = await executeTrigger(triggerType, targetUser)

  if (result.success) {
    markUserAsTargeted(targetUser, triggerType)
    client.say(`#${TWITCH_CHANNEL_NAME}`, result.message)
    console.log(`✅ Trigger "${triggerType}" executed on @${targetUser}`)
  } else {
    // Even on failure, send the failure message
    client.say(`#${TWITCH_CHANNEL_NAME}`, result.message)
    console.log(`⚠️  Trigger "${triggerType}" failed for @${targetUser}: ${result.message}`)
    // Don't mark as targeted on failure (can retry later)
  }
}

// HTTP server for webhooks and health checks
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check endpoint for Railway
  if (req.method === 'GET' && url.pathname === '/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        bot: isConnected ? 'connected' : 'connecting',
        channel: TWITCH_CHANNEL_NAME || 'unknown',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Webhook endpoint for Edge Functions
  if (req.method === 'POST' && url.pathname === '/webhook/message') {
    try {
      const body = await req.json()
      const { message, channel } = body

      if (message && channel) {
        console.log(`📨 Received webhook message: ${message}`)
        client.say(`#${channel}`, message)
        return new Response(
          JSON.stringify({ ok: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Missing message or channel' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // Webhook endpoint for manual trigger execution
  if (req.method === 'POST' && url.pathname === '/webhook/trigger-manual') {
    try {
      const body = await req.json()
      const { triggerType, isManual } = body

      if (!triggerType) {
        return new Response(
          JSON.stringify({ error: 'Missing triggerType' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate trigger type
      const validTriggers = [
        'blessingRNGesus',
        'cartographersGift',
        'mirrorTier',
        'einharApproved',
        'heistTax',
        'sirusVoice',
        'alchMisclick',
        'tradeScam',
        'chrisVision',
        'atlasInfluence'
      ]

      if (!validTriggers.includes(triggerType)) {
        return new Response(
          JSON.stringify({ error: `Invalid triggerType. Must be one of: ${validTriggers.join(', ')}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get random user for manual trigger (all tracked users, no cooldown)
      const targetUser = getRandomUserForManualTrigger()
      
      if (!targetUser) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'No users available',
            message: 'Aucun utilisateur disponible pour déclencher le trigger'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Execute trigger (isManual=true bypasses cooldown)
      const result = await executeTrigger(triggerType, targetUser, true)

      // Send message to chat if successful or failed (both send messages)
      if (result.message) {
        client.say(`#${TWITCH_CHANNEL_NAME}`, result.message)
      }

      // Return result
      return new Response(
        JSON.stringify({
          success: result.success,
          triggerType,
          targetUser,
          message: result.message
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Error handling manual trigger:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Erreur interne'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // 404 for other routes
  return new Response('Not Found', { status: 404, headers: corsHeaders })
}

// Start HTTP server
console.log('🤖 Twitch Bot Service starting...')
console.log(`   Channel: ${TWITCH_CHANNEL_NAME}`)
console.log(`   Username: ${TWITCH_BOT_USERNAME}`)

// Start HTTP server first (Railway needs this for health checks)
// Use AbortController for graceful shutdown
const abortController = new AbortController()
const server = Deno.serve({ 
  port: PORT, 
  hostname: '0.0.0.0',
  signal: abortController.signal 
}, handleRequest)
console.log(`📡 Webhook server listening on port ${PORT}`)
console.log(`   Endpoint: http://0.0.0.0:${PORT}/webhook/message`)
console.log(`   Health check: http://0.0.0.0:${PORT}/health`)
console.log('✅ HTTP server ready - Railway can now perform health checks')

// Small delay to ensure Railway sees the server is listening
await new Promise(resolve => setTimeout(resolve, 1000))

// Connect to Twitch
console.log('🔌 Connecting to Twitch...')
client.connect().catch(console.error)

// Twitch client event handlers
client.on('connected', async () => {
  isConnected = true
  console.log(`✅ Bot connected to Twitch chat: ${TWITCH_CHANNEL_NAME}`)
  
  // Load trigger config from Supabase (reload after Supabase is ready)
  if (supabase) {
    try {
      triggerConfig = await loadTriggerConfig()
      console.log('📋 Trigger configuration loaded from Supabase')
    } catch (error) {
      console.error('Error loading trigger config:', error)
      console.log('⚠️  Using default configuration')
    }
  } else {
    console.log('⚠️  Supabase not initialized, using default configuration')
  }
  
  // Start auto triggers if enabled
  if (triggerConfig.enabled) {
    console.log('🎲 Auto triggers enabled')
    console.log(`   Min interval: ${triggerConfig.minInterval}s, Max interval: ${triggerConfig.maxInterval}s`)
    console.log(`   Target cooldown: ${triggerConfig.targetCooldown / 1000}s`)
    scheduleNextTrigger()
  } else {
    console.log('⚠️  Auto triggers disabled (set auto_triggers_enabled=true in bot_config table to enable)')
  }
})

client.on('disconnected', () => {
  isConnected = false
  console.log('❌ Bot disconnected from Twitch')
})

client.on('message', async (channel: string, tags: any, message: string, self: boolean) => {
  // Ignore messages from the bot itself
  if (self) return

  const username = tags.username || 'unknown'
  
  // Track user activity for auto triggers (ignore commands)
  if (!message.trim().startsWith('!')) {
    trackUserActivity(username)
  }
  
  // Use the shared command handler
  await handleCommand(username, message, (response) => {
    client.say(channel, response)
  })
})

// Handle process termination gracefully
// Note: Windows only supports SIGINT, SIGBREAK, and SIGUP
// SIGTERM is only available on Unix-like systems (Linux, macOS)
const gracefulShutdown = async (signal: string) => {
  console.log(`🛑 ${signal} received, disconnecting bot...`)
  isConnected = false
  client.disconnect()
  abortController.abort()
  await server.finished
  console.log('🛑 Server closed, exiting...')
  Deno.exit(0)
}

// Add SIGTERM listener only on Unix-like systems (Linux, macOS)
// Railway uses Linux, so SIGTERM will work there
if (Deno.build.os !== 'windows') {
  Deno.addSignalListener('SIGTERM', () => gracefulShutdown('SIGTERM'))
}

// SIGINT works on all platforms (Ctrl+C)
Deno.addSignalListener('SIGINT', () => gracefulShutdown('SIGINT'))

// Keep the process alive - prevent Railway from thinking the service is inactive
// Railway needs to see active network connections or HTTP activity
let heartbeatCount = 0
setInterval(() => {
  heartbeatCount++
  const uptime = Math.floor(performance.now() / 1000)
  console.log(`💓 Heartbeat #${heartbeatCount} - uptime: ${uptime}s, server: listening, twitch: ${isConnected ? 'connected' : 'connecting'}`)
  
  // Also log server status every 5 minutes
  if (uptime % 300 === 0) {
    console.log(`📊 Status check - Server listening: true, Port: ${PORT}, Twitch: ${isConnected ? 'connected' : 'disconnected'}`)
    console.log(`📊 Active users tracked: ${recentUsers.length}, Recently targeted: ${targetedUsers.length}`)
  }
}, 60000) // Every 60 seconds

// Cleanup expired buffs periodically (every 5 minutes)
if (supabase && triggerConfig.enabled) {
  setInterval(async () => {
    try {
      // This would require a cleanup function in Supabase or we can do it client-side
      // For now, buffs are cleaned when accessed via get_user_buffs
      console.log('🧹 Buff cleanup check (buffs are cleaned on access)')
    } catch (error) {
      console.error('Error in buff cleanup:', error)
    }
  }, 300000) // Every 5 minutes
}

console.log('✅ Service ready and listening for requests')

// Console command interface for local development
// Only enabled when not running on Railway
if (!Deno.env.get("RAILWAY_ENVIRONMENT")) {
  console.log('\n🎮 Mode Console Activé - Tapez vos commandes ci-dessous (ou dans le chat Twitch)')
  console.log('   Commandes disponibles: !ping, !collection, !stats, !vaal, !vaalorb')
  console.log('   Commandes DEV (local uniquement): !booster, !orb')
  console.log('   Format: [username] <commande> (ex: "testuser !collection" ou juste "!ping")')
  console.log('   Tapez "exit" ou Ctrl+C pour quitter\n')
  
  // Default username for console commands (can be overridden via CONSOLE_USERNAME env var)
  const DEFAULT_CONSOLE_USERNAME = Deno.env.get("CONSOLE_USERNAME") || "testuser"
  
  // Simulate active users for auto triggers testing (only if triggers enabled)
  // Note: triggerConfig will be loaded after Supabase connection, so we check it dynamically
  setTimeout(async () => {
    if (triggerConfig && triggerConfig.enabled) {
      console.log('🎲 Simulation d\'utilisateurs actifs pour tester les triggers automatiques')
      
      // Add some fake users to recentUsers for testing
      const fakeUsers = ['testuser1', 'testuser2', 'testuser3', DEFAULT_CONSOLE_USERNAME]
      fakeUsers.forEach((user, index) => {
        trackUserActivity(user)
      })
      
      // Periodically simulate user activity (every 2 minutes)
      setInterval(() => {
        if (triggerConfig && triggerConfig.enabled) {
          const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)]
          trackUserActivity(randomUser)
          console.log(`📝 [Simulation] @${randomUser} a écrit dans le chat`)
        }
      }, 120000) // Every 2 minutes
    }
  }, 5000) // Wait 5 seconds for config to load
  
  // Read from stdin line by line
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  
  async function readConsoleInput() {
    // Set stdin to raw mode for better input handling (if supported)
    try {
      // Read line by line
      const buf = new Uint8Array(1024)
      
      while (true) {
        await Deno.stdout.write(encoder.encode('> '))
        
        const n = await Deno.stdin.read(buf)
        if (n === null) break
        
        const input = decoder.decode(buf.subarray(0, n)).trim()
        
        if (!input) continue
        
        // Handle exit
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log('\n👋 Arrêt du mode console...')
          break
        }
        
        // Parse input: "[username] command" or just "command"
        const parts = input.split(' ')
        let username = DEFAULT_CONSOLE_USERNAME
        let command = input
        
        // If first part doesn't start with '!', treat it as username
        if (parts.length > 1 && !parts[0].startsWith('!')) {
          username = parts[0]
          command = parts.slice(1).join(' ')
        }
        
        console.log(`\n📝 [Console] @${username}: ${command}`)
        
        // Track user activity (for auto triggers)
        if (!command.trim().startsWith('!')) {
          trackUserActivity(username)
        }
        
        // Handle command
        await handleCommand(username, command, (response) => {
          console.log(`💬 Bot: ${response}`)
        })
        
        console.log('') // Empty line for readability
      }
    } catch (error) {
      // If stdin reading fails, just continue without console mode
      console.log('⚠️  Console input not available, continuing in Twitch-only mode')
    }
  }
  
  // Start reading console input (non-blocking)
  readConsoleInput().catch((error) => {
    console.log('⚠️  Console mode error:', error.message)
  })
}
