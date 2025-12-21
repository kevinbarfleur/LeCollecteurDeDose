<script setup lang="ts">
/**
 * Diagnostics View
 *
 * Diagnostics and debugging tools using the form system.
 * Contains: Error logs link, Force outcome debug
 */

interface Props {
  forcedOutcome: string
  forcedOutcomeOptions: { value: string; label: string }[]
}

defineProps<Props>()

const emit = defineEmits<{
  'update:forcedOutcome': [value: string]
}>()
</script>

<template>
  <div class="diagnostics-view">
    <FormSection
      title="Diagnostics"
      subtitle="Outils de diagnostic et de debogage"
    >
      <!-- Error Logs -->
      <FormRowAction
        label="Logs d'Erreurs"
        description="Visualiser et gerer les erreurs de l'application"
      >
        <RunicButton
          to="/admin/errors"
          size="sm"
          variant="primary"
          icon="external"
        >
          Voir les logs
        </RunicButton>
      </FormRowAction>

      <!-- Force Outcome (debug) -->
      <FormRow
        label="Forcer Issue (Debug)"
        description="Forcer un resultat specifique pour l'autel"
      >
        <RunicSelect
          :model-value="forcedOutcome"
          :options="forcedOutcomeOptions"
          size="sm"
          @update:model-value="emit('update:forcedOutcome', $event as string)"
        />
      </FormRow>
    </FormSection>
  </div>
</template>

<style scoped>
.diagnostics-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
