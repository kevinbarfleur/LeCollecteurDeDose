<script setup lang="ts">
/**
 * Event Preset Card
 *
 * Card for a single batch event preset with launch and edit capabilities.
 * Uses Runic design system for consistent styling.
 */

interface Props {
  preset: {
    id: string
    display_name: string
    emoji: string
    description: string
    announcement: string
    completion_message: string
    delay_between_events_ms: number
    is_enabled: boolean
    category: string
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  launch: [id: string]
  edit: [id: string]
  toggle: [id: string, enabled: boolean]
}>()

const isLaunching = ref(false)

const handleLaunch = async () => {
  isLaunching.value = true
  emit('launch', props.preset.id)
  // Reset after animation
  setTimeout(() => {
    isLaunching.value = false
  }, 3000)
}

// Format delay for display
const delayDisplay = computed(() => {
  const seconds = props.preset.delay_between_events_ms / 1000
  return `${seconds}s`
})
</script>

<template>
  <div
    class="event-card"
    :class="{
      'event-card--disabled': !preset.is_enabled,
      'event-card--launching': isLaunching,
    }"
  >
    <!-- Corner decorations -->
    <div class="event-card__corner event-card__corner--tl"></div>
    <div class="event-card__corner event-card__corner--tr"></div>
    <div class="event-card__corner event-card__corner--bl"></div>
    <div class="event-card__corner event-card__corner--br"></div>

    <!-- Header -->
    <div class="event-card__header">
      <div class="event-card__title">
        <span class="event-card__emoji">{{ preset.emoji }}</span>
        <h4 class="event-card__name">{{ preset.display_name }}</h4>
      </div>
      <RunicRadio
        :model-value="preset.is_enabled"
        toggle
        size="sm"
        @update:model-value="(v: string | boolean) => emit('toggle', preset.id, typeof v === 'boolean' ? v : v === 'on')"
      />
    </div>

    <!-- Description -->
    <p class="event-card__description">{{ preset.description }}</p>

    <!-- Info badges -->
    <div class="event-card__info">
      <span class="event-card__badge">
        ⏱️ Délai: {{ delayDisplay }}
      </span>
    </div>

    <!-- Divider -->
    <div class="event-card__divider"></div>

    <!-- Actions -->
    <div class="event-card__actions">
      <RunicButton
        size="sm"
        variant="primary"
        :disabled="!preset.is_enabled || isLaunching"
        @click="handleLaunch"
      >
        <template v-if="isLaunching">
          <span class="event-card__launching-icon">🚀</span>
          Lancement...
        </template>
        <template v-else>
          ▶ Lancer l'événement
        </template>
      </RunicButton>

      <RunicButton
        size="sm"
        variant="ghost"
        @click="emit('edit', preset.id)"
      >
        ✏️ Modifier
      </RunicButton>
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   EVENT PRESET CARD - Runic styled card
   ========================================== */

.event-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.25rem;
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );
  border-radius: 8px;
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.25);
  border: 1px solid rgba(40, 38, 35, 0.7);
  border-top-color: rgba(30, 28, 25, 0.8);
  border-bottom-color: rgba(60, 55, 50, 0.3);
  transition: all 0.3s ease;
}

/* Radial gradient overlay */
.event-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(60, 55, 50, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(40, 35, 30, 0.04) 0%, transparent 40%);
  pointer-events: none;
  border-radius: 7px;
}

.event-card:hover {
  border-color: rgba(60, 55, 50, 0.5);
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(50, 45, 40, 0.25);
}

/* Disabled state */
.event-card--disabled {
  opacity: 0.5;
}

.event-card--disabled::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  pointer-events: none;
}

/* Launching state */
.event-card--launching {
  border-color: rgba(80, 180, 100, 0.5);
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(80, 180, 100, 0.2),
    0 1px 0 rgba(50, 45, 40, 0.25);
}

/* ==========================================
   CORNER DECORATIONS
   ========================================== */

.event-card__corner {
  position: absolute;
  width: 16px;
  height: 16px;
  pointer-events: none;
  z-index: 2;
}

.event-card__corner::before,
.event-card__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(80, 70, 55, 0.15),
    rgba(80, 70, 55, 0.35),
    rgba(80, 70, 55, 0.15)
  );
}

.event-card__corner--tl { top: 6px; left: 6px; }
.event-card__corner--tr { top: 6px; right: 6px; transform: rotate(90deg); }
.event-card__corner--bl { bottom: 6px; left: 6px; transform: rotate(-90deg); }
.event-card__corner--br { bottom: 6px; right: 6px; transform: rotate(180deg); }

.event-card__corner::before { width: 16px; height: 1px; top: 0; left: 0; }
.event-card__corner::after { width: 1px; height: 16px; top: 0; left: 0; }

/* ==========================================
   HEADER
   ========================================== */

.event-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.event-card__title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.event-card__emoji {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.event-card__name {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(220, 210, 195, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==========================================
   DESCRIPTION
   ========================================== */

.event-card__description {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(180, 170, 155, 0.75);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

/* ==========================================
   INFO BADGES
   ========================================== */

.event-card__info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(40, 38, 35, 0.4);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(150, 140, 125, 0.8);
}

/* ==========================================
   DIVIDER
   ========================================== */

.event-card__divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(80, 70, 55, 0.4),
    transparent
  );
  margin: 0.25rem 0;
}

/* ==========================================
   ACTIONS
   ========================================== */

.event-card__actions {
  display: flex;
  gap: 0.625rem;
  margin-top: 0.25rem;
}

.event-card__actions :deep(.runic-button) {
  flex: 1;
}

.event-card__actions :deep(.runic-button:first-child) {
  flex: 2;
}

.event-card__launching-icon {
  display: inline-block;
  animation: rocket 0.5s ease infinite alternate;
}

@keyframes rocket {
  0% { transform: translateY(0); }
  100% { transform: translateY(-2px); }
}

/* ==========================================
   RESPONSIVE
   ========================================== */

@media (max-width: 640px) {
  .event-card {
    padding: 1rem;
    gap: 0.75rem;
  }

  .event-card__emoji {
    font-size: 1.25rem;
  }

  .event-card__name {
    font-size: 0.875rem;
  }

  .event-card__actions {
    flex-direction: column;
  }

  .event-card__actions :deep(.runic-button:first-child) {
    flex: 1;
  }
}
</style>
