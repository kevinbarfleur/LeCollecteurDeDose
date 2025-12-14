<script setup lang="ts">
import type { ErrorLog } from '~/types/errorLog'
import type { Database } from '~/types/database'

interface Props {
  logs: ErrorLog[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  markResolved: [id: string]
  refresh: []
}>()

// Filter state
const searchQuery = ref('')
const selectedLevel = ref<string>('')
const selectedSource = ref<string>('')
const showResolved = ref(false)

// Level options
const levelOptions = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'error', label: 'Erreurs' },
  { value: 'warn', label: 'Avertissements' },
  { value: 'info', label: 'Infos' },
]

// Source options
const sourceOptions = [
  { value: '', label: 'Toutes les sources' },
  { value: 'client', label: 'Client' },
  { value: 'server', label: 'Serveur' },
]

// Filtered logs
const filteredLogs = computed(() => {
  let result = props.logs

  // Filter by resolved status
  if (!showResolved.value) {
    result = result.filter(log => !log.resolved)
  }

  // Filter by level
  if (selectedLevel.value) {
    result = result.filter(log => log.level === selectedLevel.value)
  }

  // Filter by source
  if (selectedSource.value) {
    result = result.filter(log => log.source === selectedSource.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(log => {
      const messageMatch = log.message.toLowerCase().includes(query)
      const usernameMatch = log.username?.toLowerCase().includes(query) || false
      const endpointMatch = log.endpoint?.toLowerCase().includes(query) || false
      const contextMatch = JSON.stringify(log.context).toLowerCase().includes(query)
      return messageMatch || usernameMatch || endpointMatch || contextMatch
    })
  }

  return result
})

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Format date/time
const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get level color class
const getLevelClass = (level: string): string => {
  const levelMap: Record<string, string> = {
    error: 'level-error',
    warn: 'level-warn',
    info: 'level-info',
  }
  return levelMap[level] || ''
}

// Get level emoji
const getLevelEmoji = (level: string): string => {
  const emojiMap: Record<string, string> = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
  }
  return emojiMap[level] || '❓'
}

// Expand/collapse state
const expandedLogs = ref<Set<string>>(new Set())

const toggleExpand = (logId: string) => {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId)
  } else {
    expandedLogs.value.add(logId)
  }
}

const isExpanded = (logId: string) => expandedLogs.value.has(logId)

// Handle mark as resolved
const handleMarkResolved = async (logId: string) => {
  emit('markResolved', logId)
}

// Format context for display
const formatContext = (context: Record<string, unknown>): string => {
  try {
    return JSON.stringify(context, null, 2)
  } catch {
    return String(context)
  }
}
</script>

<template>
  <div class="error-logs-panel">
    <!-- Filters -->
    <div class="error-logs-panel__filters">
      <RunicInput
        v-model="searchQuery"
        placeholder="Rechercher dans les logs..."
        icon="search"
        size="sm"
        class="error-logs-panel__search"
      />
      <div class="error-logs-panel__filter-row">
        <RunicSelect
          v-model="selectedLevel"
          :options="levelOptions"
          placeholder="Niveau"
          size="sm"
          class="error-logs-panel__filter"
        />
        <RunicSelect
          v-model="selectedSource"
          :options="sourceOptions"
          placeholder="Source"
          size="sm"
          class="error-logs-panel__filter"
        />
        <label class="error-logs-panel__checkbox-label">
          <input
            v-model="showResolved"
            type="checkbox"
            class="error-logs-panel__checkbox"
          />
          <span>Afficher les résolus</span>
        </label>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="error-logs-panel__loading">
      <span class="error-logs-panel__loading-rune">◆</span>
      <span>Chargement...</span>
      <span class="error-logs-panel__loading-rune">◆</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredLogs.length === 0" class="error-logs-panel__empty">
      <div class="error-logs-panel__empty-icon-wrapper">
        <span class="error-logs-panel__empty-rune error-logs-panel__empty-rune--left">◆</span>
        <span class="error-logs-panel__empty-icon">
          {{ searchQuery || selectedLevel || selectedSource ? '🔍' : '✅' }}
        </span>
        <span class="error-logs-panel__empty-rune error-logs-panel__empty-rune--right">◆</span>
      </div>
      <p class="error-logs-panel__empty-text">
        {{ searchQuery || selectedLevel || selectedSource ? 'Aucun résultat' : 'Aucune erreur' }}
      </p>
    </div>

    <!-- Logs list -->
    <div v-else class="error-logs-panel__list">
      <TransitionGroup name="log-item" tag="div">
        <RunicBox
          v-for="log in filteredLogs"
          :key="log.id"
          padding="sm"
          class="error-log-entry"
          :class="{
            'error-log-entry--resolved': log.resolved,
            'error-log-entry--expanded': isExpanded(log.id),
          }"
        >
          <!-- Header -->
          <div class="error-log-entry__header">
            <div class="error-log-entry__header-left">
              <span class="error-log-entry__level" :class="getLevelClass(log.level)">
                {{ getLevelEmoji(log.level) }} {{ log.level.toUpperCase() }}
              </span>
              <span class="error-log-entry__source">{{ log.source }}</span>
              <span v-if="log.endpoint" class="error-log-entry__endpoint">{{ log.endpoint }}</span>
              <span v-if="log.status_code" class="error-log-entry__status">{{ log.status_code }}</span>
            </div>
            <div class="error-log-entry__header-right">
              <span class="error-log-entry__time">{{ formatRelativeTime(log.created_at) }}</span>
              <button
                v-if="!log.resolved"
                @click="handleMarkResolved(log.id)"
                class="error-log-entry__resolve-btn"
                title="Marquer comme résolu"
              >
                ✓
              </button>
            </div>
          </div>

          <!-- Message -->
          <div class="error-log-entry__message">
            {{ log.message }}
          </div>

          <!-- User info -->
          <div v-if="log.username" class="error-log-entry__user">
            <span class="error-log-entry__user-label">Utilisateur:</span>
            <span class="error-log-entry__user-value">{{ log.username }}</span>
            <span v-if="log.user_id" class="error-log-entry__user-id">({{ log.user_id.slice(0, 8) }}...)</span>
          </div>

          <!-- Expandable details -->
          <div class="error-log-entry__details-toggle" @click="toggleExpand(log.id)">
            <span class="error-log-entry__details-icon">
              {{ isExpanded(log.id) ? '▼' : '▶' }}
            </span>
            <span>Détails</span>
          </div>

          <div v-if="isExpanded(log.id)" class="error-log-entry__details">
            <!-- Stack trace -->
            <div v-if="log.stack" class="error-log-entry__stack">
              <div class="error-log-entry__stack-header">Stack Trace:</div>
              <pre class="error-log-entry__stack-content">{{ log.stack }}</pre>
            </div>

            <!-- Context -->
            <div v-if="log.context && Object.keys(log.context).length > 0" class="error-log-entry__context">
              <div class="error-log-entry__context-header">Contexte:</div>
              <pre class="error-log-entry__context-content">{{ formatContext(log.context as Record<string, unknown>) }}</pre>
            </div>

            <!-- Metadata -->
            <div class="error-log-entry__metadata">
              <div class="error-log-entry__metadata-item">
                <span class="error-log-entry__metadata-label">ID:</span>
                <span class="error-log-entry__metadata-value">{{ log.id }}</span>
              </div>
              <div class="error-log-entry__metadata-item">
                <span class="error-log-entry__metadata-label">Date:</span>
                <span class="error-log-entry__metadata-value">{{ formatDateTime(log.created_at) }}</span>
              </div>
              <div v-if="log.resolved && log.resolved_at" class="error-log-entry__metadata-item">
                <span class="error-log-entry__metadata-label">Résolu le:</span>
                <span class="error-log-entry__metadata-value">{{ formatDateTime(log.resolved_at) }}</span>
              </div>
              <div v-if="log.resolved_by" class="error-log-entry__metadata-item">
                <span class="error-log-entry__metadata-label">Résolu par:</span>
                <span class="error-log-entry__metadata-value">{{ log.resolved_by.slice(0, 8) }}...</span>
              </div>
            </div>
          </div>
        </RunicBox>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.error-logs-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.error-logs-panel__filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.error-logs-panel__filter-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.error-logs-panel__filter {
  flex: 1;
  min-width: 150px;
}

.error-logs-panel__checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(140, 130, 120, 0.8);
  cursor: pointer;
}

.error-logs-panel__checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.error-logs-panel__loading,
.error-logs-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.error-logs-panel__loading {
  gap: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 1rem;
  color: rgba(140, 130, 120, 0.7);
}

.error-logs-panel__loading-rune {
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
}

.error-logs-panel__empty-icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.error-logs-panel__empty-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.error-logs-panel__empty-rune {
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
}

.error-logs-panel__empty-text {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.6);
}

.error-logs-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
}

/* Error Log Entry */
.error-log-entry {
  transition: opacity 0.3s ease;
}

.error-log-entry--resolved {
  opacity: 0.6;
}

.error-log-entry__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.error-log-entry__header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.error-log-entry__header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-log-entry__level {
  font-family: 'Cinzel', serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
}

.error-log-entry__level.level-error {
  background: rgba(140, 50, 50, 0.2);
  color: #c45050;
  border: 1px solid rgba(180, 70, 70, 0.3);
}

.error-log-entry__level.level-warn {
  background: rgba(140, 120, 50, 0.2);
  color: #c4a050;
  border: 1px solid rgba(180, 150, 70, 0.3);
}

.error-log-entry__level.level-info {
  background: rgba(50, 100, 140, 0.2);
  color: #5090c4;
  border: 1px solid rgba(70, 130, 180, 0.3);
}

.error-log-entry__source,
.error-log-entry__endpoint,
.error-log-entry__status {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.7);
  padding: 0.125rem 0.375rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.error-log-entry__time {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.6);
}

.error-log-entry__resolve-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 159, 90, 0.2);
  border: 1px solid rgba(74, 159, 90, 0.3);
  border-radius: 3px;
  color: #4a9f5a;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.error-log-entry__resolve-btn:hover {
  background: rgba(74, 159, 90, 0.3);
  border-color: rgba(74, 159, 90, 0.5);
}

.error-log-entry__message {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(200, 195, 190, 0.95);
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.error-log-entry__user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.7);
}

.error-log-entry__user-label {
  font-weight: 600;
}

.error-log-entry__user-value {
  color: rgba(175, 96, 37, 0.8);
}

.error-log-entry__user-id {
  color: rgba(100, 95, 90, 0.6);
  font-size: 0.6875rem;
}

.error-log-entry__details-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.7);
  transition: color 0.2s ease;
  user-select: none;
}

.error-log-entry__details-toggle:hover {
  color: rgba(175, 96, 37, 0.9);
}

.error-log-entry__details-icon {
  font-size: 0.625rem;
}

.error-log-entry__details {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(50, 48, 45, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-log-entry__stack,
.error-log-entry__context {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-log-entry__stack-header,
.error-log-entry__context-header {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(175, 96, 37, 0.8);
}

.error-log-entry__stack-content,
.error-log-entry__context-content {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: rgba(200, 195, 190, 0.9);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.error-log-entry__metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-log-entry__metadata-item {
  display: flex;
  gap: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
}

.error-log-entry__metadata-label {
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
}

.error-log-entry__metadata-value {
  color: rgba(200, 195, 190, 0.9);
  font-family: 'Courier New', monospace;
}

/* Transitions */
.log-item-enter-active,
.log-item-leave-active {
  transition: all 0.3s ease;
}

.log-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.log-item-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
