/**
 * Presets de Batch Events
 *
 * 15 scénarios diversifiés répartis en 5 catégories:
 * - BUFFS: bow_meta, caster_supremacy, divine_blessing
 * - NERFS: melee_funeral, harvest_nerf, aura_stacker_rip
 * - EVENTS SPECIAUX: vaal_roulette, mirror_event, heist_gone_wrong, steelmage_rip
 * - LEAGUE EVENTS: league_start, league_end_fire_sale, flashback_event
 * - MEMES POE: path_of_math_drama, patch_notes
 */

import type { BatchEventPreset } from './types.ts'
import { BATCH_MESSAGES } from './messages.ts'
import { BOW_CLASSES, MELEE_CLASSES, CASTER_CLASSES, JEWELRY_CLASSES, ARMOR_CLASSES } from './itemClasses.ts'

// ============================================================================
// CATÉGORIE 1: BUFFS GGG
// ============================================================================

const bow_meta: BatchEventPreset = {
  id: 'bow_meta',
  displayName: 'Bow Meta',
  emoji: '🏹',
  description: 'Cadeau habituel pour les bowcucks - arc meta encore cette league',
  announcement: BATCH_MESSAGES.announcements.bow_meta,
  completionMessage: BATCH_MESSAGES.completion.bow_meta,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'buff_bow',
      itemClasses: BOW_CLASSES,
      messages: BATCH_MESSAGES.buffBow,
    },
  ],
}

const caster_supremacy: BatchEventPreset = {
  id: 'caster_supremacy',
  displayName: 'Caster Supremacy',
  emoji: '🔮',
  description: 'Les casters dominent le meta - wands et sceptres buffés',
  announcement: BATCH_MESSAGES.announcements.caster_supremacy,
  completionMessage: BATCH_MESSAGES.completion.caster_supremacy,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'buff_caster',
      itemClasses: CASTER_CLASSES,
      messages: BATCH_MESSAGES.buffCaster,
    },
  ],
}

const divine_blessing: BatchEventPreset = {
  id: 'divine_blessing',
  displayName: 'Divine Blessing',
  emoji: '✨',
  description: 'Les dieux de Wraeclast bénissent tous les exilés - buff all',
  announcement: BATCH_MESSAGES.announcements.divine_blessing,
  completionMessage: BATCH_MESSAGES.completion.divine_blessing,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'buff_all',
      itemClasses: [], // Toutes les cartes
      messages: BATCH_MESSAGES.buffAll,
    },
  ],
}

// ============================================================================
// CATÉGORIE 2: NERFS CLASSIQUES
// ============================================================================

const melee_funeral: BatchEventPreset = {
  id: 'melee_funeral',
  displayName: 'Melee Funeral',
  emoji: '⚔️',
  description: 'Le nerf melee traditionnel - RIP Strike skills',
  announcement: BATCH_MESSAGES.announcements.melee_funeral,
  completionMessage: BATCH_MESSAGES.completion.melee_funeral,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'nerf_melee',
      itemClasses: MELEE_CLASSES,
      targetTiers: ['T2', 'T3'],
      messages: BATCH_MESSAGES.nerfMelee,
    },
  ],
}

const harvest_nerf: BatchEventPreset = {
  id: 'harvest_nerf',
  displayName: 'Harvest Nerf',
  emoji: '🌿',
  description: '"We felt Harvest was too deterministic" - remove foils',
  announcement: BATCH_MESSAGES.announcements.harvest_nerf,
  completionMessage: BATCH_MESSAGES.completion.harvest_nerf,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'remove_foil',
      itemClasses: [...JEWELRY_CLASSES, ...ARMOR_CLASSES],
      messages: BATCH_MESSAGES.harvestNerf,
    },
  ],
}

const aura_stacker_rip: BatchEventPreset = {
  id: 'aura_stacker_rip',
  displayName: 'Aura Stacker RIP',
  emoji: '🔊',
  description: 'Nerf aura stacker - remove foil des bijoux',
  announcement: BATCH_MESSAGES.announcements.aura_stacker_rip,
  completionMessage: BATCH_MESSAGES.completion.aura_stacker_rip,
  delayBetweenEventsMs: 2000,
  actions: [
    {
      type: 'remove_foil',
      itemClasses: JEWELRY_CLASSES,
      messages: BATCH_MESSAGES.auraStackerNerf,
    },
    {
      type: 'nerf_jewelry',
      itemClasses: JEWELRY_CLASSES,
      targetTiers: ['T3'],
      messages: BATCH_MESSAGES.nerfJewelry,
    },
  ],
}

// ============================================================================
// CATÉGORIE 3: EVENTS SPÉCIAUX
// ============================================================================

const vaal_roulette: BatchEventPreset = {
  id: 'vaal_roulette',
  displayName: 'Vaal Roulette',
  emoji: '🎰',
  description: 'Corruption Vaal - 50% brick, 50% upgrade en foil',
  announcement: BATCH_MESSAGES.announcements.vaal_roulette,
  completionMessage: BATCH_MESSAGES.completion.vaal_roulette,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'vaal_roulette',
      itemClasses: [],
      messages: BATCH_MESSAGES.vaalRoulette,
    },
  ],
}

const mirror_event: BatchEventPreset = {
  id: 'mirror_event',
  displayName: 'Mirror of Kalandra',
  emoji: '💎',
  description: 'Event ultra rare - duplication de cartes pour tous',
  announcement: BATCH_MESSAGES.announcements.mirror_event,
  completionMessage: BATCH_MESSAGES.completion.mirror_event,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'duplicate_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.mirrorEvent,
    },
  ],
}

const heist_gone_wrong: BatchEventPreset = {
  id: 'heist_gone_wrong',
  displayName: 'Heist Gone Wrong',
  emoji: '💰',
  description: 'Le Heist a mal tourné - vol de cartes entre joueurs',
  announcement: BATCH_MESSAGES.announcements.heist_gone_wrong,
  completionMessage: BATCH_MESSAGES.completion.heist_gone_wrong,
  delayBetweenEventsMs: 3500,
  actions: [
    {
      type: 'steal_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.heist,
    },
  ],
}

const steelmage_rip: BatchEventPreset = {
  id: 'steelmage_rip',
  displayName: 'Steelmage RIP',
  emoji: '☠️',
  description: 'Hommage à Steelmage - destruction aléatoire de cartes HC style',
  announcement: BATCH_MESSAGES.announcements.steelmage_rip,
  completionMessage: BATCH_MESSAGES.completion.steelmage_rip,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'destroy_random',
      itemClasses: [],
      targetTiers: ['T0', 'T1', 'T2'],
      messages: BATCH_MESSAGES.steelmageRip,
    },
  ],
}

// ============================================================================
// CATÉGORIE 4: LEAGUE EVENTS
// ============================================================================

const league_start: BatchEventPreset = {
  id: 'league_start',
  displayName: 'League Start',
  emoji: '🎮',
  description: 'Début de league - tout le monde reçoit des cartes gratuites',
  announcement: BATCH_MESSAGES.announcements.league_start,
  completionMessage: BATCH_MESSAGES.completion.league_start,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'give_random_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.leagueStart,
    },
    {
      type: 'give_random_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.leagueStart,
    },
  ],
}

const league_end_fire_sale: BatchEventPreset = {
  id: 'league_end_fire_sale',
  displayName: 'Fire Sale',
  emoji: '🔥',
  description: 'Fin de league - chaos total, nerfs et buffs aléatoires',
  announcement: BATCH_MESSAGES.announcements.league_end_fire_sale,
  completionMessage: BATCH_MESSAGES.completion.league_end_fire_sale,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'random_chaos',
      itemClasses: [],
      messages: BATCH_MESSAGES.leagueEndChaos,
    },
  ],
}

const flashback_event: BatchEventPreset = {
  id: 'flashback_event',
  displayName: 'Flashback Event',
  emoji: '⚡',
  description: 'Flashback - tous les mods de league en même temps',
  announcement: BATCH_MESSAGES.announcements.flashback_event,
  completionMessage: BATCH_MESSAGES.completion.flashback_event,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'buff_all',
      itemClasses: [],
      messages: BATCH_MESSAGES.flashbackBuff,
    },
    {
      type: 'give_random_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.flashbackGift,
    },
  ],
}

// ============================================================================
// CATÉGORIE 5: MEMES POE
// ============================================================================

const path_of_math_drama: BatchEventPreset = {
  id: 'path_of_math_drama',
  displayName: 'Path of Math Drama',
  emoji: '🎭',
  description: 'Drama communautaire - redistribution chaotique des richesses',
  announcement: BATCH_MESSAGES.announcements.path_of_math_drama,
  completionMessage: BATCH_MESSAGES.completion.path_of_math_drama,
  delayBetweenEventsMs: 3000,
  actions: [
    {
      type: 'steal_card',
      itemClasses: [],
      messages: BATCH_MESSAGES.pathOfMathDrama,
    },
    {
      type: 'remove_foil',
      itemClasses: JEWELRY_CLASSES,
      messages: BATCH_MESSAGES.harvestNerf,
    },
  ],
}

const patch_notes: BatchEventPreset = {
  id: 'patch_notes',
  displayName: 'Patch Notes',
  emoji: '📜',
  description: 'Le classique GGG - Buff bows, nerf melee',
  announcement: BATCH_MESSAGES.announcements.patch_notes,
  completionMessage: BATCH_MESSAGES.completion.patch_notes,
  delayBetweenEventsMs: 2500,
  actions: [
    {
      type: 'buff_bow',
      itemClasses: BOW_CLASSES,
      messages: BATCH_MESSAGES.buffBow,
    },
    {
      type: 'nerf_melee',
      itemClasses: MELEE_CLASSES,
      targetTiers: ['T2', 'T3'],
      messages: BATCH_MESSAGES.nerfMelee,
    },
  ],
}

// ============================================================================
// EXPORT: TOUS LES PRESETS
// ============================================================================

export const BATCH_PRESETS: Record<string, BatchEventPreset> = {
  // BUFFS
  bow_meta,
  caster_supremacy,
  divine_blessing,
  // NERFS
  melee_funeral,
  harvest_nerf,
  aura_stacker_rip,
  // EVENTS SPECIAUX
  vaal_roulette,
  mirror_event,
  heist_gone_wrong,
  steelmage_rip,
  // LEAGUE EVENTS
  league_start,
  league_end_fire_sale,
  flashback_event,
  // MEMES
  path_of_math_drama,
  patch_notes,
}

// ============================================================================
// CATÉGORIES POUR L'UI ADMIN
// ============================================================================

export interface PresetCategory {
  id: string
  label: string
  emoji: string
  presets: BatchEventPreset[]
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'buffs',
    label: 'Buffs GGG',
    emoji: '✨',
    presets: [bow_meta, caster_supremacy, divine_blessing],
  },
  {
    id: 'nerfs',
    label: 'Nerfs Classiques',
    emoji: '💀',
    presets: [melee_funeral, harvest_nerf, aura_stacker_rip],
  },
  {
    id: 'special',
    label: 'Events Spéciaux',
    emoji: '🎲',
    presets: [vaal_roulette, mirror_event, heist_gone_wrong, steelmage_rip],
  },
  {
    id: 'league',
    label: 'League Events',
    emoji: '🎮',
    presets: [league_start, league_end_fire_sale, flashback_event],
  },
  {
    id: 'memes',
    label: 'Memes POE',
    emoji: '🎭',
    presets: [path_of_math_drama, patch_notes],
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Récupère un preset par son ID
 */
export function getPresetById(id: string): BatchEventPreset | undefined {
  return BATCH_PRESETS[id]
}

/**
 * Liste tous les presets disponibles
 */
export function getAllPresets(): BatchEventPreset[] {
  return Object.values(BATCH_PRESETS)
}

/**
 * IDs de tous les presets valides
 */
export const VALID_PRESET_IDS = Object.keys(BATCH_PRESETS)
