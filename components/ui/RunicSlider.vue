<script setup lang="ts">
interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  showValue: true,
  valuePrefix: '',
  valueSuffix: '',
  size: 'md',
});

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const displayValue = computed(() => {
  return `${props.valuePrefix}${props.modelValue}${props.valueSuffix}`;
});

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', parseFloat(target.value));
};
</script>

<template>
  <div
    class="runic-slider"
    :class="[
      `runic-slider--${size}`,
      { 'runic-slider--disabled': disabled }
    ]"
  >
    <!-- Track container with runic decorations -->
    <div
      class="runic-slider__track-container"
      :style="{ '--thumb-position': `${percentage}%` }"
    >
      <!-- Corner runes -->
      <span class="runic-slider__rune runic-slider__rune--left">◆</span>
      <span class="runic-slider__rune runic-slider__rune--right">◆</span>

      <!-- Track background -->
      <div class="runic-slider__track">
        <!-- Fill bar -->
        <div
          class="runic-slider__fill"
          :style="{ width: `${percentage}%` }"
        ></div>

        <!-- Notches for visual reference -->
        <div class="runic-slider__notches">
          <span class="runic-slider__notch" style="left: 0%"></span>
          <span class="runic-slider__notch" style="left: 25%"></span>
          <span class="runic-slider__notch" style="left: 50%"></span>
          <span class="runic-slider__notch" style="left: 75%"></span>
          <span class="runic-slider__notch" style="left: 100%"></span>
        </div>
      </div>

      <!-- Hidden range input -->
      <input
        type="range"
        class="runic-slider__input"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        @input="handleInput"
      />
    </div>

    <!-- Value display -->
    <div v-if="showValue" class="runic-slider__value">
      <span class="runic-slider__value-text">{{ displayValue }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC SLIDER - Carved stone slider
   ========================================== */

.runic-slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.runic-slider--disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* ==========================================
   TRACK CONTAINER
   ========================================== */

.runic-slider__track-container {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

/* ==========================================
   CORNER RUNES
   ========================================== */

.runic-slider__rune {
  position: absolute;
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.4);
  z-index: 2;
  pointer-events: none;
  transition: all 0.3s ease;
}

.runic-slider__rune--left {
  left: -2px;
  top: 50%;
  transform: translateY(-50%);
}

.runic-slider__rune--right {
  right: -2px;
  top: 50%;
  transform: translateY(-50%);
}

.runic-slider:hover .runic-slider__rune,
.runic-slider:focus-within .runic-slider__rune {
  color: rgba(175, 96, 37, 0.7);
}

/* ==========================================
   TRACK
   ========================================== */

.runic-slider__track {
  position: relative;
  width: 100%;
  height: 8px;
  background: linear-gradient(
    180deg,
    rgba(6, 6, 8, 0.98) 0%,
    rgba(14, 14, 16, 0.95) 40%,
    rgba(10, 10, 12, 0.97) 100%
  );
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    inset 0 1px 2px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 1px 0 rgba(50, 45, 40, 0.2);
  border: 1px solid rgba(30, 28, 25, 0.8);
  border-top-color: rgba(20, 18, 15, 0.9);
  border-bottom-color: rgba(50, 45, 40, 0.3);
}

/* ==========================================
   FILL BAR
   ========================================== */

.runic-slider__fill {
  position: absolute;
  top: 2px;
  left: 2px;
  bottom: 2px;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.2) 3px,
      rgba(0, 0, 0, 0.2) 6px
    ),
    linear-gradient(
      180deg,
      rgba(195, 115, 50, 0.9) 0%,
      rgba(175, 96, 37, 0.95) 50%,
      rgba(140, 75, 25, 0.9) 100%
    );
  border-radius: 2px;
  transition: width 0.15s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 150, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 0 8px rgba(175, 96, 37, 0.3);
}

/* ==========================================
   NOTCHES
   ========================================== */

.runic-slider__notches {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.runic-slider__notch {
  position: absolute;
  top: 50%;
  width: 1px;
  height: 4px;
  background: rgba(80, 70, 60, 0.3);
  transform: translate(-50%, -50%);
}

/* ==========================================
   HIDDEN INPUT (for interaction)
   ========================================== */

.runic-slider__input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
  -webkit-appearance: none;
  appearance: none;
}

.runic-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.runic-slider__input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
}

/* Custom thumb rendered via pseudo-element */
.runic-slider__track-container::after {
  content: '';
  position: absolute;
  top: 50%;
  left: calc(var(--thumb-position, 0%) - 10px);
  width: 20px;
  height: 20px;
  background: linear-gradient(
    180deg,
    rgba(60, 55, 50, 0.95) 0%,
    rgba(40, 38, 35, 0.98) 50%,
    rgba(30, 28, 25, 0.95) 100%
  );
  border: 2px solid rgba(175, 96, 37, 0.6);
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(80, 75, 70, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  transition: all 0.15s ease;
  pointer-events: none;
  z-index: 4;
}

.runic-slider:hover .runic-slider__track-container::after,
.runic-slider:focus-within .runic-slider__track-container::after {
  border-color: rgba(195, 115, 50, 0.8);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.5),
    0 0 12px rgba(175, 96, 37, 0.3),
    inset 0 1px 0 rgba(80, 75, 70, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* Center diamond on thumb */
.runic-slider__track-container::before {
  content: '◆';
  position: absolute;
  top: 50%;
  left: calc(var(--thumb-position, 0%) - 10px);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.7);
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 5;
  transition: all 0.15s ease;
}

.runic-slider:hover .runic-slider__track-container::before,
.runic-slider:focus-within .runic-slider__track-container::before {
  color: rgba(195, 115, 50, 0.9);
}

/* ==========================================
   VALUE DISPLAY
   ========================================== */

.runic-slider__value {
  flex-shrink: 0;
  min-width: 4rem;
  padding: 0.375rem 0.625rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 100%
  );
  border: 1px solid rgba(35, 32, 28, 0.6);
  border-radius: 4px;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(50, 45, 40, 0.15);
  text-align: center;
}

.runic-slider__value-text {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: #e8e4df;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* ==========================================
   SIZE VARIANTS
   ========================================== */

/* Small */
.runic-slider--sm .runic-slider__track {
  height: 6px;
}

.runic-slider--sm .runic-slider__track-container::after {
  width: 16px;
  height: 16px;
  left: calc(var(--thumb-position, 0%) - 8px);
}

.runic-slider--sm .runic-slider__track-container::before {
  width: 16px;
  height: 16px;
  left: calc(var(--thumb-position, 0%) - 8px);
  font-size: 0.4rem;
}

.runic-slider--sm .runic-slider__value {
  min-width: 3.5rem;
  padding: 0.25rem 0.5rem;
}

.runic-slider--sm .runic-slider__value-text {
  font-size: 0.75rem;
}

.runic-slider--sm .runic-slider__rune {
  font-size: 0.4rem;
}

/* Large */
.runic-slider--lg .runic-slider__track {
  height: 10px;
}

.runic-slider--lg .runic-slider__track-container::after {
  width: 24px;
  height: 24px;
  left: calc(var(--thumb-position, 0%) - 12px);
}

.runic-slider--lg .runic-slider__track-container::before {
  width: 24px;
  height: 24px;
  left: calc(var(--thumb-position, 0%) - 12px);
  font-size: 0.625rem;
}

.runic-slider--lg .runic-slider__value {
  min-width: 5rem;
  padding: 0.5rem 0.75rem;
}

.runic-slider--lg .runic-slider__value-text {
  font-size: 1rem;
}

.runic-slider--lg .runic-slider__rune {
  font-size: 0.625rem;
}

/* ==========================================
   RESPONSIVE
   ========================================== */

@media (max-width: 640px) {
  .runic-slider__value {
    min-width: 3.5rem;
    padding: 0.25rem 0.5rem;
  }

  .runic-slider__value-text {
    font-size: 0.8125rem;
  }
}
</style>
