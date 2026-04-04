<script setup lang="ts">
import type { PitSlotId, PitCardDef, PitSlotFamily } from '~/types/pit'
import type { PitStatsOverlay } from '~/components/card/GameCard.vue'
import { PIT_ALL_SLOTS } from '~/types/pit'
import { PIT_ENCOUNTERS } from '~/game/pit/content/bosses'
import { PIT_MODIFIERS } from '~/game/pit/content/modifiers'
import { pitCardToGameCard } from '~/game/pit/content/cardMap'
import { canPlaceCard } from '~/game/pit/core/loadout'
import { getKeywordDef } from '~/game/pit/content/keywords'
import { usePitFloatingNumbers } from '~/composables/usePitFloatingNumbers'
import type { FloatType } from '~/composables/usePitFloatingNumbers'
import { usePitAttackAnimations } from '~/composables/usePitAttackAnimations'

const game = usePitGame()
const logEl = ref<HTMLElement | null>(null)
const playerPanelRef = ref<HTMLElement | null>(null)
const enemyPanelRef = ref<HTMLElement | null>(null)
const dividerRef = ref<HTMLElement | null>(null)
const enemyPanelRefs = ref<Map<string, HTMLElement>>(new Map())

function setEnemyPanelRef(el: any, enemyId: string) {
  if (el) enemyPanelRefs.value.set(enemyId, el as HTMLElement)
}

// Floating numbers
const playerFloats = usePitFloatingNumbers(playerPanelRef)
const enemyFloats = usePitFloatingNumbers(enemyPanelRef)

// Attack animations
const attackAnims = usePitAttackAnimations({
  playerPanel: playerPanelRef,
  enemyPanels: enemyPanelRefs,
  divider: dividerRef,
})

// Watch combat events for floating numbers + attack animations
watch(() => game.combatState.value?.events.length, (newLen, oldLen) => {
  if (!game.combatState.value || !newLen || !oldLen || newLen <= oldLen) return
  const events = game.combatState.value.events.slice(oldLen)
  for (const evt of events) {
    const isTargetPlayer = evt.target === 'Exile'
    const floater = isTargetPlayer ? playerFloats : enemyFloats
    const x = 20 + Math.random() * 60
    const y = 30 + Math.random() * 40

    // Floating numbers
    if (evt.type === 'hit' && evt.value) {
      const isBig = evt.value > 20
      floater.spawn(`-${evt.value}`, isBig ? 'crit' : 'dmg', x, y)

      // Attack lunge + VFX animation
      const style = evt.attackStyle ?? 'generic'
      if (evt.sourceId === 'player') {
        if (evt.targetId) attackAnims.playerAttacks(evt.targetId, isBig, style)
      } else if (evt.sourceId) {
        attackAnims.enemyAttacks(evt.sourceId, (evt.value ?? 0) > 20, style)
      }
    } else if (evt.type === 'damage' && evt.value && (evt.source === 'Poison' || evt.source === 'Brulure')) {
      const type = evt.source === 'Poison' ? 'poison' as const : 'burn' as const
      floater.spawn(`-${evt.value}`, type, x, y)
    } else if (evt.type === 'heal' && evt.value) {
      floater.spawn(`+${evt.value}`, 'heal', x, y)
    } else if (evt.type === 'dodge') {
      floater.spawn('Esquive!', 'dodge', x, y)
    } else if (evt.type === 'special_fire' && evt.value) {
      floater.spawn(`-${evt.value}`, 'special', x, y)
      if (evt.sourceId) attackAnims.enemyAttacks(evt.sourceId, true)
    } else if (evt.type === 'special_telegraph') {
      if (evt.sourceId) attackAnims.bossSpecialTelegraph(evt.sourceId)
    }
  }
})

// Auto-scroll log
watch(() => game.combatState.value?.events.length, () => {
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
})

onUnmounted(() => { game.destroyEngine(); playerFloats.destroy(); enemyFloats.destroy() })
onMounted(() => game.startNewGame())

// ---- Slot filter ----
const slotFilter = ref<PitSlotFamily | 'all'>('all')
const SLOT_FILTERS: { id: PitSlotFamily | 'all'; label: string }[] = [
  { id: 'all', label: 'Toutes' }, { id: 'mainhand', label: 'Armes' }, { id: 'offhand', label: 'Off-hand' },
  { id: 'body', label: 'Armure' }, { id: 'minor', label: 'Mineur' }, { id: 'charm', label: 'Charms' },
  { id: 'focus', label: 'Focus' }, { id: 'tactical', label: 'Tactique' },
]

const filteredDraft = computed(() => {
  if (slotFilter.value === 'all') return game.draftCards.value
  return game.draftCards.value.filter(c => c.allowedSlots.includes(slotFilter.value as PitSlotFamily))
})

function isUsed(c: PitCardDef) { return game.loadoutCards.value.some(x => x.uid === c.uid) }

// ---- Convert PitCardDef to GameCard props ----
function toGameCard(c: PitCardDef) { return pitCardToGameCard(c) }

function toPitStats(c: PitCardDef): PitStatsOverlay {
  const pk = c.primaryKeyword !== 'MapMod' && c.primaryKeyword !== 'Tactical' ? getKeywordDef(c.primaryKeyword) : undefined
  const sk = c.secondaryKeyword ? getKeywordDef(c.secondaryKeyword) : undefined
  return {
    ...c.stats,
    primaryKeyword: pk?.name,
    primaryKeywordColor: pk?.color,
    secondaryKeyword: sk?.name,
    secondaryKeywordColor: sk?.color,
  }
}

// ---- D&D: click to equip (simplified — drag will come later with proper lib integration) ----
function onCardClick(card: PitCardDef) {
  // Don't equip on click — let GameCard handle it (zoom)
  // We equip via the "Equiper" button or a secondary action
}

function equipCard(card: PitCardDef) {
  const slot = game.getBestSlot(card)
  if (slot) game.selectCardForSlot(card, slot)
}

// ---- Helpers ----
function fmt(ms: number) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`
}

function sc(stat: string) {
  return { atk: '#c83232', def: '#5a7080', hp: '#27ae60', spd: '#c9a227', pwr: '#7a6a8a' }[stat] ?? '#c8c8c8'
}

const SL: Record<string, string> = { atk: 'ATK', def: 'DEF', hp: 'HP', spd: 'SPD', pwr: 'PWR' }

function slotLabel(families: PitSlotFamily[]): string {
  const m: Record<string, string> = { mainhand: 'Arme', offhand: 'Off', body: 'Armure', minor: 'Mineur', charm: 'Charm', focus: 'Focus', tactical: 'Tact.' }
  return families.map(f => m[f] ?? f).join('/')
}

const currentBoss = computed(() => game.dailyConfig.value ? PIT_ENCOUNTERS[game.dailyConfig.value.bossId] : null)
const currentMod = computed(() => game.dailyConfig.value ? PIT_MODIFIERS.find(m => m.id === game.dailyConfig.value!.modifierId) : null)
const isLowHp = computed(() => {
  const p = game.combatState.value?.player
  return p && p.currentHp > 0 && p.currentHp < p.maxHp * 0.3
})
const filledCount = computed(() => PIT_ALL_SLOTS.filter(s => game.slots.value[s].card).length)

// (Attack animations handled by usePitAttackAnimations composable via event watcher above)

// (SLOT_LAYOUT removed — using body silhouette layout in template)
</script>

<template>
  <NuxtLayout>
    <div class="page-container py-4 sm:py-6">
      <div class="pit-grain" />

      <!-- ======== TABS ======== -->
      <div v-if="game.phase.value !== 'idle' && game.phase.value !== 'results'" class="pit-tabs mb-4">
        <div class="pit-tab" :class="{ 'pit-tab--active': game.phase.value === 'draft' || game.phase.value === 'loadout' }" @click="game.goToDraft()">
          Armurerie <span v-if="filledCount > 0" class="text-[#27ae60] text-xs ml-1">({{ filledCount }}/8)</span>
        </div>
        <div class="pit-tab" :class="{ 'pit-tab--active': game.phase.value === 'combat' }">Combat</div>
      </div>

      <!-- ======== ARMURERIE (Draft + Loadout fusionnes) ======== -->
      <template v-if="(game.phase.value === 'draft' || game.phase.value === 'loadout') && game.dailyConfig.value">

        <!-- Boss + Modifier info -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5" v-if="currentBoss">
          <div class="pit-boss-banner">
            <div class="text-xs text-poe-text-muted font-body uppercase tracking-wider mb-1">Boss du jour</div>
            <div class="pit-boss-banner__name">{{ currentBoss.boss.name }}</div>
            <div class="pit-boss-banner__title">{{ currentBoss.boss.title }}</div>
            <div class="mt-2 font-body text-sm text-poe-text-dim">
              <span class="text-[#c83232] font-semibold">{{ currentBoss.boss.specialName }}</span> — {{ currentBoss.boss.specialDescription }}
            </div>
          </div>
          <div v-if="currentMod" class="pit-boss-banner" style="border-color: rgba(175, 96, 37, 0.15)">
            <div class="text-xs text-poe-text-muted font-body uppercase tracking-wider mb-1">Modificateur</div>
            <div class="pit-mod" :class="`pit-mod--${currentMod.type}`" style="font-size: 1rem">{{ currentMod.name }}</div>
            <div class="font-body text-sm text-poe-text-dim mt-1">{{ currentMod.description }}</div>
          </div>
        </div>

        <!-- Main layout: Cards LEFT, Slots + Stats RIGHT -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">

          <!-- LEFT: Draft cards -->
          <div class="lg:col-span-7 xl:col-span-8">
            <!-- Slot filters -->
            <div class="flex gap-1 flex-wrap mb-3">
              <button v-for="sf in SLOT_FILTERS" :key="sf.id" class="pit-slot-filter" :class="{ 'pit-slot-filter--active': slotFilter === sf.id }" @click="slotFilter = sf.id">
                {{ sf.label }}
              </button>
            </div>

            <!-- Card grid with real GameCards -->
            <div class="pit-card-grid">
              <div v-for="card in filteredDraft" :key="card.uid" class="pit-card-slot" :class="{ 'pit-card-slot--used': isUsed(card) }">
                <GameCard :card="toGameCard(card)" :owned="true" :pit-stats="toPitStats(card)" />
                <!-- Equip button overlay -->
                <div v-if="!isUsed(card)" class="pit-card-equip" @click.stop="equipCard(card)">
                  <span class="pit-card-equip__label">{{ slotLabel(card.allowedSlots) }}</span>
                  <button class="pit-card-equip__btn">Equiper</button>
                </div>
                <div v-else class="pit-card-equipped-badge">EQUIPE</div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Equipment slots + Stats -->
          <div class="lg:col-span-5 xl:col-span-4">
            <RunicBox padding="md">
              <h3 class="font-display text-sm font-semibold text-poe-text mb-4"><span class="text-accent">&#9670;</span> Equipement</h3>

              <!-- Slots in body silhouette layout -->
              <div class="pit-body-layout mb-5">
                <!-- Row 1: Head (minor) centered -->
                <div class="pit-body-row pit-body-row--head">
                  <PitEquipSlot :slot-data="game.slots.value.minor" @remove="game.removeFromSlot('minor')" />
                </div>
                <!-- Row 2: Left arm (mainhand) | Body | Right arm (offhand) -->
                <div class="pit-body-row pit-body-row--torso">
                  <PitEquipSlot :slot-data="game.slots.value.mainhand" @remove="game.removeFromSlot('mainhand')" />
                  <PitEquipSlot :slot-data="game.slots.value.body" @remove="game.removeFromSlot('body')" />
                  <PitEquipSlot :slot-data="game.slots.value.offhand" @remove="game.removeFromSlot('offhand')" />
                </div>
                <!-- Row 3: Charms (jewelry) -->
                <div class="pit-body-row pit-body-row--waist">
                  <PitEquipSlot :slot-data="game.slots.value.charm1" @remove="game.removeFromSlot('charm1')" />
                  <PitEquipSlot :slot-data="game.slots.value.charm2" @remove="game.removeFromSlot('charm2')" />
                </div>
                <!-- Row 4: Focus + Tactical -->
                <div class="pit-body-row pit-body-row--feet">
                  <PitEquipSlot :slot-data="game.slots.value.focus" @remove="game.removeFromSlot('focus')" />
                  <PitEquipSlot :slot-data="game.slots.value.tactical" @remove="game.removeFromSlot('tactical')" />
                </div>
              </div>

              <!-- Stats summary -->
              <h4 class="font-display text-xs font-semibold text-poe-text-dim mb-2 uppercase tracking-wider">Stats totales</h4>
              <div class="pit-stats-row mb-4">
                <div v-for="stat in ['atk','def','hp','spd','pwr']" :key="stat" class="pit-stat-cell">
                  <div class="pit-stat-cell__label" :style="{ color: sc(stat) }">{{ SL[stat] }}</div>
                  <div class="pit-stat-cell__value" :style="{ color: sc(stat) }">{{ game.loadoutStats.value[stat as keyof typeof game.loadoutStats.value] }}</div>
                </div>
              </div>

              <!-- Keywords -->
              <template v-if="game.loadoutKeywords.value.length">
                <h4 class="font-display text-xs font-semibold text-poe-text-dim mb-2 uppercase tracking-wider">Keywords</h4>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span v-for="kw in game.loadoutKeywords.value" :key="kw.id" class="pit-kw" :style="{ color: game.getKwDef(kw.id)?.color }">{{ game.getKwDef(kw.id)?.name }} {{ kw.value }}</span>
                </div>
              </template>

              <!-- Synergies -->
              <template v-if="game.activeSynergies.value.length">
                <h4 class="font-display text-xs font-semibold text-poe-text-dim mb-2 uppercase tracking-wider">Synergies</h4>
                <div class="flex flex-col gap-2 mb-4">
                  <div v-for="syn in game.activeSynergies.value" :key="syn.id" class="pit-syn">
                    <span class="pit-syn__name">{{ syn.name }}</span>
                    <span class="pit-syn__bonus">{{ syn.bonus }}</span>
                  </div>
                </div>
              </template>
            </RunicBox>

            <div class="flex flex-col gap-2 mt-4">
              <RunicButton variant="primary" :disabled="!game.canStartCombat.value" @click="game.startCombat()">
                Descendre dans The Pit
              </RunicButton>
              <div class="flex gap-2">
                <RunicButton variant="ghost" size="sm" class="flex-1" @click="game.autoFill()">Auto-fill</RunicButton>
                <RunicButton variant="ghost" size="sm" class="flex-1" @click="game.resetLoadout()">Vider</RunicButton>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ======== COMBAT ======== -->
      <template v-if="game.phase.value === 'combat' && game.combatState.value">
        <RunicBox padding="sm">
          <div class="flex items-center justify-between">
            <span class="font-display text-sm font-semibold text-poe-text">
              Vague <span class="text-accent">{{ game.combatState.value.wave + 1 }}</span><span class="text-poe-text-muted">/{{ game.combatState.value.totalWaves }}</span>
            </span>
            <span class="pit-clock">{{ fmt(game.combatState.value.tickMs) }}</span>
            <div class="flex gap-1 items-center">
              <RunicButton :variant="game.combatState.value.isPaused ? 'primary' : 'ghost'" size="xs" @click="game.togglePause()">
                {{ game.combatState.value.isPaused ? '&#9654;' : '&#10074;&#10074;' }}
              </RunicButton>
              <RunicButton v-for="s in [1, 2, 3]" :key="s" :variant="game.combatState.value.speed === s ? 'secondary' : 'ghost'" size="xs" @click="game.setSpeed(s)">x{{ s }}</RunicButton>
            </div>
          </div>
        </RunicBox>

        <!-- Battlefield -->
        <div class="pit-battlefield" :class="{ 'pit-low-hp': isLowHp }">
          <!-- Player -->
          <div class="pit-bf-side">
            <div ref="playerPanelRef" class="pit-panel pit-panel--player" style="position:relative; overflow:visible">
              <div class="pit-panel__name text-[#af6025]">{{ game.combatState.value.player.name }}</div>
              <RunicProgressBar :value="(game.combatState.value.player.currentHp / game.combatState.value.player.maxHp) * 100" color="default" size="sm" :show-label="false" />
              <div class="pit-panel__hp">{{ game.combatState.value.player.currentHp }} / {{ game.combatState.value.player.maxHp }} HP</div>
              <div class="pit-action-meter mt-2">
                <div class="pit-action-meter__label">Action</div>
                <div class="pit-action-meter__track">
                  <div class="pit-action-meter__fill pit-action-meter__fill--player" :style="{ width: Math.min(100, game.combatState.value.player.actionMeter) + '%' }" />
                </div>
                <div class="pit-action-meter__pct">{{ Math.round(game.combatState.value.player.actionMeter) }}%</div>
              </div>
              <div class="pit-panel__stats mt-2">
                <span class="pit-panel__stat" style="color:#c83232">ATK {{ game.combatState.value.player.currentStats.atk }}</span>
                <span class="pit-panel__stat" style="color:#5a7080">DEF {{ game.combatState.value.player.currentStats.def }}</span>
                <span class="pit-panel__stat" style="color:#c9a227">SPD {{ game.combatState.value.player.currentStats.spd }}</span>
              </div>
              <div v-if="game.combatState.value.player.activeEffects.length" class="pit-panel__effects">
                <span v-for="eff in game.combatState.value.player.activeEffects" :key="eff.id" class="pit-panel__effect" :style="{ color: game.getKwDef(eff.keywordId)?.color }">
                  {{ game.getKwDef(eff.keywordId)?.name ?? eff.keywordId }} {{ eff.value }}
                </span>
              </div>
            </div>
          </div>

          <div ref="dividerRef" class="pit-bf-vs" />

          <!-- Enemies -->
          <div class="pit-bf-side flex flex-col gap-3">
            <div v-for="enemy in game.combatState.value.enemies" :key="enemy.id" :ref="el => { setEnemyPanelRef(el, enemy.id); if (enemy === game.combatState.value!.enemies[0]) enemyPanelRef = el as HTMLElement }" class="pit-panel pit-panel--enemy" :class="{ 'pit-panel--dead': enemy.isDead }" style="position:relative; overflow:visible">
              <div class="flex items-center justify-between">
                <span class="pit-panel__name text-[#c83232] mb-0">{{ enemy.name }}</span>
                <span v-if="!enemy.isDead" class="pit-panel__hp">{{ enemy.currentHp }}/{{ enemy.maxHp }}</span>
              </div>
              <RunicProgressBar :value="enemy.isDead ? 0 : (enemy.currentHp / enemy.maxHp) * 100" color="vaal" size="sm" :show-label="false" />
              <div v-if="!enemy.isDead" class="pit-action-meter mt-1">
                <div class="pit-action-meter__track">
                  <div class="pit-action-meter__fill pit-action-meter__fill--enemy" :style="{ width: Math.min(100, enemy.actionMeter) + '%' }" />
                </div>
              </div>
              <div v-if="game.combatState.value.bossSpecialTelegraphing && enemy.id === currentBoss?.boss.id" class="pit-telegraph">
                {{ currentBoss?.boss.specialName }} en preparation...
              </div>
              <div v-if="enemy.activeEffects.length" class="pit-panel__effects">
                <span v-for="eff in enemy.activeEffects" :key="eff.id" class="pit-panel__effect" :style="{ color: game.getKwDef(eff.keywordId)?.color }">
                  {{ game.getKwDef(eff.keywordId)?.name ?? eff.keywordId }} {{ eff.value }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Log -->
        <div class="relative mt-3">
          <div ref="logEl" class="pit-log">
            <div v-for="(e, i) in game.combatState.value.events.slice(-40)" :key="i" class="pit-log__entry" :class="`pit-log__entry--${e.type}`">
              <template v-if="e.type === 'wave_transition'">{{ e.text }}</template>
              <template v-else><span class="pit-log__time">{{ fmt(e.tickMs) }}</span>{{ e.text }}</template>
            </div>
          </div>
          <div v-if="game.combatState.value.isPaused" class="pit-paused"><span class="pit-paused__text">PAUSE</span></div>
        </div>
      </template>

      <!-- ======== RESULTS ======== -->
      <template v-if="game.phase.value === 'results' && game.result.value">
        <RunicHeader :title="game.result.value.bossKilled ? 'Victoire' : 'Defaite'" :subtitle="game.result.value.bossKilled ? 'Le boss a ete vaincu !' : 'Votre Exile est tombe...'" />
        <div class="max-w-lg mx-auto mt-6">
          <RunicBox padding="lg">
            <div class="pit-score mb-1">{{ game.result.value.score.toLocaleString() }}</div>
            <p class="text-center text-poe-text-muted font-body text-sm mb-1">points</p>
            <p class="text-center font-body text-xs mb-5 opacity-30">{{ fmt(game.result.value.durationMs) }}</p>
            <div v-if="game.result.value.underdogBonus > 0" class="flex justify-center gap-3 mb-5">
              <span class="pit-badge pit-badge--underdog">UNDERDOG +{{ game.result.value.underdogBonus }}</span>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-5 text-center">
              <div><div class="text-2xl font-display font-semibold text-accent">{{ game.result.value.wavesCleared }}/3</div><div class="text-xs text-poe-text-dim font-body mt-1">Vagues</div></div>
              <div><div class="text-2xl font-display font-semibold text-[#c83232]">{{ game.result.value.hpRemaining }}</div><div class="text-xs text-poe-text-dim font-body mt-1">HP restants</div></div>
            </div>
            <div class="border-t border-poe-border pt-4 text-center">
              <div class="grid grid-cols-4 gap-2 text-xs font-body text-poe-text-dim">
                <div><span class="block text-sm font-display text-poe-text">{{ game.result.value.clearBonus }}</span>Clear</div>
                <div><span class="block text-sm font-display text-poe-text">{{ game.result.value.speedBonus }}</span>Speed</div>
                <div><span class="block text-sm font-display text-poe-text">{{ game.result.value.hpBonus }}</span>HP</div>
                <div><span class="block text-sm font-display text-poe-text">{{ game.result.value.styleBonus }}</span>Style</div>
              </div>
            </div>
          </RunicBox>
          <div class="flex justify-center mt-4">
            <RunicButton variant="primary" @click="game.startNewGame()">Rejouer</RunicButton>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>
