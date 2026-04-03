import type {
  PitCombatState, PitCombatant, PitEvent, PitCardDef, PitLoadout,
  PitEncounterDef, PitModifierDef, PitStats, PitKeywordInstance,
} from '~/types/pit'
import { PIT_CARDS_BY_UID } from '~/game/pit/content/cardMap'
import { PROFILE_ATTACK_STYLE } from '~/composables/usePitAttackVFX'
import {
  calculateDamage, applyDamage, applyHeal, processPeriodicTicks,
  checkDodge, getStaggerSlowdown, getStrengthBonus, getLifestealPct,
  addEffect, consumeBlock,
} from './effects'

/**
 * The Pit V1 — Deterministic Combat Engine
 * Action Meter system, tick = 100ms
 * Spec section 6
 */

const TICK_MS = 100
const MAX_FRAME_MS = 250
const PERIODIC_INTERVAL_MS = 2000
const ACTION_METER_FULL = 100

// ============================================================================
// CREATE INITIAL STATE
// ============================================================================

export function createCombatState(
  loadout: PitLoadout,
  encounter: PitEncounterDef,
  modifier: PitModifierDef,
  seed: number,
): PitCombatState {
  // Sum stats from all equipped cards
  const equippedUids = [loadout.mainhand, loadout.offhand, loadout.body, loadout.minor, loadout.charm1, loadout.charm2, loadout.focus, loadout.tactical].filter(Boolean) as number[]
  const equippedCards = equippedUids.map(uid => PIT_CARDS_BY_UID.get(uid)).filter(Boolean) as PitCardDef[]

  let stats: PitStats = { atk: 0, def: 0, hp: 100, spd: 10, pwr: 0 }
  const keywords: PitKeywordInstance[] = []

  for (const card of equippedCards) {
    stats.atk += card.stats.atk
    stats.def += card.stats.def
    stats.hp += card.stats.hp
    stats.spd += card.stats.spd
    stats.pwr += card.stats.pwr

    // Primary keyword
    if (card.primaryKeyword !== 'MapMod' && card.primaryKeyword !== 'Tactical') {
      const existing = keywords.find(k => k.id === card.primaryKeyword)
      const baseVal = getKeywordBaseForTier(card.tier)
      if (existing) existing.value += baseVal
      else keywords.push({ id: card.primaryKeyword, value: baseVal })
    }
  }

  // Apply modifier
  stats = modifier.apply(stats)
  if (modifier.applyKeywords) {
    for (const kw of modifier.applyKeywords) {
      const existing = keywords.find(k => k.id === kw.id)
      if (existing) existing.value += kw.value
      else keywords.push({ ...kw })
    }
  }

  // Get mainhand profile for attack timing
  const mainhandCard = PIT_CARDS_BY_UID.get(loadout.mainhand)

  const player: PitCombatant = {
    id: 'player', name: 'Exile',
    baseStats: { ...stats }, currentStats: { ...stats },
    maxHp: stats.hp, currentHp: stats.hp,
    actionMeter: 0,
    keywords: [...keywords],
    activeEffects: [],
    isDead: false, isPlayer: true,
    profileId: mainhandCard?.profileId,
    attackMs: getProfileAttackMs(mainhandCard?.profileId ?? 'assault_balanced'),
    atkMultiplier: getProfileAtkMult(mainhandCard?.profileId ?? 'assault_balanced'),
  }

  return {
    tickMs: 0,
    wave: 0,
    totalWaves: encounter.waves.length,
    player,
    enemies: [],
    events: [],
    isOver: false,
    bossKilled: false,
    isPaused: false,
    speed: 1,
    periodicLastTick: 0,
    bossSpecialLastTick: 0,
    bossSpecialTelegraphing: false,
    bossSpecialTelegraphStart: 0,
  }
}

// ============================================================================
// SPAWN WAVE
// ============================================================================

export function spawnWave(state: PitCombatState, encounter: PitEncounterDef): PitEvent[] {
  const waveDef = encounter.waves[state.wave]
  if (!waveDef) return []

  const events: PitEvent[] = [{
    tickMs: state.tickMs, wave: state.wave, type: 'wave_transition',
    source: 'system', target: '', text: waveDef.label, isImportant: true,
  }]

  // Is this the boss wave?
  const isBossWave = state.wave === encounter.waves.length - 1

  if (isBossWave) {
    const boss = encounter.boss
    state.enemies = [{
      id: boss.id, name: `${boss.name}, ${boss.title}`,
      baseStats: { ...boss.stats }, currentStats: { ...boss.stats },
      maxHp: boss.stats.hp, currentHp: boss.stats.hp,
      actionMeter: 0,
      keywords: [], activeEffects: [],
      isDead: false, isPlayer: false,
      attackMs: 2000, atkMultiplier: 1.0,
    }]
    state.bossSpecialLastTick = state.tickMs
  } else {
    state.enemies = waveDef.enemies.map((e, i) => ({
      id: `${e.id}_${state.wave}_${i}`,
      name: e.name,
      baseStats: { ...e.stats }, currentStats: { ...e.stats },
      maxHp: e.stats.hp, currentHp: e.stats.hp,
      actionMeter: 0,
      keywords: [...e.keywords], activeEffects: [],
      isDead: false, isPlayer: false,
      attackMs: e.attackMs, atkMultiplier: e.atkMultiplier,
    }))
  }

  // Reset player action meter for new wave
  state.player.actionMeter = 0

  return events
}

// ============================================================================
// TICK (deterministic, 100ms)
// ============================================================================

export function tick(state: PitCombatState, encounter: PitEncounterDef, rng: () => number): PitEvent[] {
  if (state.isOver) return []

  state.tickMs += TICK_MS
  const events: PitEvent[] = []

  // --- Action meter advancement ---
  advanceActionMeter(state.player, TICK_MS)
  for (const enemy of state.enemies) {
    if (!enemy.isDead) advanceActionMeter(enemy, TICK_MS)
  }

  // --- Check player action ---
  if (state.player.actionMeter >= ACTION_METER_FULL && !state.player.isDead) {
    events.push(...executePlayerAction(state, encounter, rng))
    state.player.actionMeter = 0
  }

  // --- Check enemy actions ---
  for (const enemy of state.enemies) {
    if (enemy.isDead || state.player.isDead) continue
    if (enemy.actionMeter >= ACTION_METER_FULL) {
      events.push(...executeEnemyAction(state, enemy, encounter, rng))
      enemy.actionMeter = 0
    }
  }

  // --- Periodic ticks (every 2s) ---
  if (state.tickMs - state.periodicLastTick >= PERIODIC_INTERVAL_MS) {
    events.push(...processPeriodicTicks(state))
    state.periodicLastTick = state.tickMs
  }

  // --- Boss special check ---
  const isBossWave = state.wave === encounter.waves.length - 1
  if (isBossWave && !state.enemies.every(e => e.isDead)) {
    events.push(...checkBossSpecial(state, encounter, rng))
  }

  // --- Death checks ---
  events.push(...checkDeaths(state))

  // --- Wave transition ---
  if (state.enemies.length > 0 && state.enemies.every(e => e.isDead)) {
    state.wave++
    if (state.wave >= state.totalWaves) {
      state.isOver = true
      state.bossKilled = true
      events.push({
        tickMs: state.tickMs, wave: state.wave - 1, type: 'info',
        source: 'system', target: '', text: 'VICTOIRE !', isImportant: true,
      })
    } else {
      events.push(...spawnWave(state, encounter))
    }
  }

  return events
}

// ============================================================================
// ACTION METER
// ============================================================================

function advanceActionMeter(combatant: PitCombatant, dtMs: number): void {
  const staggerSlowdown = getStaggerSlowdown(combatant)
  const gain = ((10 + combatant.currentStats.spd) / 10) * (1 - staggerSlowdown)
  // gain is per 100ms tick
  combatant.actionMeter += gain
}

// ============================================================================
// PLAYER ACTION
// ============================================================================

function executePlayerAction(state: PitCombatState, encounter: PitEncounterDef, rng: () => number): PitEvent[] {
  const events: PitEvent[] = []
  const target = state.enemies.find(e => !e.isDead)
  if (!target) return events

  // Dodge check
  if (false) { /* Player attacks don't get dodged by default in V1 */ }

  const strBonus = getStrengthBonus(state.player)
  const { afterBlock, blocked } = calculateDamage(state.player, target, state.player.atkMultiplier ?? 1.0, strBonus)
  const consumed = blocked > 0 ? consumeBlock(target, blocked) : 0
  applyDamage(target, afterBlock)

  events.push({
    tickMs: state.tickMs, wave: state.wave, type: 'hit',
    source: state.player.name, target: target.name,
    sourceId: state.player.id, targetId: target.id,
    attackStyle: PROFILE_ATTACK_STYLE[state.player.profileId ?? ''] ?? 'generic',
    value: afterBlock,
    text: `${state.player.name} -> ${target.name} : ${afterBlock}${consumed > 0 ? ` (${consumed} bloques)` : ''}`,
    detail: `base ${state.player.currentStats.atk}+${strBonus}, x${state.player.atkMultiplier}, DEF ${target.currentStats.def}`,
  })

  // Lifesteal
  const lsPct = getLifestealPct(state.player)
  if (lsPct > 0 && afterBlock > 0) {
    const heal = Math.round(afterBlock * lsPct / 100)
    const healed = applyHeal(state.player, heal)
    if (healed > 0) {
      events.push({
        tickMs: state.tickMs, wave: state.wave, type: 'heal',
        source: 'Lifesteal', target: state.player.name, value: healed,
        text: `Vol de vie : +${healed} HP`,
      })
    }
  }

  // Apply primary keyword of mainhand on hit
  const mainhand = PIT_CARDS_BY_UID.get(state.player.baseStats.atk > 0 ? 0 : 0) // placeholder
  // Simplified: apply from keywords pool
  applyOnHitKeywords(state.player, target, state, events)

  // Thorns
  const thorns = target.keywords.filter(k => k.id === 'Strength').length > 0 ? 0 :
    target.activeEffects.filter(e => e.keywordId === 'Thorns' || e.keywordId === 'thorns').reduce((s, e) => s + e.value, 0)
  // (Thorns from keywords)
  const thornFromKw = target.keywords.filter(k => k.id === ('Thorns' as any)).reduce((s, k) => s + k.value, 0)
  const totalThorns = thorns + thornFromKw
  if (totalThorns > 0) {
    applyDamage(state.player, totalThorns)
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'damage',
      source: `${target.name} Thorns`, target: state.player.name, value: totalThorns,
      text: `Epines : ${totalThorns} degats renvoyes`,
    })
  }

  return events
}

function applyOnHitKeywords(attacker: PitCombatant, target: PitCombatant, state: PitCombatState, events: PitEvent[]): void {
  // Poison from attacker keywords
  const poisonVal = attacker.keywords.filter(k => k.id === 'Poison').reduce((s, k) => s + k.value, 0)
  if (poisonVal > 0) {
    addEffect(target, 'Poison', Math.min(20, poisonVal), -1, attacker.name)
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'status_add',
      source: attacker.name, target: target.name, value: poisonVal,
      text: `Poison ${poisonVal} applique`,
    })
  }

  // Burn
  const burnVal = attacker.keywords.filter(k => k.id === 'Burn').reduce((s, k) => s + k.value, 0)
  if (burnVal > 0) {
    addEffect(target, 'Burn', Math.min(15, burnVal), 6000, attacker.name)
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'status_add',
      source: attacker.name, target: target.name, value: burnVal,
      text: `Burn ${burnVal} applique`,
    })
  }

  // Vulnerable
  const vulnVal = attacker.keywords.filter(k => k.id === 'Vulnerable').reduce((s, k) => s + k.value, 0)
  if (vulnVal > 0) {
    addEffect(target, 'Vulnerable', 1, vulnVal * 1000, attacker.name)
  }

  // Stagger
  const staggerVal = attacker.keywords.filter(k => k.id === 'Stagger').reduce((s, k) => s + k.value, 0)
  if (staggerVal > 0) {
    addEffect(target, 'Stagger', staggerVal, 2000, attacker.name)
  }
}

// ============================================================================
// ENEMY ACTION
// ============================================================================

function executeEnemyAction(state: PitCombatState, enemy: PitCombatant, encounter: PitEncounterDef, rng: () => number): PitEvent[] {
  const events: PitEvent[] = []
  const target = state.player
  if (target.isDead) return events

  // Dodge check
  if (checkDodge(target, rng)) {
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'dodge',
      source: target.name, target: enemy.name,
      text: `${target.name} esquive l'attaque de ${enemy.name} !`,
    })
    return events
  }

  const strBonus = getStrengthBonus(enemy)
  const { afterBlock, blocked } = calculateDamage(enemy, target, enemy.atkMultiplier ?? 1.0, strBonus)
  const consumed = blocked > 0 ? consumeBlock(target, blocked) : 0
  applyDamage(target, afterBlock)

  events.push({
    tickMs: state.tickMs, wave: state.wave, type: 'hit',
    source: enemy.name, target: target.name,
    sourceId: enemy.id, targetId: target.id,
    attackStyle: getEnemyAttackStyle(enemy.id),
    value: afterBlock,
    text: `${enemy.name} -> ${target.name} : ${afterBlock}${consumed > 0 ? ` (${consumed} bloques)` : ''}`,
  })

  // Enemy on-hit keywords
  applyOnHitKeywords(enemy, target, state, events)

  // Player thorns
  const playerThorns = target.keywords.filter(k => k.id === ('Thorns' as any)).reduce((s, k) => s + k.value, 0)
    + target.activeEffects.filter(e => e.keywordId === 'Thorns').reduce((s, e) => s + e.value, 0)
  if (playerThorns > 0) {
    applyDamage(enemy, playerThorns)
  }

  return events
}

// ============================================================================
// BOSS SPECIAL
// ============================================================================

function checkBossSpecial(state: PitCombatState, encounter: PitEncounterDef, rng: () => number): PitEvent[] {
  const events: PitEvent[] = []
  const boss = state.enemies.find(e => !e.isDead && e.id === encounter.boss.id)
  if (!boss) return events

  const timeSinceLast = state.tickMs - state.bossSpecialLastTick

  // Telegraph
  if (!state.bossSpecialTelegraphing && timeSinceLast >= encounter.boss.specialIntervalMs - encounter.boss.specialTelegraphMs) {
    state.bossSpecialTelegraphing = true
    state.bossSpecialTelegraphStart = state.tickMs
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'special_telegraph',
      source: encounter.boss.name, target: state.player.name,
      sourceId: boss.id, targetId: state.player.id,
      text: `${encounter.boss.name} prepare ${encounter.boss.specialName}...`, isImportant: true,
    })
  }

  // Fire
  if (timeSinceLast >= encounter.boss.specialIntervalMs) {
    state.bossSpecialTelegraphing = false
    const ctx = {
      state,
      source: boss,
      target: state.player,
      allEnemies: state.enemies,
    }
    events.push(...encounter.boss.executeSpecial(ctx))
    state.bossSpecialLastTick = state.tickMs
  }

  return events
}

// ============================================================================
// DEATH CHECKS
// ============================================================================

function checkDeaths(state: PitCombatState): PitEvent[] {
  const events: PitEvent[] = []

  // Player death: check HP directly (isDead may already be set by applyDamage)
  if (state.player.currentHp <= 0 && !state.isOver) {
    state.player.isDead = true
    state.isOver = true
    events.push({
      tickMs: state.tickMs, wave: state.wave, type: 'death',
      source: 'system', target: state.player.name,
      text: 'Votre Exile est tombe...', isImportant: true,
    })
  }

  for (const enemy of state.enemies) {
    if (enemy.currentHp <= 0 && !enemy.isDead) {
      enemy.isDead = true
      events.push({
        tickMs: state.tickMs, wave: state.wave, type: 'death',
        source: 'system', target: enemy.name,
        text: `${enemy.name} est mort !`, isImportant: true,
      })
    }
  }

  return events
}

// ============================================================================
// RAF WRAPPER (client-side animation)
// ============================================================================

export class PitEngineRunner {
  private state: PitCombatState
  private encounter: PitEncounterDef
  private rng: () => number
  private rafId: number | null = null
  private lastTime = 0
  private accumulator = 0
  private onUpdate: (state: PitCombatState) => void

  constructor(state: PitCombatState, encounter: PitEncounterDef, seed: number, onUpdate: (state: PitCombatState) => void) {
    this.state = state
    this.encounter = encounter
    this.rng = this.createRng(seed)
    this.onUpdate = onUpdate
  }

  start() {
    // Spawn first wave
    const events = spawnWave(this.state, this.encounter)
    this.state.events.push(...events)
    this.lastTime = performance.now()
    this.loop(performance.now())
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop)

    if (this.state.isPaused || this.state.isOver) {
      this.lastTime = now
      this.onUpdate(this.state)
      return
    }

    let dt = Math.min(now - this.lastTime, MAX_FRAME_MS) * this.state.speed
    this.lastTime = now
    this.accumulator += dt

    while (this.accumulator >= TICK_MS) {
      const events = tick(this.state, this.encounter, this.rng)
      this.state.events.push(...events)
      this.accumulator -= TICK_MS
      if (this.state.isOver) break
    }

    this.onUpdate(this.state)
  }

  pause() { this.state.isPaused = true }
  resume() { this.state.isPaused = false; this.lastTime = performance.now(); this.accumulator = 0 }
  togglePause() { this.state.isPaused ? this.resume() : this.pause() }
  setSpeed(s: number) { this.state.speed = Math.max(1, Math.min(3, s)) }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private createRng(seed: number): () => number {
    let s = seed
    return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getKeywordBaseForTier(tier: string): number {
  return tier === 'T0' ? 4 : tier === 'T1' ? 3 : tier === 'T2' ? 2 : 1
}

function getProfileAttackMs(profileId: string): number {
  const map: Record<string, number> = {
    assault_balanced: 1800, tempo_duelist: 1400, assault_rend: 1900,
    heavy_execution: 2400, control_crusher: 2100, venom_leech: 1500,
    venom_burst: 1300, occult_venom: 1700, hunter_ranged: 1600,
    ember_caster: 1800, ember_battlemage: 1900, channel_guard: 2000,
    channel_control: 2100,
  }
  return map[profileId] ?? 1800
}

function getProfileAtkMult(profileId: string): number {
  const map: Record<string, number> = {
    assault_balanced: 1.0, tempo_duelist: 0.75, assault_rend: 1.05,
    heavy_execution: 1.5, control_crusher: 1.0, venom_leech: 0.8,
    venom_burst: 0.7, occult_venom: 0.75, hunter_ranged: 0.9,
    ember_caster: 0.8, ember_battlemage: 0.9, channel_guard: 0.85,
    channel_control: 0.9,
  }
  return map[profileId] ?? 1.0
}

/**
 * Assign a stable but varied attack style to each enemy based on its ID.
 * Same enemy always gets the same style (deterministic hash of ID string).
 * This ensures trash mobs of the same type get different visual attacks.
 */
const ENEMY_ATTACK_STYLES: Array<'slash' | 'thrust' | 'smash' | 'bolt'> = ['slash', 'thrust', 'smash', 'bolt']

function getEnemyAttackStyle(enemyId: string): 'slash' | 'thrust' | 'smash' | 'bolt' {
  // Simple hash of the enemy ID string
  let hash = 0
  for (let i = 0; i < enemyId.length; i++) {
    hash = ((hash << 5) - hash + enemyId.charCodeAt(i)) | 0
  }
  return ENEMY_ATTACK_STYLES[Math.abs(hash) % ENEMY_ATTACK_STYLES.length]
}
