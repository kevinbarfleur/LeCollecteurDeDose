<script setup lang="ts">
const { t } = useI18n();

interface Props {
  modelValue: string;
  placeholder?: string;
  icon?: "search" | "filter" | "none";
  size?: "sm" | "md" | "lg";
  clearable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "",
  icon: "none",
  size: "md",
  clearable: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
};

const clearValue = () => {
  emit("update:modelValue", "");
  inputRef.value?.focus();
};

const showClear = computed(
  () => props.clearable && props.modelValue.length > 0
);

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });
</script>

<template>
  <div
    class="runic-input"
    :class="[
      `runic-input--${size}`,
      {
        'runic-input--has-icon': icon !== 'none',
        'runic-input--has-clear': showClear,
      },
    ]"
  >
    <!-- The carved groove container -->
    <div class="runic-input__groove">
      <!-- Corner runes -->
      <span class="runic-input__rune runic-input__rune--tl">◆</span>
      <span class="runic-input__rune runic-input__rune--tr">◆</span>
      <span class="runic-input__rune runic-input__rune--bl">◆</span>
      <span class="runic-input__rune runic-input__rune--br">◆</span>

      <!-- Icon -->
      <svg
        v-if="icon === 'search'"
        class="runic-input__icon"
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
      <svg
        v-else-if="icon === 'filter'"
        class="runic-input__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>

      <!-- Input field -->
      <input
        ref="inputRef"
        type="text"
        class="runic-input__field"
        :value="modelValue"
        :placeholder="placeholder"
        @input="updateValue"
      />

      <!-- Clear button -->
      <button
        v-if="showClear"
        type="button"
        class="runic-input__clear"
        @click="clearValue"
        :aria-label="t('common.clear')"
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

      <!-- Inner glow line -->
      <div class="runic-input__glow"></div>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC INPUT - Carved stone input field
   ========================================== */
.runic-input {
  position: relative;
  display: inline-flex;
  width: 100%;
  font-family: "Crimson Text", serif;
}

/* ==========================================
   THE GROOVE - Carved container
   ========================================== */
.runic-input__groove {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

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

.runic-input__groove:focus-within {
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9), inset 0 -1px 1px rgba(175, 96, 37, 0.1),
    0 0 15px rgba(175, 96, 37, 0.1), 0 1px 0 rgba(45, 40, 35, 0.3);
}

/* ==========================================
   CORNER RUNES
   ========================================== */
.runic-input__rune {
  position: absolute;
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.3);
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.runic-input__rune--tl {
  top: 4px;
  left: 6px;
}
.runic-input__rune--tr {
  top: 4px;
  right: 6px;
}
.runic-input__rune--bl {
  bottom: 4px;
  left: 6px;
}
.runic-input__rune--br {
  bottom: 4px;
  right: 6px;
}

.runic-input__groove:focus-within .runic-input__rune {
  color: rgba(175, 96, 37, 0.5);
}

/* ==========================================
   ICON
   ========================================== */
.runic-input__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-left: 1rem;
  color: rgba(90, 85, 75, 0.6);
  transition: color 0.3s ease;
}

.runic-input__groove:focus-within .runic-input__icon {
  color: rgba(175, 96, 37, 0.7);
}

/* ==========================================
   INPUT FIELD
   ========================================== */
.runic-input__field {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #c8c8c8;
  font-family: "Crimson Text", serif;

  /* Engraved text style */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.runic-input__field::placeholder {
  color: rgba(90, 85, 80, 0.5);
  font-style: italic;
}

/* ==========================================
   CLEAR BUTTON
   ========================================== */
.runic-input__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-right: 0.75rem;
  padding: 0;
  background: rgba(80, 70, 60, 0.3);
  border: none;
  border-radius: 50%;
  color: rgba(200, 200, 200, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 3;
}

.runic-input__clear:hover {
  background: rgba(175, 96, 37, 0.4);
  color: #fff;
}

.runic-input__clear:active {
  transform: scale(0.95);
}

.runic-input__clear svg {
  width: 12px;
  height: 12px;
}

/* ==========================================
   GLOW LINE - Bottom accent
   ========================================== */
.runic-input__glow {
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

.runic-input__groove:focus-within .runic-input__glow {
  width: 80%;
}

/* ==========================================
   SIZES
   ========================================== */

/* Small */
.runic-input--sm .runic-input__groove {
  min-height: 38px;
}

.runic-input--sm .runic-input__field {
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
}

.runic-input--sm.runic-input--has-icon .runic-input__field {
  padding-left: 0.75rem;
}

.runic-input--sm.runic-input--has-clear .runic-input__field {
  padding-right: 0.5rem;
}

.runic-input--sm .runic-input__icon {
  width: 16px;
  height: 16px;
}

.runic-input--sm .runic-input__rune {
  font-size: 0.4rem;
}

.runic-input--sm .runic-input__clear {
  width: 18px;
  height: 18px;
  margin-right: 0.5rem;
}

.runic-input--sm .runic-input__clear svg {
  width: 10px;
  height: 10px;
}

/* Medium */
.runic-input--md .runic-input__groove {
  min-height: 46px;
}

.runic-input--md .runic-input__field {
  padding: 0.625rem 1.5rem;
  font-size: 1.0625rem;
}

.runic-input--md.runic-input--has-icon .runic-input__field {
  padding-left: 0.875rem;
}

.runic-input--md.runic-input--has-clear .runic-input__field {
  padding-right: 0.5rem;
}

.runic-input--md .runic-input__icon {
  width: 18px;
  height: 18px;
}

/* Large */
.runic-input--lg .runic-input__groove {
  min-height: 54px;
}

.runic-input--lg .runic-input__field {
  padding: 0.75rem 1.75rem;
  font-size: 1.1875rem;
}

.runic-input--lg.runic-input--has-icon .runic-input__field {
  padding-left: 1rem;
}

.runic-input--lg.runic-input--has-clear .runic-input__field {
  padding-right: 0.5rem;
}

.runic-input--lg .runic-input__icon {
  width: 22px;
  height: 22px;
  margin-left: 1.25rem;
}

.runic-input--lg .runic-input__rune {
  font-size: 0.5625rem;
}

.runic-input--lg .runic-input__clear {
  width: 24px;
  height: 24px;
  margin-right: 1rem;
}

.runic-input--lg .runic-input__clear svg {
  width: 14px;
  height: 14px;
}

/* ==========================================
   RESPONSIVE - Mobile optimizations
   ========================================== */
@media (max-width: 640px) {
  /* Small */
  .runic-input--sm .runic-input__groove {
    min-height: 34px;
  }

  .runic-input--sm .runic-input__field {
    padding: 0.375rem 1rem;
    font-size: 0.9375rem;
  }

  /* Medium */
  .runic-input--md .runic-input__groove {
    min-height: 40px;
  }

  .runic-input--md .runic-input__field {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .runic-input--md .runic-input__icon {
    width: 16px;
    height: 16px;
    margin-left: 0.75rem;
  }

  .runic-input--md.runic-input--has-icon .runic-input__field {
    padding-left: 0.625rem;
  }

  /* Large */
  .runic-input--lg .runic-input__groove {
    min-height: 48px;
  }

  .runic-input--lg .runic-input__field {
    padding: 0.625rem 1.25rem;
    font-size: 1.0625rem;
  }

  /* Hide corner runes on mobile */
  .runic-input__rune {
    display: none;
  }
}
</style>
