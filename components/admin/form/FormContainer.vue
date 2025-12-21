<script setup lang="ts">
/**
 * FormContainer
 *
 * Main layout component with vertical tabs on the left and content on the right.
 * Mobile: tabs become dropdown at top, content stacked below.
 */

interface TabItem {
  key: string
  label: string
  icon?: string
}

interface Props {
  tabs: TabItem[]
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="form-container">
    <!-- Sidebar with tabs -->
    <aside class="form-container__sidebar">
      <FormTabs
        :tabs="tabs"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </aside>

    <!-- Main content area -->
    <main class="form-container__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.form-container {
  display: flex;
  gap: 1.5rem;
  min-height: 400px;
}

/* Sidebar */
.form-container__sidebar {
  flex-shrink: 0;
  width: 200px;
  padding: 0.5rem;
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.6) 0%,
    rgba(18, 18, 20, 0.5) 100%
  );
  border-radius: 8px;
  border: 1px solid rgba(40, 38, 35, 0.4);
}

/* Content */
.form-container__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Mobile: stacked layout */
@media (max-width: 768px) {
  .form-container {
    flex-direction: column;
    gap: 1rem;
  }

  .form-container__sidebar {
    width: 100%;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
  }

  .form-container__content {
    gap: 1rem;
  }
}
</style>
