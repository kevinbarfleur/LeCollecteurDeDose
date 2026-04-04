<script setup lang="ts">
import type { PitCardDef } from '~/types/pit'
import { TIER_COLORS } from '~/constants/colors'
import type { CardTier } from '~/types/card'
import { getKeywordDef } from '~/game/pit/content/keywords'
import { getOverride } from '~/game/pit/content/overrides'
import gsap from 'gsap'

const props = defineProps<{
  card: PitCardDef
  used?: boolean
}>()

const emit = defineEmits<{
  equip: [card: PitCardDef]
}>()

const tierColor = computed(() => TIER_COLORS[props.card.tier as CardTier])
const imgUrl = computed(() => {
  if (!props.card.wikiUrl) return ''
  return `https://www.poewiki.net/wiki/Special:FilePath/${encodeURIComponent(props.card.name.replace(/ /g, '_'))}_inventory_icon.png`
})

// Stat pill colors: subtle bg (6% opacity) + subtle border (12% opacity)
const STAT_COLORS: Record<string, { bg: string; border: string }> = {
  atk: { bg: 'rgba(200, 50, 50, 0.06)', border: 'rgba(200, 50, 50, 0.12)' },
  def: { bg: 'rgba(90, 112, 128, 0.06)', border: 'rgba(90, 112, 128, 0.12)' },
  hp:  { bg: 'rgba(39, 174, 96, 0.06)', border: 'rgba(39, 174, 96, 0.12)' },
  spd: { bg: 'rgba(201, 162, 39, 0.06)', border: 'rgba(201, 162, 39, 0.12)' },
  pwr: { bg: 'rgba(122, 106, 138, 0.06)', border: 'rgba(122, 106, 138, 0.12)' },
}

const visibleStats = computed(() => {
  const s = props.card.stats
  const list: { key: string; label: string; val: number; bg: string; border: string }[] = []
  if (s.atk) list.push({ key: 'atk', label: 'ATK', val: s.atk, ...STAT_COLORS.atk })
  if (s.def) list.push({ key: 'def', label: 'DEF', val: s.def, ...STAT_COLORS.def })
  if (s.hp) list.push({ key: 'hp', label: 'HP', val: s.hp, ...STAT_COLORS.hp })
  if (s.spd) list.push({ key: 'spd', label: 'SPD', val: s.spd, ...STAT_COLORS.spd })
  if (s.pwr) list.push({ key: 'pwr', label: 'PWR', val: s.pwr, ...STAT_COLORS.pwr })
  return list
})

const primaryKw = computed(() => {
  if (props.card.primaryKeyword === 'MapMod' || props.card.primaryKeyword === 'Tactical') return null
  return getKeywordDef(props.card.primaryKeyword)
})
const secondaryKw = computed(() => props.card.secondaryKeyword ? getKeywordDef(props.card.secondaryKeyword) : null)

const override = computed(() => props.card.overrideEffectId ? getOverride(props.card.overrideEffectId) : null)

const slotLabel = computed(() => {
  const m: Record<string, string> = { mainhand: 'Arme', offhand: 'Off-hand', body: 'Armure', minor: 'Mineur', charm: 'Charm', focus: 'Focus', tactical: 'Tactique' }
  return props.card.allowedSlots.map(s => m[s] ?? s).join(' / ')
})

// Tooltip
const showTooltip = ref(false)
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

function onMouseEnter() {
  tooltipTimer = setTimeout(() => { showTooltip.value = true }, 300)
}
function onMouseLeave() {
  if (tooltipTimer) clearTimeout(tooltipTimer)
  showTooltip.value = false
}

// Detail view (zoom on click)
const isExpanded = ref(false)
function openDetail() { isExpanded.value = true }
function closeDetail() { isExpanded.value = false }
</script>

<template>
  <div
    class="pitcard-wrapper"
    :class="{ 'pitcard-wrapper--used': used }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- ====== PREVIEW CARD ====== -->
    <article
      class="pitcard"
      :style="{
        '--pc-color': tierColor.primary,
        '--pc-glow': tierColor.glow,
        '--pc-rgb': tierColor.glowRgba,
        '--pc-bg': tierColor.bg,
      } as any"
      @click="openDetail"
    >
      <!-- Frame background -->
      <div class="pitcard__frame" />

      <!-- Runic corners -->
      <div class="pitcard__corner pitcard__corner--tl" />
      <div class="pitcard__corner pitcard__corner--tr" />
      <div class="pitcard__corner pitcard__corner--bl" />
      <div class="pitcard__corner pitcard__corner--br" />

      <!-- Tier badge -->
      <span class="pitcard__tier">{{ card.tier }}</span>

      <!-- Slot family badge -->
      <span class="pitcard__slot">{{ slotLabel }}</span>

      <!-- Image -->
      <div class="pitcard__image">
        <img v-if="imgUrl" :src="imgUrl" :alt="card.name" loading="lazy" @error="($event.target as HTMLImageElement).style.display='none'" />
      </div>

      <!-- Separator -->
      <div class="pitcard__sep" />

      <!-- Name + Class -->
      <div class="pitcard__info">
        <h3 class="pitcard__name">{{ card.name }}</h3>
        <p class="pitcard__class">{{ card.rawItemClass }}</p>
      </div>

      <!-- Stats grid (ALWAYS VISIBLE) — subtle pills -->
      <div class="pitcard__stats">
        <div v-for="s in visibleStats" :key="s.key" class="pitcard__stat" :style="{ '--stat-bg': s.bg, '--stat-border': s.border } as any">
          <span class="pitcard__stat-val">{{ s.val }}</span>
          <span class="pitcard__stat-label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Keywords -->
      <div v-if="primaryKw" class="pitcard__kws">
        <span class="pitcard__kw" :style="{ color: primaryKw.color }">{{ primaryKw.name }}</span>
        <span v-if="secondaryKw" class="pitcard__kw" :style="{ color: secondaryKw.color }">{{ secondaryKw.name }}</span>
      </div>

      <!-- Marquee indicator -->
      <div v-if="card.isMarquee" class="pitcard__marquee">&#9670;</div>

      <!-- Used overlay -->
      <div v-if="used" class="pitcard__used-overlay">EQUIPE</div>
    </article>

    <!-- ====== TOOLTIP (hover, desktop only) ====== -->
    <Transition name="pitcard-tooltip">
      <div v-if="showTooltip && !used && !isExpanded" class="pitcard-tooltip">
        <div class="pitcard-tooltip__inner">
          <div class="pitcard-tooltip__corner pitcard-tooltip__corner--tl" />
          <div class="pitcard-tooltip__corner pitcard-tooltip__corner--tr" />
          <div class="pitcard-tooltip__corner pitcard-tooltip__corner--bl" />
          <div class="pitcard-tooltip__corner pitcard-tooltip__corner--br" />

          <h4 class="pitcard-tooltip__name" :style="{ color: tierColor.primary }">
            <span class="pitcard-tooltip__rune">&#9670;</span>
            {{ card.name }}
            <span class="pitcard-tooltip__rune">&#9670;</span>
          </h4>
          <p class="pitcard-tooltip__class">{{ card.rawItemClass }} — {{ slotLabel }}</p>

          <!-- All stats (including zeros) — subtle pills -->
          <div class="pitcard-tooltip__stats">
            <div v-for="[key, label] in [['atk','ATK'],['def','DEF'],['hp','HP'],['spd','SPD'],['pwr','PWR']]" :key="key" class="pitcard-tooltip__stat" :style="{ '--stat-bg': STAT_COLORS[key as string]?.bg, '--stat-border': STAT_COLORS[key as string]?.border } as any">
              <span class="pitcard-tooltip__stat-label">{{ label }}</span>
              <span class="pitcard-tooltip__stat-val">{{ (card.stats as any)[key] }}</span>
            </div>
          </div>

          <!-- Keywords -->
          <div v-if="primaryKw" class="pitcard-tooltip__kws">
            <div class="pitcard-tooltip__kw-item">
              <span :style="{ color: primaryKw.color }">{{ primaryKw.name }}</span>
              <span class="pitcard-tooltip__kw-desc">{{ primaryKw.description.replace('{value}', '') }}</span>
            </div>
            <div v-if="secondaryKw" class="pitcard-tooltip__kw-item">
              <span :style="{ color: secondaryKw.color }">{{ secondaryKw.name }}</span>
              <span class="pitcard-tooltip__kw-desc">{{ secondaryKw.description.replace('{value}', '') }}</span>
            </div>
          </div>

          <!-- Override (if marquee) -->
          <div v-if="override" class="pitcard-tooltip__override">
            <p class="pitcard-tooltip__override-text">{{ override.effectSummary }}</p>
          </div>

          <!-- Equip button -->
          <button v-if="!used" class="pitcard-tooltip__equip" @click.stop="emit('equip', card)">Equiper</button>
        </div>
      </div>
    </Transition>

    <!-- ====== DETAIL VIEW (click to zoom) ====== -->
    <Teleport to="body">
      <Transition name="pitcard-detail">
        <div v-if="isExpanded" class="pitcard-detail-overlay" @click.self="closeDetail">
          <div class="pitcard-detail">
            <div class="pitcard-detail__corner pitcard-detail__corner--tl" />
            <div class="pitcard-detail__corner pitcard-detail__corner--tr" />
            <div class="pitcard-detail__corner pitcard-detail__corner--bl" />
            <div class="pitcard-detail__corner pitcard-detail__corner--br" />

            <button class="pitcard-detail__close" @click="closeDetail">&times;</button>

            <!-- Header -->
            <div class="pitcard-detail__header">
              <span class="pitcard-detail__tier" :style="{ color: tierColor.primary }">{{ card.tier }}</span>
              <h2 class="pitcard-detail__name" :style="{ color: tierColor.primary }">{{ card.name }}</h2>
              <p class="pitcard-detail__class">{{ card.rawItemClass }} — {{ slotLabel }}</p>
            </div>

            <!-- Image -->
            <div class="pitcard-detail__artwork">
              <img v-if="imgUrl" :src="imgUrl" :alt="card.name" />
            </div>

            <!-- Stats — subtle pills -->
            <div class="pitcard-detail__stats">
              <div v-for="[key, label] in [['atk','ATK'],['def','DEF'],['hp','HP'],['spd','SPD'],['pwr','PWR']]" :key="key" class="pitcard-detail__stat" :style="{ '--stat-bg': STAT_COLORS[key as string]?.bg, '--stat-border': STAT_COLORS[key as string]?.border } as any">
                <span class="pitcard-detail__stat-val">{{ (card.stats as any)[key] }}</span>
                <span class="pitcard-detail__stat-label">{{ label }}</span>
              </div>
            </div>

            <!-- Keywords with descriptions -->
            <div v-if="primaryKw" class="pitcard-detail__keywords">
              <div class="pitcard-detail__kw">
                <span class="pitcard-detail__kw-name" :style="{ color: primaryKw.color }">{{ primaryKw.name }}</span>
                <span class="pitcard-detail__kw-desc">{{ primaryKw.description }}</span>
              </div>
              <div v-if="secondaryKw" class="pitcard-detail__kw">
                <span class="pitcard-detail__kw-name" :style="{ color: secondaryKw.color }">{{ secondaryKw.name }}</span>
                <span class="pitcard-detail__kw-desc">{{ secondaryKw.description }}</span>
              </div>
            </div>

            <!-- Override -->
            <div v-if="override" class="pitcard-detail__override">
              <p class="pitcard-detail__override-label">{{ override.clarity === 'hidden' ? 'Effet mystere' : 'Effet unique' }}</p>
              <p class="pitcard-detail__override-text">{{ override.effectSummary }}</p>
              <p v-if="override.mechanicalNotes" class="pitcard-detail__override-notes">{{ override.mechanicalNotes }}</p>
            </div>

            <!-- Meta -->
            <div class="pitcard-detail__meta">
              <span v-if="card.motif !== 'neutral'" class="pitcard-detail__meta-tag">{{ card.motif }}</span>
              <span v-for="tag in card.archetypeTags.slice(0, 3)" :key="tag" class="pitcard-detail__meta-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ==========================================
   PIT CARD — Dedicated component for The Pit
   Reuses visual tokens from the design system
   but with its own layout optimized for stats
   ========================================== */

.pitcard-wrapper {
  position: relative;
  width: 160px;
}
@media (min-width: 640px) { .pitcard-wrapper { width: 180px; } }
@media (min-width: 1024px) { .pitcard-wrapper { width: 195px; } }

.pitcard-wrapper--used { opacity: 0.25; filter: grayscale(0.5); pointer-events: none; }

/* ---- PREVIEW CARD (fixed height for uniform grid) ---- */
.pitcard {
  position: relative;
  width: 100%;
  min-height: 240px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}
@media (min-width: 640px) { .pitcard { min-height: 265px; } }
@media (min-width: 1024px) { .pitcard { min-height: 280px; } }
.pitcard:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6), 0 0 10px var(--pc-glow, rgba(90, 90, 93, 0.2));
}

.pitcard__frame {
  position: absolute; inset: 0; border-radius: 8px; overflow: hidden;
  background: linear-gradient(180deg, rgba(14, 14, 16, 0.98) 0%, rgba(10, 10, 12, 0.96) 50%, rgba(8, 8, 10, 0.99) 100%);
  border: 1px solid var(--pc-color, #2a2a30);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(0, 0, 0, 0.6);
  z-index: 0;
}

/* Runic corners */
.pitcard__corner { position: absolute; pointer-events: none; z-index: 3; }
.pitcard__corner::before, .pitcard__corner::after { content: ''; position: absolute; }
.pitcard__corner::before { height: 1px; background: linear-gradient(to right, rgba(var(--pc-rgb), 0.35), transparent); }
.pitcard__corner::after { width: 1px; background: linear-gradient(to bottom, rgba(var(--pc-rgb), 0.35), transparent); }
.pitcard__corner--tl { top: 8px; left: 8px; }
.pitcard__corner--tl::before { width: 14px; } .pitcard__corner--tl::after { height: 14px; }
.pitcard__corner--tr { top: 8px; right: 8px; }
.pitcard__corner--tr::before { width: 10px; right: 0; background: linear-gradient(to left, rgba(var(--pc-rgb), 0.35), transparent); }
.pitcard__corner--tr::after { height: 10px; right: 0; }
.pitcard__corner--bl { bottom: 8px; left: 8px; }
.pitcard__corner--bl::before { width: 10px; } .pitcard__corner--bl::after { height: 10px; bottom: 0; background: linear-gradient(to top, rgba(var(--pc-rgb), 0.35), transparent); }
.pitcard__corner--br { bottom: 8px; right: 8px; }
.pitcard__corner--br::before { width: 8px; right: 0; background: linear-gradient(to left, rgba(var(--pc-rgb), 0.3), transparent); }
.pitcard__corner--br::after { height: 8px; right: 0; bottom: 0; background: linear-gradient(to top, rgba(var(--pc-rgb), 0.3), transparent); }

.pitcard__tier {
  position: absolute; top: 6px; left: 6px; z-index: 4;
  font-family: 'Cinzel', serif; font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 3px;
  background: rgba(0, 0, 0, 0.7); color: var(--pc-color);
  border: 1px solid rgba(var(--pc-rgb), 0.3);
}

.pitcard__slot {
  position: absolute; top: 6px; right: 6px; z-index: 4;
  font-family: 'Crimson Text', serif; font-size: 8px;
  color: rgba(175, 96, 37, 0.5); text-transform: uppercase; letter-spacing: 0.3px;
}

.pitcard__image {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  height: 80px; padding: 14px 10px 4px;
}
@media (min-width: 640px) { .pitcard__image { height: 90px; } }
.pitcard__image img {
  max-width: 80%; max-height: 100%; object-fit: contain;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6)); pointer-events: none;
}

.pitcard__sep {
  position: relative; z-index: 1; height: 1px; margin: 0 10px;
  background: linear-gradient(90deg, transparent, rgba(var(--pc-rgb), 0.25), transparent);
}

.pitcard__info { position: relative; z-index: 1; padding: 4px 10px 2px; }
.pitcard__name {
  font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
  color: var(--pc-color); margin: 0; line-height: 1.3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (min-width: 640px) { .pitcard__name { font-size: 12px; } }
.pitcard__class {
  font-family: 'Crimson Text', serif; font-size: 9px;
  color: rgba(127, 127, 127, 0.6); text-transform: uppercase; letter-spacing: 0.5px;
  margin: 0; line-height: 1.2;
}

/* Stats — always visible, "subtle pill" style */
.pitcard__stats {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 3px; padding: 5px 8px 3px;
}
.pitcard__stat {
  display: flex; align-items: baseline; gap: 3px;
  padding: 3px 6px; border-radius: 3px;
  /* Subtle colored background — color set via inline style */
  background: var(--stat-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--stat-border, rgba(255, 255, 255, 0.04));
}
.pitcard__stat:last-child:nth-child(odd) { grid-column: span 2; justify-content: center; }
.pitcard__stat-val {
  font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
  color: #e8e6e3; /* Always neutral white — color is in the pill background */
}
@media (min-width: 640px) { .pitcard__stat-val { font-size: 12px; } }
.pitcard__stat-label {
  font-family: 'Crimson Text', serif; font-size: 8px;
  color: rgba(200, 196, 183, 0.4); text-transform: uppercase; letter-spacing: 0.3px;
}

.pitcard__kws {
  position: relative; z-index: 1;
  display: flex; gap: 3px; justify-content: center; padding: 2px 8px 6px;
}
.pitcard__kw {
  font-family: 'Crimson Text', serif; font-size: 9px;
  padding: 1px 5px; border-radius: 2px;
  background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06);
}

.pitcard__marquee {
  position: absolute; bottom: 4px; right: 6px; z-index: 4;
  font-size: 8px; color: var(--pc-color); opacity: 0.6;
}

.pitcard__used-overlay {
  position: absolute; inset: 0; z-index: 10; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
  color: #27ae60; letter-spacing: 1px;
}

/* ---- TOOLTIP ---- */
.pitcard-tooltip {
  position: absolute; left: calc(100% + 12px); top: 0; z-index: 100;
  width: 240px; pointer-events: auto;
}
@media (max-width: 1023px) { .pitcard-tooltip { display: none; } }

.pitcard-tooltip__inner {
  position: relative; padding: 14px 16px;
  background: linear-gradient(180deg, rgba(12, 12, 14, 0.98) 0%, rgba(18, 18, 20, 0.95) 50%, rgba(10, 10, 12, 0.98) 100%);
  border-radius: 6px;
  border: 1px solid rgba(40, 38, 35, 0.7);
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.7), inset 0 1px 3px rgba(0, 0, 0, 0.8), 0 8px 30px rgba(0, 0, 0, 0.6);
}

/* Tooltip runic corners */
.pitcard-tooltip__corner { position: absolute; pointer-events: none; z-index: 2; }
.pitcard-tooltip__corner::before, .pitcard-tooltip__corner::after { content: ''; position: absolute; }
.pitcard-tooltip__corner::before { height: 1px; width: 16px; background: linear-gradient(to right, rgba(80, 70, 55, 0.25), transparent); }
.pitcard-tooltip__corner::after { width: 1px; height: 16px; background: linear-gradient(to bottom, rgba(80, 70, 55, 0.25), transparent); }
.pitcard-tooltip__corner--tl { top: 6px; left: 6px; }
.pitcard-tooltip__corner--tr { top: 6px; right: 6px; }
.pitcard-tooltip__corner--tr::before { right: 0; background: linear-gradient(to left, rgba(80, 70, 55, 0.25), transparent); }
.pitcard-tooltip__corner--tr::after { right: 0; }
.pitcard-tooltip__corner--bl { bottom: 6px; left: 6px; }
.pitcard-tooltip__corner--bl::after { bottom: 0; background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent); }
.pitcard-tooltip__corner--br { bottom: 6px; right: 6px; }
.pitcard-tooltip__corner--br::before { right: 0; background: linear-gradient(to left, rgba(80, 70, 55, 0.25), transparent); }
.pitcard-tooltip__corner--br::after { right: 0; bottom: 0; background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent); }

.pitcard-tooltip__name {
  font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700;
  text-align: center; margin: 0 0 4px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}
.pitcard-tooltip__rune { font-size: 7px; color: rgba(175, 96, 37, 0.5); margin: 0 6px; }
.pitcard-tooltip__class {
  font-family: 'Crimson Text', serif; font-size: 11px; text-align: center;
  color: rgba(127, 127, 127, 0.6); text-transform: uppercase; letter-spacing: 0.5px;
  margin: 0 0 10px;
}

.pitcard-tooltip__stats {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px;
}
.pitcard-tooltip__stat {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 4px 8px; border-radius: 3px;
  background: var(--stat-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--stat-border, rgba(255, 255, 255, 0.04));
}
.pitcard-tooltip__stat-label { font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600; color: rgba(200, 196, 183, 0.5); }
.pitcard-tooltip__stat-val { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; color: #e8e6e3; }

.pitcard-tooltip__kws { margin-bottom: 8px; }
.pitcard-tooltip__kw-item { margin-bottom: 4px; }
.pitcard-tooltip__kw-item span:first-child { font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600; }
.pitcard-tooltip__kw-desc { font-family: 'Crimson Text', serif; font-size: 10px; color: rgba(200, 196, 183, 0.5); margin-left: 4px; }

.pitcard-tooltip__override {
  padding-top: 6px; border-top: 1px solid rgba(60, 55, 50, 0.2); margin-bottom: 8px;
}
.pitcard-tooltip__override-text {
  font-family: 'Crimson Text', serif; font-size: 11px; font-style: italic;
  color: rgba(175, 96, 37, 0.7); line-height: 1.4; margin: 0;
}

.pitcard-tooltip__equip {
  width: 100%; padding: 6px; border: none; border-radius: 3px;
  font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;
  color: #c9a227; background: linear-gradient(180deg, rgba(30, 25, 20, 0.95), rgba(15, 12, 10, 0.98));
  border: 1px solid rgba(100, 80, 60, 0.3);
  transition: all 0.2s;
}
.pitcard-tooltip__equip:hover { border-color: rgba(150, 120, 80, 0.5); box-shadow: 0 0 10px rgba(201, 162, 39, 0.1); }

/* Tooltip transition */
.pitcard-tooltip-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.pitcard-tooltip-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.pitcard-tooltip-enter-from, .pitcard-tooltip-leave-to { opacity: 0; transform: translateX(-8px); }

/* ---- DETAIL VIEW (zoom on click) ---- */
.pitcard-detail-overlay {
  position: fixed; inset: 0; z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.88); backdrop-filter: blur(12px);
  padding: 1rem;
}

.pitcard-detail {
  position: relative; width: 100%; max-width: 380px;
  background: linear-gradient(180deg, rgba(18, 18, 22, 0.98) 0%, rgba(12, 12, 15, 0.99) 50%, rgba(14, 14, 18, 0.98) 100%);
  border-radius: 8px; border: 1px solid rgba(60, 55, 50, 0.4);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.6);
  padding: 24px;
}

/* Detail runic corners */
.pitcard-detail__corner { position: absolute; pointer-events: none; z-index: 2; }
.pitcard-detail__corner::before, .pitcard-detail__corner::after { content: ''; position: absolute; }
.pitcard-detail__corner::before { height: 1px; width: 20px; background: linear-gradient(to right, rgba(80, 70, 55, 0.3), transparent); }
.pitcard-detail__corner::after { width: 1px; height: 20px; background: linear-gradient(to bottom, rgba(80, 70, 55, 0.3), transparent); }
.pitcard-detail__corner--tl { top: 10px; left: 10px; }
.pitcard-detail__corner--tr { top: 10px; right: 10px; }
.pitcard-detail__corner--tr::before { right: 0; background: linear-gradient(to left, rgba(80, 70, 55, 0.3), transparent); }
.pitcard-detail__corner--tr::after { right: 0; }
.pitcard-detail__corner--bl { bottom: 10px; left: 10px; }
.pitcard-detail__corner--bl::after { bottom: 0; background: linear-gradient(to top, rgba(80, 70, 55, 0.3), transparent); }
.pitcard-detail__corner--br { bottom: 10px; right: 10px; }
.pitcard-detail__corner--br::before { right: 0; background: linear-gradient(to left, rgba(80, 70, 55, 0.3), transparent); }
.pitcard-detail__corner--br::after { right: 0; bottom: 0; background: linear-gradient(to top, rgba(80, 70, 55, 0.3), transparent); }

.pitcard-detail__close {
  position: absolute; top: 10px; right: 14px; z-index: 5;
  background: none; border: none; color: rgba(200, 196, 183, 0.4); font-size: 24px;
  cursor: pointer; transition: color 0.2s;
}
.pitcard-detail__close:hover { color: #e8e6e3; }

.pitcard-detail__header { text-align: center; margin-bottom: 16px; }
.pitcard-detail__tier {
  font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 3px; background: rgba(0, 0, 0, 0.4);
}
.pitcard-detail__name {
  font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700; margin: 8px 0 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
}
.pitcard-detail__class {
  font-family: 'Crimson Text', serif; font-size: 13px;
  color: rgba(127, 127, 127, 0.7); text-transform: uppercase; letter-spacing: 1px;
}

.pitcard-detail__artwork {
  display: flex; justify-content: center; padding: 16px 0;
  background: linear-gradient(180deg, rgba(8, 8, 10, 0.98), rgba(12, 12, 14, 0.95), rgba(6, 6, 8, 0.99));
  border-radius: 6px; margin-bottom: 16px;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.7);
}
.pitcard-detail__artwork img { max-width: 120px; max-height: 120px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6)); }

.pitcard-detail__stats {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px;
}
.pitcard-detail__stat {
  text-align: center; padding: 8px 4px; border-radius: 4px;
  background: var(--stat-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--stat-border, rgba(255, 255, 255, 0.04));
}
.pitcard-detail__stat-val { display: block; font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700; color: #e8e6e3; }
.pitcard-detail__stat-label { font-family: 'Crimson Text', serif; font-size: 10px; color: rgba(200, 196, 183, 0.45); text-transform: uppercase; }

.pitcard-detail__keywords { margin-bottom: 14px; }
.pitcard-detail__kw { margin-bottom: 8px; }
.pitcard-detail__kw-name { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600; }
.pitcard-detail__kw-desc { font-family: 'Crimson Text', serif; font-size: 12px; color: rgba(200, 196, 183, 0.6); margin-left: 8px; }

.pitcard-detail__override {
  padding: 12px; border-radius: 4px; margin-bottom: 14px;
  background: rgba(175, 96, 37, 0.06); border: 1px solid rgba(175, 96, 37, 0.15);
}
.pitcard-detail__override-label { font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600; color: #af6025; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
.pitcard-detail__override-text { font-family: 'Crimson Text', serif; font-size: 13px; color: rgba(200, 196, 183, 0.8); line-height: 1.5; margin: 0; }
.pitcard-detail__override-notes { font-family: 'Crimson Text', serif; font-size: 11px; font-style: italic; color: rgba(200, 196, 183, 0.4); margin: 4px 0 0; }

.pitcard-detail__meta { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.pitcard-detail__meta-tag {
  font-family: 'Crimson Text', serif; font-size: 10px; padding: 2px 8px;
  border-radius: 2px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(200, 196, 183, 0.5); text-transform: uppercase; letter-spacing: 0.3px;
}

/* Detail transition */
.pitcard-detail-enter-active { transition: opacity 0.3s ease; }
.pitcard-detail-leave-active { transition: opacity 0.2s ease; }
.pitcard-detail-enter-from, .pitcard-detail-leave-to { opacity: 0; }
</style>
