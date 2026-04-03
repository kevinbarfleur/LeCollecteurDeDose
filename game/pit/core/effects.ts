import type { PitCombatant, PitCombatState, PitEvent, PitActiveEffect, PitKeywordId } from '~/types/pit'

/**
 * The Pit V1 — Keyword Effects Engine
 * Handles periodic ticks (every 2s), damage application, status management.
 * Spec sections 6 & 7
 */

const PERIODIC_INTERVAL_MS = 2000

// ============================================================================
// DAMAGE
// ============================================================================

export function calculateDamage(
  attacker: PitCombatant,
  defender: PitCombatant,
  skillMultiplier: number = 1.0,
  flatBonus: number = 0,
  offensiveMultiplier: number = 1.0,
): { raw: number; mitigated: number; afterBlock: number; blocked: number } {
  // Check Vulnerable on defender
  const isVulnerable = defender.activeEffects.some(e => e.keywordId === 'Vulnerable')
  const vulnMult = isVulnerable ? 1.3 : 1.0

  const raw = Math.floor((attacker.currentStats.atk + flatBonus) * skillMultiplier * offensiveMultiplier * vulnMult)
  const mitigated = Math.ceil(raw * 100 / (100 + defender.currentStats.def))

  // Block absorption (Block + Plating)
  const totalBlock = getBlockTotal(defender)
  const blocked = Math.min(totalBlock, mitigated)
  const afterBlock = Math.max(1, mitigated - blocked)

  return { raw, mitigated, afterBlock, blocked }
}

export function applyDamage(target: PitCombatant, dmg: number): void {
  target.currentHp = Math.max(0, target.currentHp - dmg)
  if (target.currentHp <= 0) target.isDead = true
}

export function applyHeal(target: PitCombatant, amount: number): number {
  const actual = Math.min(amount, target.maxHp - target.currentHp)
  target.currentHp += actual
  return actual
}

// ============================================================================
// BLOCK
// ============================================================================

function getBlockTotal(combatant: PitCombatant): number {
  return combatant.activeEffects
    .filter(e => e.keywordId === 'Block' || e.keywordId === 'Plating')
    .reduce((s, e) => s + e.value, 0)
}

export function consumeBlock(combatant: PitCombatant, amount: number): number {
  let remaining = amount
  // Consume Block first (temporary), then Plating (permanent)
  for (const eff of combatant.activeEffects.filter(e => e.keywordId === 'Block')) {
    if (remaining <= 0) break
    const consumed = Math.min(eff.value, remaining)
    eff.value -= consumed
    remaining -= consumed
  }
  for (const eff of combatant.activeEffects.filter(e => e.keywordId === 'Plating')) {
    if (remaining <= 0) break
    const consumed = Math.min(eff.value, remaining)
    eff.value -= consumed
    remaining -= consumed
  }
  // Clean up zero-value effects
  combatant.activeEffects = combatant.activeEffects.filter(e =>
    (e.keywordId !== 'Block' && e.keywordId !== 'Plating') || e.value > 0
  )
  return amount - remaining
}

// ============================================================================
// PERIODIC TICKS (every 2s)
// ============================================================================

export function processPeriodicTicks(state: PitCombatState): PitEvent[] {
  const events: PitEvent[] = []
  const allCombatants = [state.player, ...state.enemies].filter(c => !c.isDead)

  for (const combatant of allCombatants) {
    // Poison: deal damage, lose 1 stack
    const poisonEffects = combatant.activeEffects.filter(e => e.keywordId === 'Poison')
    for (const eff of poisonEffects) {
      if (eff.value <= 0) continue
      const dmg = eff.value
      applyDamage(combatant, dmg)
      events.push({
        tickMs: state.tickMs, wave: state.wave, type: 'damage',
        source: 'Poison', target: combatant.name, value: dmg,
        text: `Poison : ${combatant.name} -${dmg} HP`,
      })
      eff.value = Math.max(0, eff.value - 1)
    }

    // Burn: deal damage (ignores Block), doesn't decay (duration-based)
    const burnEffects = combatant.activeEffects.filter(e => e.keywordId === 'Burn')
    for (const eff of burnEffects) {
      if (eff.value <= 0) continue
      applyDamage(combatant, eff.value)
      events.push({
        tickMs: state.tickMs, wave: state.wave, type: 'damage',
        source: 'Brulure', target: combatant.name, value: eff.value,
        text: `Brulure : ${combatant.name} -${eff.value} HP`,
      })
    }

    // Regen
    const regenTotal = combatant.keywords.filter(k => k.id === 'Regen').reduce((s, k) => s + k.value, 0)
      + combatant.activeEffects.filter(e => e.keywordId === 'Regen').reduce((s, e) => s + e.value, 0)
    if (regenTotal > 0 && combatant.currentHp < combatant.maxHp) {
      const healed = applyHeal(combatant, regenTotal)
      if (healed > 0) {
        events.push({
          tickMs: state.tickMs, wave: state.wave, type: 'heal',
          source: 'Regen', target: combatant.name, value: healed,
          text: `Regen : ${combatant.name} +${healed} HP`,
        })
      }
    }

    // Decrement duration-based effects
    combatant.activeEffects = combatant.activeEffects.filter(eff => {
      if (eff.remainingMs === -1) return true // permanent
      if (eff.remainingMs === 0) return true // until end of wave
      eff.remainingMs -= PERIODIC_INTERVAL_MS
      return eff.remainingMs > 0
    })
  }

  return events
}

// ============================================================================
// DODGE CHECK
// ============================================================================

export function checkDodge(defender: PitCombatant, rng: () => number): boolean {
  const dodgeTotal = Math.min(40, // cap 40%
    defender.keywords.filter(k => k.id === 'Dodge').reduce((s, k) => s + k.value, 0)
    + defender.activeEffects.filter(e => e.keywordId === 'Dodge').reduce((s, e) => s + e.value, 0)
  )
  return rng() * 100 < dodgeTotal
}

// ============================================================================
// STAGGER
// ============================================================================

export function getStaggerSlowdown(combatant: PitCombatant): number {
  const stacks = combatant.activeEffects
    .filter(e => e.keywordId === 'Stagger')
    .reduce((s, e) => s + e.value, 0)
  return stacks > 0 ? 0.15 * stacks : 0 // 15% per stack
}

// ============================================================================
// STRENGTH
// ============================================================================

export function getStrengthBonus(combatant: PitCombatant): number {
  return combatant.keywords.filter(k => k.id === 'Strength').reduce((s, k) => s + k.value, 0)
    + combatant.activeEffects.filter(e => e.keywordId === 'Strength').reduce((s, e) => s + e.value, 0)
}

// ============================================================================
// LIFESTEAL
// ============================================================================

export function getLifestealPct(combatant: PitCombatant): number {
  return combatant.keywords.filter(k => k.id === 'Lifesteal').reduce((s, k) => s + k.value, 0)
    + combatant.activeEffects.filter(e => e.keywordId === 'Lifesteal').reduce((s, e) => s + e.value, 0)
}

// ============================================================================
// ADD EFFECT
// ============================================================================

export function addEffect(target: PitCombatant, kwId: PitKeywordId | string, value: number, durationMs: number, source: string): void {
  const existing = target.activeEffects.find(e => e.keywordId === kwId && e.source === source)
  if (existing) {
    existing.value = Math.max(existing.value, value)
    existing.remainingMs = durationMs
  } else {
    target.activeEffects.push({
      id: `${kwId}_${source}_${Date.now()}`,
      keywordId: kwId,
      value,
      remainingMs: durationMs,
      source,
    })
  }
}
