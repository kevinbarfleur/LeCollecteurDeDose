<script setup lang="ts">
interface Props {
  value: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 't0' | 't1' | 't2' | 't3' | 'vaal';
}

withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'md',
  color: 'default',
});
</script>

<template>
  <div
    class="runic-progress"
    :class="[`runic-progress--${size}`, `runic-progress--${color}`]"
  >
    <div class="runic-progress__track">
      <!-- Corner runes -->
      <div class="runic-progress__corner runic-progress__corner--tl"></div>
      <div class="runic-progress__corner runic-progress__corner--tr"></div>
      <div class="runic-progress__corner runic-progress__corner--bl"></div>
      <div class="runic-progress__corner runic-progress__corner--br"></div>

      <!-- Fill bar -->
      <div
        class="runic-progress__fill"
        :style="{ width: `calc(${Math.min(100, Math.max(0, value))}% - var(--progress-inset, 4px))` }"
      ></div>

      <!-- Centered label -->
      <span v-if="showLabel" class="runic-progress__label">
        {{ Number.isInteger(value) ? value : value.toFixed(1) }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.runic-progress {
  width: 100%;
}

.runic-progress__track {
  position: relative;
  width: 100%;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(14, 14, 16, 0.95) 35%,
    rgba(12, 12, 14, 0.96) 65%,
    rgba(6, 6, 8, 0.99) 100%
  );
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    inset 0 3px 8px rgba(0, 0, 0, 0.75),
    inset 0 1px 2px rgba(0, 0, 0, 0.85),
    inset 0 -1px 3px rgba(50, 45, 40, 0.06),
    0 1px 0 rgba(50, 45, 40, 0.2);
  border: 1px solid rgba(35, 33, 30, 0.6);
  border-top-color: rgba(25, 23, 20, 0.75);
  border-bottom-color: rgba(55, 50, 45, 0.25);
}

/* Corner decorations */
.runic-progress__corner {
  position: absolute;
  width: 8px;
  height: 8px;
  pointer-events: none;
  z-index: 3;
}

.runic-progress__corner::before,
.runic-progress__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(var(--progress-accent-rgb, 80, 70, 55), 0.1),
    rgba(var(--progress-accent-rgb, 80, 70, 55), 0.35),
    rgba(var(--progress-accent-rgb, 80, 70, 55), 0.1)
  );
}

.runic-progress__corner--tl { top: 3px; left: 3px; }
.runic-progress__corner--tr { top: 3px; right: 3px; transform: rotate(90deg); }
.runic-progress__corner--bl { bottom: 3px; left: 3px; transform: rotate(-90deg); }
.runic-progress__corner--br { bottom: 3px; right: 3px; transform: rotate(180deg); }

.runic-progress__corner::before { width: 8px; height: 1px; top: 0; left: 0; }
.runic-progress__corner::after { width: 1px; height: 8px; top: 0; left: 0; }

/* Fill bar with subtle runic stripes */
.runic-progress__fill {
  position: absolute;
  top: var(--progress-inset, 4px);
  left: var(--progress-inset, 4px);
  bottom: var(--progress-inset, 4px);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(0, 0, 0, 0.15) 5px,
      rgba(0, 0, 0, 0.15) 10px
    ),
    linear-gradient(
      180deg,
      var(--progress-fill-light, rgba(80, 65, 45, 0.95)) 0%,
      var(--progress-fill, rgba(65, 52, 35, 0.92)) 50%,
      var(--progress-fill-dark, rgba(55, 45, 30, 0.95)) 100%
    );
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    inset 0 1px 0 rgba(120, 100, 70, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.25),
    inset -1px 0 0 rgba(90, 75, 50, 0.2);
}

/* Centered label */
.runic-progress__label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  color: var(--progress-label-color, #e8e4df);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 8px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  pointer-events: none;
}

/* Size variants */
.runic-progress--sm {
  --progress-inset: 3px;
}
.runic-progress--sm .runic-progress__track {
  height: 24px;
}
.runic-progress--sm .runic-progress__label {
  font-size: 0.75rem;
}
.runic-progress--sm .runic-progress__corner {
  width: 6px;
  height: 6px;
}
.runic-progress--sm .runic-progress__corner::before { width: 6px; }
.runic-progress--sm .runic-progress__corner::after { height: 6px; }

.runic-progress--md {
  --progress-inset: 4px;
}
.runic-progress--md .runic-progress__track {
  height: 32px;
}
.runic-progress--md .runic-progress__label {
  font-size: 0.9375rem;
}

.runic-progress--lg {
  --progress-inset: 5px;
}
.runic-progress--lg .runic-progress__track {
  height: 40px;
}
.runic-progress--lg .runic-progress__label {
  font-size: 1.125rem;
}
.runic-progress--lg .runic-progress__corner {
  width: 10px;
  height: 10px;
}
.runic-progress--lg .runic-progress__corner::before { width: 10px; }
.runic-progress--lg .runic-progress__corner::after { height: 10px; }

/* Color variants - Muted, runic tones */
.runic-progress--default {
  --progress-fill: rgba(65, 52, 35, 0.92);
  --progress-fill-light: rgba(80, 65, 45, 0.95);
  --progress-fill-dark: rgba(55, 45, 30, 0.95);
  --progress-accent-rgb: 120, 95, 60;
  --progress-label-color: rgba(200, 185, 165, 0.95);
}

.runic-progress--t0 {
  --progress-fill: rgba(75, 60, 30, 0.92);
  --progress-fill-light: rgba(90, 72, 38, 0.95);
  --progress-fill-dark: rgba(60, 48, 25, 0.95);
  --progress-accent-rgb: 160, 130, 45;
  --progress-label-color: rgba(210, 190, 140, 0.95);
}

.runic-progress--t1 {
  --progress-fill: rgba(55, 48, 65, 0.92);
  --progress-fill-light: rgba(68, 60, 80, 0.95);
  --progress-fill-dark: rgba(45, 40, 55, 0.95);
  --progress-accent-rgb: 100, 88, 115;
  --progress-label-color: rgba(185, 175, 195, 0.95);
}

.runic-progress--t2 {
  --progress-fill: rgba(45, 55, 65, 0.92);
  --progress-fill-light: rgba(55, 68, 80, 0.95);
  --progress-fill-dark: rgba(38, 48, 58, 0.95);
  --progress-accent-rgb: 75, 95, 110;
  --progress-label-color: rgba(175, 190, 200, 0.95);
}

.runic-progress--t3 {
  --progress-fill: rgba(50, 50, 55, 0.92);
  --progress-fill-light: rgba(62, 62, 68, 0.95);
  --progress-fill-dark: rgba(42, 42, 48, 0.95);
  --progress-accent-rgb: 80, 80, 88;
  --progress-label-color: rgba(180, 180, 185, 0.95);
}

.runic-progress--vaal {
  --progress-fill: rgba(70, 35, 35, 0.92);
  --progress-fill-light: rgba(85, 42, 42, 0.95);
  --progress-fill-dark: rgba(58, 30, 30, 0.95);
  --progress-accent-rgb: 140, 55, 55;
  --progress-label-color: rgba(200, 170, 170, 0.95);
}

/* Responsive */
@media (max-width: 480px) {
  .runic-progress--md .runic-progress__track {
    height: 28px;
  }
  .runic-progress--md .runic-progress__label {
    font-size: 0.8125rem;
  }

  .runic-progress--lg .runic-progress__track {
    height: 34px;
  }
  .runic-progress--lg .runic-progress__label {
    font-size: 1rem;
  }
}
</style>
