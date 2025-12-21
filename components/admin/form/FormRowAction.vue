<script setup lang="ts">
/**
 * FormRowAction
 *
 * Form row with action buttons (slot for RunicButton components).
 */

interface Props {
  label: string
  description?: string
  disabled?: boolean
}

defineProps<Props>()
</script>

<template>
  <FormRow
    :label="label"
    :description="description"
    :disabled="disabled"
  >
    <div class="form-row-action__buttons">
      <slot />
    </div>
  </FormRow>
</template>

<style scoped>
.form-row-action__buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .form-row-action__buttons {
    width: 100%;
  }

  .form-row-action__buttons :deep(.runic-button) {
    flex: 1;
    min-width: 120px;
  }
}
</style>
