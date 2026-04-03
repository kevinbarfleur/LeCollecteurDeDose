import type { PitCombatState, PitResult, PitEvent } from '~/types/pit'

/**
 * The Pit V1 — Scoring
 * Spec section 17
 */
export function calculateScore(state: PitCombatState, loadoutHasNoT0: boolean): PitResult {
  const bossKilled = state.bossKilled
  const wavesCleared = state.wave as 0 | 1 | 2 | 3
  const hpRemaining = Math.max(0, state.player.currentHp)
  const durationMs = state.tickMs
  const durationSec = durationMs / 1000

  // Clear bonus
  const clearBonus =
    (wavesCleared >= 1 ? 400 : 0) +
    (wavesCleared >= 2 ? 900 : 0) +
    (bossKilled ? 2000 : 0)

  // Speed bonus: faster = more points
  const speedBonus = Math.max(0, Math.min(600, Math.round(600 - durationSec * 3)))

  // HP bonus
  const hpBonus = hpRemaining * 4

  // Style bonus: keyword applications + unique triggers
  const keywordApps = state.events.filter(e => e.type === 'status_add').length
  const uniqueTriggers = state.events.filter(e => e.type === 'hidden_proc').length
  const styleBonus = Math.min(400, keywordApps * 8 + uniqueTriggers * 15)

  // Underdog bonus: no T0 in core loadout
  const underdogBonus = bossKilled && loadoutHasNoT0 ? 250 : 0

  const score = clearBonus + speedBonus + hpBonus + styleBonus + underdogBonus

  return {
    bossKilled,
    wavesCleared,
    hpRemaining,
    durationMs,
    score,
    clearBonus,
    speedBonus,
    hpBonus,
    styleBonus,
    underdogBonus,
    events: state.events,
    rulesetVersion: 'v1.0',
  }
}
