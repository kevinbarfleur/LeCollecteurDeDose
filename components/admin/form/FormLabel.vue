<script setup lang="ts">
/**
 * FormLabel
 *
 * Label component for form rows with optional description.
 * Uses Cinzel font for labels, Crimson Text for descriptions.
 */

interface Props {
  label: string
  description?: string
  required?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="form-label">
    <span class="form-label__text">
      {{ label }}
      <span v-if="required" class="form-label__required">*</span>
    </span>
    <span v-if="description" class="form-label__description">
      {{ description }}
    </span>
  </div>
</template>

<style scoped>
.form-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label__text {
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(180, 170, 155, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-label__required {
  color: #c97a3a;
  margin-left: 0.125rem;
}

.form-label__description {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.6);
  line-height: 1.4;
}
</style>
