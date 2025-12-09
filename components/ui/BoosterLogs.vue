<script setup lang="ts">
import type { BoosterLog } from '~/data/mockBoosterLogs';
import { TIER_CONFIG } from '~/types/card';

interface Props {
  logs: BoosterLog[];
  maxHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: '400px',
});

const { t, locale } = useI18n();

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return locale.value === 'fr' ? `il y a ${diffSecs}s` : `${diffSecs}s ago`;
  }
  if (diffMins < 60) {
    return locale.value === 'fr' ? `il y a ${diffMins}min` : `${diffMins}min ago`;
  }
  if (diffHours < 24) {
    return locale.value === 'fr' ? `il y a ${diffHours}h` : `${diffHours}h ago`;
  }
  if (diffDays < 3) {
    return locale.value === 'fr' ? `il y a ${diffDays}j` : `${diffDays}d ago`;
  }
  
  return date.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTierColor(tier: string): string {
  return TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.color ?? '#5a5a5d';
}

function getTierGlow(tier: string): string {
  return TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.glowColor ?? '#5a5a5d';
}

// With column-reverse: first item in DOM appears at bottom
// So we reverse logs: [newest, ..., oldest] → newest at bottom, oldest at top
const displayLogs = computed(() => [...props.logs].reverse());
</script>

<template>
  <div class="booster-logs">
    <div class="booster-logs__corner booster-logs__corner--tl"></div>
    <div class="booster-logs__corner booster-logs__corner--tr"></div>
    <div class="booster-logs__corner booster-logs__corner--bl"></div>
    <div class="booster-logs__corner booster-logs__corner--br"></div>

    <div class="booster-logs__header">
      <span class="booster-logs__header-rune">◆</span>
      <span class="booster-logs__header-title">{{ t('home.logs.title') }}</span>
      <span class="booster-logs__header-rune">◆</span>
    </div>

    <div 
      class="booster-logs__container"
      :style="{ maxHeight }"
    >
      <div class="booster-logs__list">
        <article
          v-for="log in displayLogs"
          :key="log.id"
          class="log-entry"
          :class="{
            'log-entry--legendary': log.highestTier === 'T0',
            'log-entry--epic': log.highestTier === 'T1',
          }"
        >
          <div class="log-entry__glow" v-if="log.highestTier === 'T0'"></div>
          
          <div class="log-entry__header">
            <span class="log-entry__username">{{ log.username }}</span>
            <span class="log-entry__timestamp">{{ formatTimestamp(log.timestamp) }}</span>
          </div>

          <div class="log-entry__content">
            <div class="log-entry__booster-label">
              <span class="log-entry__booster-icon">📦</span>
              <span>{{ t('home.logs.opened') }}</span>
            </div>
            
            <div class="log-entry__cards">
              <div
                v-for="item in log.content"
                :key="item.uid"
                class="log-entry__card"
                :class="[
                  `log-entry__card--${item.card.tier.toLowerCase()}`,
                  { 'log-entry__card--foil': item.isFoil }
                ]"
                :style="{
                  '--tier-color': getTierColor(item.card.tier),
                  '--tier-glow': getTierGlow(item.card.tier),
                }"
              >
                <span v-if="item.isFoil" class="log-entry__card-foil-badge">✦</span>
                <span class="log-entry__card-tier">{{ item.card.tier }}</span>
                <span class="log-entry__card-name">{{ item.card.name }}</span>
                <span v-if="item.isFoil" class="log-entry__card-foil-shine"></span>
              </div>
            </div>
          </div>

        </article>
      </div>
    </div>

    <div class="booster-logs__fade-top"></div>
    <div class="booster-logs__fade-bottom"></div>
  </div>
</template>

<style scoped>
.booster-logs {
  position: relative;
  width: 100%;
  max-width: 100%;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 12, 0.98) 0%,
    rgba(14, 14, 16, 0.95) 30%,
    rgba(12, 12, 14, 0.96) 70%,
    rgba(8, 8, 10, 0.99) 100%
  );
  border-radius: 6px;
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    inset 0 -2px 4px rgba(50, 45, 40, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.2);
  border: 1px solid rgba(40, 38, 35, 0.6);
  border-top-color: rgba(30, 28, 25, 0.7);
  border-bottom-color: rgba(60, 55, 50, 0.25);
  overflow: hidden;
}

.booster-logs__corner {
  position: absolute;
  pointer-events: none;
  z-index: 10;
}

.booster-logs__corner::before,
.booster-logs__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(175, 96, 37, 0.4),
    rgba(80, 70, 55, 0.2)
  );
}

.booster-logs__corner--tl { top: 8px; left: 8px; }
.booster-logs__corner--tl::before { width: 20px; height: 1px; }
.booster-logs__corner--tl::after { width: 1px; height: 20px; }

.booster-logs__corner--tr { top: 8px; right: 8px; }
.booster-logs__corner--tr::before { width: 14px; height: 1px; right: 0; background: linear-gradient(to left, rgba(80, 70, 55, 0.35), transparent); }
.booster-logs__corner--tr::after { width: 1px; height: 14px; right: 0; background: linear-gradient(to bottom, rgba(80, 70, 55, 0.35), transparent); }

.booster-logs__corner--bl { bottom: 8px; left: 8px; }
.booster-logs__corner--bl::before { width: 12px; height: 1px; bottom: 0; background: linear-gradient(to right, rgba(80, 70, 55, 0.25), transparent); }
.booster-logs__corner--bl::after { width: 1px; height: 12px; bottom: 0; background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent); }

.booster-logs__corner--br { bottom: 8px; right: 8px; }
.booster-logs__corner--br::before { width: 18px; height: 1px; right: 0; bottom: 0; background: linear-gradient(to left, rgba(175, 96, 37, 0.35), rgba(80, 70, 55, 0.15), transparent); }
.booster-logs__corner--br::after { width: 1px; height: 18px; right: 0; bottom: 0; background: linear-gradient(to top, rgba(175, 96, 37, 0.35), rgba(80, 70, 55, 0.15), transparent); }

.booster-logs__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: linear-gradient(
    180deg,
    rgba(14, 14, 16, 0.95) 0%,
    rgba(10, 10, 12, 0.9) 100%
  );
  border-bottom: 1px solid rgba(50, 48, 45, 0.3);
  box-shadow: inset 0 -2px 6px rgba(0, 0, 0, 0.4);
}

.booster-logs__header-rune {
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.6);
  text-shadow: 0 0 8px rgba(175, 96, 37, 0.4);
}

.booster-logs__header-title {
  font-family: "Cinzel", serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(200, 190, 175, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.booster-logs__container {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(80, 70, 60, 0.4) transparent;
}

.booster-logs__container::-webkit-scrollbar {
  width: 6px;
}

.booster-logs__container::-webkit-scrollbar-track {
  background: transparent;
}

.booster-logs__container::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

.booster-logs__container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 90, 75, 0.5);
}

.booster-logs__list {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.625rem;
  padding: 1rem;
}

.booster-logs__fade-top,
.booster-logs__fade-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 30px;
  pointer-events: none;
  z-index: 5;
}

.booster-logs__fade-top {
  top: 48px;
  background: linear-gradient(to bottom, rgba(10, 10, 12, 0.9), transparent);
}

.booster-logs__fade-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(8, 8, 10, 0.95), transparent);
}

.log-entry {
  position: relative;
  padding: 0.75rem;
  background: linear-gradient(
    180deg,
    rgba(16, 16, 18, 0.6) 0%,
    rgba(12, 12, 14, 0.5) 100%
  );
  border-radius: 4px;
  border: 1px solid rgba(40, 38, 35, 0.3);
  transition: all 0.3s ease;
}

.log-entry:hover {
  background: linear-gradient(
    180deg,
    rgba(20, 20, 22, 0.7) 0%,
    rgba(15, 15, 17, 0.6) 100%
  );
  border-color: rgba(60, 55, 50, 0.4);
}

.log-entry--legendary {
  background: linear-gradient(
    180deg,
    rgba(201, 162, 39, 0.08) 0%,
    rgba(16, 16, 18, 0.6) 30%,
    rgba(12, 12, 14, 0.5) 100%
  );
  border-color: rgba(201, 162, 39, 0.25);
  box-shadow: 
    inset 0 0 20px rgba(201, 162, 39, 0.05),
    0 0 15px rgba(201, 162, 39, 0.1);
}

.log-entry--legendary:hover {
  border-color: rgba(201, 162, 39, 0.4);
  box-shadow: 
    inset 0 0 25px rgba(201, 162, 39, 0.08),
    0 0 20px rgba(201, 162, 39, 0.15);
}

.log-entry--epic {
  background: linear-gradient(
    180deg,
    rgba(122, 106, 138, 0.06) 0%,
    rgba(16, 16, 18, 0.6) 30%,
    rgba(12, 12, 14, 0.5) 100%
  );
  border-color: rgba(122, 106, 138, 0.2);
}

.log-entry--epic:hover {
  border-color: rgba(122, 106, 138, 0.35);
}

.log-entry__glow {
  position: absolute;
  inset: -1px;
  border-radius: 5px;
  background: conic-gradient(
    from 0deg,
    rgba(201, 162, 39, 0.3) 0%,
    rgba(201, 162, 39, 0.05) 25%,
    rgba(201, 162, 39, 0.3) 50%,
    rgba(201, 162, 39, 0.05) 75%,
    rgba(201, 162, 39, 0.3) 100%
  );
  animation: glow-rotate 4s linear infinite;
  z-index: -1;
  opacity: 0.6;
}

@keyframes glow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.log-entry__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.log-entry__username {
  font-family: "Cinzel", serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(220, 215, 205, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.log-entry--legendary .log-entry__username {
  color: #c9a227;
  text-shadow: 0 0 10px rgba(201, 162, 39, 0.4), 0 1px 2px rgba(0, 0, 0, 0.5);
}

.log-entry__timestamp {
  font-family: "Cormorant Garamond", serif;
  font-size: 0.8125rem;
  font-style: italic;
  color: rgba(120, 115, 105, 0.8);
}

.log-entry__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.log-entry__booster-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: "Cormorant Garamond", serif;
  font-size: 0.875rem;
  color: rgba(140, 135, 125, 0.9);
}

.log-entry__booster-icon {
  font-size: 1rem;
}

.log-entry__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.log-entry__card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  background: linear-gradient(
    180deg,
    rgba(20, 20, 22, 0.8) 0%,
    rgba(14, 14, 16, 0.9) 100%
  );
  border-radius: 4px;
  border: 1px solid rgba(var(--tier-color-rgb, 60, 58, 55), 0.3);
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

.log-entry__card:hover {
  border-color: var(--tier-color);
  box-shadow: 0 0 8px rgba(var(--tier-glow-rgb, 80, 70, 60), 0.2);
}

.log-entry__card--t0 {
  --tier-color-rgb: 201, 162, 39;
  --tier-glow-rgb: 201, 162, 39;
  border-color: rgba(201, 162, 39, 0.4);
  background: linear-gradient(
    180deg,
    rgba(201, 162, 39, 0.12) 0%,
    rgba(14, 14, 16, 0.9) 100%
  );
}

.log-entry__card--t1 {
  --tier-color-rgb: 122, 106, 138;
  --tier-glow-rgb: 122, 106, 138;
  border-color: rgba(122, 106, 138, 0.35);
}

.log-entry__card--t2 {
  --tier-color-rgb: 90, 112, 128;
  --tier-glow-rgb: 90, 112, 128;
  border-color: rgba(90, 112, 128, 0.3);
}

.log-entry__card--t3 {
  --tier-color-rgb: 80, 80, 85;
  --tier-glow-rgb: 80, 80, 85;
}

.log-entry__card-tier {
  font-family: "Cinzel", serif;
  font-weight: 700;
  font-size: 0.6875rem;
  color: var(--tier-glow);
  text-shadow: 0 0 4px rgba(var(--tier-glow-rgb), 0.3);
}

.log-entry__card-name {
  font-family: "Cormorant Garamond", serif;
  font-size: 0.875rem;
  color: rgba(180, 175, 165, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.log-entry__card--t0 .log-entry__card-name {
  color: #c9a227;
}

.log-entry__card--foil {
  --foil-space: 8%;
  --foil-angle: -22deg;
}

.log-entry__card--foil.log-entry__card--t0 {
  --foil-hue-1: 45;
  --foil-hue-2: 38;
  --foil-hue-3: 52;
  --foil-sat: 70%;
  --foil-light: 50%;
}

.log-entry__card--foil.log-entry__card--t1 {
  --foil-hue-1: 278;
  --foil-hue-2: 268;
  --foil-hue-3: 288;
  --foil-sat: 55%;
  --foil-light: 50%;
}

.log-entry__card--foil.log-entry__card--t2 {
  --foil-hue-1: 210;
  --foil-hue-2: 200;
  --foil-hue-3: 220;
  --foil-sat: 45%;
  --foil-light: 48%;
}

.log-entry__card--foil.log-entry__card--t3 {
  --foil-hue-1: 220;
  --foil-hue-2: 210;
  --foil-hue-3: 230;
  --foil-sat: 15%;
  --foil-light: 52%;
}

.log-entry__card-foil-badge {
  font-size: 0.5625rem;
  color: hsla(var(--foil-hue-1, 220), calc(var(--foil-sat, 50%) + 10%), 75%, 0.95);
  text-shadow: 0 0 4px hsla(var(--foil-hue-1, 220), var(--foil-sat, 50%), 60%, 0.6);
}

.log-entry__card-foil-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-linear-gradient(
    var(--foil-angle, -22deg),
    hsla(var(--foil-hue-1, 220), var(--foil-sat, 50%), var(--foil-light, 50%), 0.35) 0%,
    hsla(var(--foil-hue-2, 210), var(--foil-sat, 50%), calc(var(--foil-light, 50%) + 5%), 0.25) var(--foil-space, 8%),
    hsla(var(--foil-hue-3, 230), var(--foil-sat, 50%), var(--foil-light, 50%), 0.35) calc(var(--foil-space, 8%) * 2),
    hsla(var(--foil-hue-1, 220), var(--foil-sat, 50%), calc(var(--foil-light, 50%) + 3%), 0.3) calc(var(--foil-space, 8%) * 3)
  );
  mix-blend-mode: color-dodge;
  opacity: 0.5;
  pointer-events: none;
  animation: foil-shimmer 4s linear infinite;
}

@keyframes foil-shimmer {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}


@media (min-width: 640px) {
  .booster-logs__header-title {
    font-size: 1.125rem;
  }
  
  .booster-logs__list {
    gap: 0.75rem;
    padding: 1.25rem;
  }
  
  .log-entry {
    padding: 1.125rem;
  }
  
  .log-entry__username {
    font-size: 1rem;
  }
  
  .log-entry__timestamp {
    font-size: 0.875rem;
  }
  
  .log-entry__card {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .log-entry__card-tier {
    font-size: 0.75rem;
  }
  
  .log-entry__card-name {
    font-size: 0.9375rem;
    max-width: 180px;
  }
}

@media (min-width: 1024px) {
  .booster-logs__list {
    gap: 0.875rem;
  }
  
  .log-entry__card-name {
    max-width: 220px;
  }
}
</style>

