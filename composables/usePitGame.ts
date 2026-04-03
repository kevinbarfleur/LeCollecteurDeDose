import { ref, computed, shallowRef, triggerRef } from 'vue'
import type {
  PitGamePhase, PitCombatState, PitCardDef, PitSlotId, PitLoadoutSlot,
  PitDailyConfig, PitResult, PitKeywordInstance, PitStats, PitSynergyDef, PitLoadout,
} from '~/types/pit'
import { PIT_ALL_SLOTS } from '~/types/pit'
import { PIT_CARD_MAP, PIT_CARDS_BY_UID } from '~/game/pit/content/cardMap'
import { PIT_KEYWORDS, getKeywordDef } from '~/game/pit/content/keywords'
import { PIT_ENCOUNTERS, BOSS_IDS } from '~/game/pit/content/bosses'
import { PIT_MODIFIERS } from '~/game/pit/content/modifiers'
import { checkSynergies } from '~/game/pit/content/synergies'
import { PIT_OVERRIDES_BY_ID } from '~/game/pit/content/overrides'
import { buildDraft } from '~/game/pit/core/draft'
import { createEmptyLoadoutSlots, canPlaceCard, updateSlotStates, isLoadoutValid, extractLoadout } from '~/game/pit/core/loadout'
import { createCombatState, spawnWave, PitEngineRunner } from '~/game/pit/core/engine'
import { calculateScore } from '~/game/pit/core/scoring'

export function usePitGame() {
  // ==========================================
  // STATE
  // ==========================================
  const phase = ref<PitGamePhase>('idle')
  const dailyConfig = ref<PitDailyConfig | null>(null)
  const draftCards = ref<PitCardDef[]>([])
  const slots = ref<Record<PitSlotId, PitLoadoutSlot>>(createEmptyLoadoutSlots())
  const combatState = shallowRef<PitCombatState | null>(null)
  const result = shallowRef<PitResult | null>(null)
  let engine: PitEngineRunner | null = null

  // ==========================================
  // COMPUTED
  // ==========================================
  const loadoutCards = computed<PitCardDef[]>(() =>
    PIT_ALL_SLOTS.map(s => slots.value[s].card).filter((c): c is PitCardDef => c !== null)
  )

  const loadoutStats = computed<PitStats>(() => {
    const base: PitStats = { atk: 0, def: 0, hp: 100, spd: 10, pwr: 0 }
    for (const card of loadoutCards.value) {
      base.atk += card.stats.atk
      base.def += card.stats.def
      base.hp += card.stats.hp
      base.spd += card.stats.spd
      base.pwr += card.stats.pwr
    }
    return base
  })

  const loadoutKeywords = computed<PitKeywordInstance[]>(() => {
    const kws = new Map<string, number>()
    for (const card of loadoutCards.value) {
      if (card.primaryKeyword !== 'MapMod' && card.primaryKeyword !== 'Tactical') {
        const tierVal = card.tier === 'T0' ? 4 : card.tier === 'T1' ? 3 : card.tier === 'T2' ? 2 : 1
        kws.set(card.primaryKeyword, (kws.get(card.primaryKeyword) ?? 0) + tierVal)
      }
    }
    return Array.from(kws.entries()).map(([id, value]) => ({ id: id as any, value }))
  })

  const loadoutObj = computed<PitLoadout | null>(() => {
    if (!isLoadoutValid(slots.value)) return null
    return extractLoadout(slots.value)
  })

  const activeSynergies = computed<PitSynergyDef[]>(() => {
    if (!loadoutObj.value) return []
    return checkSynergies(loadoutObj.value)
  })

  const canStartCombat = computed(() => isLoadoutValid(slots.value))

  const availableDraftCards = computed(() => {
    const used = new Set(loadoutCards.value.map(c => c.uid))
    return draftCards.value.filter(c => !used.has(c.uid))
  })

  // ==========================================
  // ACTIONS
  // ==========================================
  function startNewGame() {
    destroyEngine()
    // Generate daily config
    const date = new Date().toISOString().split('T')[0]
    const seed = date.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0)
    const rng = seedRng(seed)
    const bossId = BOSS_IDS[Math.floor(rng() * BOSS_IDS.length)]
    const modId = PIT_MODIFIERS[Math.floor(rng() * PIT_MODIFIERS.length)].id

    dailyConfig.value = { date, bossId, modifierId: modId, seed, rulesetVersion: 'v1.0' }

    // Build draft from all cards (prototype: use full catalogue as "player collection")
    const playerUids = new Set(PIT_CARD_MAP.map(c => c.uid))
    const draft = buildDraft(playerUids, seed)
    draftCards.value = draft.cards

    slots.value = createEmptyLoadoutSlots()
    combatState.value = null
    result.value = null
    phase.value = 'draft'
  }

  function selectCardForSlot(card: PitCardDef, slotId: PitSlotId) {
    if (!canPlaceCard(card, slotId, slots.value)) return
    // Remove from any existing slot
    for (const s of Object.values(slots.value)) {
      if (s.card?.uid === card.uid) s.card = null
    }
    slots.value[slotId].card = card
    updateSlotStates(slots.value)
    slots.value = { ...slots.value }
  }

  function removeFromSlot(slotId: PitSlotId) {
    slots.value[slotId].card = null
    updateSlotStates(slots.value)
    slots.value = { ...slots.value }
  }

  function autoFill() {
    const available = [...availableDraftCards.value]
    const order: PitSlotId[] = ['mainhand', 'body', 'minor', 'charm1', 'charm2', 'focus', 'offhand', 'tactical']
    for (const slotId of order) {
      const slot = slots.value[slotId]
      if (slot.card || slot.isDisabled) continue
      const candidates = available.filter(c => canPlaceCard(c, slotId, slots.value))
      if (candidates.length === 0) continue
      // Pick highest total stats
      candidates.sort((a, b) => (b.stats.atk + b.stats.def + b.stats.hp + b.stats.spd + b.stats.pwr)
        - (a.stats.atk + a.stats.def + a.stats.hp + a.stats.spd + a.stats.pwr))
      const pick = candidates[0]
      slots.value[slotId].card = pick
      available.splice(available.indexOf(pick), 1)
      updateSlotStates(slots.value)
    }
    slots.value = { ...slots.value }
  }

  function resetLoadout() {
    for (const s of Object.values(slots.value)) s.card = null
    updateSlotStates(slots.value)
    slots.value = { ...slots.value }
  }

  function getBestSlot(card: PitCardDef): PitSlotId | null {
    // Try slot families in priority order
    const slotMap: Record<string, PitSlotId[]> = {
      mainhand: ['mainhand'],
      offhand: ['offhand'],
      body: ['body'],
      minor: ['minor'],
      charm: ['charm1', 'charm2'],
      focus: ['focus'],
      tactical: ['tactical'],
    }
    for (const family of card.allowedSlots) {
      const candidates = slotMap[family] ?? []
      for (const slotId of candidates) {
        if (!slots.value[slotId].card && canPlaceCard(card, slotId, slots.value)) return slotId
      }
    }
    return null
  }

  function goToLoadout() { phase.value = 'loadout' }
  function goToDraft() { phase.value = 'draft' }

  // ==========================================
  // COMBAT
  // ==========================================
  function startCombat() {
    if (!canStartCombat.value || !dailyConfig.value || !loadoutObj.value) return
    destroyEngine()

    const encounter = PIT_ENCOUNTERS[dailyConfig.value.bossId]
    const modifier = PIT_MODIFIERS.find(m => m.id === dailyConfig.value!.modifierId) ?? PIT_MODIFIERS[0]

    const state = createCombatState(loadoutObj.value, encounter, modifier, dailyConfig.value.seed)
    combatState.value = state
    phase.value = 'combat'

    engine = new PitEngineRunner(state, encounter, dailyConfig.value.seed, (updated) => {
      combatState.value = updated
      triggerRef(combatState)

      if (updated.isOver && phase.value === 'combat') {
        const hasNoT0 = loadoutCards.value.every(c => c.tier !== 'T0')
        result.value = calculateScore(updated, hasNoT0)
        phase.value = 'results'
        destroyEngine()
      }
    })

    engine.start()
  }

  function togglePause() { engine?.togglePause() }
  function setSpeed(s: number) { engine?.setSpeed(s) }
  function destroyEngine() { engine?.destroy(); engine = null }

  // ==========================================
  // HELPERS
  // ==========================================
  function getOverride(effectId: string) { return PIT_OVERRIDES_BY_ID.get(effectId) }
  function getKwDef(id: string) { return getKeywordDef(id) }
  function getCardByUid(uid: number) { return PIT_CARDS_BY_UID.get(uid) }

  function seedRng(seed: number): () => number {
    let s = seed
    return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF }
  }

  return {
    phase, dailyConfig, draftCards, slots, combatState, result,
    loadoutCards, loadoutStats, loadoutKeywords, loadoutObj, activeSynergies,
    canStartCombat, availableDraftCards,
    startNewGame, selectCardForSlot, removeFromSlot, autoFill, resetLoadout,
    getBestSlot, goToLoadout, goToDraft,
    startCombat, togglePause, setSpeed, destroyEngine,
    getOverride, getKwDef, getCardByUid,
  }
}
