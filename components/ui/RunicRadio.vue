<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  color?: string; // Optional color override for tier-specific colors
}

interface Props {
  options?: Option[];
  modelValue: string | boolean;
  size?: "sm" | "md" | "lg";
  toggle?: boolean; // Simple on/off toggle mode
  toggleColor?: string; // Color when toggle is on
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  toggle: false,
  toggleColor: "default",
});

const emit = defineEmits<{
  "update:modelValue": [value: string | boolean];
}>();

// For toggle mode, create simple on/off options
const effectiveOptions = computed(() => {
  if (props.toggle) {
    return [
      { value: "off", label: "", color: "off" },
      { value: "on", label: "", color: props.toggleColor },
    ];
  }
  return props.options || [];
});

// Convert boolean to string for internal use
const internalValue = computed(() => {
  if (props.toggle) {
    return props.modelValue ? "on" : "off";
  }
  return props.modelValue as string;
});

// Find the index of the selected option
const selectedIndex = computed(() => {
  return effectiveOptions.value.findIndex((opt) => opt.value === internalValue.value);
});

// Calculate the position of the slider
const sliderStyle = computed(() => {
  const index = selectedIndex.value;
  const count = effectiveOptions.value.length;
  if (index === -1) return { left: "0%", width: `${100 / count}%` };
  
  return {
    left: `${(index / count) * 100}%`,
    width: `${100 / count}%`,
  };
});

// Get the color for the current selection
const selectedColor = computed(() => {
  const option = effectiveOptions.value[selectedIndex.value];
  return option?.color || null;
});

const selectOption = (value: string) => {
  if (props.toggle) {
    emit("update:modelValue", value === "on");
  } else {
    emit("update:modelValue", value);
  }
};

// Toggle mode: flip the current state
const handleToggleClick = () => {
  if (props.toggle) {
    emit("update:modelValue", !props.modelValue);
  }
};
</script>

<template>
  <div
    class="runic-radio"
    :class="[
      `runic-radio--${size}`,
      { 'runic-radio--toggle': toggle }
    ]"
    :role="toggle ? 'switch' : 'radiogroup'"
    :aria-checked="toggle ? (modelValue as boolean) : undefined"
  >
    <!-- The carved groove/crevice background -->
    <div 
      class="runic-radio__groove"
      :class="{ 'runic-radio__groove--clickable': toggle }"
      @click="handleToggleClick"
    >
      <!-- Engraved labels at the bottom of the groove (only for radio mode) -->
      <button
        v-for="(option, index) in effectiveOptions"
        :key="option.value"
        type="button"
        :role="toggle ? 'presentation' : 'radio'"
        :aria-checked="!toggle ? internalValue === option.value : undefined"
        :tabindex="toggle ? -1 : 0"
        class="runic-radio__option"
        :class="[
          { 'runic-radio__option--selected': internalValue === option.value },
          option.color ? `runic-radio__option--${option.color}` : ''
        ]"
        @click.stop="!toggle && selectOption(option.value)"
      >
        <span v-if="!toggle" class="runic-radio__label">{{ option.label }}</span>
      </button>

      <!-- The sliding selector that moves between options -->
      <div
        class="runic-radio__slider"
        :class="selectedColor ? `runic-radio__slider--${selectedColor}` : ''"
        :style="sliderStyle"
        aria-hidden="true"
      >
        <span v-if="!toggle" class="runic-radio__slider-label">
          {{ effectiveOptions[selectedIndex]?.label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC RADIO - The carved groove container
   ========================================== */
.runic-radio {
  position: relative;
  display: inline-flex;
  font-family: "Cinzel", serif;
}

/* ==========================================
   THE GROOVE - The carved crevice effect
   ========================================== */
.runic-radio__groove {
  position: relative;
  display: flex;
  align-items: center;
  background: linear-gradient(
    180deg,
    rgba(5, 5, 7, 0.95) 0%,
    rgba(12, 12, 14, 0.9) 40%,
    rgba(8, 8, 10, 0.95) 100%
  );
  border-radius: 4px;
  
  /* Inner shadow to create depth - the carved effect */
  box-shadow: 
    inset 0 3px 8px rgba(0, 0, 0, 0.8),
    inset 0 1px 2px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(60, 55, 50, 0.1),
    0 1px 0 rgba(40, 35, 30, 0.3);
  
  /* Outer border - worn stone edge */
  border: 1px solid rgba(30, 28, 25, 0.8);
  border-top-color: rgba(20, 18, 15, 0.9);
  border-bottom-color: rgba(50, 45, 40, 0.4);
  
  overflow: hidden;
}

/* Clickable groove for toggle mode */
.runic-radio__groove--clickable {
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.runic-radio__groove--clickable:hover {
  box-shadow: 
    inset 0 3px 8px rgba(0, 0, 0, 0.8),
    inset 0 1px 2px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(60, 55, 50, 0.15),
    0 1px 0 rgba(40, 35, 30, 0.4);
}

.runic-radio__groove--clickable:active {
  box-shadow: 
    inset 0 4px 10px rgba(0, 0, 0, 0.9),
    inset 0 2px 3px rgba(0, 0, 0, 0.95),
    inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 1px 0 rgba(40, 35, 30, 0.2);
}

/* Decorative groove texture */
.runic-radio__groove::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.05) 2px,
      rgba(0, 0, 0, 0.05) 3px
    );
  pointer-events: none;
  opacity: 0.5;
}

/* ==========================================
   OPTIONS - The engraved labels
   ========================================== */
.runic-radio__option {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.runic-radio__label {
  position: relative;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  
  /* Engraved text effect - carved into stone */
  color: rgba(60, 58, 55, 0.7);
  text-shadow: 
    0 1px 0 rgba(30, 28, 25, 0.8),
    0 -1px 0 rgba(80, 75, 70, 0.15);
  
  transition: all 0.3s ease;
}

.runic-radio__option:hover .runic-radio__label {
  color: rgba(90, 85, 80, 0.9);
}

/* When option is selected, hide the engraved label (slider shows it) */
.runic-radio__option--selected .runic-radio__label {
  opacity: 0;
}

/* ==========================================
   SLIDER - The moving selector stone
   ========================================== */
.runic-radio__slider {
  position: absolute;
  top: 2px;
  bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* The raised stone tablet look */
  background: linear-gradient(
    180deg,
    rgba(45, 40, 35, 0.95) 0%,
    rgba(30, 27, 23, 0.98) 50%,
    rgba(25, 22, 18, 0.95) 100%
  );
  
  border-radius: 3px;
  
  /* Raised effect with lighting */
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(80, 70, 60, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  
  border: 1px solid rgba(60, 55, 45, 0.5);
  border-top-color: rgba(80, 70, 60, 0.4);
  border-bottom-color: rgba(30, 25, 20, 0.6);
  
  /* Smooth sliding animation */
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
  
  z-index: 2;
  pointer-events: none;
}

/* Inner glow effect */
.runic-radio__slider::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: 2px;
  border: 1px solid rgba(100, 90, 75, 0.15);
  border-bottom-color: transparent;
  border-right-color: transparent;
  pointer-events: none;
}

.runic-radio__slider-label {
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #c9a227;
  text-shadow: 0 0 10px rgba(201, 162, 39, 0.3);
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

/* ==========================================
   COLOR VARIANTS FOR TIERS
   ========================================== */

/* Default/All - Copper/Bronze */
.runic-radio__slider--default,
.runic-radio__slider:not([class*="--t"]):not([class*="--all"]) {
  border-color: rgba(175, 96, 37, 0.4);
}

.runic-radio__slider--default .runic-radio__slider-label,
.runic-radio__slider:not([class*="--t"]):not([class*="--all"]) .runic-radio__slider-label {
  color: #c97a3a;
  text-shadow: 0 0 10px rgba(175, 96, 37, 0.3);
}

/* T0 - Gold */
.runic-radio__slider--t0 {
  border-color: rgba(201, 162, 39, 0.5);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(201, 162, 39, 0.15),
    inset 0 1px 0 rgba(201, 162, 39, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.runic-radio__slider--t0 .runic-radio__slider-label {
  color: #c9a227;
  text-shadow: 0 0 12px rgba(201, 162, 39, 0.4);
}

/* T1 - Purple/Amethyst */
.runic-radio__slider--t1 {
  border-color: rgba(122, 106, 138, 0.5);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(122, 106, 138, 0.15),
    inset 0 1px 0 rgba(122, 106, 138, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.runic-radio__slider--t1 .runic-radio__slider-label {
  color: #9a8aaa;
  text-shadow: 0 0 12px rgba(122, 106, 138, 0.4);
}

/* T2 - Blue/Steel */
.runic-radio__slider--t2 {
  border-color: rgba(90, 112, 128, 0.5);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3),
    0 0 15px rgba(90, 112, 128, 0.15),
    inset 0 1px 0 rgba(90, 112, 128, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.runic-radio__slider--t2 .runic-radio__slider-label {
  color: #7a9aaa;
  text-shadow: 0 0 12px rgba(90, 112, 128, 0.4);
}

/* T3 - Gray/Iron */
.runic-radio__slider--t3 {
  border-color: rgba(80, 80, 85, 0.5);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(90, 90, 95, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}

.runic-radio__slider--t3 .runic-radio__slider-label {
  color: #8a8a90;
  text-shadow: none;
}

/* ==========================================
   SIZES - Mobile first, then larger screens
   ========================================== */

/* Small */
.runic-radio--sm .runic-radio__groove {
  min-height: 32px;
}

.runic-radio--sm .runic-radio__option {
  padding: 0.375rem 0.625rem;
}

.runic-radio--sm .runic-radio__label,
.runic-radio--sm .runic-radio__slider-label {
  font-size: 0.625rem;
}

@media (min-width: 640px) {
  .runic-radio--sm .runic-radio__groove {
    min-height: 38px;
  }
  
  .runic-radio--sm .runic-radio__option {
    padding: 0.5rem 1.25rem;
  }
  
  .runic-radio--sm .runic-radio__label,
  .runic-radio--sm .runic-radio__slider-label {
    font-size: 0.75rem;
  }
}

/* Medium (default) */
.runic-radio--md .runic-radio__groove {
  min-height: 38px;
}

.runic-radio--md .runic-radio__option {
  padding: 0.5rem 0.75rem;
}

.runic-radio--md .runic-radio__label,
.runic-radio--md .runic-radio__slider-label {
  font-size: 0.6875rem;
}

@media (min-width: 640px) {
  .runic-radio--md .runic-radio__groove {
    min-height: 46px;
  }
  
  .runic-radio--md .runic-radio__option {
    padding: 0.625rem 1.5rem;
  }
  
  .runic-radio--md .runic-radio__label,
  .runic-radio--md .runic-radio__slider-label {
    font-size: 0.8125rem;
  }
}

/* Large */
.runic-radio--lg .runic-radio__groove {
  min-height: 44px;
}

.runic-radio--lg .runic-radio__option {
  padding: 0.5rem 1rem;
}

.runic-radio--lg .runic-radio__label,
.runic-radio--lg .runic-radio__slider-label {
  font-size: 0.75rem;
}

@media (min-width: 640px) {
  .runic-radio--lg .runic-radio__groove {
    min-height: 54px;
  }
  
  .runic-radio--lg .runic-radio__option {
    padding: 0.75rem 1.75rem;
  }
  
  .runic-radio--lg .runic-radio__label,
  .runic-radio--lg .runic-radio__slider-label {
    font-size: 0.9375rem;
  }
}

/* ==========================================
   TOGGLE MODE - Simple on/off switch
   ========================================== */
.runic-radio--toggle .runic-radio__groove {
  min-height: 32px;
}

.runic-radio--toggle .runic-radio__option {
  padding: 0.5rem 1rem;
  min-width: 28px;
}

.runic-radio--toggle.runic-radio--sm .runic-radio__groove {
  min-height: 28px;
}

.runic-radio--toggle.runic-radio--sm .runic-radio__option {
  padding: 0.375rem 0.75rem;
  min-width: 24px;
}

.runic-radio--toggle.runic-radio--md .runic-radio__groove {
  min-height: 32px;
}

.runic-radio--toggle.runic-radio--md .runic-radio__option {
  padding: 0.5rem 1rem;
  min-width: 28px;
}

.runic-radio--toggle.runic-radio--lg .runic-radio__groove {
  min-height: 38px;
}

.runic-radio--toggle.runic-radio--lg .runic-radio__option {
  padding: 0.5rem 1.25rem;
  min-width: 34px;
}

/* In toggle mode, buttons are just visual - clicks go to the groove */
.runic-radio--toggle .runic-radio__option {
  pointer-events: none;
}

/* Off state - dimmed slider */
.runic-radio__slider--off {
  background: linear-gradient(
    180deg,
    rgba(30, 28, 26, 0.9) 0%,
    rgba(22, 20, 18, 0.95) 50%,
    rgba(18, 16, 14, 0.9) 100%
  );
  border-color: rgba(40, 38, 35, 0.4);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 1px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(50, 45, 40, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* ==========================================
   HOVER & FOCUS STATES
   ========================================== */
.runic-radio__option:focus {
  outline: none;
}

.runic-radio__option:focus-visible .runic-radio__label {
  color: rgba(120, 110, 100, 1);
}

/* Subtle pulse animation on the slider when it moves */
@keyframes slider-glow {
  0%, 100% {
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.5),
      0 2px 6px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(80, 70, 60, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  }
  50% {
    box-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.5),
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 0 15px var(--glow-color, rgba(201, 162, 39, 0.2)),
      inset 0 1px 0 rgba(80, 70, 60, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  }
}
</style>

