<script setup lang="ts">
withDefaults(
  defineProps<{
    rune?: string;
    showRune?: boolean;
    variant?: "default" | "subtle" | "accent";
  }>(),
  {
    rune: "◆",
    showRune: true,
    variant: "default",
  }
);
</script>

<template>
  <div
    class="runic-divider"
    :class="`runic-divider--${variant}`"
    role="separator"
  >
    <span v-if="showRune" class="runic-divider__rune">{{ rune }}</span>
  </div>
</template>

<style scoped>
.runic-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.25rem 0;
  position: relative;
}

.runic-divider::before,
.runic-divider::after {
  content: "";
  flex: 1;
  height: 1px;
}

.runic-divider--default::before,
.runic-divider--default::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(60, 55, 50, 0.4),
    transparent
  );
}

.runic-divider--default .runic-divider__rune {
  color: rgba(80, 70, 60, 0.4);
}

.runic-divider--subtle::before,
.runic-divider--subtle::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(60, 55, 50, 0.25),
    transparent
  );
}

.runic-divider--subtle .runic-divider__rune {
  color: rgba(80, 70, 60, 0.3);
}

.runic-divider--accent::before,
.runic-divider--accent::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 96, 37, 0.4),
    transparent
  );
}

.runic-divider--accent .runic-divider__rune {
  color: rgba(175, 96, 37, 0.5);
}

.runic-divider__rune {
  padding: 0 1rem;
  font-size: 0.5rem;
  transition: color 0.2s ease;
}
</style>
