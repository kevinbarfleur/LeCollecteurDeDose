<script setup lang="ts">
/**
 * FormRowNumber
 *
 * Form row with a styled number input.
 */

interface Props {
  label: string
  description?: string
  modelValue: number
  min?: number
  max?: number
  unit?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  unit: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

// Local value for input field
const inputValue = ref(props.modelValue)

// Track if user is actively editing to prevent watch from overwriting
const isEditing = ref(false)

// Sync input with modelValue (only when not editing)
watch(() => props.modelValue, (newVal) => {
  if (!isEditing.value) {
    inputValue.value = newVal
  }
})

// Handle input focus/blur
const handleFocus = () => {
  isEditing.value = true
}

const handleBlur = () => {
  isEditing.value = false
  // Sync with props on blur in case they diverged
  inputValue.value = props.modelValue
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseInt(target.value) || props.min

  // Clamp value to min/max
  value = Math.max(props.min, Math.min(props.max, value))

  inputValue.value = value
  emit('update:modelValue', value)
}
</script>

<template>
  <FormRow
    :label="label"
    :description="description"
    :disabled="disabled"
  >
    <div class="form-row-number__control">
      <input
        type="number"
        :value="inputValue"
        :min="min"
        :max="max"
        :disabled="disabled"
        class="form-row-number__input"
        @focus="handleFocus"
        @blur="handleBlur"
        @change="handleChange"
      />
      <span v-if="unit" class="form-row-number__unit">{{ unit }}</span>
    </div>
  </FormRow>
</template>

<style scoped>
.form-row-number__control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-row-number__input {
  width: 80px;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  text-align: center;
  transition: border-color 0.2s ease;
}

.form-row-number__input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.form-row-number__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-row-number__unit {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.6);
}

/* Remove spinner buttons */
.form-row-number__input::-webkit-outer-spin-button,
.form-row-number__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-row-number__input[type="number"] {
  -moz-appearance: textfield;
}
</style>
