<script setup lang="ts">
/**
 * Trigger Card (Row Layout)
 *
 * Configuration row for a single auto-trigger with probability, toggle, and actions.
 * Uses a horizontal layout optimized for list display.
 */

interface Props {
  triggerKey: string
  displayName: string
  emoji: string
  description: string
  enabled: boolean
  probability: number
  isLocked: boolean
  messages: any[]
  positive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  positive: true,
})

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:probability': [value: number]
  'update:locked': [value: boolean]
  test: []
  editMessages: []
}>()

// Format probability as percentage
const probabilityPercent = computed(() => Math.round(props.probability * 100))

// Handle probability change from slider
const handleProbabilityChange = (value: number) => {
  emit('update:probability', value / 100)
}

// Test trigger loading state
const isTesting = ref(false)
const handleTest = () => {
  isTesting.value = true
  emit('test')
  setTimeout(() => {
    isTesting.value = false
  }, 2000)
}
</script>

<template>
  <div
    class="trigger-row"
    :class="{
      'trigger-row--disabled': !enabled,
      'trigger-row--locked': isLocked,
      'trigger-row--positive': positive,
      'trigger-row--negative': !positive,
    }"
  >
    <!-- Left: Toggle + Info -->
    <div class="trigger-row__left">
      <RunicRadio
        :model-value="enabled"
        toggle
        size="sm"
        @update:model-value="emit('update:enabled', $event as boolean)"
      />

      <div class="trigger-row__info">
        <div class="trigger-row__header">
          <span class="trigger-row__emoji">{{ emoji }}</span>
          <h4 class="trigger-row__name">{{ displayName }}</h4>
        </div>
        <p class="trigger-row__description">{{ description }}</p>
      </div>
    </div>

    <!-- Center: Probability -->
    <div class="trigger-row__probability">
      <div class="trigger-row__probability-header">
        <span class="trigger-row__probability-value">{{ probabilityPercent }}%</span>
        <RunicButton
          size="xs"
          variant="ghost"
          icon-only
          :title="isLocked ? 'Déverrouiller' : 'Verrouiller'"
          @click="emit('update:locked', !isLocked)"
        >
          {{ isLocked ? '🔒' : '🔓' }}
        </RunicButton>
      </div>
      <RunicSlider
        :model-value="probabilityPercent"
        :min="0"
        :max="50"
        :step="1"
        :disabled="!enabled || isLocked"
        size="sm"
        @update:model-value="handleProbabilityChange"
      />
    </div>

    <!-- Right: Actions -->
    <div class="trigger-row__actions">
      <RunicButton
        size="xs"
        variant="secondary"
        :disabled="!enabled || isTesting"
        @click="handleTest"
      >
        {{ isTesting ? '...' : 'Tester' }}
      </RunicButton>

      <RunicButton
        size="xs"
        variant="ghost"
        @click="emit('editMessages')"
      >
        Messages
        <span v-if="messages.length > 0" class="trigger-row__badge">{{ messages.length }}</span>
      </RunicButton>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   TRIGGER ROW - Horizontal layout
   ========================================== */

.trigger-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 50%,
    rgba(10, 10, 12, 0.98) 100%
  );
  border-radius: 6px;
  border: 1px solid rgba(40, 38, 35, 0.7);
  border-left-width: 3px;
  transition: all 0.2s ease;
}

.trigger-row:hover {
  background: linear-gradient(
    180deg,
    rgba(18, 18, 20, 0.95) 0%,
    rgba(22, 22, 24, 0.9) 50%,
    rgba(14, 14, 16, 0.98) 100%
  );
  border-color: rgba(60, 55, 50, 0.5);
}

/* Positive/Negative accents */
.trigger-row--positive {
  border-left-color: rgba(80, 180, 100, 0.5);
}

.trigger-row--positive:hover {
  border-left-color: rgba(80, 180, 100, 0.7);
}

.trigger-row--negative {
  border-left-color: rgba(180, 80, 80, 0.5);
}

.trigger-row--negative:hover {
  border-left-color: rgba(180, 80, 80, 0.7);
}

/* Disabled state */
.trigger-row--disabled {
  opacity: 0.5;
}

/* Locked state */
.trigger-row--locked {
  border-color: rgba(201, 162, 39, 0.3);
}

/* ==========================================
   LEFT SECTION: Toggle + Info
   ========================================== */

.trigger-row__left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.trigger-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.trigger-row__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trigger-row__emoji {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.trigger-row__name {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(220, 210, 195, 0.95);
  white-space: nowrap;
}

.trigger-row__description {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.7);
  line-height: 1.4;
}

/* ==========================================
   CENTER SECTION: Probability
   ========================================== */

.trigger-row__probability {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 160px;
  flex-shrink: 0;
}

.trigger-row__probability-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trigger-row__probability-value {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(201, 162, 39, 0.9);
}

/* ==========================================
   RIGHT SECTION: Actions
   ========================================== */

.trigger-row__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.trigger-row__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  background: rgba(175, 96, 37, 0.3);
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(201, 162, 39, 0.9);
  margin-left: 0.25rem;
}

/* ==========================================
   RESPONSIVE
   ========================================== */

@media (max-width: 900px) {
  .trigger-row {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .trigger-row__left {
    flex: 1 1 100%;
  }

  .trigger-row__probability {
    flex: 1;
    min-width: 140px;
  }

  .trigger-row__actions {
    flex: 0 0 auto;
  }
}

@media (max-width: 640px) {
  .trigger-row {
    padding: 0.875rem 1rem;
  }

  .trigger-row__probability {
    width: 100%;
    flex: 1 1 100%;
  }

  .trigger-row__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
