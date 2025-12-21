<script setup lang="ts">
/**
 * FormTabItem
 *
 * Individual tab item for vertical navigation.
 * Uses RunicSelect styling with striped background effect.
 */

interface Props {
  label: string
  icon?: string
  active?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    class="form-tab-item"
    :class="{ 'form-tab-item--active': active }"
    type="button"
    @click="emit('click')"
  >
    <!-- Corner runes -->
    <span class="form-tab-item__rune form-tab-item__rune--tl">◆</span>
    <span class="form-tab-item__rune form-tab-item__rune--tr">◆</span>
    <span class="form-tab-item__rune form-tab-item__rune--bl">◆</span>
    <span class="form-tab-item__rune form-tab-item__rune--br">◆</span>

    <span v-if="icon" class="form-tab-item__icon">{{ icon }}</span>
    <span class="form-tab-item__label">{{ label }}</span>

    <!-- Glow line -->
    <span class="form-tab-item__glow"></span>
  </button>
</template>

<style scoped>
.form-tab-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.75rem 1rem;
  cursor: pointer;
  text-align: left;
  overflow: hidden;

  /* Deep carved groove effect */
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );

  /* Deep inset shadow */
  box-shadow:
    inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 1px 0 rgba(45, 40, 35, 0.3);

  /* Worn stone border */
  border: 1px solid rgba(35, 32, 28, 0.8);
  border-top-color: rgba(25, 22, 18, 0.9);
  border-bottom-color: rgba(55, 50, 45, 0.35);
  border-radius: 4px;

  transition: all 0.3s ease;
}

.form-tab-item:hover {
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow:
    inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9),
    inset 0 -1px 1px rgba(175, 96, 37, 0.1),
    0 0 15px rgba(175, 96, 37, 0.1),
    0 1px 0 rgba(45, 40, 35, 0.3);
}

/* Active state: striped background */
.form-tab-item--active {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(175, 135, 80, 0.06) 4px,
      rgba(175, 135, 80, 0.06) 8px
    ),
    linear-gradient(
      180deg,
      rgba(8, 8, 10, 0.95) 0%,
      rgba(14, 14, 16, 0.9) 40%,
      rgba(10, 10, 12, 0.95) 100%
    );
  border-color: rgba(175, 135, 80, 0.3);
}

.form-tab-item--active:hover {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(175, 135, 80, 0.08) 4px,
      rgba(175, 135, 80, 0.08) 8px
    ),
    linear-gradient(
      180deg,
      rgba(8, 8, 10, 0.95) 0%,
      rgba(14, 14, 16, 0.9) 40%,
      rgba(10, 10, 12, 0.95) 100%
    );
  border-color: rgba(175, 135, 80, 0.45);
}

/* Corner runes */
.form-tab-item__rune {
  position: absolute;
  font-size: 0.4rem;
  color: rgba(80, 70, 60, 0.25);
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.form-tab-item__rune--tl {
  top: 4px;
  left: 6px;
}

.form-tab-item__rune--tr {
  top: 4px;
  right: 6px;
}

.form-tab-item__rune--bl {
  bottom: 4px;
  left: 6px;
}

.form-tab-item__rune--br {
  bottom: 4px;
  right: 6px;
}

.form-tab-item:hover .form-tab-item__rune,
.form-tab-item--active .form-tab-item__rune {
  color: rgba(175, 96, 37, 0.5);
}

/* Icon */
.form-tab-item__icon {
  font-size: 1rem;
  flex-shrink: 0;
  z-index: 1;
}

/* Label */
.form-tab-item__label {
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(180, 170, 155, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  transition: color 0.2s ease;
  z-index: 1;
}

.form-tab-item:hover .form-tab-item__label {
  color: rgba(200, 190, 175, 0.85);
}

.form-tab-item--active .form-tab-item__label {
  color: #c97a3a;
}

/* Glow line */
.form-tab-item__glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 96, 37, 0.6),
    transparent
  );
  transition: width 0.4s ease;
}

.form-tab-item:hover .form-tab-item__glow {
  width: 80%;
}

.form-tab-item--active .form-tab-item__glow {
  width: 60%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 96, 37, 0.5),
    transparent
  );
}

.form-tab-item--active:hover .form-tab-item__glow {
  width: 90%;
}
</style>
