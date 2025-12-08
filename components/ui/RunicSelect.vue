<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  options: Option[];
  modelValue: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  maxVisibleItems?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Sélectionner...",
  size: "md",
  maxVisibleItems: 8,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

// Dropdown positioning
const dropdownPosition = ref({ top: 0, left: 0, width: 0 });

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue);
});

// Calculate item height for max-height calculation
const itemHeight = computed(() => {
  switch (props.size) {
    case "sm": return 48;
    case "lg": return 64;
    default: return 56;
  }
});

const maxDropdownHeight = computed(() => {
  return props.maxVisibleItems * itemHeight.value + 8; // +8 for padding
});

const updateDropdownPosition = () => {
  if (!triggerRef.value) return;
  
  const rect = triggerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  
  // Determine if dropdown should open above or below
  const openAbove = spaceBelow < maxDropdownHeight.value && spaceAbove > spaceBelow;
  
  dropdownPosition.value = {
    top: openAbove ? rect.top - Math.min(maxDropdownHeight.value, spaceAbove - 10) : rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  };
};

const toggleDropdown = () => {
  if (!isOpen.value) {
    updateDropdownPosition();
  }
  isOpen.value = !isOpen.value;
};

const selectOption = (value: string) => {
  emit("update:modelValue", value);
  isOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (selectRef.value && !selectRef.value.contains(target) && 
      dropdownRef.value && !dropdownRef.value.contains(target)) {
    isOpen.value = false;
  }
};

// Update position on scroll or resize
const handleScrollResize = () => {
  if (isOpen.value) {
    updateDropdownPosition();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  window.addEventListener("scroll", handleScrollResize, true);
  window.addEventListener("resize", handleScrollResize);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  window.removeEventListener("scroll", handleScrollResize, true);
  window.removeEventListener("resize", handleScrollResize);
});
</script>

<template>
  <div
    ref="selectRef"
    class="runic-select"
    :class="[`runic-select--${size}`, { 'runic-select--open': isOpen }]"
  >
    <!-- Label -->
    <label v-if="label" class="runic-select__label">{{ label }}</label>

    <!-- The carved groove container -->
    <button
      ref="triggerRef"
      type="button"
      class="runic-select__trigger"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <!-- Corner runes -->
      <span class="runic-select__rune runic-select__rune--tl">◆</span>
      <span class="runic-select__rune runic-select__rune--tr">◆</span>
      <span class="runic-select__rune runic-select__rune--bl">◆</span>
      <span class="runic-select__rune runic-select__rune--br">◆</span>

      <!-- Selected value -->
      <span class="runic-select__value">
        {{ selectedOption?.label || placeholder }}
      </span>

      <!-- Chevron -->
      <svg
        class="runic-select__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19 9l-7 7-7-7"
        />
      </svg>

      <!-- Inner glow line -->
      <div class="runic-select__glow"></div>
    </button>

    <!-- Dropdown options - Teleported to body for proper overflow handling -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="runic-select__dropdown"
          :class="`runic-select__dropdown--${size}`"
          :style="{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: `${maxDropdownHeight}px`,
          }"
        >
          <div class="runic-select__dropdown-inner">
            <button
              v-for="option in options"
              :key="option.value"
              type="button"
              class="runic-select__option"
              :class="{ 'runic-select__option--selected': option.value === modelValue }"
              @click="selectOption(option.value)"
            >
              <span class="runic-select__option-label">{{ option.label }}</span>
              <span v-if="option.description" class="runic-select__option-desc">
                {{ option.description }}
              </span>
              <!-- Selected indicator -->
              <svg
                v-if="option.value === modelValue"
                class="runic-select__check"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC SELECT - Carved stone dropdown
   ========================================== */
.runic-select {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  width: 100%;
  font-family: "Crimson Text", serif;
}

.runic-select__label {
  display: block;
  margin-bottom: 0.5rem;
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(140, 130, 120, 0.8);
}

/* ==========================================
   TRIGGER - The carved button
   ========================================== */
.runic-select__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  text-align: left;

  /* Deep carved groove effect */
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );

  border-radius: 4px;

  /* Deep inset shadow */
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(60, 55, 50, 0.08), 0 1px 0 rgba(45, 40, 35, 0.3);

  /* Worn stone border */
  border: 1px solid rgba(35, 32, 28, 0.8);
  border-top-color: rgba(25, 22, 18, 0.9);
  border-bottom-color: rgba(55, 50, 45, 0.35);

  overflow: hidden;
  transition: all 0.3s ease;
}

.runic-select__trigger:hover,
.runic-select--open .runic-select__trigger {
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(175, 96, 37, 0.1), 0 0 15px rgba(175, 96, 37, 0.1),
    0 1px 0 rgba(45, 40, 35, 0.3);
}

/* ==========================================
   CORNER RUNES
   ========================================== */
.runic-select__rune {
  position: absolute;
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.3);
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.runic-select__rune--tl {
  top: 4px;
  left: 6px;
}
.runic-select__rune--tr {
  top: 4px;
  right: 6px;
}
.runic-select__rune--bl {
  bottom: 4px;
  left: 6px;
}
.runic-select__rune--br {
  bottom: 4px;
  right: 6px;
}

.runic-select__trigger:hover .runic-select__rune,
.runic-select--open .runic-select__rune {
  color: rgba(175, 96, 37, 0.5);
}

/* ==========================================
   VALUE & CHEVRON
   ========================================== */
.runic-select__value {
  flex: 1;
  color: #c8c8c8;
  font-family: "Crimson Text", serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.runic-select__chevron {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: rgba(90, 85, 75, 0.6);
  transition: transform 0.3s ease, color 0.3s ease;
}

.runic-select--open .runic-select__chevron {
  transform: rotate(180deg);
  color: rgba(175, 96, 37, 0.7);
}

/* ==========================================
   GLOW LINE - Bottom accent
   ========================================== */
.runic-select__glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(175, 96, 37, 0.6), transparent);
  transition: width 0.4s ease;
}

.runic-select__trigger:hover .runic-select__glow,
.runic-select--open .runic-select__glow {
  width: 80%;
}

/* ==========================================
   DROPDOWN - Teleported to body
   ========================================== */
.runic-select__dropdown {
  /* Position is set inline via style binding */
  z-index: 10001; /* Above settings modal (10000) */

  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.99) 0%,
    rgba(12, 12, 15, 1) 100%
  );

  border-radius: 4px;
  border: 1px solid rgba(60, 55, 50, 0.5);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.7), 
    0 6px 16px rgba(0, 0, 0, 0.5),
    0 0 1px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(80, 75, 70, 0.15);

  overflow: hidden;
}

.runic-select__dropdown-inner {
  overflow-y: auto;
  max-height: inherit;
  padding: 4px;
}

/* Custom scrollbar */
.runic-select__dropdown-inner::-webkit-scrollbar {
  width: 6px;
}

.runic-select__dropdown-inner::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.runic-select__dropdown-inner::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

.runic-select__dropdown-inner::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 90, 80, 0.5);
}

/* ==========================================
   OPTIONS
   ========================================== */
.runic-select__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: all 0.2s ease;
}

.runic-select__option:hover {
  background: rgba(175, 96, 37, 0.1);
}

.runic-select__option--selected {
  background: rgba(175, 96, 37, 0.15);
}

.runic-select__option-label {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: #c8c8c8;
  transition: color 0.2s ease;
}

.runic-select__option:hover .runic-select__option-label {
  color: #e0e0e0;
}

.runic-select__option--selected .runic-select__option-label {
  color: #c97a3a;
}

.runic-select__option-desc {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(140, 130, 120, 0.6);
  margin-top: 2px;
  font-style: italic;
}

.runic-select__check {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #c97a3a;
}

/* ==========================================
   DROPDOWN ANIMATION
   ========================================== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.25s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ==========================================
   SIZES
   ========================================== */

/* Small */
.runic-select--sm .runic-select__trigger {
  min-height: 38px;
  padding: 0.5rem 1.25rem;
}

.runic-select--sm .runic-select__value {
  font-size: 0.875rem;
}

.runic-select--sm .runic-select__rune {
  font-size: 0.4rem;
}

.runic-select--sm .runic-select__option {
  padding: 0.5rem 0.875rem;
}

.runic-select--sm .runic-select__option-label {
  font-size: 0.875rem;
}

/* Medium */
.runic-select--md .runic-select__trigger {
  min-height: 46px;
  padding: 0.625rem 1.5rem;
}

.runic-select--md .runic-select__value {
  font-size: 1rem;
}

/* Large */
.runic-select--lg .runic-select__trigger {
  min-height: 54px;
  padding: 0.75rem 1.75rem;
}

.runic-select--lg .runic-select__value {
  font-size: 1.125rem;
}

.runic-select--lg .runic-select__rune {
  font-size: 0.5625rem;
}

.runic-select--lg .runic-select__chevron {
  width: 20px;
  height: 20px;
}

/* Dropdown size variants */
.runic-select__dropdown--sm .runic-select__option {
  padding: 0.5rem 0.875rem;
}

.runic-select__dropdown--sm .runic-select__option-label {
  font-size: 0.875rem;
}

.runic-select__dropdown--sm .runic-select__option-desc {
  font-size: 0.75rem;
}

.runic-select__dropdown--lg .runic-select__option {
  padding: 1rem 1.25rem;
}

.runic-select__dropdown--lg .runic-select__option-label {
  font-size: 1.0625rem;
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .runic-select--sm .runic-select__trigger {
    min-height: 34px;
    padding: 0.375rem 1rem;
  }

  .runic-select--md .runic-select__trigger {
    min-height: 40px;
    padding: 0.5rem 1rem;
  }

  .runic-select--lg .runic-select__trigger {
    min-height: 48px;
    padding: 0.625rem 1.25rem;
  }

  .runic-select__rune {
    display: none;
  }

  .runic-select__dropdown {
    max-height: 250px;
  }

  .runic-select__dropdown-inner {
    max-height: 250px;
  }
}
</style>

