import type { PitSynergyDef, PitLoadout, PitCardDef } from '~/types/pit'
import { PIT_CARDS_BY_UID } from './cardMap'

/**
 * The Pit V1 — 8 Synergies
 * Spec section 9
 */

const TWO_HAND_CLASSES = ['axe_2h', 'staff', 'warstaff']
const ONE_HAND_WEAPON_CLASSES = ['sword_1h', 'rapier_1h', 'axe_1h', 'mace_1h', 'claw', 'dagger', 'rune_dagger', 'wand', 'sceptre']

function getCard(uid: number | null | undefined): PitCardDef | undefined {
  if (!uid) return undefined
  return PIT_CARDS_BY_UID.get(uid)
}

export const PIT_SYNERGIES: PitSynergyDef[] = [
  {
    id: 'bulwark', name: 'Bulwark',
    condition: 'Body + Shield + Minor avec tag bastion',
    bonus: 'Debut de vague: Block 8. Quand Block casse: Thorns 2 pendant 4s.',
    check: (loadout) => {
      const body = getCard(loadout.body)
      const offhand = getCard(loadout.offhand)
      const minor = getCard(loadout.minor)
      return !!body && offhand?.normalizedClass === 'shield' && !!minor?.archetypeTags.includes('bastion')
    },
    effects: [{ type: 'keyword_add', keywordId: 'Block', value: 8 }],
  },
  {
    id: 'dual_wield', name: 'Dual Wield',
    condition: 'Mainhand et Offhand = deux armes 1H',
    bonus: 'Offhand follow-up a 45% ATK, +12 SPD.',
    check: (loadout) => {
      const mh = getCard(loadout.mainhand)
      const oh = getCard(loadout.offhand)
      return !!mh && !!oh && ONE_HAND_WEAPON_CLASSES.includes(mh.normalizedClass) && ONE_HAND_WEAPON_CLASSES.includes(oh.normalizedClass)
    },
    effects: [{ type: 'stat_flat', stat: 'spd', value: 12 }],
  },
  {
    id: 'two_handed_mastery', name: 'Two-Handed Mastery',
    condition: 'Mainhand 2H/Staff/Warstaff, Offhand vide',
    bonus: '+25% ATK, +10% max HP, +1 primary keyword mainhand.',
    check: (loadout) => {
      const mh = getCard(loadout.mainhand)
      return !!mh && TWO_HAND_CLASSES.includes(mh.normalizedClass) && !loadout.offhand
    },
    effects: [{ type: 'stat_mult', stat: 'atk', value: 1.25 }, { type: 'stat_mult', stat: 'hp', value: 1.10 }],
  },
  {
    id: 'bow_discipline', name: 'Bow Discipline',
    condition: 'Bow + Quiver',
    bonus: 'Premiere attaque de chaque vague: Vulnerable 2. +15 SPD.',
    check: (loadout) => {
      const mh = getCard(loadout.mainhand)
      const oh = getCard(loadout.offhand)
      return mh?.normalizedClass === 'bow' && oh?.normalizedClass === 'quiver'
    },
    effects: [{ type: 'stat_flat', stat: 'spd', value: 15 }, { type: 'keyword_add', keywordId: 'Vulnerable', value: 2 }],
  },
  {
    id: 'ember_conduit', name: 'Ember Conduit',
    condition: 'Mainhand ember_* + Focus + 1 charm ember/storm',
    bonus: 'Burn +1 sur application, +15% Burn damage.',
    check: (loadout) => {
      const mh = getCard(loadout.mainhand)
      const focus = getCard(loadout.focus)
      const c1 = getCard(loadout.charm1)
      const c2 = getCard(loadout.charm2)
      const hasEmberMH = !!mh && mh.profileId.startsWith('ember_')
      const hasFocus = !!focus
      const hasEmberCharm = [c1, c2].some(c => c && (c.motif === 'ember' || c.motif === 'storm'))
      return hasEmberMH && hasFocus && hasEmberCharm
    },
    effects: [{ type: 'keyword_add', keywordId: 'Burn', value: 1 }],
  },
  {
    id: 'venom_circuit', name: 'Venom Circuit',
    condition: 'Claw/Dagger/Rune Dagger + Focus + 1 charm venom/blood',
    bonus: 'Poison ne decroit pas pendant les 4 premieres secondes du boss.',
    check: (loadout) => {
      const mh = getCard(loadout.mainhand)
      const focus = getCard(loadout.focus)
      const c1 = getCard(loadout.charm1)
      const c2 = getCard(loadout.charm2)
      const hasVenomWeapon = !!mh && ['claw', 'dagger', 'rune_dagger'].includes(mh.normalizedClass)
      const hasFocus = !!focus
      const hasVenomCharm = [c1, c2].some(c => c && (c.motif === 'venom' || c.motif === 'blood'))
      return hasVenomWeapon && hasFocus && hasVenomCharm
    },
    effects: [{ type: 'special', description: 'Poison freeze 4s on boss start', value: 0 }],
  },
  {
    id: 'ritual_link', name: 'Ritual Link',
    condition: 'Amulet + Relic + Body sustain/support',
    bonus: 'Regen +2, hidden effects revelent 1 trigger plus tot.',
    check: (loadout) => {
      const body = getCard(loadout.body)
      const c1 = getCard(loadout.charm1)
      const c2 = getCard(loadout.charm2)
      const focus = getCard(loadout.focus)
      const hasAmulet = [c1, c2].some(c => c?.normalizedClass === 'amulet')
      const hasRelic = focus?.normalizedClass === 'relic'
      const hasSustainBody = !!body?.archetypeTags.some(t => t === 'sustain' || t === 'support')
      return hasAmulet && hasRelic && hasSustainBody
    },
    effects: [{ type: 'keyword_add', keywordId: 'Regen', value: 2 }],
  },
  {
    id: 'mark_union', name: 'Mark Union',
    condition: 'Mark of the Elder + Mark of the Shaper equipes',
    bonus: 'Toutes les 4 frappes, Focus Bolt gratuit a 75% puissance.',
    check: (loadout) => {
      const c1 = getCard(loadout.charm1)
      const c2 = getCard(loadout.charm2)
      const ids = [c1?.id, c2?.id].filter(Boolean)
      return ids.includes('mark_of_the_elder') && ids.includes('mark_of_the_shaper')
    },
    effects: [{ type: 'special', description: 'Focus bolt every 4 hits at 75%', value: 0 }],
  },
]

export function checkSynergies(loadout: PitLoadout): PitSynergyDef[] {
  return PIT_SYNERGIES.filter(s => s.check(loadout))
}
