/**
 * Messages pour les commandes batch (!booster X, !vaals X)
 *
 * TOUS les messages sont centralisés ici pour faciliter la modification.
 * Variables disponibles:
 * - {username}      : Nom du joueur Twitch
 * - {card}          : Nom de la carte (avec sparkle si foil)
 * - {count}         : Nombre d'utilisations accordées
 * - {requested}     : Nombre demandé
 * - {total}         : Total de Vaal Orbs ajoutés
 * - {newTotal}      : Nouveau total de Vaal Orbs
 * - {timeUntilReset}: Temps restant avant reset (ex: "3h45")
 *
 * Pour ajouter un nouveau message, ajoutez-le simplement dans le tableau correspondant.
 */

import type { BatchMessageVariables } from './types.ts'

export const BATCH_COMMAND_MESSAGES = {
  // ============================================================================
  // ANNONCES T0 (messages publics dans le chat)
  // Utilisés quand un T0 est obtenu dans un batch de boosters
  // ============================================================================
  t0Announcement: {
    /** Messages pour T0 non-foil */
    normal: [
      "UN T0 ! @{username} drop {card} ! GG Exile !",
      "POGGERS ! @{username} obtient {card} ! La chance est avec toi !",
      "{card} pour @{username} ! Beni par Kuduku !",
      "HOLY ! @{username} unbox {card} ! Les T0 existent vraiment !",
      "Les dieux du RNG sourient a @{username} : {card} !",
      "@{username} decouvre {card} dans son batch ! JACKPOT !",
      "Zana approuve : {card} pour @{username} !",
      "T0 ALERT ! @{username} repart avec {card} !",
    ],
    /** Messages pour T0 foil (encore plus rare) */
    foil: [
      "T0 FOIL ! @{username} drop {card} FOIL ! LEGENDAIRE !",
      "LA FOLIE ! @{username} obtient {card} EN FOIL ! Impossible !",
      "LEGENDARY ! {card} FOIL pour @{username} ! On ne voit ca qu'une fois !",
      "@{username} realise l'impossible : {card} FOIL !",
      "MIRROR-TIER RNG ! @{username} unbox {card} FOIL ! *chef's kiss*",
      "Chris Wilson pleure : @{username} a {card} FOIL !",
      "INJECT THIS INTO MY VEINS ! {card} FOIL pour @{username} !",
      "T0 FOIL ALERT ! @{username} entre dans la legende avec {card} !",
    ],
  },

  // ============================================================================
  // BOOSTER BATCH - Messages courts pour le chat
  // ============================================================================
  boosterBatch: {
    /** Ouverture reussie (count = requested) */
    success: [
      "@{username} ouvre {count} boosters ! Check tes whispers pour le recap !",
      "{count}x boosters pour @{username} ! Details en DM !",
      "BATCH OPEN ! @{username} deballe {count} boosters. Recap en whisper !",
    ],
    /** Ouverture partielle (count < requested car limite atteinte) */
    partial: [
      "@{username} ouvre {count}/{requested} boosters (limite atteinte). Recap en whisper !",
      "{count} boosters pour @{username}, limite quotidienne atteinte ! Details en DM.",
      "Limite ! @{username} n'ouvre que {count}/{requested} boosters. Recap en DM.",
    ],
    /** Limite deja atteinte (count = 0) */
    limitReached: [
      "@{username}, Zana refuse - limite quotidienne atteinte ! Reviens dans {timeUntilReset}.",
      "Pas de boosters pour @{username} aujourd'hui ! Reviens dans {timeUntilReset}, Exile !",
      "@{username}, les maps sont epuisees ! Rendez-vous dans {timeUntilReset}.",
    ],
  },

  // ============================================================================
  // VAALS BATCH - Messages courts pour le chat
  // ============================================================================
  vaalsBatch: {
    /** Reception reussie (count = requested) */
    success: [
      "@{username} recoit {total} Vaal Orbs ({count}x5) ! Total: {newTotal}",
      "{count}x Vaals pour @{username} ! +{total} orbs, total: {newTotal}",
      "BATCH VAALS ! @{username} gagne {total} Vaal Orbs ! Nouveau total: {newTotal}",
    ],
    /** Reception partielle (count < requested car limite atteinte) */
    partial: [
      "@{username} recoit {total} Vaal Orbs ({count}/{requested} uses). Total: {newTotal}",
      "Limite ! @{username} ne recoit que {total} orbs ({count}/{requested}). Total: {newTotal}",
    ],
    /** Limite deja atteinte */
    limitReached: [
      "@{username}, le temple d'Atziri est epuise ! Reviens dans {timeUntilReset}.",
      "Atziri refuse @{username} - reviens dans {timeUntilReset} !",
      "@{username}, plus de Vaal pour aujourd'hui ! Rendez-vous dans {timeUntilReset}.",
    ],
  },

  // ============================================================================
  // WHISPER RECAP - Templates pour les messages prives
  // Note: Les whispers Twitch ont une limite de ~500 caracteres
  // ============================================================================
  whisperRecap: {
    /** En-tete du recap booster */
    boosterHeader: "RECAP BATCH: {count} boosters, {totalCards} cartes",
    /** Format pour chaque ligne de carte (genere par code) */
    cardLineFormat: "- {card} ({tier})",
    /** Resume a la fin */
    boosterSummary: "Total: {normalCount} normales, {foilCount} foils",
    /** Breakdown par tier */
    tierBreakdown: "Tiers: {t0}x T0, {t1}x T1, {t2}x T2, {t3}x T3",
    /** Recap pour les vaals (plus simple) */
    vaalsRecap: "RECAP VAALS: +{total} orbs ({count}x5). Nouveau total: {newTotal}",
    /** Lien vers la collection avec historique */
    collectionLink: "Voir ton historique: {link}",
  },

  // ============================================================================
  // FALLBACK CHAT - Messages si le whisper echoue
  // Utilises quand le whisper ne peut pas etre envoye (DMs desactives, etc.)
  // ============================================================================
  chatFallback: {
    /** Fallback booster avec pulls rares */
    boosterWithRares: [
      "@{username}, {count} boosters ouverts ! Pulls rares: {rareCards}. Historique: {link}",
      "@{username} unbox {count} boosters avec {rareCards} ! Details: {link}",
    ],
    /** Fallback booster sans pulls rares */
    boosterNoRares: [
      "@{username}, {count} boosters ouverts ! Pas de chance cette fois. Historique: {link}",
      "@{username} ouvre {count} boosters, rien de ouf. Check ton historique: {link}",
    ],
    /** Fallback vaals */
    vaals: [
      "@{username}, +{total} Vaal Orbs ! Total: {newTotal}. Collection: {link}",
    ],
  },
}

/** URL de base pour la collection */
export const COLLECTION_URL = "https://le-collecteur-de-dose.vercel.app/collection"

/** URL avec query pour ouvrir la modal historique */
export const HISTORY_URL = `${COLLECTION_URL}?modal=history`

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Choisit un message au hasard dans un tableau
 */
export function getRandomBatchMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Remplace les variables dans un template de message
 */
export function formatBatchMessage(
  template: string,
  variables: BatchMessageVariables
): string {
  let result = template

  const replacements: Record<string, string | undefined> = {
    username: variables.username,
    card: variables.card,
    count: variables.count?.toString(),
    requested: variables.requested?.toString(),
    total: variables.total?.toString(),
    newTotal: variables.newTotal?.toString(),
    timeUntilReset: variables.timeUntilReset,
    normalCount: variables.normalCount?.toString(),
    foilCount: variables.foilCount?.toString(),
    totalCards: variables.normalCount !== undefined && variables.foilCount !== undefined
      ? (variables.normalCount + variables.foilCount).toString()
      : undefined,
    t0: variables.t0?.toString(),
    t1: variables.t1?.toString(),
    t2: variables.t2?.toString(),
    t3: variables.t3?.toString(),
    rareCards: variables.rareCards,
    link: variables.link,
  }

  for (const [key, value] of Object.entries(replacements)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
  }

  return result
}

/**
 * Obtient un message T0 aleatoire et formate
 */
export function getRandomT0Message(
  isFoil: boolean,
  username: string,
  cardName: string
): string {
  const messages = isFoil
    ? BATCH_COMMAND_MESSAGES.t0Announcement.foil
    : BATCH_COMMAND_MESSAGES.t0Announcement.normal

  const template = getRandomBatchMessage(messages)
  const card = isFoil ? `${cardName} ✨` : cardName

  return formatBatchMessage(template, { username, card })
}

/**
 * Obtient un message de reponse batch et formate
 */
export function getRandomBatchResponse(
  type: 'booster' | 'vaals',
  status: 'success' | 'partial' | 'limitReached',
  variables: BatchMessageVariables
): string {
  const messageKey = type === 'booster' ? 'boosterBatch' : 'vaalsBatch'
  const messages = BATCH_COMMAND_MESSAGES[messageKey][status]

  const template = getRandomBatchMessage(messages)
  return formatBatchMessage(template, variables)
}

/**
 * Formate le recap whisper pour les boosters
 * Gere le chunking si le message est trop long
 * Inclut le lien vers l'historique a la fin
 */
export function formatBoosterWhisperRecap(
  cards: Array<{ name: string; tier: string; is_foil: boolean }>,
  summary: {
    total_cards: number
    total_foils: number
    tier_counts: { T0: number; T1: number; T2: number; T3: number }
  },
  count: number
): string[] {
  const chunks: string[] = []

  // Header
  const header = formatBatchMessage(
    BATCH_COMMAND_MESSAGES.whisperRecap.boosterHeader,
    {
      count,
      normalCount: summary.total_cards - summary.total_foils,
      foilCount: summary.total_foils,
    }
  )

  // Card list (group by tier for readability)
  const cardsByTier: Record<string, string[]> = { T0: [], T1: [], T2: [], T3: [] }
  for (const card of cards) {
    const cardStr = card.is_foil ? `${card.name} ✨` : card.name
    cardsByTier[card.tier]?.push(cardStr)
  }

  // Build card list string
  let cardList = ''
  for (const tier of ['T0', 'T1', 'T2', 'T3']) {
    if (cardsByTier[tier].length > 0) {
      cardList += `[${tier}] ${cardsByTier[tier].join(', ')} | `
    }
  }
  cardList = cardList.slice(0, -3) // Remove trailing " | "

  // Summary
  const summaryLine = formatBatchMessage(
    BATCH_COMMAND_MESSAGES.whisperRecap.boosterSummary,
    {
      normalCount: summary.total_cards - summary.total_foils,
      foilCount: summary.total_foils,
    }
  )

  // Collection link
  const linkLine = formatBatchMessage(
    BATCH_COMMAND_MESSAGES.whisperRecap.collectionLink,
    { link: HISTORY_URL }
  )

  // Combine and chunk if needed (Twitch whisper limit ~500 chars)
  const fullMessage = `${header} | ${cardList} | ${summaryLine}`

  if (fullMessage.length <= 400) {
    // Everything fits in one message + link
    chunks.push(fullMessage)
    chunks.push(linkLine)
  } else {
    // Split into multiple whispers
    chunks.push(header)

    // Chunk card list
    const maxChunkSize = 400
    let currentChunk = ''
    for (const tier of ['T0', 'T1', 'T2', 'T3']) {
      if (cardsByTier[tier].length > 0) {
        const tierStr = `[${tier}] ${cardsByTier[tier].join(', ')}`
        if (currentChunk.length + tierStr.length > maxChunkSize) {
          if (currentChunk) chunks.push(currentChunk)
          currentChunk = tierStr
        } else {
          currentChunk += (currentChunk ? ' | ' : '') + tierStr
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk)

    chunks.push(summaryLine)
    chunks.push(linkLine)
  }

  return chunks
}

/**
 * Formate un message de fallback chat pour les boosters
 * Utilise quand le whisper echoue
 */
export function formatBoosterChatFallback(
  username: string,
  count: number,
  rareCards: Array<{ name: string; tier: string; is_foil: boolean }>
): string {
  const hasRares = rareCards.length > 0

  // Format rare cards list (T0 and T1 only)
  let rareCardsStr = ''
  if (hasRares) {
    rareCardsStr = rareCards
      .map(c => c.is_foil ? `${c.name} ✨` : c.name)
      .join(', ')
  }

  const messages = hasRares
    ? BATCH_COMMAND_MESSAGES.chatFallback.boosterWithRares
    : BATCH_COMMAND_MESSAGES.chatFallback.boosterNoRares

  const template = getRandomBatchMessage(messages)

  return formatBatchMessage(template, {
    username,
    count,
    rareCards: rareCardsStr,
    link: HISTORY_URL,
  })
}

/**
 * Formate un message de fallback chat pour les vaals
 * Utilise quand le whisper echoue
 */
export function formatVaalsChatFallback(
  username: string,
  total: number,
  newTotal: number
): string {
  const template = getRandomBatchMessage(BATCH_COMMAND_MESSAGES.chatFallback.vaals)

  return formatBatchMessage(template, {
    username,
    total,
    newTotal,
    link: COLLECTION_URL,
  })
}
