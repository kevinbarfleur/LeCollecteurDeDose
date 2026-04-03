import type { PitEncounterDef, PitBossDef, PitEnemyDef, PitWaveDef, PitActionContext, PitEvent } from '~/types/pit'

/**
 * The Pit V1 — 3 Bosses
 * Spec section 13
 */

// ============================================================================
// MINIONS
// ============================================================================

const GLUTTONOUS_SPAWN: PitEnemyDef = {
  id: 'gluttonous_spawn', name: 'Gluttonous Spawn',
  stats: { atk: 10, def: 4, hp: 50, spd: 10, pwr: 0 },
  keywords: [], attackMs: 2800, atkMultiplier: 1.0,
}

const KITAVA_HERALD: PitEnemyDef = {
  id: 'kitava_herald', name: 'Kitava\'s Herald',
  stats: { atk: 16, def: 6, hp: 85, spd: 14, pwr: 0 },
  keywords: [{ id: 'Burn', value: 2 }], attackMs: 2200, atkMultiplier: 1.0,
}

const NIGHTMARE_CONSTRUCT: PitEnemyDef = {
  id: 'nightmare_construct', name: 'Nightmare Construct',
  stats: { atk: 11, def: 6, hp: 55, spd: 9, pwr: 0 },
  keywords: [{ id: 'Poison', value: 1 }], attackMs: 2600, atkMultiplier: 1.0,
}

const PIETY: PitEnemyDef = {
  id: 'piety', name: 'Piety',
  stats: { atk: 15, def: 8, hp: 80, spd: 14, pwr: 4 },
  keywords: [{ id: 'Burn', value: 2 }], attackMs: 2200, atkMultiplier: 1.0,
}

const APPARITION: PitEnemyDef = {
  id: 'apparition', name: 'Conqueror Apparition',
  stats: { atk: 12, def: 3, hp: 45, spd: 16, pwr: 0 },
  keywords: [{ id: 'Dodge', value: 8 }], attackMs: 2000, atkMultiplier: 1.0,
}

const STORM_SENTINEL: PitEnemyDef = {
  id: 'storm_sentinel', name: 'Storm Sentinel',
  stats: { atk: 18, def: 5, hp: 75, spd: 15, pwr: 3 },
  keywords: [{ id: 'Stagger', value: 1 }], attackMs: 2400, atkMultiplier: 1.0,
}

// ============================================================================
// BOSSES
// ============================================================================

const KITAVA: PitBossDef = {
  id: 'kitava', name: 'Kitava', title: 'The Insatiable',
  stats: { atk: 19, def: 16, hp: 320, spd: 14, pwr: 0 },
  specialName: 'Festin',
  specialDescription: 'Supprime le slot non-mainhand le plus faible pendant 6s et se soigne de 8% HP max.',
  specialIntervalMs: 10000,
  specialTelegraphMs: 2000,
  executeSpecial: (ctx) => {
    const events: PitEvent[] = []
    const heal = Math.round(ctx.source.maxHp * 0.08)
    ctx.source.currentHp = Math.min(ctx.source.maxHp, ctx.source.currentHp + heal)
    events.push({
      tickMs: ctx.state.tickMs, wave: ctx.state.wave, type: 'special_fire',
      source: 'Kitava', target: ctx.target.name,
      sourceId: ctx.source.id, targetId: ctx.target.id,
      value: heal,
      text: `FESTIN ! Kitava devore et se soigne de ${heal} HP.`, isImportant: true,
    })
    // Suppress weakest non-mainhand slot (simplified: just add Strength to boss)
    ctx.source.activeEffects.push({
      id: 'kitava_feast_str', keywordId: 'Strength', value: 2,
      remainingMs: -1, source: 'Festin',
    })
    return events
  },
}

const MALACHAI: PitBossDef = {
  id: 'malachai', name: 'Malachai', title: 'The Nightmare',
  stats: { atk: 18, def: 18, hp: 290, spd: 16, pwr: 8 },
  specialName: 'Corruption',
  specialDescription: 'Corrompt la carte avec le plus de PWR: -25% stats et Poison 2.',
  specialIntervalMs: 12000,
  specialTelegraphMs: 2500,
  executeSpecial: (ctx) => {
    const events: PitEvent[] = []
    // Apply Poison 2 to player
    ctx.target.activeEffects.push({
      id: 'malachai_corrupt_poison', keywordId: 'Poison', value: 2,
      remainingMs: 8000, source: 'Corruption',
    })
    // Reduce player DEF
    const defLoss = Math.max(1, Math.round(ctx.target.currentStats.def * 0.15))
    ctx.target.currentStats.def = Math.max(0, ctx.target.currentStats.def - defLoss)
    events.push({
      tickMs: ctx.state.tickMs, wave: ctx.state.wave, type: 'special_fire',
      source: 'Malachai', target: ctx.target.name,
      sourceId: ctx.source.id, targetId: ctx.target.id,
      value: defLoss,
      text: `CORRUPTION ! DEF -${defLoss}, Poison 2 applique.`, isImportant: true,
    })
    return events
  },
}

const SIRUS: PitBossDef = {
  id: 'sirus', name: 'Sirus', title: 'The Distant Storm',
  stats: { atk: 21, def: 14, hp: 280, spd: 18, pwr: 0 },
  specialName: 'Die Beam',
  specialDescription: 'Telegraphe 3s puis 30 degats directs, ignore 50% Block, Burn 2.',
  specialIntervalMs: 11000,
  specialTelegraphMs: 3000,
  executeSpecial: (ctx) => {
    const events: PitEvent[] = []
    const dmg = 30
    // Ignore 50% block
    const blockAbsorbed = Math.min(Math.floor(ctx.target.activeEffects
      .filter(e => e.keywordId === 'Block' || e.keywordId === 'Plating')
      .reduce((s, e) => s + e.value, 0) * 0.5), dmg)
    const finalDmg = Math.max(1, dmg - blockAbsorbed)
    ctx.target.currentHp = Math.max(0, ctx.target.currentHp - finalDmg)
    // Apply Burn 2
    ctx.target.activeEffects.push({
      id: 'sirus_beam_burn', keywordId: 'Burn', value: 2,
      remainingMs: 6000, source: 'Die Beam',
    })
    events.push({
      tickMs: ctx.state.tickMs, wave: ctx.state.wave, type: 'special_fire',
      source: 'Sirus', target: ctx.target.name,
      sourceId: ctx.source.id, targetId: ctx.target.id,
      value: finalDmg,
      text: `DIE BEAM ! ${finalDmg} degats directs + Burn 2 !`, isImportant: true,
    })
    if (ctx.target.currentHp <= 0) ctx.target.isDead = true
    return events
  },
}

// ============================================================================
// ENCOUNTERS
// ============================================================================

export const PIT_ENCOUNTERS: Record<string, PitEncounterDef> = {
  kitava: {
    bossId: 'kitava', boss: KITAVA,
    waves: [
      { label: 'Vague 1 — Les Rejetons', enemies: [
        { ...GLUTTONOUS_SPAWN },
        { ...GLUTTONOUS_SPAWN, id: 'gluttonous_spawn_2' },
      ]},
      { label: 'Vague 2 — Le Heraut', enemies: [
        { ...GLUTTONOUS_SPAWN, id: 'gluttonous_spawn_3' },
        { ...GLUTTONOUS_SPAWN, id: 'gluttonous_spawn_4' },
        KITAVA_HERALD,
      ]},
      { label: 'Vague 3 — KITAVA', enemies: [] }, // Boss only
    ],
  },
  malachai: {
    bossId: 'malachai', boss: MALACHAI,
    waves: [
      { label: 'Vague 1 — Constructs', enemies: [
        NIGHTMARE_CONSTRUCT,
        { ...NIGHTMARE_CONSTRUCT, id: 'nightmare_2' },
      ]},
      { label: 'Vague 2 — Piety', enemies: [
        { ...NIGHTMARE_CONSTRUCT, id: 'nightmare_3' },
        { ...NIGHTMARE_CONSTRUCT, id: 'nightmare_4' },
        PIETY,
      ]},
      { label: 'Vague 3 — MALACHAI', enemies: [] },
    ],
  },
  sirus: {
    bossId: 'sirus', boss: SIRUS,
    waves: [
      { label: 'Vague 1 — Apparitions', enemies: [
        APPARITION,
        { ...APPARITION, id: 'apparition_2' },
      ]},
      { label: 'Vague 2 — Storm Sentinel', enemies: [
        { ...APPARITION, id: 'apparition_3' },
        { ...APPARITION, id: 'apparition_4' },
        STORM_SENTINEL,
      ]},
      { label: 'Vague 3 — SIRUS', enemies: [] },
    ],
  },
}

export const BOSS_IDS = ['kitava', 'malachai', 'sirus'] as const
