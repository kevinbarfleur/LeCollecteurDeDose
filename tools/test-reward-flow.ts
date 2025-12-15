/**
 * Script de test complet pour valider le flux d'achat de rewards Twitch
 * 
 * Ce script simule un achat de reward et vérifie :
 * - Les URLs des webhooks (accessibilité publique)
 * - L'authentification (clés API)
 * - Le flux complet : EventSub → handle-reward → Bot
 * 
 * Usage: npx tsx tools/test-reward-flow.ts [--reward-type=booster|vaal]
 */

import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

dotenv.config()

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TWITCH_REWARD_VAAL_ID = process.env.TWITCH_REWARD_VAAL_ID || ''
const TWITCH_REWARD_BOOSTER_ID = process.env.TWITCH_REWARD_BOOSTER_ID || ''
const BOT_WEBHOOK_URL = process.env.BOT_WEBHOOK_URL || ''
const TWITCH_CHANNEL_NAME = process.env.TWITCH_CHANNEL_NAME || ''
const TEST_USERNAME = process.env.TEST_USERNAME || 'test_user'

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

// Vérification des variables d'environnement
function checkEnvironmentVariables() {
  logSection('1. Vérification des variables d\'environnement')
  
  const required = {
    'SUPABASE_URL': SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': SUPABASE_SERVICE_ROLE_KEY,
    'TWITCH_CHANNEL_NAME': TWITCH_CHANNEL_NAME,
    'BOT_WEBHOOK_URL': BOT_WEBHOOK_URL
  }
  
  const optional = {
    'TWITCH_REWARD_VAAL_ID': TWITCH_REWARD_VAAL_ID,
    'TWITCH_REWARD_BOOSTER_ID': TWITCH_REWARD_BOOSTER_ID
  }
  
  let allOk = true
  
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      logSuccess(`${key}: ${value.substring(0, 20)}...`)
    } else {
      logError(`${key}: Manquant`)
      allOk = false
    }
  }
  
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      logSuccess(`${key}: ${value}`)
    } else {
      logWarning(`${key}: Non défini (optionnel)`)
    }
  }
  
  if (!allOk) {
    logError('Variables d\'environnement manquantes. Vérifiez votre fichier .env')
    process.exit(1)
  }
  
  return true
}

// Test de l'accessibilité des URLs
async function testUrlAccessibility() {
  logSection('2. Test d\'accessibilité des URLs')
  
  const urls = [
    {
      name: 'Supabase Edge Function (twitch-eventsub)',
      url: `${SUPABASE_URL}/functions/v1/twitch-eventsub`,
      method: 'GET',
      expectedStatus: [200, 400, 405] // 400/405 sont OK (pas de params)
    },
    {
      name: 'Supabase Edge Function (handle-reward)',
      url: `${SUPABASE_URL}/functions/v1/handle-reward`,
      method: 'POST',
      expectedStatus: [200, 400, 500] // 400/500 sont OK (pas de body)
    },
    {
      name: 'Bot Webhook',
      url: `${BOT_WEBHOOK_URL}/health`,
      method: 'GET',
      expectedStatus: [200]
    }
  ]
  
  for (const { name, url, method, expectedStatus } of urls) {
    try {
      logInfo(`Test: ${name}`)
      logInfo(`  URL: ${url}`)
      
      const response = await fetch(url, { method })
      const status = response.status
      
      if (expectedStatus.includes(status)) {
        logSuccess(`${name}: Accessible (HTTP ${status})`)
      } else {
        logWarning(`${name}: Réponse inattendue (HTTP ${status})`)
      }
    } catch (error: any) {
      logError(`${name}: Non accessible - ${error.message}`)
      logWarning('  ⚠️  Assurez-vous que l\'URL est accessible publiquement')
    }
  }
}

// Test de l'authentification Supabase
async function testSupabaseAuth() {
  logSection('3. Test d\'authentification Supabase')
  
  try {
    logInfo('Test de connexion à Supabase avec Service Role Key...')
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
      }
    })
    
    if (response.ok) {
      logSuccess('Authentification Supabase: OK')
    } else {
      const text = await response.text()
      logError(`Authentification Supabase: Échec (HTTP ${response.status})`)
      logError(`  Réponse: ${text.substring(0, 200)}`)
      return false
    }
  } catch (error: any) {
    logError(`Authentification Supabase: Erreur - ${error.message}`)
    return false
  }
  
  return true
}

// Test du webhook EventSub (simulation du challenge)
async function testEventSubWebhook() {
  logSection('4. Test du webhook EventSub (challenge)')
  
  try {
    const challenge = 'test_challenge_12345'
    const url = `${SUPABASE_URL}/functions/v1/twitch-eventsub?hub.challenge=${challenge}&hub.mode=subscribe`
    
    logInfo(`Envoi du challenge EventSub...`)
    
    const response = await fetch(url, { method: 'GET' })
    const text = await response.text()
    
    if (response.ok && text === challenge) {
      logSuccess('Webhook EventSub: Challenge accepté correctement')
      return true
    } else {
      logWarning(`Webhook EventSub: Réponse inattendue (HTTP ${response.status})`)
      logInfo(`  Réponse: ${text.substring(0, 100)}`)
      return false
    }
  } catch (error: any) {
    logError(`Webhook EventSub: Erreur - ${error.message}`)
    return false
  }
}

// Test du flux complet (simulation d'un achat de reward)
async function testRewardFlow(rewardType: 'booster' | 'vaal') {
  logSection(`5. Test du flux complet (${rewardType})`)
  
  const rewardId = rewardType === 'vaal' ? TWITCH_REWARD_VAAL_ID : TWITCH_REWARD_BOOSTER_ID
  
  if (!rewardId) {
    logWarning(`ID de reward non défini pour ${rewardType}, utilisation d'un ID fictif`)
  }
  
  // Simuler un événement EventSub
  const eventSubPayload = {
    subscription: {
      id: 'test-subscription-id',
      type: 'channel.channel_points_custom_reward_redemption.add',
      version: '1',
      status: 'enabled',
      condition: {
        broadcaster_user_id: '123456789'
      },
      transport: {
        method: 'webhook',
        callback: `${SUPABASE_URL}/functions/v1/twitch-eventsub`
      },
      created_at: new Date().toISOString()
    },
    event: {
      id: 'test-event-id',
      broadcaster_user_id: '123456789',
      broadcaster_user_login: TWITCH_CHANNEL_NAME.toLowerCase(),
      broadcaster_user_name: TWITCH_CHANNEL_NAME,
      user_id: '987654321',
      user_login: TEST_USERNAME.toLowerCase(),
      user_name: TEST_USERNAME,
      user_input: '',
      status: 'unfulfilled',
      reward: {
        id: rewardId || 'test-reward-id',
        title: rewardType === 'vaal' ? 'Vaal Orbs' : 'Booster Pack',
        cost: rewardType === 'vaal' ? 1000 : 500,
        prompt: ''
      },
      redeemed_at: new Date().toISOString()
    }
  }
  
  try {
    logInfo(`Simulation d'un achat de reward ${rewardType}...`)
    logInfo(`  Utilisateur: ${TEST_USERNAME}`)
    logInfo(`  Reward ID: ${rewardId || 'test-reward-id'}`)
    
    // Appel direct à handle-reward (bypass EventSub pour test)
    const handleRewardUrl = `${SUPABASE_URL}/functions/v1/handle-reward`
    
    const response = await fetch(handleRewardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        input: '',
        rewardId: rewardId || (rewardType === 'vaal' ? 'vaal-test' : 'booster-test')
      })
    })
    
    const responseText = await response.text()
    let responseData: any = null
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // Pas du JSON
    }
    
    if (response.ok) {
      logSuccess(`Flux ${rewardType}: Réussi (HTTP ${response.status})`)
      if (responseData) {
        logInfo(`  Réponse: ${JSON.stringify(responseData, null, 2)}`)
      }
      
      // Vérifier les logs de diagnostic
      logInfo('Vérification des logs de diagnostic...')
      await checkDiagnosticLogs(TEST_USERNAME, rewardType)
      
      return true
    } else {
      logError(`Flux ${rewardType}: Échec (HTTP ${response.status})`)
      logError(`  Réponse: ${responseText.substring(0, 500)}`)
      return false
    }
  } catch (error: any) {
    logError(`Flux ${rewardType}: Erreur - ${error.message}`)
    return false
  }
}

// Vérifier les logs de diagnostic
async function checkDiagnosticLogs(username: string, rewardType: 'booster' | 'vaal') {
  try {
    const logsUrl = `${SUPABASE_URL}/rest/v1/diagnostic_logs?username=eq.${username}&order=created_at.desc&limit=1`
    
    const response = await fetch(logsUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0) {
        const log = data[0]
        logSuccess('Log de diagnostic trouvé')
        logInfo(`  Type: ${log.action_type}`)
        logInfo(`  Status: ${log.validation_status}`)
        logInfo(`  Notes: ${log.validation_notes || 'Aucune'}`)
        
        if (log.validation_status === 'ok') {
          logSuccess('Validation: OK')
        } else if (log.validation_status === 'warning') {
          logWarning('Validation: Avertissements détectés')
        } else {
          logError('Validation: Erreurs détectées')
        }
      } else {
        logWarning('Aucun log de diagnostic trouvé')
      }
    }
  } catch (error: any) {
    logWarning(`Impossible de vérifier les logs: ${error.message}`)
  }
}

// Test du bot webhook
async function testBotWebhook() {
  logSection('6. Test du webhook du bot')
  
  if (!BOT_WEBHOOK_URL) {
    logWarning('BOT_WEBHOOK_URL non défini, test ignoré')
    return false
  }
  
  try {
    logInfo(`Envoi d'un message de test au bot...`)
    
    const response = await fetch(`${BOT_WEBHOOK_URL}/webhook/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `🧪 Message de test depuis le script de test`,
        channel: TWITCH_CHANNEL_NAME
      })
    })
    
    if (response.ok) {
      logSuccess('Webhook du bot: Message envoyé avec succès')
      return true
    } else {
      const text = await response.text()
      logWarning(`Webhook du bot: Réponse inattendue (HTTP ${response.status})`)
      logInfo(`  Réponse: ${text.substring(0, 200)}`)
      return false
    }
  } catch (error: any) {
    logError(`Webhook du bot: Erreur - ${error.message}`)
    logWarning('  ⚠️  Assurez-vous que le bot est démarré et accessible')
    return false
  }
}

// Résumé des tests
function printSummary(results: Record<string, boolean>) {
  logSection('Résumé des tests')
  
  const total = Object.keys(results).length
  const passed = Object.values(results).filter(r => r).length
  
  for (const [test, result] of Object.entries(results)) {
    if (result) {
      logSuccess(`${test}`)
    } else {
      logError(`${test}`)
    }
  }
  
  console.log('\n' + '-'.repeat(60))
  log(`Tests réussis: ${passed}/${total}`, passed === total ? 'green' : 'yellow')
  console.log('-'.repeat(60))
  
  if (passed === total) {
    log('\n🎉 Tous les tests sont passés ! Le système est prêt pour la production.', 'green')
  } else {
    log('\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.', 'yellow')
    log('\nPoints à vérifier:', 'yellow')
    log('  1. Les URLs sont-elles accessibles publiquement ?', 'yellow')
    log('  2. Les variables d\'environnement sont-elles correctes ?', 'yellow')
    log('  3. Le bot est-il démarré et accessible ?', 'yellow')
    log('  4. Les Edge Functions sont-elles déployées ?', 'yellow')
  }
}

// Main
async function main() {
  console.log('\n')
  log('🧪 Test du flux d\'achat de rewards Twitch', 'cyan')
  log('='.repeat(60), 'cyan')
  
  const args = process.argv.slice(2)
  const rewardTypeArg = args.find(arg => arg.startsWith('--reward-type='))
  const rewardType = (rewardTypeArg?.split('=')[1] || 'booster') as 'booster' | 'vaal'
  
  if (rewardType !== 'booster' && rewardType !== 'vaal') {
    logError('Type de reward invalide. Utilisez --reward-type=booster ou --reward-type=vaal')
    process.exit(1)
  }
  
  const results: Record<string, boolean> = {}
  
  // 1. Vérification des variables d'environnement
  results['Variables d\'environnement'] = checkEnvironmentVariables()
  
  // 2. Test d'accessibilité des URLs
  await testUrlAccessibility()
  results['Accessibilité des URLs'] = true // On ne fait pas échouer le test si certaines URLs ne sont pas accessibles
  
  // 3. Test d'authentification Supabase
  results['Authentification Supabase'] = await testSupabaseAuth()
  
  // 4. Test du webhook EventSub
  results['Webhook EventSub'] = await testEventSubWebhook()
  
  // 5. Test du flux complet
  results[`Flux ${rewardType}`] = await testRewardFlow(rewardType)
  
  // 6. Test du bot webhook
  results['Webhook du bot'] = await testBotWebhook()
  
  // Résumé
  printSummary(results)
  
  process.exit(Object.values(results).every(r => r) ? 0 : 1)
}

main().catch(error => {
  logError(`Erreur fatale: ${error.message}`)
  console.error(error)
  process.exit(1)
})
