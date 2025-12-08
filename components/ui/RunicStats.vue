<script setup lang="ts">
interface StatItem {
  value: number | string;
  label: string;
  color?: "default" | "t0" | "t1" | "t2" | "t3";
}

interface Props {
  stats: StatItem[];
  layout?: "horizontal" | "compact";
}

const props = withDefaults(defineProps<Props>(), {
  layout: "horizontal",
});
</script>

<template>
  <div
    class="runic-stats"
    :class="[`runic-stats--${layout}`]"
  >
    <!-- The carved stone tablet -->
    <div class="runic-stats__tablet">
      <!-- Corner decorations -->
      <div class="runic-stats__corner runic-stats__corner--tl"></div>
      <div class="runic-stats__corner runic-stats__corner--tr"></div>
      <div class="runic-stats__corner runic-stats__corner--bl"></div>
      <div class="runic-stats__corner runic-stats__corner--br"></div>
      
      <!-- Stats items -->
      <div class="runic-stats__items">
        <div
          v-for="(stat, index) in stats"
          :key="index"
          class="runic-stats__item"
          :class="stat.color ? `runic-stats__item--${stat.color}` : ''"
        >
          <!-- Engraved number -->
          <div class="runic-stats__value-container">
            <span class="runic-stats__rune runic-stats__rune--left">◆</span>
            <span class="runic-stats__value">{{ stat.value }}</span>
            <span class="runic-stats__rune runic-stats__rune--right">◆</span>
          </div>
          
          <!-- Label carved below -->
          <span class="runic-stats__label">{{ stat.label }}</span>
          
          <!-- Separator line (not on last item) -->
          <div v-if="index < stats.length - 1" class="runic-stats__separator"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC STATS - Carved stone tablet
   ========================================== */
.runic-stats {
  position: relative;
  display: inline-flex;
  width: 100%;
}

/* ==========================================
   THE TABLET - Main carved container
   ========================================== */
.runic-stats__tablet {
  position: relative;
  width: 100%;
  padding: 1.5rem 2rem;
  
  /* Deep carved stone look */
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );
  
  border-radius: 6px;
  
  /* Multi-layered carved effect */
  box-shadow: 
    /* Deep inner shadow */
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    /* Bottom highlight for 3D */
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    /* Outer shadow */
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.25);
  
  /* Stone border */
  border: 1px solid rgba(40, 38, 35, 0.7);
  border-top-color: rgba(30, 28, 25, 0.8);
  border-bottom-color: rgba(60, 55, 50, 0.3);
}

/* Stone texture overlay */
.runic-stats__tablet::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(60, 55, 50, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(40, 35, 30, 0.04) 0%, transparent 40%);
  pointer-events: none;
  border-radius: 5px;
}

/* ==========================================
   CORNER DECORATIONS
   ========================================== */
.runic-stats__corner {
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.runic-stats__corner::before,
.runic-stats__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(80, 70, 55, 0.15),
    rgba(80, 70, 55, 0.4),
    rgba(80, 70, 55, 0.15)
  );
}

.runic-stats__corner--tl { top: 8px; left: 8px; }
.runic-stats__corner--tr { top: 8px; right: 8px; transform: rotate(90deg); }
.runic-stats__corner--bl { bottom: 8px; left: 8px; transform: rotate(-90deg); }
.runic-stats__corner--br { bottom: 8px; right: 8px; transform: rotate(180deg); }

.runic-stats__corner::before {
  width: 20px;
  height: 1px;
  top: 0;
  left: 0;
}

.runic-stats__corner::after {
  width: 1px;
  height: 20px;
  top: 0;
  left: 0;
}

/* ==========================================
   STATS ITEMS CONTAINER
   ========================================== */
.runic-stats__items {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  z-index: 1;
}

/* ==========================================
   INDIVIDUAL STAT ITEM
   ========================================== */
.runic-stats__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.5rem;
  min-width: 80px;
}

/* Value container with runes */
.runic-stats__value-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* The main number - engraved look */
.runic-stats__value {
  font-family: "Cinzel", serif;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  
  /* Engraved/carved text effect */
  color: #d0d0d0;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

/* Small decorative runes */
.runic-stats__rune {
  font-size: 0.5rem;
  color: rgba(100, 90, 75, 0.4);
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.runic-stats__item:hover .runic-stats__rune {
  opacity: 1;
  transform: scale(1);
}

/* Label - carved subtitle */
.runic-stats__label {
  font-family: "Cinzel", serif;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  
  /* Engraved look */
  color: rgba(100, 95, 90, 0.7);
  text-shadow: 
    0 1px 0 rgba(0, 0, 0, 0.5),
    0 -1px 0 rgba(80, 75, 70, 0.1);
}

/* ==========================================
   SEPARATOR LINE
   ========================================== */
.runic-stats__separator {
  position: absolute;
  right: -1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 50%;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(80, 70, 60, 0.3),
    transparent
  );
}

/* ==========================================
   COLOR VARIANTS
   ========================================== */

/* Default - stays gray */
.runic-stats__item--default .runic-stats__value {
  color: #c8c8c8;
}

/* T0 - Gold */
.runic-stats__item--t0 .runic-stats__value {
  color: #c9a227;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(201, 162, 39, 0.15),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

.runic-stats__item--t0 .runic-stats__rune {
  color: rgba(201, 162, 39, 0.5);
}

.runic-stats__item--t0 .runic-stats__label {
  color: rgba(201, 162, 39, 0.6);
}

/* T1 - Purple */
.runic-stats__item--t1 .runic-stats__value {
  color: #9a8aaa;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(122, 106, 138, 0.15),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

.runic-stats__item--t1 .runic-stats__rune {
  color: rgba(122, 106, 138, 0.5);
}

.runic-stats__item--t1 .runic-stats__label {
  color: rgba(122, 106, 138, 0.6);
}

/* T2 - Blue/Steel */
.runic-stats__item--t2 .runic-stats__value {
  color: #7a9aaa;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(90, 112, 128, 0.15),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

.runic-stats__item--t2 .runic-stats__rune {
  color: rgba(90, 112, 128, 0.5);
}

.runic-stats__item--t2 .runic-stats__label {
  color: rgba(90, 112, 128, 0.6);
}

/* T3 - Gray/Iron */
.runic-stats__item--t3 .runic-stats__value {
  color: #7a7a80;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 -1px 0 rgba(255, 255, 255, 0.03);
}

.runic-stats__item--t3 .runic-stats__rune {
  color: rgba(90, 90, 95, 0.4);
}

.runic-stats__item--t3 .runic-stats__label {
  color: rgba(90, 90, 95, 0.6);
}

/* ==========================================
   COMPACT LAYOUT
   ========================================== */
.runic-stats--compact .runic-stats__tablet {
  padding: 1rem 1.5rem;
}

.runic-stats--compact .runic-stats__items {
  gap: 1rem;
}

.runic-stats--compact .runic-stats__item {
  padding: 0.375rem 1rem;
  min-width: 60px;
}

.runic-stats--compact .runic-stats__value {
  font-size: 1.5rem;
}

.runic-stats--compact .runic-stats__label {
  font-size: 0.625rem;
}

.runic-stats--compact .runic-stats__separator {
  right: -0.5rem;
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .runic-stats__tablet {
    padding: 1.25rem 1.5rem;
  }
  
  .runic-stats__items {
    gap: 1rem;
  }
  
  .runic-stats__item {
    padding: 0.375rem 0.75rem;
    min-width: 60px;
  }
  
  .runic-stats__value {
    font-size: 1.5rem;
  }
  
  .runic-stats__separator {
    right: -0.5rem;
  }
}
</style>

