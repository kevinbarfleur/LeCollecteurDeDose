/**
 * Types pour les commandes batch (!booster X, !vaals X)
 *
 * Ce fichier définit les interfaces TypeScript pour les résultats
 * des commandes batch de boosters et Vaal Orbs.
 */

/** Informations sur une carte dans un booster */
export interface BoosterCard {
  /** Nom de la carte */
  name: string
  /** Tier de la carte (T0 = légendaire, T3 = commun) */
  tier: 'T0' | 'T1' | 'T2' | 'T3'
  /** Si la carte est foil */
  is_foil: boolean
  /** UID unique de la carte */
  uid: number
}

/** Résultat d'un seul booster */
export interface BoosterResult {
  /** ID du booster */
  booster_id: string
  /** Cartes obtenues dans ce booster */
  cards: BoosterCard[]
}

/** Résultat de la vérification de limite batch */
export interface BatchLimitResult {
  /** Si au moins une utilisation est accordée */
  success: boolean
  /** Nombre d'utilisations accordées */
  granted: number
  /** Nombre total utilisé après cette opération */
  used: number
  /** Limite maximale */
  limit: number
  /** Nombre restant après cette opération */
  remaining: number
}

/** Résultat complet d'un batch de boosters */
export interface BatchBoosterResult {
  /** Si l'opération a réussi */
  success: boolean
  /** Liste des boosters ouverts avec leurs cartes */
  boosters: BoosterResult[]
  /** Cartes T0 obtenues (pour annonces publiques) */
  t0_cards: Array<{ name: string; is_foil: boolean }>
  /** Résumé statistique */
  summary: {
    /** Nombre total de cartes */
    total_cards: number
    /** Nombre total de foils */
    total_foils: number
    /** Décompte par tier */
    tier_counts: {
      T0: number
      T1: number
      T2: number
      T3: number
    }
  }
}

/** Résultat d'un batch de Vaal Orbs */
export interface BatchVaalsResult {
  /** Si l'opération a réussi */
  success: boolean
  /** Nombre d'orbs ajoutés */
  added: number
  /** Nouveau total après ajout */
  new_total: number
}

/** Variables disponibles pour les templates de messages */
export interface BatchMessageVariables {
  username?: string
  card?: string
  count?: number | string
  requested?: number | string
  total?: number | string
  newTotal?: number | string
  timeUntilReset?: string
  normalCount?: number
  foilCount?: number
  t0?: number
  t1?: number
  t2?: number
  t3?: number
  /** Liste formatée des cartes rares (pour fallback chat) */
  rareCards?: string
  /** Lien vers la collection/historique */
  link?: string
}
