<script setup lang="ts">
/**
 * FormRowToggle
 *
 * Form row with a toggle switch (RunicRadio in toggle mode).
 */

interface Props {
  label: string
  description?: string
  modelValue: boolean
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const handleToggle = (value: string | boolean) => {
  const boolValue = typeof value === 'boolean' ? value : value === 'on'
  emit('update:modelValue', boolValue)
}
</script>

<template>
  <FormRow
    :label="label"
    :description="description"
    :disabled="disabled"
  >
    <RunicRadio
      :model-value="modelValue"
      toggle
      size="sm"
      :disabled="disabled"
      @update:model-value="handleToggle"
    />
  </FormRow>
</template>
