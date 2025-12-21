<script setup lang="ts">
/**
 * System View
 *
 * System controls view using the form system.
 * Contains: Altar control, Activity logs, Maintenance mode
 */

const { t } = useI18n()

interface Props {
  altarOpen: boolean
  activityLogsEnabled: boolean
  isMaintenanceMode: boolean
  isLoading: boolean
  isTogglingAltar: boolean
  isTogglingActivityLogs: boolean
  isTogglingMaintenance: boolean
  isMaintenanceLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:altarOpen': [value: boolean]
  'update:activityLogsEnabled': [value: boolean]
  'toggleMaintenance': []
}>()
</script>

<template>
  <div class="system-view">
    <FormSection
      title="Controles Systeme"
      subtitle="Gestion des fonctionnalites principales du royaume"
    >
      <!-- Altar Control -->
      <FormRowToggle
        label="Controle de l'Autel"
        :description="t('admin.altar.description')"
        :model-value="altarOpen"
        :disabled="isLoading || isTogglingAltar"
        @update:model-value="emit('update:altarOpen', $event)"
      />

      <!-- Activity Logs Control -->
      <FormRowToggle
        label="Panneau de Logs d'Activite"
        :description="t('admin.activityLogs.description')"
        :model-value="activityLogsEnabled"
        :disabled="isLoading || isTogglingActivityLogs"
        @update:model-value="emit('update:activityLogsEnabled', $event)"
      />

      <!-- Maintenance Mode -->
      <FormRowAction
        label="Mode Maintenance"
        description="Active le mode maintenance pour afficher le message 'Le royaume est en service' sur toutes les pages interactives."
        :disabled="isMaintenanceLoading || isTogglingMaintenance"
      >
        <FormIndicator
          variant="status"
          :status="isMaintenanceMode ? 'warning' : 'neutral'"
          size="sm"
        >
          {{ isMaintenanceMode ? 'Active' : 'Desactive' }}
        </FormIndicator>
        <RunicButton
          size="sm"
          variant="primary"
          :disabled="isMaintenanceLoading || isTogglingMaintenance"
          @click="emit('toggleMaintenance')"
        >
          <span v-if="!isTogglingMaintenance">
            {{ isMaintenanceMode ? 'Desactiver' : 'Activer' }}
          </span>
          <span v-else>En cours...</span>
        </RunicButton>
      </FormRowAction>
    </FormSection>
  </div>
</template>

<style scoped>
.system-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
