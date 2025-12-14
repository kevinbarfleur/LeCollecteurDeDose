<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isSyncing?: boolean
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  isSyncing: false,
  isLoading: false,
  hasError: false,
  errorMessage: undefined,
})

const status = computed(() => {
  if (props.hasError) {
    return 'error'
  }
  if (props.isSyncing || props.isLoading) {
    return 'syncing'
  }
  return 'synced'
})

const statusText = computed(() => {
  switch (status.value) {
    case 'error':
      return 'Erreur'
    case 'syncing':
      return 'Synchronisation...'
    case 'synced':
      return 'Synchronisé'
    default:
      return ''
  }
})

const statusIcon = computed(() => {
  switch (status.value) {
    case 'error':
      return '⚠'
    case 'syncing':
      return '⟳'
    case 'synced':
      return '✓'
    default:
      return ''
  }
})
</script>

<template>
  <div 
    class="sync-status-banner"
    :class="`sync-status-banner--${status}`"
    :title="errorMessage || statusText"
  >
    <span 
      class="sync-status-banner__icon"
      :class="{ 'sync-status-banner__icon--spinning': status === 'syncing' }"
    >
      {{ statusIcon }}
    </span>
    <span class="sync-status-banner__text">{{ statusText }}</span>
  </div>
</template>

<style scoped>
.sync-status-banner {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-family: "Crimson Text", serif;
  font-size: 0.75rem;
  font-style: italic;
  border-radius: 4px;
  background: rgba(12, 12, 15, 0.9);
  border: 1px solid rgba(60, 55, 50, 0.4);
  backdrop-filter: blur(4px);
  z-index: 10;
  pointer-events: none;
  transition: all 0.2s ease;
}

.sync-status-banner--synced {
  color: rgba(180, 170, 160, 0.7);
  opacity: 0.6;
}

.sync-status-banner--syncing {
  color: rgba(201, 162, 39, 0.9);
  opacity: 1;
  border-color: rgba(201, 162, 39, 0.3);
}

.sync-status-banner--error {
  color: rgba(248, 113, 113, 0.9);
  opacity: 1;
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(12, 12, 15, 0.95);
}

.sync-status-banner__icon {
  display: inline-block;
  font-size: 0.875rem;
  line-height: 1;
}

.sync-status-banner__icon--spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sync-status-banner__text {
  white-space: nowrap;
}
</style>

