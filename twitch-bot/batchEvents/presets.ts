/**
 * Presets de Batch Events
 *
 * Chaque preset définit un scénario complet avec:
 * - Message d'annonce
 * - Actions à exécuter (buff bow, nerf melee, etc.)
 * - Délai entre les actions
 * - Message de fin
 *
 * Pour ajouter un nouveau preset:
 * 1. Ajoute les messages dans messages.ts
 * 2. Copie un preset existant ci-dessous
 * 3. Modifie les propriétés selon tes besoins
 */

import type { BatchEventPreset } from './types.ts'
import { BATCH_MESSAGES } from './messages.ts'
import { BOW_CLASSES, MELEE_CLASSES } from './itemClasses.ts'

export const BATCH_PRESETS: Record<string, BatchEventPreset> = {
  // ============================================================================
  // PATCH NOTES 3.26 - Le classique : buff arcs, nerf melee
  // ============================================================================
  patch_notes: {
    id: 'patch_notes',
    displayName: 'Patch Notes 3.26',
    emoji: '📜',
    description: 'Buff bows, nerf melee - The classic GGG experience',
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
        targetTiers: ['T2', 'T3'], // Seulement les tiers bas
        messages: BATCH_MESSAGES.nerfMelee,
      },
    ],
  },

  // ============================================================================
  // HOTFIX D'URGENCE - Nerf melee only (T3 seulement)
  // ============================================================================
  hotfix: {
    id: 'hotfix',
    displayName: "Hotfix d'urgence",
    emoji: '🔧',
    description: 'Nerf melee uniquement (T3 seulement)',
    announcement: BATCH_MESSAGES.announcements.hotfix,
    completionMessage: BATCH_MESSAGES.completion.hotfix,
    delayBetweenEventsMs: 2000,
    actions: [
      {
        type: 'nerf_melee',
        itemClasses: MELEE_CLASSES,
        targetTiers: ['T3'], // Seulement T3
        messages: BATCH_MESSAGES.nerfMelee,
      },
    ],
  },

  // ============================================================================
  // LEAGUE START EVENT - Buff arcs seulement
  // ============================================================================
  league_start: {
    id: 'league_start',
    displayName: 'League Start Event',
    emoji: '🎮',
    description: 'Buff de départ pour tous les joueurs',
    announcement: BATCH_MESSAGES.announcements.league_start,
    completionMessage: BATCH_MESSAGES.completion.league_start,
    delayBetweenEventsMs: 3000,
    actions: [
      {
        type: 'buff_bow',
        itemClasses: BOW_CLASSES,
        messages: BATCH_MESSAGES.buffBow,
      },
    ],
  },

  // ============================================================================
  // AJOUTER UN NOUVEAU PRESET
  // ============================================================================
  // Copie l'exemple ci-dessous et modifie-le selon tes besoins:
  //
  // mon_event: {
  //   id: 'mon_event',
  //   displayName: 'Mon Event Custom',
  //   emoji: '🎉',
  //   description: 'Description de mon event',
  //   announcement: 'Message d\'annonce...',
  //   completionMessage: 'Event terminé pour {count} joueurs !',
  //   delayBetweenEventsMs: 2500,
  //   actions: [
  //     {
  //       type: 'buff_bow',  // ou 'nerf_melee'
  //       itemClasses: BOW_CLASSES,  // ou MELEE_CLASSES, ou custom
  //       targetTiers: ['T2', 'T3'],  // optionnel, pour nerf_melee
  //       messages: BATCH_MESSAGES.buffBow,  // ou créer les tiens
  //     },
  //   ],
  // },
}

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
