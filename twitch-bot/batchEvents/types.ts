/**
 * Types pour le système de Batch Events
 *
 * Ce fichier définit les types TypeScript pour les événements batch
 * comme les "Patch Notes" qui affectent plusieurs joueurs.
 */

/** Types d'actions disponibles dans un batch event */
export type BatchActionType = 'buff_bow' | 'nerf_melee' | 'give_card' | 'destroy_card' | 'convert_to_foil'

/** Messages pour une action (success et échec) */
export interface BatchActionMessages {
  /** Messages de succès (un sera choisi au hasard) */
  success: string[]
  /** Messages quand le joueur n'a pas de cartes correspondantes */
  noCards: string[]
}

/** Définition d'une action dans un batch event */
export interface BatchEventAction {
  /** Type d'action */
  type: BatchActionType
  /** Classes d'items ciblées (ex: ['Bow', 'Quiver']) */
  itemClasses: string[]
  /** Tiers ciblés pour les nerfs (ex: ['T2', 'T3']) */
  targetTiers?: string[]
  /** Messages pour cette action */
  messages: BatchActionMessages
}

/** Définition complète d'un preset de batch event */
export interface BatchEventPreset {
  /** ID unique du preset */
  id: string
  /** Nom d'affichage */
  displayName: string
  /** Emoji pour l'UI */
  emoji: string
  /** Description courte pour l'admin */
  description: string
  /** Message d'annonce au début de l'event */
  announcement: string
  /** Message de fin de l'event (utilise {count} pour le nombre de joueurs) */
  completionMessage: string
  /** Délai entre chaque action en millisecondes */
  delayBetweenEventsMs: number
  /** Liste des actions à exécuter */
  actions: BatchEventAction[]
}

/** Résultat d'une action sur un utilisateur */
export interface BatchActionResult {
  success: boolean
  message: string
  card_name?: string
  card_uid?: number
  item_class?: string
  was_foil?: boolean
}

/** Informations sur un utilisateur pour le batch event */
export interface BatchEventUser {
  user_id: string
  twitch_username: string
  has_bow_cards: boolean
  has_melee_cards: boolean
  has_normal_bow_cards: boolean
  has_normal_melee_cards: boolean
  bow_card_count: number
  melee_card_count: number
}
