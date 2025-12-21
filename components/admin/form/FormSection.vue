<script setup lang="ts">
/**
 * FormSection
 *
 * A titled section containing form rows.
 * Uses carved stone styling.
 */

interface Props {
  title: string
  subtitle?: string
  variant?: 'default' | 'positive' | 'negative'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <section
    class="form-section"
    :class="`form-section--${variant}`"
  >
    <!-- Header -->
    <header class="form-section__header">
      <h3 class="form-section__title">{{ title }}</h3>
      <p v-if="subtitle" class="form-section__subtitle">{{ subtitle }}</p>
    </header>

    <!-- Rows container -->
    <div class="form-section__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.form-section {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.25);
  border: 1px solid rgba(40, 38, 35, 0.7);
  border-top-color: rgba(30, 28, 25, 0.8);
  border-bottom-color: rgba(60, 55, 50, 0.3);
}

/* Radial gradient overlay */
.form-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(60, 55, 50, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(40, 35, 30, 0.04) 0%, transparent 40%);
  pointer-events: none;
}

/* Header */
.form-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 1rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(80, 70, 55, 0.25);
}

.form-section__title {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(220, 210, 195, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.form-section__subtitle {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.6);
  line-height: 1.4;
}

/* Content */
.form-section__content {
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .form-section {
    padding: 1rem;
  }

  .form-section__header {
    padding-bottom: 0.75rem;
  }

  .form-section__title {
    font-size: 0.9375rem;
  }
}
</style>
