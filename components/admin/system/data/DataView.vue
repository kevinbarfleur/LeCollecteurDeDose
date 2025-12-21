<script setup lang="ts">
/**
 * Data View
 *
 * Data management view using the form system.
 * Contains: Data source selection, Backups management, Test data sync
 */

const { t } = useI18n()

interface Props {
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
  formatBackupName: (backup: any) => string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:dataSourceModel': [value: 'supabase' | 'mock']
  'update:debugVaalOrbs': [delta: number]
  'createBackup': []
  'update:selectedBackupId': [value: string]
  'update:restoreMode': [value: 'strict' | 'permissive']
  'restoreBackup': []
  'syncTestData': []
}>()

// Computed for backup options
const backupOptions = computed(() =>
  props.backupsList.map((b) => ({
    value: b.id,
    label: props.formatBackupName(b),
  }))
)

// Computed for restore mode options
const restoreModeOptions = computed(() => [
  { value: 'permissive', label: t('admin.dataSource.restoreMode.permissive.label') },
  { value: 'strict', label: t('admin.dataSource.restoreMode.strict.label') },
])
</script>

<template>
  <div class="data-view">
    <!-- Data Source Section -->
    <FormSection
      title="Source des Donnees"
      subtitle="Basculer entre les donnees de production et les donnees de test"
    >
      <FormRow
        label="Source des Donnees"
        description="Selectionnez la source de donnees a utiliser"
      >
        <RunicSelect
          :model-value="dataSourceModel"
          :options="dataSourceOptions"
          size="sm"
          @update:model-value="emit('update:dataSourceModel', $event as 'supabase' | 'mock')"
        />
      </FormRow>

      <!-- Vaal Orbs Debug (Mock mode only) -->
      <FormRow
        v-if="isMockData"
        label="Vaal Orbs (Debug)"
        description="Nombre de Vaal Orbs pour les tests"
      >
        <div class="data-view__vaal-control">
          <button
            class="data-view__vaal-btn"
            :disabled="debugVaalOrbs <= 0 || isUpdatingVaalOrbs"
            @click="emit('update:debugVaalOrbs', -1)"
          >
            -
          </button>
          <span class="data-view__vaal-value">{{ debugVaalOrbs }}</span>
          <button
            class="data-view__vaal-btn"
            :disabled="debugVaalOrbs >= 99 || isUpdatingVaalOrbs"
            @click="emit('update:debugVaalOrbs', 1)"
          >
            +
          </button>
        </div>
      </FormRow>
    </FormSection>

    <!-- Backups Section -->
    <FormSection
      title="Gestion des Backups"
      subtitle="Creer et restaurer des sauvegardes de donnees"
    >
      <!-- Create Backup -->
      <FormRowAction
        label="Creer un Backup"
        description="Sauvegarde complete de toutes les donnees"
      >
        <RunicButton
          size="sm"
          variant="primary"
          :disabled="isCreatingBackup"
          @click="emit('createBackup')"
        >
          <span v-if="isCreatingBackup" class="data-view__loading">
            <span class="data-view__spinner"></span>
            {{ t("admin.dataSource.backingUp") }}
          </span>
          <span v-else>
            {{ t("admin.dataSource.backupButton") }}
          </span>
        </RunicButton>
      </FormRowAction>

      <!-- Restore Backup -->
      <div class="data-view__restore-section">
        <FormRow
          label="Restaurer un Backup"
          description="Remplace toutes les donnees actuelles"
        >
          <template v-if="isLoadingBackups">
            <div class="data-view__loading">
              <span class="data-view__spinner"></span>
              Chargement...
            </div>
          </template>
          <template v-else-if="backupsList.length === 0">
            <span class="data-view__empty">Aucun backup disponible</span>
          </template>
          <RunicSelect
            v-else
            :model-value="selectedBackupId"
            :options="backupOptions"
            size="sm"
            placeholder="Selectionner un backup"
            :disabled="isRestoringBackup"
            @update:model-value="emit('update:selectedBackupId', $event as string)"
          />
        </FormRow>

        <!-- Restore Mode (shown when backup selected) -->
        <FormRow
          v-if="selectedBackupId"
          label="Mode de restauration"
          :description="restoreMode === 'strict'
            ? t('admin.dataSource.restoreMode.strict.description')
            : t('admin.dataSource.restoreMode.permissive.description')"
        >
          <RunicSelect
            :model-value="restoreMode"
            :options="restoreModeOptions"
            size="sm"
            :disabled="isRestoringBackup"
            @update:model-value="emit('update:restoreMode', $event as 'strict' | 'permissive')"
          />
        </FormRow>

        <!-- Restore Button -->
        <FormRowAction
          v-if="selectedBackupId"
          label=""
          description=""
        >
          <RunicButton
            size="sm"
            variant="danger"
            :disabled="!selectedBackupId || isRestoringBackup"
            @click="emit('restoreBackup')"
          >
            <span v-if="!isRestoringBackup">Restaurer</span>
            <span v-else class="data-view__loading">
              <span class="data-view__spinner"></span>
              Restauration...
            </span>
          </RunicButton>
        </FormRowAction>

        <!-- Restore Message -->
        <div
          v-if="restoreBackupMessage"
          class="data-view__message"
          :class="{
            'data-view__message--success': restoreBackupMessage.type === 'success',
            'data-view__message--error': restoreBackupMessage.type === 'error'
          }"
        >
          {{ restoreBackupMessage.text }}
        </div>
      </div>

      <!-- Sync Test Data (Mock mode only) -->
      <FormRowAction
        v-if="isMockData"
        label="Sync Donnees de Test"
        description="Synchroniser depuis la production"
      >
        <RunicButton
          size="sm"
          variant="primary"
          :disabled="isSyncingTestData"
          @click="emit('syncTestData')"
        >
          <span v-if="isSyncingTestData" class="data-view__loading">
            <span class="data-view__spinner"></span>
            {{ t("admin.dataSource.syncing") }}
          </span>
          <span v-else>
            {{ t("admin.dataSource.syncButton") }}
          </span>
        </RunicButton>
      </FormRowAction>
    </FormSection>
  </div>
</template>

<style scoped>
.data-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Vaal Orbs Control */
.data-view__vaal-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 4px;
}

.data-view__vaal-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(175, 96, 37, 0.1);
  border: 1px solid rgba(175, 96, 37, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-view__vaal-btn:hover:not(:disabled) {
  background: rgba(175, 96, 37, 0.2);
  border-color: rgba(175, 96, 37, 0.5);
  color: #af6025;
}

.data-view__vaal-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.data-view__vaal-value {
  font-family: 'Cinzel', serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(220, 210, 195, 0.9);
  min-width: 2ch;
  text-align: center;
}

/* Loading State */
.data-view__loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(180, 170, 155, 0.7);
}

.data-view__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.data-view__empty {
  font-style: italic;
  color: rgba(150, 140, 125, 0.6);
}

/* Restore Section */
.data-view__restore-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Message */
.data-view__message {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  text-align: center;
}

.data-view__message--success {
  background: rgba(60, 140, 60, 0.15);
  border: 1px solid rgba(80, 160, 80, 0.3);
  color: rgba(120, 200, 120, 0.9);
}

.data-view__message--error {
  background: rgba(140, 40, 40, 0.15);
  border: 1px solid rgba(180, 60, 60, 0.3);
  color: rgba(220, 100, 100, 0.9);
}
</style>
