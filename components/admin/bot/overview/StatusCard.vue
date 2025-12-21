<script setup lang="ts">
/**
 * Status Card
 *
 * A dashboard card showing quick status and action for a bot feature.
 */

interface Props {
  title: string
  icon?: string
  value: string
  description?: string
  status?: 'enabled' | 'disabled' | 'warning' | 'neutral'
  actionLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  status: 'neutral',
})

const emit = defineEmits<{
  action: []
}>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'enabled':
      return 'status-card--enabled'
    case 'disabled':
      return 'status-card--disabled'
    case 'warning':
      return 'status-card--warning'
    default:
      return 'status-card--neutral'
  }
})
</script>

<template>
  <div class="status-card" :class="statusClass">
    <div class="status-card__header">
      <span v-if="icon" class="status-card__icon">{{ icon }}</span>
      <span class="status-card__title">{{ title }}</span>
    </div>

    <div class="status-card__value">{{ value }}</div>

    <div v-if="description" class="status-card__description">
      {{ description }}
    </div>

    <div v-if="actionLabel" class="status-card__action">
      <RunicButton size="sm" @click="emit('action')">
        {{ actionLabel }}
      </RunicButton>
    </div>
  </div>
</template>

<style scoped>
.status-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(
    180deg,
    rgba(18, 17, 15, 0.95) 0%,
    rgba(14, 13, 11, 0.98) 100%
  );
  border-radius: 6px;
  border: 1px solid rgba(60, 55, 45, 0.3);
  box-shadow:
    inset 0 1px 0 rgba(80, 70, 60, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.status-card:hover {
  border-color: rgba(80, 72, 58, 0.4);
}

.status-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-card__icon {
  font-size: 1.25rem;
}

.status-card__title {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(180, 170, 155, 0.8);
}

.status-card__value {
  font-family: 'Cinzel', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #c9a227;
}

.status-card__description {
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.7);
  line-height: 1.4;
}

.status-card__action {
  margin-top: auto;
  padding-top: 0.5rem;
}

/* Status variants */
.status-card--enabled {
  border-color: rgba(80, 180, 100, 0.3);
}

.status-card--enabled .status-card__value {
  color: #55cc70;
}

.status-card--disabled {
  border-color: rgba(150, 80, 80, 0.3);
}

.status-card--disabled .status-card__value {
  color: #cc5555;
}

.status-card--warning {
  border-color: rgba(200, 160, 60, 0.3);
}

.status-card--warning .status-card__value {
  color: #dda030;
}

.status-card--neutral .status-card__value {
  color: #c97a3a;
}
</style>
