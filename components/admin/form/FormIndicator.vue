<script setup lang="ts">
/**
 * FormIndicator
 *
 * Carved stone indicator for displaying values, statuses, or code variables.
 * Fits the runic/PoE aesthetic of the design system.
 */

interface Props {
  /**
   * Variant determines the visual style:
   * - value: For numeric values (100%, 50ms, etc.)
   * - code: For code/variables ({username}, {card})
   * - status: For status indicators (success, warning, error)
   */
  variant?: 'value' | 'code' | 'status'
  /**
   * Status type when variant is 'status'
   */
  status?: 'success' | 'warning' | 'error' | 'neutral'
  /**
   * Size variant
   */
  size?: 'sm' | 'md'
  /**
   * Optional label displayed before the value
   */
  label?: string
  /**
   * Whether to display inline (no background box)
   */
  inline?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'value',
  status: 'neutral',
  size: 'md',
  inline: false,
})
</script>

<template>
  <span
    class="form-indicator"
    :class="[
      `form-indicator--${variant}`,
      `form-indicator--${size}`,
      `form-indicator--status-${status}`,
      { 'form-indicator--inline': inline }
    ]"
  >
    <!-- Decorative runes for non-inline -->
    <span v-if="!inline" class="form-indicator__rune form-indicator__rune--left">◆</span>

    <!-- Label if provided -->
    <span v-if="label" class="form-indicator__label">{{ label }}</span>

    <!-- Content slot -->
    <span class="form-indicator__content">
      <slot />
    </span>

    <!-- Decorative runes for non-inline -->
    <span v-if="!inline" class="form-indicator__rune form-indicator__rune--right">◆</span>
  </span>
</template>

<style scoped>
/* ==========================================
   FORM INDICATOR - Carved stone style
   ========================================== */

.form-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  position: relative;
}

/* ==========================================
   BOXED STYLE (default)
   ========================================== */

.form-indicator:not(.form-indicator--inline) {
  padding: 0.375rem 0.75rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 50%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border: 1px solid rgba(40, 38, 35, 0.6);
  border-radius: 4px;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 -1px 0 rgba(60, 55, 50, 0.1),
    0 1px 0 rgba(50, 45, 40, 0.15);
}

/* ==========================================
   INLINE STYLE
   ========================================== */

.form-indicator--inline {
  padding: 0.125rem 0.5rem;
  background: rgba(60, 55, 50, 0.15);
  border: 1px solid rgba(60, 55, 50, 0.25);
  border-radius: 3px;
}

/* ==========================================
   DECORATIVE RUNES
   ========================================== */

.form-indicator__rune {
  font-size: 0.5rem;
  color: rgba(100, 90, 80, 0.4);
  transition: color 0.2s ease;
}

.form-indicator:hover .form-indicator__rune {
  color: rgba(175, 96, 37, 0.5);
}

/* ==========================================
   LABEL
   ========================================== */

.form-indicator__label {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(150, 140, 125, 0.6);
  margin-right: 0.25rem;
}

/* ==========================================
   CONTENT
   ========================================== */

.form-indicator__content {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* ==========================================
   VARIANT: VALUE
   ========================================== */

.form-indicator--value .form-indicator__content {
  font-family: 'Cinzel', serif;
  font-weight: 600;
  color: rgba(220, 210, 195, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.form-indicator--value.form-indicator--md .form-indicator__content {
  font-size: 0.9375rem;
}

.form-indicator--value.form-indicator--sm .form-indicator__content {
  font-size: 0.8125rem;
}

/* ==========================================
   VARIANT: CODE
   ========================================== */

.form-indicator--code {
  border-color: rgba(175, 96, 37, 0.2);
  background: linear-gradient(
    180deg,
    rgba(175, 96, 37, 0.08) 0%,
    rgba(140, 75, 25, 0.05) 100%
  );
}

.form-indicator--code.form-indicator--inline {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.2);
}

.form-indicator--code .form-indicator__content {
  font-family: 'Fira Code', monospace;
  color: rgba(195, 115, 50, 0.9);
}

.form-indicator--code.form-indicator--md .form-indicator__content {
  font-size: 0.75rem;
}

.form-indicator--code.form-indicator--sm .form-indicator__content {
  font-size: 0.6875rem;
}

.form-indicator--code .form-indicator__rune {
  color: rgba(175, 96, 37, 0.3);
}

/* ==========================================
   VARIANT: STATUS
   ========================================== */

.form-indicator--status .form-indicator__content {
  font-family: 'Cinzel', serif;
  font-weight: 600;
}

/* Status: Success */
.form-indicator--status-success {
  border-color: rgba(80, 160, 80, 0.3);
  background: linear-gradient(
    180deg,
    rgba(60, 140, 60, 0.1) 0%,
    rgba(40, 100, 40, 0.05) 100%
  );
}

.form-indicator--status-success .form-indicator__content {
  color: rgba(120, 200, 120, 0.9);
}

.form-indicator--status-success .form-indicator__rune {
  color: rgba(80, 160, 80, 0.4);
}

/* Status: Warning */
.form-indicator--status-warning {
  border-color: rgba(200, 160, 60, 0.3);
  background: linear-gradient(
    180deg,
    rgba(180, 140, 40, 0.1) 0%,
    rgba(140, 100, 20, 0.05) 100%
  );
}

.form-indicator--status-warning .form-indicator__content {
  color: rgba(220, 180, 80, 0.9);
}

.form-indicator--status-warning .form-indicator__rune {
  color: rgba(200, 160, 60, 0.4);
}

/* Status: Error */
.form-indicator--status-error {
  border-color: rgba(180, 60, 60, 0.3);
  background: linear-gradient(
    180deg,
    rgba(160, 40, 40, 0.1) 0%,
    rgba(120, 20, 20, 0.05) 100%
  );
}

.form-indicator--status-error .form-indicator__content {
  color: rgba(220, 100, 100, 0.9);
}

.form-indicator--status-error .form-indicator__rune {
  color: rgba(180, 60, 60, 0.4);
}

/* Status: Neutral */
.form-indicator--status-neutral .form-indicator__content {
  color: rgba(180, 170, 160, 0.9);
}

/* ==========================================
   SIZE VARIANTS
   ========================================== */

.form-indicator--sm:not(.form-indicator--inline) {
  padding: 0.25rem 0.5rem;
  gap: 0.25rem;
}

.form-indicator--sm .form-indicator__rune {
  font-size: 0.375rem;
}

.form-indicator--sm .form-indicator__label {
  font-size: 0.6875rem;
}
</style>
