/**
 * Messages pour les Batch Events
 *
 * TOUS les messages sont centralisés ici pour faciliter la modification
 * Variables disponibles:
 * - {username} : Nom du joueur Twitch
 * - {card} : Nom de la carte affectée
 * - {count} : Nombre de joueurs (pour les messages de fin)
 * - {version} : Numéro de version du patch (ex: "3.27")
 * - {targetUsername} : Nom du joueur cible (pour steal)
 * - {tier} : Tier de la carte (T0, T1, T2, T3)
 *
 * Pour ajouter un nouveau message, ajoutez-le simplement dans le tableau correspondant
 */

export const BATCH_MESSAGES = {
  // ============================================================================
  // ANNONCES (message de début d'event)
  // ============================================================================
  announcements: {
    // BUFFS
    bow_meta:
      "🏹 BREAKING NEWS: GGG confirme que les arcs sont 'underperforming'... Buff incoming pour les bowcucks !",
    caster_supremacy:
      '🔮 Les arcanes s\'éveillent ! GGG buff les builds caster... "We felt casters were underperforming."',
    divine_blessing:
      '✨ Les dieux de Wraeclast sourient aux exilés ! Une bénédiction divine descend sur le royaume...',

    // NERFS
    melee_funeral:
      '⚔️ "Melee is in a good place" - Chris Wilson, avant de nerf melee pour la 47ème fois...',
    harvest_nerf:
      '🌿 "Harvest was too deterministic and made other content feel bad." - Les foils perdent leur éclat...',
    aura_stacker_rip:
      "🔊 ALERTE NERF: Les Aura Stackers ont été détectés... GGG active le protocole d'extermination !",

    // EVENTS SPECIAUX
    vaal_roulette:
      '🎰 Atziri ouvre les portes du Temple ! Corruption obligatoire pour tous les exilés... Vaal or no balls !',
    mirror_event:
      '💎 ALERTE MIRROR ! Un Mirror of Kalandra a été trouvé dans Wraeclast... Tout le monde en profite !',
    heist_gone_wrong:
      '💰 ALERTE HEIST ! Les Rogues de Tibbs ont infiltré le chat... Vos cartes ne sont plus en sécurité !',
    steelmage_rip:
      '☠️ "NOOOOO!" - Un Steelmage RIP moment se produit. Vos meilleurs items sont en danger !',

    // LEAGUE EVENTS
    league_start:
      '🎮 NOUVELLE LEAGUE ! Les serveurs sont stables (pour une fois). GGG distribue des cadeaux de bienvenue !',
    league_end_fire_sale:
      "🔥 FIN DE LEAGUE ! Plus rien n'a d'importance. GGG active le mode chaos total !",
    flashback_event:
      "⚡ FLASHBACK EVENT ! Tous les mods de league sont actifs. C'est le chaos, mais le bon chaos !",

    // MEMES
    path_of_math_drama:
      "🎭 DRAMA ALERT ! Un influenceur a été banni... Les répercussions se font sentir dans tout Wraeclast !",
    patch_notes:
      '📜 Les devs se sont réveillés, ils ont trouvé que certains builds étaient trop forts... Patch Notes {version} incoming !',

    // Legacy
    hotfix: '🔧 HOTFIX: "This is a buff" - Chris Wilson',
  },

  // ============================================================================
  // BUFF BOW (bowcucks) - Conversion en foil
  // ============================================================================
  buffBow: {
    success: [
      '🏹 @{username} reçoit le cadeau habituel pour les bowcucks ! {card} devient ✨ FOIL !',
      '🎯 GGG buff encore les arcs ! @{username} voit {card} devenir FOIL ✨',
      '"Cadeau habituel" - @{username} : {card} → FOIL ✨',
      '🏹 @{username} profite du buff arc ! {card} est maintenant ✨ FOIL !',
      '"We felt bows were underperforming" - {card} de @{username} brille maintenant ✨',
    ],
    noCards: [
      '🙏 @{username} Ce joueur est encore sauvable, il ne joue pas arc !',
      "✨ @{username} n'a pas succombé aux arcs... respect.",
      '🛡️ @{username} résiste à la tentation bowcuck !',
      "💪 @{username} : Pas d'arc = Pas de honte. GG !",
      "🎭 @{username} joue avec honneur, pas d'arcs dans sa collection !",
    ],
  },

  // ============================================================================
  // BUFF CASTER - Conversion en foil
  // ============================================================================
  buffCaster: {
    success: [
      "🔮 @{username} voit {card} briller d'une lueur arcane ! ✨ FOIL !",
      '🔮 Les arcanes bénissent @{username} ! {card} → FOIL ✨',
      '"Casters are fine" - {card} de @{username} devient FOIL ✨',
      '🔮 @{username} canalise les arcanes ! {card} resplendit ✨',
      '✨ Le pouvoir des casters s\'éveille chez @{username} ! {card} FOIL !',
    ],
    noCards: [
      "🔮 @{username} ne possède pas de wand... un vrai melee enjoyer ?",
      "🔮 @{username} n'a pas sucombé au caster meta !",
      '⚔️ @{username} préfère le combat rapproché, respect !',
      "🛡️ @{username} : Pas de wand, pas de problème !",
    ],
  },

  // ============================================================================
  // BUFF ALL (Divine Blessing) - Conversion en foil
  // ============================================================================
  buffAll: {
    success: [
      '✨ Les dieux bénissent @{username} ! {card} → FOIL !',
      '✨ @{username} reçoit la grâce divine ! {card} brille maintenant ✨',
      '🌟 Bénédiction divine pour @{username} ! {card} devient FOIL !',
      '✨ La lumière touche @{username} : {card} → FOIL ✨',
      '🙏 @{username} est béni ! {card} resplendit de mille feux ✨',
    ],
    noCards: [
      "✨ @{username} n'a pas de carte normale à bénir...",
      '🙏 @{username} a déjà tout en foil... ou rien du tout !',
      "✨ La bénédiction passe sur @{username}... mais il n'y a rien à améliorer.",
    ],
  },

  // ============================================================================
  // NERF MELEE - Destruction de cartes
  // ============================================================================
  nerfMelee: {
    success: [
      '⚔️ NERF MELEE ! @{username} perd {card} - "Melee is fine" - GGG',
      '💀 @{username} subit le nerf melee habituel : {card} détruite',
      '"We felt melee was overperforming" - {card} de @{username} est supprimée',
      '🗡️ Nerf melee classique ! @{username} dit adieu à {card}',
      '⚔️ @{username} : {card} disparaît - "Working as intended"',
      "💀 Le nerf melee frappe @{username} ! {card} n'existe plus.",
    ],
    noCards: [
      "🛡️ @{username} échappe au nerf melee (pas d'armes de corps à corps)",
      '✅ @{username} ne joue pas melee, épargné par GGG',
      '🎭 @{username} a évité le piège melee, bien joué !',
      '🏃 @{username} esquive le nerf melee - pas d\'armes CaC trouvées',
      '😌 @{username} respire : aucune arme melee à sacrifier',
    ],
  },

  // ============================================================================
  // NERF CASTER - Destruction de cartes
  // ============================================================================
  nerfCaster: {
    success: [
      '🔮 NERF CASTER ! @{username} perd {card} - Les arcanes se dissipent...',
      '💀 @{username} subit le nerf caster : {card} détruite',
      '"Casters had too much damage" - {card} de @{username} disparaît',
      '🔮 Le nerf frappe les casters ! @{username} perd {card}',
    ],
    noCards: [
      "🔮 @{username} n'a pas de wand à détruire...",
      '✅ @{username} ne joue pas caster, épargné !',
      "🛡️ @{username} esquive le nerf caster - pas d'items magiques",
    ],
  },

  // ============================================================================
  // NERF JEWELRY - Destruction de cartes
  // ============================================================================
  nerfJewelry: {
    success: [
      '💍 @{username} perd {card} ! Les bijoux sont ciblés !',
      '🔊 Nerf aura ! @{username} dit adieu à {card}',
      '💎 {card} de @{username} a été jugée trop puissante... supprimée !',
    ],
    noCards: [
      "💍 @{username} n'a pas de bijoux à détruire...",
      '✅ @{username} ne porte pas de bijoux, épargné !',
    ],
  },

  // ============================================================================
  // HARVEST NERF - Remove foil
  // ============================================================================
  harvestNerf: {
    success: [
      '🌿 Le foil de {card} de @{username} a été jugé trop déterministe...',
      '🌿 @{username} perd le foil de {card}. "Harvest was too powerful."',
      '🌿 "Too deterministic" - {card} de @{username} n\'est plus foil',
      '🌿 Le nerf Harvest frappe @{username} ! {card} perd son éclat ✨→📄',
    ],
    noCards: [
      "🌿 @{username} n'avait pas de foil à nerf... déjà poor !",
      '🌿 @{username} épargné par le nerf Harvest - pas de foil trouvé',
    ],
  },

  // ============================================================================
  // AURA STACKER NERF - Remove foil + destroy
  // ============================================================================
  auraStackerNerf: {
    success: [
      '🔊 NERF AURA ! Le foil de {card} de @{username} est supprimé !',
      '🔊 @{username} perd le foil de {card}. "Auras were problematic."',
      '🔊 Aura stacker détecté ! {card} de @{username} perd son foil',
    ],
    noCards: [
      "🔊 @{username} n'a pas de bijoux foil... pas un aura stacker !",
      '✅ @{username} ne stack pas les auras, épargné !',
    ],
  },

  // ============================================================================
  // VAAL ROULETTE - 50/50
  // ============================================================================
  vaalRoulette: {
    brick: [
      '🎰 BRICK ! @{username} corrompt {card}... POOF ! Disparue !',
      '🎰 @{username} Vaal {card}... "This item has been corrupted" → DÉTRUIT',
      '🎰 RIP ! La corruption détruit {card} de @{username}',
      '💀 VAAL BRICK ! @{username} perd {card} dans les flammes de la corruption',
      '🎰 "Vaal or no balls" - @{username} a Vaal... et a perdu {card}',
    ],
    upgrade: [
      '🎰 JACKPOT ! @{username} corrompt {card} → FOIL ✨',
      '🎰 @{username} gagne à la Vaal roulette ! {card} devient FOIL ✨',
      '🎰 Corruption parfaite ! {card} de @{username} brille maintenant ✨',
      '✨ VAAL SUCCESS ! @{username} transforme {card} en FOIL !',
      '🎰 "Vaal or no balls" - @{username} a Vaal... et a GAGNÉ ! {card} FOIL ✨',
    ],
    noCards: [
      "🎰 @{username} n'a rien à corrompre... collection vide !",
      '🎰 La corruption cherche une cible chez @{username}... mais ne trouve rien',
    ],
  },

  // ============================================================================
  // MIRROR EVENT - Duplication
  // ============================================================================
  mirrorEvent: {
    success: [
      '💎 MIRROR ! @{username} duplique {card} !',
      '💎 Le Mirror bénit @{username} ! +1 {card}',
      '💎 @{username} trouve un Mirror ! {card} a été dupliquée !',
      '✨ MIRROR OF KALANDRA ! @{username} reçoit une copie de {card}',
      '💎 La légende devient réalité ! @{username} duplique {card}',
    ],
    noCards: [
      "💎 @{username} n'a rien à mirror... collection vide !",
      '💎 Le Mirror cherche quelque chose chez @{username}... en vain',
    ],
  },

  // ============================================================================
  // HEIST - Vol de cartes
  // ============================================================================
  heist: {
    success: [
      '💰 HEIST ! @{targetUsername} vole {card} à @{username} !',
      '💰 Les Rogues frappent ! {card} passe de @{username} à @{targetUsername}',
      '💰 Vol réussi ! @{targetUsername} dérobe {card} à @{username}',
      '🎭 "Nothing personal, exile" - @{targetUsername} vole {card} à @{username}',
      '💰 Tibbs approuve ! {card} volée de @{username} → @{targetUsername}',
    ],
    noCards: [
      "💰 @{username} n'avait rien à voler... broke exile !",
      '💰 Les Rogues fouillent @{username}... poches vides !',
      '💰 Heist raté ! @{username} est trop pauvre pour être volé',
    ],
  },

  // ============================================================================
  // STEELMAGE RIP - Destruction high tier
  // ============================================================================
  steelmageRip: {
    success: [
      '☠️ "NOOOO!" @{username} perd {card} ({tier}) en HC ! RIP',
      '☠️ @{username} fait un Steelmage ! {card} ({tier}) est GONE',
      '☠️ F pour @{username} qui perd {card} ({tier}). "I should have logged out."',
      '💀 RIP HC ! @{username} perd {card} ({tier}) - moment Steelmage',
      '☠️ "At least I went down fighting" - @{username} perd {card} ({tier})',
    ],
    noCards: [
      "☠️ @{username} n'avait rien à perdre. Déjà mort inside.",
      '☠️ @{username} survit au RIP moment - pas de cartes high tier',
    ],
  },

  // ============================================================================
  // LEAGUE START - Cartes gratuites
  // ============================================================================
  leagueStart: {
    success: [
      '🎮 @{username} reçoit {card} ({tier}) pour le league start !',
      '🎮 GGG offre {card} ({tier}) à @{username} ! Welcome to the new league !',
      '🎮 Starter pack ! @{username} obtient {card} ({tier})',
      '🎮 Bienvenue exile ! @{username} reçoit {card} ({tier})',
    ],
  },

  // ============================================================================
  // LEAGUE END CHAOS - Random effects
  // ============================================================================
  leagueEndChaos: {
    buff: [
      '🔥 CHAOS ! @{username} gagne ! {card} → FOIL ✨',
      '🔥 Le chaos sourit à @{username} ! {card} devient FOIL ✨',
    ],
    nerf: [
      "🔥 CHAOS ! @{username} perd {card} ! C'est la fin de league !",
      '🔥 Le chaos frappe @{username} ! {card} disparaît !',
    ],
    nothing: [
      '🔥 @{username} survit au chaos de fin de league !',
      '🔥 Le chaos passe devant @{username}... sans le toucher',
    ],
  },

  // ============================================================================
  // FLASHBACK - Multiple effects
  // ============================================================================
  flashbackBuff: {
    success: [
      '⚡ FLASHBACK ! {card} de @{username} → FOIL ✨',
      '⚡ Le chaos du Flashback bénit @{username} ! {card} FOIL ✨',
    ],
    noCards: [
      '⚡ @{username} survit au flashback... pour l\'instant !',
    ],
  },
  flashbackGift: {
    success: [
      '⚡ @{username} trouve {card} ({tier}) dans le chaos du Flashback !',
      '⚡ Le Flashback offre {card} ({tier}) à @{username} !',
    ],
  },

  // ============================================================================
  // PATH OF MATH DRAMA - Vol + nerf
  // ============================================================================
  pathOfMathDrama: {
    steal: [
      '🎭 DRAMA ! @{targetUsername} "emprunte" {card} à @{username} !',
      '🎭 @{username} se fait... euh, voler {card} par @{targetUsername}',
      '🎭 "I didn\'t do anything wrong!" - {card} passe de @{username} à @{targetUsername}',
    ],
    nerf: [
      '🎭 Le drama continue ! {card} de @{username} perd son foil',
      '🎭 Dommage collatéral ! @{username} perd le foil de {card}',
    ],
    noCards: [
      '🎭 @{username} est trop pauvre pour le drama...',
      '🎭 Le drama évite @{username} - rien à prendre',
    ],
  },

  // ============================================================================
  // FIN D'EVENT (message de conclusion)
  // ============================================================================
  completion: {
    // BUFFS
    bow_meta: '🏹 Bow Meta activé ! {count} joueurs ont reçu le cadeau habituel. "This is a buff."',
    caster_supremacy: '🔮 Caster Supremacy confirmée ! {count} joueurs ont vu leurs wands briller. Nerf incoming dans 3... 2...',
    divine_blessing: '✨ Bénédiction Divine accordée à {count} exilés ! Que la lumière guide vos builds.',

    // NERFS
    melee_funeral: '⚔️ Melee Funeral terminé. {count} joueurs ont perdu leurs armes. F in chat. "This is a buff."',
    harvest_nerf: '🌿 Harvest nerfé. {count} items ont perdu leur foil. "We\'re monitoring the situation."',
    aura_stacker_rip: '🔊 Aura Stacker purge terminée. {count} joueurs ont été rééquilibrés. "Auras were too powerful."',

    // EVENTS SPECIAUX
    vaal_roulette: '🎰 Vaal Roulette terminée ! {count} exilés ont tenté leur chance. Certains pleurent, d\'autres brillent ✨',
    mirror_event: '💎 Mirror Event terminé ! {count} exilés ont dupliqué leurs cartes. "Still sane, exile?"',
    heist_gone_wrong: '💰 Heist terminé ! {count} transferts de cartes effectués. "Nothing personal, exile."',
    steelmage_rip: '☠️ RIP. {count} exilés ont perdu leur meilleur loot. "At least I went down fighting." - Steelmage',

    // LEAGUE EVENTS
    league_start: '🎮 League Start réussi ! {count} exilés ont reçu leur starter pack. Queue time: 0 minutes (menteur).',
    league_end_fire_sale: '🔥 Fire Sale terminée ! {count} joueurs ont vécu le chaos. See you next league!',
    flashback_event: '⚡ Flashback terminé ! {count} exilés ont survécu au chaos. RIP les serveurs.',

    // MEMES
    path_of_math_drama: '🎭 Drama terminé. {count} joueurs ont été affectés. "I didn\'t do anything wrong!" - Personne jamais',
    patch_notes: '✅ Patch Notes {version} appliqué à {count} joueurs ! Melee is fine.',

    // Legacy
    hotfix: '🔧 Hotfix terminé. {count} joueurs affectés.',
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Choisit un message au hasard dans un tableau
 */
export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Remplace les variables dans un message
 */
export function formatMessage(
  template: string,
  variables: {
    username?: string
    card?: string
    count?: number
    version?: string
    targetUsername?: string
    tier?: string
  }
): string {
  let result = template
  if (variables.username) {
    result = result.replace(/{username}/g, variables.username)
  }
  if (variables.card) {
    result = result.replace(/{card}/g, variables.card)
  }
  if (variables.count !== undefined) {
    result = result.replace(/{count}/g, variables.count.toString())
  }
  if (variables.version) {
    result = result.replace(/{version}/g, variables.version)
  }
  if (variables.targetUsername) {
    result = result.replace(/{targetUsername}/g, variables.targetUsername)
  }
  if (variables.tier) {
    result = result.replace(/{tier}/g, variables.tier)
  }
  return result
}
