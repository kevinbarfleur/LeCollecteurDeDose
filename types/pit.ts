/**
 * The Pit V1 — Core Types
 * Aligned with the_pit_v1_spec.md section 18
 */

// ============================================================================
// SLOTS
// ============================================================================

export type PitSlotId =
  | 'mainhand'
  | 'offhand'
  | 'body'
  | 'minor'
  | 'charm1'
  | 'charm2'
  | 'focus'
  | 'tactical'

export const PIT_CORE_SLOTS: PitSlotId[] = ['mainhand', 'body', 'minor', 'charm1', 'charm2', 'focus']
export const PIT_ALL_SLOTS: PitSlotId[] = ['mainhand', 'offhand', 'body', 'minor', 'charm1', 'charm2', 'focus', 'tactical']

// ============================================================================
// KEYWORDS
// ============================================================================

export type PitKeywordId =
  | 'Strength'
  | 'Block'
  | 'Plating'
  | 'Regen'
  | 'Poison'
  | 'Burn'
  | 'Vulnerable'
  | 'Lifesteal'
  | 'Dodge'
  | 'Foresight'
  | 'Stagger'

export interface PitKeywordDef {
  id: PitKeywordId
  name: string
  description: string
  category: 'offensive' | 'defensive' | 'utility'
  color: string
  icon: string
  baseValues: [number, number, number, number] // T3, T2, T1, T0
  cap?: number
}

export interface PitKeywordInstance {
  id: PitKeywordId
  value: number
}

// ============================================================================
// STATS
// ============================================================================

export interface PitStats {
  atk: number
  def: number
  hp: number
  spd: number
  pwr: number
}

// ============================================================================
// CARD DEFINITION (from CSV)
// ============================================================================

export type PitTier = 'T0' | 'T1' | 'T2' | 'T3'
export type PitEffectTier = 'simple' | 'major' | 'elite' | 'legendary'
export type PitSlotFamily = 'mainhand' | 'offhand' | 'body' | 'minor' | 'charm' | 'focus' | 'tactical'
export type PitClarityLevel = 'explicit' | 'implied' | 'hidden'

export interface PitCardDef {
  uid: number
  id: string
  name: string
  rawItemClass: string
  normalizedClass: string
  tier: PitTier
  allowedSlots: PitSlotFamily[]
  profileId: string
  motif: string
  stats: PitStats
  primaryKeyword: PitKeywordId | 'MapMod' | 'Tactical'
  secondaryKeyword?: PitKeywordId
  effectTier: PitEffectTier
  archetypeTags: string[]
  isMarquee: boolean
  overrideEffectId?: string
  wikiUrl: string
  relevanceScore: number
  // Resolved at runtime
  imgUrl?: string
}

// ============================================================================
// OVERRIDE EFFECT
// ============================================================================

export interface PitOverrideDef {
  effectId: string
  itemName: string
  tier: PitTier
  slotScope: string[]
  clarity: PitClarityLevel
  trigger: string
  effectSummary: string
  mechanicalNotes: string
  bossCounter: string
  buildRoles: string[]
}

// ============================================================================
// PROFILE BEHAVIOR
// ============================================================================

export interface PitProfileDef {
  id: string
  attackMs: number
  atkMultiplier: number
  onHitEffect?: (ctx: PitActionContext) => PitEvent[]
  passiveEffect?: (ctx: PitActionContext) => PitEvent[]
  description: string
}

// ============================================================================
// BOSS
// ============================================================================

export interface PitBossDef {
  id: string
  name: string
  title: string
  stats: PitStats & { hp: number }
  specialName: string
  specialDescription: string
  specialIntervalMs: number
  specialTelegraphMs: number
  executeSpecial: (ctx: PitActionContext) => PitEvent[]
}

export interface PitWaveDef {
  label: string
  enemies: PitEnemyDef[]
}

export interface PitEnemyDef {
  id: string
  name: string
  stats: PitStats & { hp: number }
  keywords: PitKeywordInstance[]
  attackMs: number
  atkMultiplier: number
}

export interface PitEncounterDef {
  bossId: string
  boss: PitBossDef
  waves: PitWaveDef[]
}

// ============================================================================
// MODIFIER
// ============================================================================

export interface PitModifierDef {
  id: string
  name: string
  description: string
  type: 'positive' | 'negative'
  apply: (stats: PitStats) => PitStats
  applyKeywords?: PitKeywordInstance[]
}

// ============================================================================
// SYNERGY
// ============================================================================

export interface PitSynergyDef {
  id: string
  name: string
  condition: string
  bonus: string
  check: (loadout: PitLoadout) => boolean
  effects: PitSynergyEffect[]
}

export interface PitSynergyEffect {
  type: 'stat_flat' | 'stat_mult' | 'keyword_add' | 'special'
  stat?: keyof PitStats
  keywordId?: PitKeywordId
  value: number
  description?: string
}

// ============================================================================
// LOADOUT
// ============================================================================

export interface PitLoadout {
  mainhand: number // uid
  offhand?: number | null
  body: number
  minor: number
  charm1: number
  charm2: number
  focus: number
  tactical?: number | null
}

export interface PitLoadoutSlot {
  id: PitSlotId
  label: string
  icon: string
  acceptsFamily: PitSlotFamily[]
  card: PitCardDef | null
  isDisabled: boolean
  disabledReason?: string
}

// ============================================================================
// COMBAT STATE (Action Meter engine)
// ============================================================================

export interface PitCombatant {
  id: string
  name: string
  baseStats: PitStats
  currentStats: PitStats
  maxHp: number
  currentHp: number
  actionMeter: number // 0-100
  keywords: PitKeywordInstance[]
  activeEffects: PitActiveEffect[]
  isDead: boolean
  isPlayer: boolean
  // For player: equipped cards info
  profileId?: string
  attackMs?: number
  atkMultiplier?: number
}

export interface PitActiveEffect {
  id: string
  keywordId: PitKeywordId | string
  value: number
  remainingMs: number // -1 = permanent, 0 = until end of wave
  source: string
  isHidden?: boolean
}

export interface PitCombatState {
  tickMs: number // current game time in ms
  wave: number
  totalWaves: number
  player: PitCombatant
  enemies: PitCombatant[]
  events: PitEvent[]
  isOver: boolean
  bossKilled: boolean
  isPaused: boolean
  speed: number
  periodicLastTick: number // last 2s periodic tick
  bossSpecialLastTick: number
  bossSpecialTelegraphing: boolean
  bossSpecialTelegraphStart: number
}

// ============================================================================
// EVENTS (log stream)
// ============================================================================

export type PitEventType =
  | 'hit'
  | 'damage'
  | 'status_add'
  | 'status_remove'
  | 'heal'
  | 'meter_gain'
  | 'special_telegraph'
  | 'special_fire'
  | 'gear_suppressed'
  | 'hidden_proc'
  | 'death'
  | 'wave_transition'
  | 'info'
  | 'dodge'
  | 'block'

export interface PitEvent {
  tickMs: number
  wave: number
  type: PitEventType
  source: string
  target: string
  sourceId?: string  // combatant.id for animation targeting
  targetId?: string  // combatant.id for animation targeting
  attackStyle?: 'slash' | 'thrust' | 'smash' | 'bolt' | 'generic' // VFX style
  value?: number
  text: string
  detail?: string
  isImportant?: boolean
}

export interface PitActionContext {
  state: PitCombatState
  source: PitCombatant
  target: PitCombatant
  allEnemies: PitCombatant[]
}

// ============================================================================
// DAILY CONFIG
// ============================================================================

export interface PitDailyConfig {
  date: string
  bossId: string
  modifierId: string
  seed: number
  rulesetVersion: string
}

// ============================================================================
// RESULTS & SCORING
// ============================================================================

export interface PitResult {
  bossKilled: boolean
  wavesCleared: 0 | 1 | 2 | 3
  hpRemaining: number
  durationMs: number
  score: number
  clearBonus: number
  speedBonus: number
  hpBonus: number
  styleBonus: number
  underdogBonus: number
  events: PitEvent[]
  rulesetVersion: string
}

// ============================================================================
// GAME PHASES
// ============================================================================

export type PitGamePhase = 'idle' | 'draft' | 'loadout' | 'combat' | 'results'
