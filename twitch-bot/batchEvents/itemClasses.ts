/**
 * Catégories d'items pour les Batch Events
 *
 * Facilement configurable - ajoute/retire des classes ici
 * Ces listes sont utilisées pour cibler des types d'items spécifiques
 * lors des événements "Patch Notes"
 */

// ============================================================================
// ARCS (bowcucks)
// Items associés aux builds arc - "cadeau habituel" de GGG
// ============================================================================
export const BOW_CLASSES = ['Bow', 'Quiver']

// ============================================================================
// MELEE
// Items associés aux builds corps à corps - toujours nerfés
// ============================================================================
export const MELEE_CLASSES = [
  'One-Handed Sword',
  'Two-Handed Sword',
  'Thrusting One-Handed Sword',
  'One-Handed Axe',
  'Two-Handed Axe',
  'One-Handed Mace',
  'Staff',
  'Warstaff',
  'Claw',
  'Dagger',
  'Rune Dagger',
]

// ============================================================================
// AUTRES CATÉGORIES (pour de futurs events)
// ============================================================================

/** Items de caster */
export const CASTER_CLASSES = ['Wand', 'Sceptre', 'Rune Dagger']

/** Armures */
export const ARMOR_CLASSES = ['Body Armour', 'Helmet', 'Gloves', 'Boots', 'Shield']

/** Bijoux */
export const JEWELRY_CLASSES = ['Ring', 'Amulet', 'Belt']

/** Tous les items (pour les events globaux) */
export const ALL_WEAPON_CLASSES = [...BOW_CLASSES, ...MELEE_CLASSES, ...CASTER_CLASSES]
