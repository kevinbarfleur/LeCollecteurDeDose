<script setup lang="ts">
/**
 * System Tab Container
 *
 * Main container for the system configuration with vertical tab navigation.
 * Uses the FormContainer system for consistent layout.
 * Contains: System controls, Data management, Diagnostics
 */

// Explicit imports for child components (Nuxt auto-import can be slow on first load)
import SystemView from './system/SystemView.vue'
import DataView from './data/DataView.vue'
import DiagnosticsView from './diagnostics/DiagnosticsView.vue'

// Props from parent (all state and handlers)
interface Props {
  // Active tab from URL
  activeTab?: 'system' | 'data' | 'diagnostics'
  // System controls
  altarOpen: boolean
  activityLogsEnabled: boolean
  isMaintenanceMode: boolean
  isLoading: boolean
  isTogglingAltar: boolean
  isTogglingActivityLogs: boolean
  isTogglingMaintenance: boolean
  isMaintenanceLoading: boolean
  // Data management
  dataSourceModel: 'supabase' | 'mock'
  dataSourceOptions: { value: string; label: string }[]
  isMockData: boolean
  debugVaalOrbs: number
  isUpdatingVaalOrbs: boolean
  isCreatingBackup: boolean
  isLoadingBackups: boolean
  backupsList: any[]
  selectedBackupId: string
  restoreMode: 'strict' | 'permissive'
  isRestoringBackup: boolean
  restoreBackupMessage: { type: 'success' | 'error'; text: string } | null
  isSyncingTestData: boolean
  // Diagnostics
  forcedOutcome: string
  forcedOutcomeOptions: { value: string; label: string }[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:activeTab': [value: 'system' | 'data' | 'diagnostics']
  'update:altarOpen': [value: boolean]
  'update:activityLogsEnabled': [value: boolean]
  'toggleMaintenance': []
  'update:dataSourceModel': [value: 'supabase' | 'mock']
  'update:debugVaalOrbs': [delta: number]
  'createBackup': []
  'update:selectedBackupId': [value: string]
  'update:restoreMode': [value: 'strict' | 'permissive']
  'restoreBackup': []
  'syncTestData': []
  'update:forcedOutcome': [value: string]
}>()

// Tab configuration
const tabs = [
  { key: 'system', label: 'Systeme', icon: '🔧' },
  { key: 'data', label: 'Donnees', icon: '💾' },
  { key: 'diagnostics', label: 'Diagnostics', icon: '🔍' },
]

// Current active tab - use prop if provided, otherwise default
const currentTab = computed(() => props.activeTab || 'system')

// Handle tab change - emit to parent for URL navigation
const handleTabChange = (tab: string) => {
  emit('update:activeTab', tab as 'system' | 'data' | 'diagnostics')
}

// Format backup display name
const formatBackupName = (backup: { backup_date: string; backup_time: string; created_at: string; user_collection?: any; uniques?: any }) => {
  const date = new Date(backup.created_at)
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const usersCount = backup.user_collection ? Object.keys(backup.user_collection).length : 0
  const uniquesArray = Array.isArray(backup.uniques) ? backup.uniques : []
  const cardsCount = uniquesArray.length
  return `${dateStr} ${timeStr} (${usersCount} utilisateurs, ${cardsCount} cartes)`
}
</script>

<template>
  <div class="system-tab-container">
    <FormContainer
      :model-value="currentTab"
      :tabs="tabs"
      @update:model-value="handleTabChange"
    >
      <!-- System Controls -->
      <SystemView
        v-if="currentTab === 'system'"
        :altar-open="altarOpen"
        :activity-logs-enabled="activityLogsEnabled"
        :is-maintenance-mode="isMaintenanceMode"
        :is-loading="isLoading"
        :is-toggling-altar="isTogglingAltar"
        :is-toggling-activity-logs="isTogglingActivityLogs"
        :is-toggling-maintenance="isTogglingMaintenance"
        :is-maintenance-loading="isMaintenanceLoading"
        @update:altar-open="emit('update:altarOpen', $event)"
        @update:activity-logs-enabled="emit('update:activityLogsEnabled', $event)"
        @toggle-maintenance="emit('toggleMaintenance')"
      />

      <!-- Data Management -->
      <DataView
        v-if="currentTab === 'data'"
        :data-source-model="dataSourceModel"
        :data-source-options="dataSourceOptions"
        :is-mock-data="isMockData"
        :debug-vaal-orbs="debugVaalOrbs"
        :is-updating-vaal-orbs="isUpdatingVaalOrbs"
        :is-creating-backup="isCreatingBackup"
        :is-loading-backups="isLoadingBackups"
        :backups-list="backupsList"
        :selected-backup-id="selectedBackupId"
        :restore-mode="restoreMode"
        :is-restoring-backup="isRestoringBackup"
        :restore-backup-message="restoreBackupMessage"
        :is-syncing-test-data="isSyncingTestData"
        :format-backup-name="formatBackupName"
        @update:data-source-model="emit('update:dataSourceModel', $event)"
        @update:debug-vaal-orbs="emit('update:debugVaalOrbs', $event)"
        @create-backup="emit('createBackup')"
        @update:selected-backup-id="emit('update:selectedBackupId', $event)"
        @update:restore-mode="emit('update:restoreMode', $event)"
        @restore-backup="emit('restoreBackup')"
        @sync-test-data="emit('syncTestData')"
      />

      <!-- Diagnostics -->
      <DiagnosticsView
        v-if="currentTab === 'diagnostics'"
        :forced-outcome="forcedOutcome"
        :forced-outcome-options="forcedOutcomeOptions"
        @update:forced-outcome="emit('update:forcedOutcome', $event)"
      />
    </FormContainer>
  </div>
</template>

<style scoped>
.system-tab-container {
  display: flex;
  flex-direction: column;
}
</style>
