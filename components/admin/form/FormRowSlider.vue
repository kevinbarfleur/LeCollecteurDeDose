<script setup lang="ts">
/**
 * FormRowSlider
 *
 * Form row with a slider control and synced input field.
 */

interface Props {
  label: string
  description?: string
  modelValue: number
  min: number
  max: number
  step?: number
  valueSuffix?: string
  disabled?: boolean
  hideSlider?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  valueSuffix: '',
  hideSlider: false,
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

// Handle slider change
const handleSliderChange = (value: number) => {
  inputValue.value = value
  emit('update:modelValue', value)
}

// Handle input focus/blur
const handleFocus = () => {
  isEditing.value = true
}

const handleBlur = () => {
  isEditing.value = false
  // Sync with props on blur in case they diverged
  inputValue.value = props.modelValue
}

// Handle input change
const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value) || props.min

  // Clamp value to min/max
  value = Math.max(props.min, Math.min(props.max, value))

  // Round to step
  if (props.step) {
    value = Math.round(value / props.step) * props.step
  }

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
    <div class="form-row-slider__control" :class="{ 'form-row-slider__control--input-only': hideSlider }">
      <RunicSlider
        v-if="!hideSlider"
        :model-value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :show-value="false"
        size="sm"
        @update:model-value="handleSliderChange"
      />
      <div class="form-row-slider__input-wrapper">
        <input
          type="number"
          :value="inputValue"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          class="form-row-slider__input"
          @focus="handleFocus"
          @blur="handleBlur"
          @change="handleInputChange"
        />
        <span v-if="valueSuffix" class="form-row-slider__suffix">{{ valueSuffix }}</span>
      </div>
    </div>
  </FormRow>
</template>

<style scoped>
.form-row-slider__control {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 320px;
}

.form-row-slider__control--input-only {
  max-width: none;
  justify-content: flex-end;
}

.form-row-slider__control :deep(.runic-slider) {
  flex: 1;
  min-width: 120px;
}

.form-row-slider__input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.form-row-slider__input {
  width: 70px;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  text-align: center;
  transition: border-color 0.2s ease;
}

.form-row-slider__input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.form-row-slider__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-row-slider__suffix {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(150, 140, 125, 0.6);
  white-space: nowrap;
}

/* Remove spinner buttons */
.form-row-slider__input::-webkit-outer-spin-button,
.form-row-slider__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-row-slider__input[type="number"] {
  -moz-appearance: textfield;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row-slider__control {
    max-width: 100%;
  }
}
</style>
