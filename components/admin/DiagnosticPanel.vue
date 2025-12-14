<script setup lang="ts">
import type { DiagnosticLog } from '~/types/diagnostic'
import type { Database } from '~/types/database'

interface Props {
  diagnostics: DiagnosticLog[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  refresh: []
  filtersChanged: [filters: { category: string; actionType: string; validationStatus: string; startDate: string }]
}>()

const { t } = useI18n()

// Filter state
const searchQuery = ref('')
const selectedCategory = ref<string>('')
const selectedActionType = ref<string>('')
const selectedValidationStatus = ref<string>('')
const startDate = ref<string>('') // ISO date string, empty for all dates

// Track if component is mounted to avoid emitting on initial setup
const isMounted = ref(false)

// Watch filters and emit changes to parent (only after mount)
watch([selectedCategory, selectedActionType, selectedValidationStatus, startDate], () => {
  if (isMounted.value) {
    emit('filtersChanged', {
      category: selectedCategory.value,
      actionType: selectedActionType.value,
      validationStatus: selectedValidationStatus.value,
      startDate: startDate.value,
    })
  }
})

onMounted(() => {
  isMounted.value = true
})

// Category options
const categoryOptions = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'altar', label: 'Autel' },
  { value: 'admin', label: 'Admin' },
]

// Action type options (dynamically generated from diagnostics)
const actionTypeOptions = computed(() => {
  const types = new Set<string>()
  props.diagnostics.forEach(d => types.add(d.action_type))
  const options = [{ value: '', label: 'Tous les types' }]
  Array.from(types).sort().forEach(type => {
    options.push({ value: type, label: formatActionType(type) })
  })
  return options
})

// Validation status options
const validationStatusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ok', label: '✓ OK' },
  { value: 'warning', label: '⚠ Avertissement' },
  { value: 'error', label: '❌ Erreur' },
]

// Filtered diagnostics
// Note: Category, actionType, and validationStatus filters are applied server-side via API
// We only filter by search query client-side for instant feedback
const filteredDiagnostics = computed(() => {
  let result = props.diagnostics

  // Only filter by search query client-side (server-side filters are already applied)
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(diag => {
      const usernameMatch = diag.username?.toLowerCase().includes(query) || false
      const actionTypeMatch = diag.action_type.toLowerCase().includes(query)
      const notesMatch = diag.validation_notes?.toLowerCase().includes(query) || false
      return usernameMatch || actionTypeMatch || notesMatch
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

// Format action type for display
const formatActionType = (actionType: string): string => {
  const actionMap: Record<string, string> = {
    vaal_outcome: 'Résultat Vaal',
    load_collection: 'Chargement collection',
    toggle_altar: 'Toggle Autel',
    toggle_activity_logs: 'Toggle Logs Activité',
    switch_data_source: 'Changement Source Données',
  }
  return actionMap[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get validation status color class
const getValidationStatusClass = (status: string | null): string => {
  const statusMap: Record<string, string> = {
    ok: 'validation-ok',
    warning: 'validation-warning',
    error: 'validation-error',
  }
  return statusMap[status || 'ok'] || ''
}

// Get validation status emoji
const getValidationStatusEmoji = (status: string | null): string => {
  const emojiMap: Record<string, string> = {
    ok: '✓',
    warning: '⚠',
    error: '❌',
  }
  return emojiMap[status || 'ok'] || '?'
}

// Expand/collapse state
const expandedDiagnostics = ref<Set<string>>(new Set())

const toggleExpand = (diagId: string) => {
  if (expandedDiagnostics.value.has(diagId)) {
    expandedDiagnostics.value.delete(diagId)
  } else {
    expandedDiagnostics.value.add(diagId)
  }
}

const isExpanded = (diagId: string) => expandedDiagnostics.value.has(diagId)

// Format state for display
const formatState = (state: any): string => {
  try {
    return JSON.stringify(state, null, 2)
  } catch {
    return String(state)
  }
}

// Calculate state diff (simplified)
const getStateDiff = (before: any, after: any): Array<{ key: string; before: any; after: any }> => {
  const diffs: Array<{ key: string; before: any; after: any }> = []
  
  if (!before || !after) return diffs
  
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  
  for (const key of allKeys) {
    const beforeVal = before[key]
    const afterVal = after[key]
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diffs.push({ key, before: beforeVal, after: afterVal })
    }
  }
  
  return diffs
}
</script>

<template>
  <div class="diagnostic-panel">
    <!-- Filters -->
    <div class="diagnostic-panel__filters">
      <RunicInput
        v-model="searchQuery"
        placeholder="Rechercher dans les diagnostics..."
        icon="search"
        size="sm"
        class="diagnostic-panel__search"
      />
      <div class="diagnostic-panel__filter-row">
        <RunicSelect
          v-model="selectedCategory"
          :options="categoryOptions"
          placeholder="Catégorie"
          size="sm"
          class="diagnostic-panel__filter"
        />
        <RunicSelect
          v-model="selectedActionType"
          :options="actionTypeOptions"
          placeholder="Type d'action"
          size="sm"
          class="diagnostic-panel__filter"
        />
        <RunicSelect
          v-model="selectedValidationStatus"
          :options="validationStatusOptions"
          placeholder="Statut"
          size="sm"
          class="diagnostic-panel__filter"
        />
        <RunicDateFilter
          v-model="startDate"
          size="sm"
          class="diagnostic-panel__filter"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="diagnostic-panel__loading">
      <span class="diagnostic-panel__loading-rune">◆</span>
      <span>Chargement...</span>
      <span class="diagnostic-panel__loading-rune">◆</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredDiagnostics.length === 0" class="diagnostic-panel__empty">
      <div class="diagnostic-panel__empty-icon-wrapper">
        <span class="diagnostic-panel__empty-rune diagnostic-panel__empty-rune--left">◆</span>
        <span class="diagnostic-panel__empty-icon">
          {{ searchQuery || selectedCategory || selectedActionType || selectedValidationStatus ? '🔍' : '📊' }}
        </span>
        <span class="diagnostic-panel__empty-rune diagnostic-panel__empty-rune--right">◆</span>
      </div>
      <p class="diagnostic-panel__empty-text">
        {{ searchQuery || selectedCategory || selectedActionType || selectedValidationStatus ? 'Aucun résultat' : 'Aucun diagnostic' }}
      </p>
    </div>

    <!-- Diagnostics list -->
    <div v-else class="diagnostic-panel__list">
      <TransitionGroup name="diagnostic-item" tag="div">
        <RunicBox
          v-for="diag in filteredDiagnostics"
          :key="diag.id"
          padding="sm"
          class="diagnostic-entry"
          :class="{
            'diagnostic-entry--expanded': isExpanded(diag.id),
            [`diagnostic-entry--${diag.validation_status || 'ok'}`]: true,
          }"
        >
          <!-- Header -->
          <div class="diagnostic-entry__header">
            <div class="diagnostic-entry__header-left">
              <span class="diagnostic-entry__category">{{ diag.category.toUpperCase() }}</span>
              <span class="diagnostic-entry__action-type">{{ formatActionType(diag.action_type) }}</span>
              <span class="diagnostic-entry__validation-status" :class="getValidationStatusClass(diag.validation_status)">
                {{ getValidationStatusEmoji(diag.validation_status) }}
              </span>
            </div>
            <div class="diagnostic-entry__header-right">
              <span class="diagnostic-entry__time">{{ formatRelativeTime(diag.created_at) }}</span>
            </div>
          </div>

          <!-- User info -->
          <div v-if="diag.username" class="diagnostic-entry__user">
            <span class="diagnostic-entry__user-label">Utilisateur:</span>
            <span class="diagnostic-entry__user-value">{{ diag.username }}</span>
            <span v-if="diag.user_id" class="diagnostic-entry__user-id">({{ diag.user_id.slice(0, 8) }}...)</span>
          </div>

          <!-- Validation notes -->
          <div v-if="diag.validation_notes" class="diagnostic-entry__validation-notes">
            <span class="diagnostic-entry__validation-label">Validation:</span>
            <span class="diagnostic-entry__validation-text" :class="getValidationStatusClass(diag.validation_status)">
              {{ diag.validation_notes }}
            </span>
          </div>

          <!-- API response time -->
          <div v-if="diag.api_response_time_ms" class="diagnostic-entry__api-time">
            <span class="diagnostic-entry__api-time-label">Temps de réponse API:</span>
            <span class="diagnostic-entry__api-time-value" :class="{ 'diagnostic-entry__api-time-value--slow': diag.api_response_time_ms > 2000 }">
              {{ diag.api_response_time_ms }}ms
            </span>
          </div>

          <!-- Expandable details -->
          <div class="diagnostic-entry__details-toggle" @click="toggleExpand(diag.id)">
            <span class="diagnostic-entry__details-icon">
              {{ isExpanded(diag.id) ? '▼' : '▶' }}
            </span>
            <span>Détails</span>
          </div>

          <div v-if="isExpanded(diag.id)" class="diagnostic-entry__details">
            <!-- State Before/After -->
            <div class="diagnostic-entry__states">
              <div class="diagnostic-entry__state diagnostic-entry__state--before">
                <div class="diagnostic-entry__state-header">État Avant</div>
                <pre class="diagnostic-entry__state-content">{{ formatState(diag.state_before) }}</pre>
              </div>
              <div class="diagnostic-entry__state diagnostic-entry__state--after">
                <div class="diagnostic-entry__state-header">État Après</div>
                <pre class="diagnostic-entry__state-content">{{ formatState(diag.state_after) }}</pre>
              </div>
            </div>

            <!-- State Diff -->
            <div v-if="getStateDiff(diag.state_before, diag.state_after).length > 0" class="diagnostic-entry__diff">
              <div class="diagnostic-entry__diff-header">Changements:</div>
              <div class="diagnostic-entry__diff-list">
                <div
                  v-for="diff in getStateDiff(diag.state_before, diag.state_after)"
                  :key="diff.key"
                  class="diagnostic-entry__diff-item"
                >
                  <span class="diagnostic-entry__diff-key">{{ diff.key }}:</span>
                  <span class="diagnostic-entry__diff-before">{{ JSON.stringify(diff.before) }}</span>
                  <span class="diagnostic-entry__diff-arrow">→</span>
                  <span class="diagnostic-entry__diff-after">{{ JSON.stringify(diff.after) }}</span>
                </div>
              </div>
            </div>

            <!-- Action Details -->
            <div v-if="diag.action_details && Object.keys(diag.action_details).length > 0" class="diagnostic-entry__action-details">
              <div class="diagnostic-entry__action-details-header">Détails de l'action:</div>
              <pre class="diagnostic-entry__action-details-content">{{ formatState(diag.action_details) }}</pre>
            </div>

            <!-- Metadata -->
            <div class="diagnostic-entry__metadata">
              <div class="diagnostic-entry__metadata-item">
                <span class="diagnostic-entry__metadata-label">ID:</span>
                <span class="diagnostic-entry__metadata-value">{{ diag.id }}</span>
              </div>
              <div class="diagnostic-entry__metadata-item">
                <span class="diagnostic-entry__metadata-label">Date:</span>
                <span class="diagnostic-entry__metadata-value">{{ formatDateTime(diag.created_at) }}</span>
              </div>
              <div v-if="diag.data_mode" class="diagnostic-entry__metadata-item">
                <span class="diagnostic-entry__metadata-label">Mode:</span>
                <span class="diagnostic-entry__metadata-value">{{ diag.data_mode }}</span>
              </div>
            </div>
          </div>
        </RunicBox>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.diagnostic-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.diagnostic-panel__filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.diagnostic-panel__filter-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.diagnostic-panel__filter {
  flex: 1;
  min-width: 150px;
}

.diagnostic-panel__loading,
.diagnostic-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.diagnostic-panel__loading-rune {
  font-family: 'Crimson Text', serif;
  color: rgba(140, 130, 120, 0.6);
  margin: 0 0.5rem;
}

.diagnostic-panel__empty-icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.diagnostic-panel__empty-icon {
  font-size: 3rem;
}

.diagnostic-panel__empty-rune {
  font-family: 'Crimson Text', serif;
  color: rgba(140, 130, 120, 0.4);
  font-size: 1.5rem;
}

.diagnostic-panel__empty-text {
  font-family: 'Crimson Text', serif;
  color: rgba(140, 130, 120, 0.8);
  font-size: 1rem;
}

.diagnostic-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.diagnostic-entry {
  transition: all 0.2s ease;
}

.diagnostic-entry__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.diagnostic-entry__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.diagnostic-entry__category {
  font-family: 'Crimson Text', serif;
  font-weight: 600;
  color: rgba(180, 160, 140, 0.9);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diagnostic-entry__action-type {
  font-family: 'Crimson Text', serif;
  color: rgba(140, 130, 120, 0.9);
  font-size: 0.875rem;
}

.diagnostic-entry__validation-status {
  font-size: 1rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: rgba(40, 38, 35, 0.5);
}

.diagnostic-entry__validation-status.validation-ok {
  color: rgba(120, 200, 120, 0.9);
}

.diagnostic-entry__validation-status.validation-warning {
  color: rgba(255, 200, 100, 0.9);
}

.diagnostic-entry__validation-status.validation-error {
  color: rgba(255, 120, 120, 0.9);
}

.diagnostic-entry__header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.diagnostic-entry__time {
  font-family: 'Crimson Text', serif;
  color: rgba(140, 130, 120, 0.6);
  font-size: 0.75rem;
}

.diagnostic-entry__user,
.diagnostic-entry__validation-notes,
.diagnostic-entry__api-time {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(140, 130, 120, 0.8);
  margin-top: 0.5rem;
}

.diagnostic-entry__user-label,
.diagnostic-entry__validation-label,
.diagnostic-entry__api-time-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.diagnostic-entry__user-value {
  color: rgba(180, 160, 140, 0.9);
}

.diagnostic-entry__user-id {
  color: rgba(140, 130, 120, 0.5);
  margin-left: 0.25rem;
}

.diagnostic-entry__validation-text {
  font-style: italic;
}

.diagnostic-entry__api-time-value {
  color: rgba(180, 160, 140, 0.9);
}

.diagnostic-entry__api-time-value--slow {
  color: rgba(255, 200, 100, 0.9);
}

.diagnostic-entry__details-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(40, 38, 35, 0.5);
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(140, 130, 120, 0.7);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.diagnostic-entry__details-toggle:hover {
  color: rgba(180, 160, 140, 0.9);
}

.diagnostic-entry__details-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.diagnostic-entry__details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(40, 38, 35, 0.3);
}

.diagnostic-entry__states {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.diagnostic-entry__state {
  background: rgba(10, 10, 12, 0.5);
  border: 1px solid rgba(40, 38, 35, 0.5);
  border-radius: 4px;
  padding: 0.75rem;
}

.diagnostic-entry__state-header {
  font-family: 'Crimson Text', serif;
  font-weight: 600;
  color: rgba(180, 160, 140, 0.9);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.diagnostic-entry__state-content {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.8);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.diagnostic-entry__diff {
  margin-bottom: 1rem;
}

.diagnostic-entry__diff-header {
  font-family: 'Crimson Text', serif;
  font-weight: 600;
  color: rgba(180, 160, 140, 0.9);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.diagnostic-entry__diff-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diagnostic-entry__diff-item {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.8);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(10, 10, 12, 0.3);
  border-radius: 4px;
}

.diagnostic-entry__diff-key {
  font-weight: 600;
  color: rgba(180, 160, 140, 0.9);
}

.diagnostic-entry__diff-before {
  color: rgba(255, 120, 120, 0.8);
}

.diagnostic-entry__diff-arrow {
  color: rgba(140, 130, 120, 0.5);
}

.diagnostic-entry__diff-after {
  color: rgba(120, 200, 120, 0.8);
}

.diagnostic-entry__action-details {
  margin-bottom: 1rem;
}

.diagnostic-entry__action-details-header {
  font-family: 'Crimson Text', serif;
  font-weight: 600;
  color: rgba(180, 160, 140, 0.9);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.diagnostic-entry__action-details-content {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.8);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  padding: 0.75rem;
  background: rgba(10, 10, 12, 0.3);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.diagnostic-entry__metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(40, 38, 35, 0.3);
}

.diagnostic-entry__metadata-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
}

.diagnostic-entry__metadata-label {
  color: rgba(140, 130, 120, 0.6);
  font-weight: 600;
}

.diagnostic-entry__metadata-value {
  color: rgba(140, 130, 120, 0.8);
}

/* Transitions */
.diagnostic-item-enter-active,
.diagnostic-item-leave-active {
  transition: all 0.3s ease;
}

.diagnostic-item-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.diagnostic-item-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .diagnostic-entry__states {
    grid-template-columns: 1fr;
  }
}
</style>
