<script setup lang="ts">
/**
 * FormRow
 *
 * Base row component for form layouts.
 * Desktop: label on left (50%), control on right (50%)
 * Mobile: stacked layout
 */

interface Props {
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="form-row" :class="{ 'form-row--disabled': disabled }">
    <div class="form-row__label">
      <FormLabel
        :label="label"
        :description="description"
        :required="required"
      />
    </div>
    <div class="form-row__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid rgba(60, 55, 50, 0.15);
  transition: opacity 0.2s ease;
}

.form-row:last-child {
  border-bottom: none;
}

.form-row--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.form-row__label {
  flex: 1;
  min-width: 0;
}

.form-row__control {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

/* Mobile: stacked layout */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-row__label,
  .form-row__control {
    width: 100%;
    flex: none;
  }

  .form-row__control {
    justify-content: flex-start;
  }
}
</style>
