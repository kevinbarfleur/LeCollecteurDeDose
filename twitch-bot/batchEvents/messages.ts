/**
 * Messages pour les Batch Events
 *
 * TOUS les messages sont centralisés ici pour faciliter la modification
 * Variables disponibles:
 * - {username} : Nom du joueur Twitch
 * - {card} : Nom de la carte affectée
 * - {count} : Nombre de joueurs (pour les messages de fin)
 * - {version} : Numéro de version du patch (ex: "3.27")
 *
 * Pour ajouter un nouveau message, ajoutez-le simplement dans le tableau correspondant
 */

export const BATCH_MESSAGES = {
  // ============================================================================
  // ANNONCES (message de début d'event)
  // ============================================================================
  announcements: {
    patch_notes:
      "📜 Les devs se sont réveillés, ils ont trouvé que certains builds étaient trop forts... Patch Notes {version} incoming !",
    hotfix: '🔧 HOTFIX: "This is a buff" - Chris Wilson',
    league_start: "🎮 NOUVEAU LEAGUE ! Tout le monde reçoit des buffs de départ !",
    // Ajoute tes propres annonces ici...
  },

  // ============================================================================
  // BUFF BOW (bowcucks) - Conversion en foil
  // ============================================================================
  buffBow: {
    success: [
      "🏹 @{username} reçoit le cadeau habituel pour les bowcucks ! {card} devient ✨ FOIL !",
      "🎯 GGG buff encore les arcs ! @{username} voit {card} devenir FOIL ✨",
      '🏹 "Cadeau habituel" - @{username} : {card} → FOIL ✨',
      "🏹 @{username} profite du buff arc ! {card} est maintenant ✨ FOIL !",
      '🎯 "We felt bows were underperforming" - {card} de @{username} brille maintenant ✨',
      // Ajoute tes variantes ici...
    ],
    noCards: [
      "🙏 @{username} Ce joueur est encore sauvable, il ne joue pas arc !",
      "✨ @{username} n'a pas succombé aux arcs... respect.",
      "🛡️ @{username} résiste à la tentation bowcuck !",
      "💪 @{username} : Pas d'arc = Pas de honte. GG !",
      "🎭 @{username} joue avec honneur, pas d'arcs dans sa collection !",
      // Ajoute tes variantes ici...
    ],
  },

  // ============================================================================
  // NERF MELEE - Destruction de cartes
  // ============================================================================
  nerfMelee: {
    success: [
      '⚔️ NERF MELEE ! @{username} perd {card} - "Melee is fine" - GGG',
      "💀 @{username} subit le nerf melee habituel : {card} détruite",
      '⚔️ "We felt melee was overperforming" - {card} de @{username} est supprimée',
      "🗡️ Nerf melee classique ! @{username} dit adieu à {card}",
      '⚔️ @{username} : {card} disparaît - "Working as intended"',
      "💀 Le nerf melee frappe @{username} ! {card} n'existe plus.",
      // Ajoute tes variantes ici...
    ],
    noCards: [
      "🛡️ @{username} échappe au nerf melee (pas d'armes de corps à corps)",
      "✅ @{username} ne joue pas melee, épargné par GGG",
      "🎭 @{username} a évité le piège melee, bien joué !",
      "🏃 @{username} esquive le nerf melee - pas d'armes CaC trouvées",
      "😌 @{username} respire : aucune arme melee à sacrifier",
      // Ajoute tes variantes ici...
    ],
  },

  // ============================================================================
  // FIN D'EVENT (message de conclusion)
  // ============================================================================
  completion: {
    patch_notes: "✅ Patch Notes {version} appliqué à {count} joueurs ! Melee is fine.",
    hotfix: "🔧 Hotfix terminé. {count} joueurs affectés.",
    league_start: "🎮 League Start buffs distribués à {count} joueurs !",
    // Ajoute tes messages de fin ici...
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
  variables: { username?: string; card?: string; count?: number; version?: string }
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
  return result
}
