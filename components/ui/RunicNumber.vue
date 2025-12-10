<script setup lang="ts">
interface Props {
  value: number | string;
  label?: string;
  color?: "default" | "t0" | "t1" | "t2" | "t3";
  size?: "sm" | "md" | "lg";
}

withDefaults(defineProps<Props>(), {
  label: undefined,
  color: "default",
  size: "md",
});
</script>

<template>
  <div
    class="runic-number"
    :class="[`runic-number--${color}`, `runic-number--${size}`]"
  >
    <div class="runic-number__cavity">
      <div class="runic-number__corner runic-number__corner--tl"></div>
      <div class="runic-number__corner runic-number__corner--tr"></div>
      <div class="runic-number__corner runic-number__corner--bl"></div>
      <div class="runic-number__corner runic-number__corner--br"></div>

      <span class="runic-number__value">{{ value }}</span>
    </div>
    <span v-if="label" class="runic-number__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.runic-number {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.runic-number__cavity {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 48px;
  padding: 0.5rem 0.875rem;
  border-radius: 4px;

  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(14, 14, 16, 0.95) 35%,
    rgba(12, 12, 14, 0.96) 65%,
    rgba(6, 6, 8, 0.99) 100%
  );

  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.75),
    inset 0 1px 2px rgba(0, 0, 0, 0.85), inset 0 -1px 3px rgba(50, 45, 40, 0.06),
    inset 2px 0 4px rgba(0, 0, 0, 0.4), inset -2px 0 4px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.2);

  border: 1px solid rgba(35, 33, 30, 0.6);
  border-top-color: rgba(25, 23, 20, 0.75);
  border-bottom-color: rgba(55, 50, 45, 0.25);

  transition: box-shadow 0.3s ease;
}

.runic-number:hover .runic-number__cavity {
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.8),
    inset 0 1px 2px rgba(0, 0, 0, 0.9), inset 0 -1px 3px rgba(50, 45, 40, 0.08),
    inset 2px 0 4px rgba(0, 0, 0, 0.45), inset -2px 0 4px rgba(0, 0, 0, 0.45),
    0 1px 0 rgba(55, 50, 45, 0.25),
    0 0 12px var(--number-glow, rgba(60, 55, 48, 0.08));
}

.runic-number__corner {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
  z-index: 2;
}

.runic-number__corner::before,
.runic-number__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(var(--accent-rgb, 80, 70, 55), 0.1),
    rgba(var(--accent-rgb, 80, 70, 55), 0.35),
    rgba(var(--accent-rgb, 80, 70, 55), 0.1)
  );
}

.runic-number__corner--tl {
  top: 4px;
  left: 4px;
}
.runic-number__corner--tr {
  top: 4px;
  right: 4px;
  transform: rotate(90deg);
}
.runic-number__corner--bl {
  bottom: 4px;
  left: 4px;
  transform: rotate(-90deg);
}
.runic-number__corner--br {
  bottom: 4px;
  right: 4px;
  transform: rotate(180deg);
}

.runic-number__corner::before {
  width: 10px;
  height: 1px;
  top: 0;
  left: 0;
}
.runic-number__corner::after {
  width: 1px;
  height: 10px;
  top: 0;
  left: 0;
}

.runic-number__value {
  position: relative;
  z-index: 1;
  font-family: "Cinzel", serif;
  font-weight: 700;
  line-height: 1;
  color: var(--number-color, #c8c2b8);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9), 0 1px 1px rgba(0, 0, 0, 0.8),
    0 -1px 0 rgba(60, 55, 48, 0.08);
  transition: text-shadow 0.3s ease, color 0.3s ease;
}

.runic-number:hover .runic-number__value {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 1px 2px rgba(0, 0, 0, 0.85),
    0 -1px 0 rgba(70, 62, 52, 0.1),
    0 0 18px var(--number-glow, rgba(100, 92, 80, 0.2));
}

.runic-number__label {
  font-family: "Cinzel", serif;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(100, 95, 88, 0.7);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  transition: color 0.3s ease;
}

.runic-number:hover .runic-number__label {
  color: rgba(135, 128, 118, 0.9);
}

/* Size Variants */
.runic-number--sm .runic-number__cavity {
  min-width: 50px;
  min-height: 40px;
  padding: 0.375rem 0.625rem;
}
.runic-number--sm .runic-number__value {
  font-size: 1.25rem;
}
.runic-number--sm .runic-number__label {
  font-size: 0.75rem;
}
.runic-number--sm .runic-number__corner {
  width: 8px;
  height: 8px;
}
.runic-number--sm .runic-number__corner::before {
  width: 8px;
}
.runic-number--sm .runic-number__corner::after {
  height: 8px;
}
.runic-number--sm {
  gap: 0.375rem;
}

.runic-number--md .runic-number__value {
  font-size: 1.875rem;
}
.runic-number--md .runic-number__label {
  font-size: 0.8125rem;
}

.runic-number--lg .runic-number__cavity {
  min-width: 75px;
  min-height: 58px;
  padding: 0.625rem 1.125rem;
}
.runic-number--lg .runic-number__value {
  font-size: 2.5rem;
}
.runic-number--lg .runic-number__label {
  font-size: 0.875rem;
}
.runic-number--lg .runic-number__corner {
  width: 12px;
  height: 12px;
}
.runic-number--lg .runic-number__corner::before {
  width: 12px;
}
.runic-number--lg .runic-number__corner::after {
  height: 12px;
}

/* Color Variants */
.runic-number--default {
  --number-color: #c8c2b8;
  --number-glow: rgba(160, 152, 140, 0.15);
  --accent-rgb: 80, 70, 55;
}

.runic-number--t0 {
  --number-color: #d4b040;
  --number-glow: rgba(201, 162, 39, 0.25);
  --accent-rgb: 201, 162, 39;
}
.runic-number--t0 .runic-number__cavity {
  border-color: rgba(201, 162, 39, 0.2);
  border-top-color: rgba(160, 130, 32, 0.25);
  border-bottom-color: rgba(201, 162, 39, 0.12);
}
.runic-number--t0 .runic-number__label {
  color: rgba(201, 162, 39, 0.7);
}
.runic-number--t0:hover .runic-number__label {
  color: rgba(201, 162, 39, 0.9);
}

.runic-number--t1 {
  --number-color: #a89aba;
  --number-glow: rgba(122, 106, 138, 0.25);
  --accent-rgb: 122, 106, 138;
}
.runic-number--t1 .runic-number__cavity {
  border-color: rgba(122, 106, 138, 0.2);
  border-top-color: rgba(98, 85, 110, 0.25);
  border-bottom-color: rgba(122, 106, 138, 0.12);
}
.runic-number--t1 .runic-number__label {
  color: rgba(122, 106, 138, 0.7);
}
.runic-number--t1:hover .runic-number__label {
  color: rgba(122, 106, 138, 0.9);
}

.runic-number--t2 {
  --number-color: #8aaaba;
  --number-glow: rgba(90, 112, 128, 0.25);
  --accent-rgb: 90, 112, 128;
}
.runic-number--t2 .runic-number__cavity {
  border-color: rgba(90, 112, 128, 0.2);
  border-top-color: rgba(72, 90, 102, 0.25);
  border-bottom-color: rgba(90, 112, 128, 0.12);
}
.runic-number--t2 .runic-number__label {
  color: rgba(90, 112, 128, 0.7);
}
.runic-number--t2:hover .runic-number__label {
  color: rgba(90, 112, 128, 0.9);
}

.runic-number--t3 {
  --number-color: #8a8a90;
  --number-glow: rgba(90, 90, 95, 0.2);
  --accent-rgb: 90, 90, 95;
}
.runic-number--t3 .runic-number__cavity {
  border-color: rgba(70, 70, 75, 0.2);
  border-top-color: rgba(55, 55, 60, 0.25);
  border-bottom-color: rgba(80, 80, 85, 0.12);
}
.runic-number--t3 .runic-number__label {
  color: rgba(90, 90, 95, 0.65);
}
.runic-number--t3:hover .runic-number__label {
  color: rgba(90, 90, 95, 0.85);
}

/* Responsive */
@media (max-width: 480px) {
  .runic-number--md .runic-number__cavity {
    min-width: 48px;
    min-height: 38px;
    padding: 0.375rem 0.5rem;
  }
  .runic-number--md .runic-number__value {
    font-size: 1.375rem;
  }
  .runic-number--md .runic-number__label {
    font-size: 0.6875rem;
  }
  .runic-number--md .runic-number__corner {
    width: 7px;
    height: 7px;
  }
  .runic-number--md .runic-number__corner::before {
    width: 7px;
  }
  .runic-number--md .runic-number__corner::after {
    height: 7px;
  }

  .runic-number--lg .runic-number__cavity {
    min-width: 58px;
    min-height: 46px;
    padding: 0.5rem 0.75rem;
  }
  .runic-number--lg .runic-number__value {
    font-size: 1.625rem;
  }
  .runic-number--lg .runic-number__label {
    font-size: 0.75rem;
  }
  .runic-number--lg .runic-number__corner {
    width: 9px;
    height: 9px;
  }
  .runic-number--lg .runic-number__corner::before {
    width: 9px;
  }
  .runic-number--lg .runic-number__corner::after {
    height: 9px;
  }
}
</style>
