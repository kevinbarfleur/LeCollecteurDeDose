<script setup lang="ts">
const { t } = useI18n();

interface Option {
  value: string;
  label: string;
  description?: string;
  count?: number;
}

interface Props {
  options: Option[];
  modelValue: string | string[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  maxVisibleItems?: number;
  searchable?: boolean;
  multiple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  size: "md",
  maxVisibleItems: 8,
  searchable: false,
  multiple: false,
});

// Use translated default placeholder if none provided
const displayPlaceholder = computed(
  () => props.placeholder ?? t("common.select")
);

const emit = defineEmits<{
  "update:modelValue": [value: string | string[]];
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");

// Dropdown positioning
const dropdownPosition = ref({ top: 0, left: 0, width: 0 });

// Selected values as array (works for both single and multiple)
const selectedValues = computed<string[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return props.modelValue ? [props.modelValue as string] : [];
});

// Display text for trigger
const displayText = computed(() => {
  if (selectedValues.value.length === 0) {
    return displayPlaceholder.value;
  }

  if (props.multiple) {
    if (selectedValues.value.length === 1) {
      const opt = props.options.find(
        (o) => o.value === selectedValues.value[0]
      );
      return opt?.label || selectedValues.value[0];
    }
    return t("common.selected", { count: selectedValues.value.length });
  }

  const opt = props.options.find((o) => o.value === props.modelValue);
  return opt?.label || displayPlaceholder.value;
});

// Filter and sort options: selected first, then filtered by search
const processedOptions = computed(() => {
  let opts = [...props.options];

  // Filter by search query
  if (props.searchable && searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    opts = opts.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );
  }

  // Sort: selected options first (pinned at top)
  if (props.multiple) {
    opts.sort((a, b) => {
      const aSelected = selectedValues.value.includes(a.value);
      const bSelected = selectedValues.value.includes(b.value);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }

  return opts;
});

// Check if an option is selected
const isSelected = (value: string) => selectedValues.value.includes(value);

// Calculate item height for max-height calculation
const itemHeight = computed(() => {
  switch (props.size) {
    case "sm":
      return 48;
    case "lg":
      return 64;
    default:
      return 56;
  }
});

// Account for search input height
const searchInputHeight = computed(() => (props.searchable ? 52 : 0));

const maxDropdownHeight = computed(() => {
  return props.maxVisibleItems * itemHeight.value + 8 + searchInputHeight.value;
});

// Calculate actual dropdown height based on current options count
const actualDropdownHeight = computed(() => {
  const actualItemCount = processedOptions.value.length;
  const contentHeight =
    actualItemCount * itemHeight.value + 8 + searchInputHeight.value;
  return Math.min(contentHeight, maxDropdownHeight.value);
});

const updateDropdownPosition = () => {
  if (!triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  // Use actual dropdown height for positioning calculations
  const dropdownHeight = actualDropdownHeight.value;

  // Determine if dropdown should open above or below
  const openAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

  dropdownPosition.value = {
    top: openAbove
      ? rect.top - Math.min(dropdownHeight, spaceAbove - 10) - 4
      : rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  };
};

const toggleDropdown = () => {
  if (!isOpen.value) {
    updateDropdownPosition();
    searchQuery.value = "";
  }
  isOpen.value = !isOpen.value;

  // Focus search input when opening
  if (isOpen.value && props.searchable) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
};

const selectOption = (value: string) => {
  if (props.multiple) {
    // Toggle selection for multiple mode
    const newValues = [...selectedValues.value];
    const index = newValues.indexOf(value);

    if (index === -1) {
      newValues.push(value);
    } else {
      newValues.splice(index, 1);
    }

    emit("update:modelValue", newValues);
    // Keep dropdown open in multiple mode
  } else {
    // Single select mode
    emit("update:modelValue", value);
    isOpen.value = false;
  }
};

// Clear all selections (multiple mode only)
const clearAll = () => {
  if (props.multiple) {
    emit("update:modelValue", []);
  }
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (
    selectRef.value &&
    !selectRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
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
    :class="[
      `runic-select--${size}`,
      {
        'runic-select--open': isOpen,
        'runic-select--multiple': multiple,
        'runic-select--has-selection': selectedValues.length > 0,
      },
    ]"
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

      <!-- Selected value / count badge -->
      <span class="runic-select__value">
        {{ displayText }}
      </span>

      <!-- Selection count badge for multiple -->
      <span
        v-if="multiple && selectedValues.length > 0"
        class="runic-select__badge"
      >
        {{ selectedValues.length }}
      </span>

      <!-- Clear button for multiple mode -->
      <button
        v-if="multiple && selectedValues.length > 0"
        type="button"
        class="runic-select__clear"
        @click.stop="clearAll"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

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
          :class="[
            `runic-select__dropdown--${size}`,
            { 'runic-select__dropdown--searchable': searchable },
          ]"
          :style="{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: `${maxDropdownHeight}px`,
          }"
        >
          <!-- Search input -->
          <div v-if="searchable" class="runic-select__search">
            <svg
              class="runic-select__search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="runic-select__search-input"
              :placeholder="t('common.search')"
              @click.stop
            />
            <button
              v-if="searchQuery"
              type="button"
              class="runic-select__search-clear"
              @click.stop="searchQuery = ''"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="runic-select__dropdown-inner">
            <!-- Empty state -->
            <div
              v-if="processedOptions.length === 0"
              class="runic-select__empty"
            >
              Aucun résultat
            </div>

            <!-- Options list -->
            <button
              v-for="option in processedOptions"
              :key="option.value"
              type="button"
              class="runic-select__option"
              :class="{
                'runic-select__option--selected': isSelected(option.value),
                'runic-select__option--pinned':
                  multiple && isSelected(option.value),
              }"
              @click="selectOption(option.value)"
            >
              <!-- Checkbox for multiple mode -->
              <span v-if="multiple" class="runic-select__checkbox">
                <svg
                  v-if="isSelected(option.value)"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>

              <span class="runic-select__option-content">
                <span class="runic-select__option-label">{{
                  option.label
                }}</span>
                <span
                  v-if="option.description"
                  class="runic-select__option-desc"
                >
                  {{ option.description }}
                </span>
              </span>

              <!-- Count badge -->
              <span
                v-if="option.count !== undefined"
                class="runic-select__option-count"
              >
                {{ option.count }}
              </span>

              <!-- Selected indicator (single mode) -->
              <svg
                v-if="!multiple && isSelected(option.value)"
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
  font-size: 0.875rem;
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
  gap: 0.5rem;
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
    inset 0 1px 3px rgba(0, 0, 0, 0.9), inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 1px 0 rgba(45, 40, 35, 0.3);

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
    inset 0 1px 3px rgba(0, 0, 0, 0.9), inset 0 -1px 1px rgba(175, 96, 37, 0.1),
    0 0 15px rgba(175, 96, 37, 0.1), 0 1px 0 rgba(45, 40, 35, 0.3);
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
   VALUE & BADGES
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

.runic-select__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-family: "Cinzel", serif;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #0a0908;
  background: linear-gradient(180deg, #c97a3a 0%, #a86428 100%);
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.runic-select__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(80, 70, 60, 0.3);
  border: none;
  border-radius: 50%;
  color: rgba(200, 200, 200, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.runic-select__clear:hover {
  background: rgba(175, 96, 37, 0.4);
  color: #fff;
}

.runic-select__clear svg {
  width: 12px;
  height: 12px;
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
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 96, 37, 0.6),
    transparent
  );
  transition: width 0.4s ease;
}

.runic-select__trigger:hover .runic-select__glow,
.runic-select--open .runic-select__glow {
  width: 80%;
}

.runic-select--has-selection .runic-select__glow {
  width: 40%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 96, 37, 0.4),
    transparent
  );
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
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7), 0 6px 16px rgba(0, 0, 0, 0.5),
    0 0 1px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(80, 75, 70, 0.15);

  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==========================================
   SEARCH INPUT
   ========================================== */
.runic-select__search {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
  background: rgba(0, 0, 0, 0.2);
}

.runic-select__search-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: rgba(140, 130, 120, 0.5);
  margin-right: 8px;
}

.runic-select__search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  color: #c8c8c8;
}

.runic-select__search-input::placeholder {
  color: rgba(140, 130, 120, 0.5);
  font-style: italic;
}

.runic-select__search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: rgba(80, 70, 60, 0.3);
  border: none;
  border-radius: 50%;
  color: rgba(200, 200, 200, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.runic-select__search-clear:hover {
  background: rgba(175, 96, 37, 0.4);
  color: #fff;
}

.runic-select__search-clear svg {
  width: 10px;
  height: 10px;
}

/* ==========================================
   DROPDOWN INNER
   ========================================== */
.runic-select__dropdown-inner {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
   EMPTY STATE
   ========================================== */
.runic-select__empty {
  padding: 1rem;
  text-align: center;
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(140, 130, 120, 0.6);
}

/* ==========================================
   OPTIONS
   ========================================== */
.runic-select__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: all 0.2s ease;
}

/* Hover: runic borders */
.runic-select__option:hover {
  border-color: rgba(175, 135, 80, 0.3);
  box-shadow: inset 0 0 0 1px rgba(175, 135, 80, 0.1),
    0 0 8px rgba(175, 135, 80, 0.05);
}

.runic-select__option:hover::before,
.runic-select__option:hover::after {
  content: "◆";
  position: absolute;
  font-size: 0.4rem;
  color: rgba(175, 135, 80, 0.5);
}

.runic-select__option:hover::before {
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
}

.runic-select__option:hover::after {
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
}

/* Selected: subtle dashed pattern background */
.runic-select__option--selected {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(175, 135, 80, 0.06) 4px,
    rgba(175, 135, 80, 0.06) 8px
  );
  border-color: rgba(175, 135, 80, 0.2);
}

.runic-select__option--selected:hover {
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(175, 135, 80, 0.08) 4px,
    rgba(175, 135, 80, 0.08) 8px
  );
  border-color: rgba(175, 135, 80, 0.35);
}

/* Pinned indicator for selected options in multiple mode */
.runic-select__option--pinned {
  border-left: 2px solid rgba(175, 135, 80, 0.4);
  padding-left: calc(1rem - 2px);
}

/* Checkbox for multiple mode */
.runic-select__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(80, 70, 60, 0.4);
  border-radius: 3px;
  transition: all 0.2s ease;
}

.runic-select__option--selected .runic-select__checkbox {
  background: linear-gradient(180deg, #c97a3a 0%, #a86428 100%);
  border-color: #c97a3a;
}

.runic-select__checkbox svg {
  width: 12px;
  height: 12px;
  color: #0a0908;
}

.runic-select__option-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.runic-select__option-label {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: #c8c8c8;
  transition: color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.runic-select__option:hover .runic-select__option-label {
  color: #e0e0e0;
}

.runic-select__option--selected .runic-select__option-label {
  color: #c97a3a;
}

.runic-select__option-desc {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: rgba(140, 130, 120, 0.6);
  margin-top: 2px;
  font-style: italic;
}

.runic-select__option-count {
  font-family: "Cinzel", serif;
  font-size: 0.6875rem;
  color: rgba(140, 130, 120, 0.6);
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: auto;
}

.runic-select__option--selected .runic-select__option-count {
  color: rgba(175, 96, 37, 0.8);
  background: rgba(175, 96, 37, 0.1);
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
  font-size: 0.9375rem;
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
    max-height: 300px !important;
  }
}
</style>
