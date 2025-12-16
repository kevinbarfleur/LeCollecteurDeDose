/**
 * Messages de triggers pour le bot Twitch
 *
 * Ce fichier centralise tous les messages affichés dans le chat Twitch
 * lors des triggers automatiques. Facile à modifier sans toucher à la logique.
 *
 * Variables disponibles (utilisez {nomVariable} dans les messages):
 * - {username}       : Nom du joueur ciblé
 * - {card}           : Nom de la carte avec le sparkle si foil (ex: "The Doctor" ou "The Doctor ✨")
 * - {oldCard}        : Ancienne carte avant reroll
 * - {newCard}        : Nouvelle carte après reroll
 * - {targetUsername} : Autre joueur (pour tradeScam)
 * - {boostPercent}   : Pourcentage de boost (pour atlasInfluence)
 */

export type TriggerMessageType = 'success' | 'failure' | 'failureNoTarget' | 'failureNoCards'

export interface TriggerMessages {
  [key: string]: {
    [K in TriggerMessageType]?: string[]
  }
}

export const triggerMessages: TriggerMessages = {
  // ============================================================================
  // BLESSING OF RNGESUS - Donne +1 Vaal Orb (toujours succès)
  // ============================================================================
  blessingRNGesus: {
    success: [
      "✨ @{username} reçoit la bénédiction de RNGesus ! +1 Vaal Orb",
      "✨ RNGesus sourit à @{username} ! +1 Vaal Orb",
      "✨ Les dieux du RNG favorisent @{username} ! +1 Vaal Orb",
      "✨ @{username} a prié au bon autel ! +1 Vaal Orb",
      "✨ La chance sourit à @{username} ! +1 Vaal Orb béni"
    ]
  },

  // ============================================================================
  // CARTOGRAPHER'S GIFT - Donne une carte random (non-foil, toujours succès)
  // ============================================================================
  cartographersGift: {
    success: [
      "🗺️ Le Cartographe offre {card} à @{username} !",
      "🗺️ @{username} trouve {card} sur une map oubliée !",
      "🗺️ Une map révèle {card} pour @{username} !",
      "🗺️ Le Cartographe récompense @{username} avec {card} !",
      "🗺️ @{username} découvre {card} dans l'Atlas !"
    ]
  },

  // ============================================================================
  // MIRROR-TIER MOMENT - Duplique une carte aléatoire
  // ============================================================================
  mirrorTier: {
    success: [
      "💎 MIRROR-TIER ! @{username} duplique {card} !",
      "💎 @{username} trouve un Mirror ! {card} est dupliquée !",
      "💎 LÉGENDAIRE ! @{username} mirror {card} !",
      "💎 Le Mirror of Kalandra bénit @{username} ! +1 {card}",
      "💎 @{username} réalise l'impossible : mirror sur {card} !"
    ],
    failure: [
      "💎 @{username} cherche un Mirror of Kalandra... mais sa collection est vide.",
      "💎 @{username} rêve d'un Mirror... mais n'a rien à dupliquer.",
      "💎 Le Mirror de @{username} ne reflète que le vide...",
      "💎 @{username} trouve un Mirror ! Mais... rien à copier.",
      "💎 \"No items to mirror\" - Le Mirror ignore @{username}"
    ]
  },

  // ============================================================================
  // EINHAR APPROVED - Transforme une carte normale en foil
  // ============================================================================
  einharApproved: {
    success: [
      "🦎 \"A worthy capture!\" Einhar transforme {card} de @{username} en FOIL ✨",
      "🦎 Einhar capture {card} de @{username} ! C'est maintenant FOIL ✨",
      "🦎 \"Ha ha! You are captured!\" - {card} devient FOIL ✨ pour @{username}",
      "🦎 La bête rouge bénit @{username} ! {card} est maintenant FOIL ✨",
      "🦎 Einhar approuve @{username} ! {card} brille maintenant ✨"
    ],
    failure: [
      "🦎 Einhar regarde @{username}... \"You have nothing worth capturing, exile!\"",
      "🦎 \"Hm, no beasts here...\" Einhar ignore @{username}",
      "🦎 Einhar cherche une proie chez @{username}... mais ne trouve que du vide.",
      "🦎 \"Still sane, exile?\" Einhar s'en va sans rien capturer de @{username}",
      "🦎 La collection de @{username} n'intéresse pas Einhar..."
    ]
  },

  // ============================================================================
  // HEIST TAX - Vole 1 Vaal Orb
  // ============================================================================
  heistTax: {
    success: [
      "💰 @{username} a été taxé par Heist ! -1 Vaal Orb",
      "💰 Les Rogues volent 1 Vaal Orb à @{username} !",
      "💰 @{username} se fait pickpocket ! -1 Vaal Orb",
      "💰 \"Nothing personal, exile.\" Les voleurs prennent 1 Vaal à @{username}",
      "💰 Heist réussi ! @{username} perd 1 Vaal Orb"
    ],
    failure: [
      "💰 @{username} n'a rien à voler... Heist repart bredouille.",
      "💰 Les Rogues fouillent @{username}... poches vides !",
      "💰 Heist annulé : @{username} n'a pas de Vaal Orbs",
      "💰 \"This one's broke!\" Les voleurs ignorent @{username}",
      "💰 @{username} est trop pauvre pour être volé..."
    ]
  },

  // ============================================================================
  // SIRUS VOICE LINE - Détruit une carte aléatoire
  // ============================================================================
  sirusVoice: {
    success: [
      "💀 \"Die.\" - Sirus détruit {card} de @{username}",
      "💀 \"Feel the thrill of the void!\" Sirus élimine {card} de @{username}",
      "💀 La météorite de Sirus frappe {card} de @{username} !",
      "💀 \"Everlasting darkness...\" @{username} perd {card}",
      "💀 Sirus DIE beam sur @{username} ! {card} est détruite"
    ],
    failure: [
      "💀 Sirus regarde @{username}... \"Tu n'as rien à perdre.\"",
      "💀 \"Interesting...\" Sirus épargne @{username} qui n'a rien",
      "💀 Le meteor de Sirus rate @{username}... collection vide !",
      "💀 @{username} esquive Sirus ! (en fait, il n'avait rien)",
      "💀 Sirus cherche une cible... @{username} n'a rien d'intéressant."
    ]
  },

  // ============================================================================
  // ALCH & GO MISCLICK - Reroll une carte en une autre
  // ============================================================================
  alchMisclick: {
    success: [
      "⚗️ MISCLICK ! @{username} reroll {oldCard} → {newCard}",
      "⚗️ Oups ! @{username} alch accidentellement {oldCard} en {newCard}",
      "⚗️ @{username} rate son clic ! {oldCard} devient {newCard}",
      "⚗️ \"C'était pas la bonne!\" @{username} transforme {oldCard} → {newCard}",
      "⚗️ Fat fingers ! @{username} reroll {oldCard} en {newCard}"
    ],
    failure: [
      "⚗️ @{username} tente un Alch & Go... mais n'a rien à alch !",
      "⚗️ @{username} cherche quelque chose à alch... rien trouvé !",
      "⚗️ L'Orb of Alchemy de @{username} ne trouve pas de cible...",
      "⚗️ Misclick évité ! @{username} n'a rien à transformer",
      "⚗️ @{username} spam le clic... mais sa collection est vide !"
    ]
  },

  // ============================================================================
  // TRADE SCAM - Vole une carte d'un user pour la donner à un autre
  // ============================================================================
  tradeScam: {
    success: [
      "🤝 SCAM ! @{targetUsername} vole {card} à @{username} !",
      "🤝 Trade window scam ! @{targetUsername} repart avec {card} de @{username}",
      "🤝 @{targetUsername} arnaque @{username} ! {card} change de main",
      "🤝 \"Merci pour le trade!\" @{targetUsername} vole {card} à @{username}",
      "🤝 @{username} se fait scam ! {card} va chez @{targetUsername}"
    ],
    failureNoTarget: [
      "🤝 @{username} cherche une victime... mais personne n'est là !",
      "🤝 @{username} veut scam... mais le chat est vide !",
      "🤝 Tentative de scam ratée : @{username} est seul...",
      "🤝 @{username} ouvre un trade... avec personne.",
      "🤝 Pas de pigeon pour @{username} aujourd'hui !"
    ],
    failureNoCards: [
      "🤝 @{username} n'a rien à échanger... le scam échoue.",
      "🤝 @{username} tente un scam... mais n'a rien à offrir !",
      "🤝 Trade annulé : @{username} a une collection vide",
      "🤝 \"Montre ta collection\" - @{username} n'a rien...",
      "🤝 Le scam de @{username} échoue : rien à voler !"
    ]
  },

  // ============================================================================
  // CHRIS WILSON'S VISION - Retire le foil d'une carte foil
  // ============================================================================
  chrisVision: {
    success: [
      "👓 NERF ! Chris Wilson retire le foil de {card} de @{username}",
      "👓 \"This is a buff.\" Chris nerf le foil de {card} de @{username}",
      "👓 Patch notes: {card} de @{username} n'est plus foil",
      "👓 Chris Wilson balance @{username} ! {card} perd son foil",
      "👓 \"Working as intended.\" Le foil de {card} disparaît pour @{username}"
    ],
    failure: [
      "👓 Chris Wilson regarde @{username}... \"No foils to nerf here.\"",
      "👓 Chris cherche des foils chez @{username}... aucun trouvé !",
      "👓 Patch annulé : @{username} n'a pas de foils",
      "👓 \"Interesting build\" - Chris épargne @{username} (pas de foils)",
      "👓 Le nerf hammer ignore @{username}... pas de foils !"
    ]
  },

  // ============================================================================
  // ATLAS INFLUENCE - Buff temporaire +% chance foil au prochain autel
  // ============================================================================
  atlasInfluence: {
    success: [
      "🗺️ @{username} reçoit l'influence de l'Atlas ! +{boostPercent}% chance de foil au prochain autel",
      "🗺️ L'Atlas favorise @{username} ! +{boostPercent}% foil au prochain autel",
      "🗺️ Influence détectée ! @{username} gagne +{boostPercent}% de chance foil",
      "🗺️ Les Elderslayers bénissent @{username} ! +{boostPercent}% foil",
      "🗺️ @{username} conquiert l'Atlas ! Bonus foil +{boostPercent}% activé"
    ]
  }
}

/**
 * Récupère un message aléatoire pour un trigger donné
 *
 * @param trigger - Le type de trigger (ex: 'blessingRNGesus', 'mirrorTier', etc.)
 * @param type - Le type de message ('success', 'failure', 'failureNoTarget', 'failureNoCards')
 * @param replacements - Les variables à remplacer dans le message
 * @returns Le message formaté avec les variables remplacées
 *
 * @example
 * getRandomMessage('mirrorTier', 'success', { username: 'Player1', card: 'The Doctor ✨' })
 * // Retourne: "💎 MIRROR-TIER ! @Player1 duplique The Doctor ✨ !"
 */
export function getRandomMessage(
  trigger: string,
  type: TriggerMessageType,
  replacements: Record<string, string>
): string {
  const messages = triggerMessages[trigger]?.[type]

  if (!messages || messages.length === 0) {
    console.warn(`[TRIGGER] No messages found for trigger="${trigger}" type="${type}"`)
    return `❌ Message non configuré pour ${trigger}/${type}`
  }

  const template = messages[Math.floor(Math.random() * messages.length)]

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return replacements[key] !== undefined ? replacements[key] : match
  })
}

/**
 * Helper pour formater le nom d'une carte avec le sparkle si foil
 *
 * @param cardName - Le nom de la carte
 * @param isFoil - Si la carte est foil
 * @returns Le nom formaté (ex: "The Doctor ✨" ou "The Doctor")
 */
export function formatCardName(cardName: string, isFoil: boolean = false): string {
  return isFoil ? `${cardName} ✨` : cardName
}
