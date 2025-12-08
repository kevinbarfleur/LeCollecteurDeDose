<script setup lang="ts">
interface Props {
  to?: string;
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "twitch" | "youtube" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: "twitch" | "youtube" | "collection" | "catalogue" | "arrow-right" | "external" | "logout" | "document";
  runeLeft?: string;
  runeRight?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  external: true,
  runeLeft: "◆",
  runeRight: "◆",
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

// Determine which component to render
const componentTag = computed(() => {
  if (props.to) return resolveComponent("NuxtLink");
  if (props.href) return "a";
  return "button";
});

const componentProps = computed(() => {
  if (props.to) return { to: props.to };
  if (props.href) {
    if (props.external) {
      return { href: props.href, target: "_blank", rel: "noopener noreferrer" };
    }
    return { href: props.href };
  }
  return { type: "button", disabled: props.disabled };
});

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit("click", event);
  }
};
</script>

<template>
  <component
    :is="componentTag"
    v-bind="componentProps"
    class="runic-button"
    :class="[
      `runic-button--${variant}`,
      `runic-button--${size}`,
      { 'runic-button--disabled': disabled },
      { 'runic-button--has-icon': icon }
    ]"
    @click="handleClick"
  >
    <!-- Icon -->
    <svg v-if="icon === 'twitch'" class="runic-button__icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
    <svg v-else-if="icon === 'youtube'" class="runic-button__icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
    <svg v-else-if="icon === 'collection'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
    </svg>
    <svg v-else-if="icon === 'catalogue'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
    </svg>
    <svg v-else-if="icon === 'arrow-right'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
    </svg>
    <svg v-else-if="icon === 'external'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
    </svg>
    <svg v-else-if="icon === 'logout'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
    <svg v-else-if="icon === 'document'" class="runic-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>

    <!-- Left Rune (only if no icon) -->
    <span v-if="runeLeft && !icon" class="runic-button__rune runic-button__rune--left">
      {{ runeLeft }}
    </span>

    <!-- Text -->
    <span class="runic-button__text">
      <slot />
    </span>

    <!-- Right Rune -->
    <span v-if="runeRight && !icon" class="runic-button__rune runic-button__rune--right">
      {{ runeRight }}
    </span>
  </component>
</template>

<style scoped>
.runic-button {
  position: relative;
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-family: "Cinzel", serif;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.runic-button::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(80, 65, 50, 0.25);
  border-radius: 1px;
  pointer-events: none;
  transition: border-color 0.3s ease;
}

/* ==========================================
   SIZES
   ========================================== */
.runic-button--sm {
  padding: 0.625rem 1.25rem;
  font-size: 0.75rem;
  gap: 0.75rem;
}

.runic-button--md {
  padding: 0.875rem 2rem;
  font-size: 0.875rem;
  gap: 1rem;
}

.runic-button--lg {
  padding: 1rem 2.5rem;
  font-size: 1rem;
  gap: 1.25rem;
}

/* ==========================================
   PRIMARY VARIANT
   ========================================== */
.runic-button--primary {
  color: #c9a227;
  background: linear-gradient(
    180deg,
    rgba(30, 25, 20, 0.95) 0%,
    rgba(15, 12, 10, 0.98) 100%
  );
  border: 1px solid rgba(100, 80, 60, 0.4);
  box-shadow: inset 0 1px 0 rgba(100, 80, 60, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.runic-button--primary:hover {
  color: #e0c060;
  border-color: rgba(150, 120, 80, 0.5);
  box-shadow: inset 0 1px 0 rgba(150, 120, 80, 0.3),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(201, 162, 39, 0.1);
}

.runic-button--primary::before {
  border-color: rgba(80, 65, 50, 0.25);
}

.runic-button--primary:hover::before {
  border-color: rgba(120, 95, 70, 0.35);
}

/* ==========================================
   SECONDARY VARIANT
   ========================================== */
.runic-button--secondary {
  color: #7a6a5a;
  background: linear-gradient(
    180deg,
    rgba(20, 18, 15, 0.9) 0%,
    rgba(12, 10, 8, 0.95) 100%
  );
  border: 1px solid rgba(70, 60, 50, 0.3);
  box-shadow: inset 0 1px 0 rgba(70, 60, 50, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.3);
}

.runic-button--secondary:hover {
  color: #a09080;
  border-color: rgba(100, 85, 70, 0.4);
  box-shadow: inset 0 1px 0 rgba(100, 85, 70, 0.2),
    0 4px 15px rgba(0, 0, 0, 0.4);
}

.runic-button--secondary::before {
  border-color: rgba(60, 50, 40, 0.2);
}

.runic-button--secondary:hover::before {
  border-color: rgba(80, 70, 55, 0.3);
}

/* ==========================================
   GHOST VARIANT
   ========================================== */
.runic-button--ghost {
  color: #5a5a5a;
  background: transparent;
  border: 1px solid rgba(60, 55, 50, 0.25);
  box-shadow: none;
}

.runic-button--ghost:hover {
  color: #8a8078;
  border-color: rgba(80, 70, 60, 0.4);
  background: rgba(30, 25, 20, 0.3);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.runic-button--ghost::before {
  border-color: transparent;
}

.runic-button--ghost:hover::before {
  border-color: rgba(60, 50, 40, 0.15);
}

/* ==========================================
   TWITCH VARIANT (Amethyst)
   ========================================== */
.runic-button--twitch {
  color: #9146ff;
  background: linear-gradient(
    180deg,
    rgba(25, 20, 35, 0.95) 0%,
    rgba(15, 12, 20, 0.98) 100%
  );
  border: 1px solid rgba(145, 70, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(145, 70, 255, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.runic-button--twitch:hover {
  color: #bf94ff;
  border-color: rgba(145, 70, 255, 0.5);
  box-shadow: inset 0 1px 0 rgba(145, 70, 255, 0.25),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(145, 70, 255, 0.15);
}

.runic-button--twitch::before {
  border-color: rgba(145, 70, 255, 0.15);
}

.runic-button--twitch:hover::before {
  border-color: rgba(145, 70, 255, 0.3);
}

/* ==========================================
   YOUTUBE VARIANT (Ruby)
   ========================================== */
.runic-button--youtube {
  color: #ff4444;
  background: linear-gradient(
    180deg,
    rgba(35, 18, 18, 0.95) 0%,
    rgba(20, 10, 10, 0.98) 100%
  );
  border: 1px solid rgba(255, 68, 68, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 68, 68, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.runic-button--youtube:hover {
  color: #ff6b6b;
  border-color: rgba(255, 68, 68, 0.5);
  box-shadow: inset 0 1px 0 rgba(255, 68, 68, 0.25),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 68, 68, 0.15);
}

.runic-button--youtube::before {
  border-color: rgba(255, 68, 68, 0.15);
}

.runic-button--youtube:hover::before {
  border-color: rgba(255, 68, 68, 0.3);
}

/* ==========================================
   DANGER VARIANT (for logout/destructive actions)
   ========================================== */
.runic-button--danger {
  color: #ef4444;
  background: linear-gradient(
    180deg,
    rgba(35, 15, 15, 0.95) 0%,
    rgba(20, 8, 8, 0.98) 100%
  );
  border: 1px solid rgba(239, 68, 68, 0.25);
  box-shadow: inset 0 1px 0 rgba(239, 68, 68, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.runic-button--danger:hover {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: inset 0 1px 0 rgba(239, 68, 68, 0.2),
    0 4px 15px rgba(0, 0, 0, 0.5), 0 0 25px rgba(239, 68, 68, 0.15);
}

.runic-button--danger::before {
  border-color: rgba(239, 68, 68, 0.12);
}

.runic-button--danger:hover::before {
  border-color: rgba(239, 68, 68, 0.25);
}

/* ==========================================
   RUNES
   ========================================== */
.runic-button__rune {
  font-size: 0.625em;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.runic-button:hover .runic-button__rune {
  opacity: 1;
}

.runic-button--primary:hover .runic-button__rune {
  color: #c9a227;
}

.runic-button--secondary:hover .runic-button__rune {
  color: #8a7a6a;
}

.runic-button--ghost:hover .runic-button__rune {
  color: #6a6058;
}

.runic-button--twitch:hover .runic-button__rune {
  color: #9146ff;
}

.runic-button--youtube:hover .runic-button__rune {
  color: #ff4444;
}

.runic-button--danger:hover .runic-button__rune {
  color: #ef4444;
}

/* ==========================================
   ICON
   ========================================== */
.runic-button__icon {
  display: inline-block;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  vertical-align: middle;
  transition: transform 0.3s ease;
}

.runic-button--sm .runic-button__icon {
  width: 14px;
  height: 14px;
}

.runic-button--lg .runic-button__icon {
  width: 18px;
  height: 18px;
}

.runic-button--has-icon {
  gap: 0.5rem;
}

.runic-button--has-icon.runic-button--lg {
  gap: 0.75rem;
}

.runic-button:hover .runic-button__icon {
  transform: scale(1.1);
}

/* ==========================================
   TEXT
   ========================================== */
.runic-button__text {
  position: relative;
  display: inline-block;
  vertical-align: middle;
}

/* ==========================================
   DISABLED STATE
   ========================================== */
.runic-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* ==========================================
   RESPONSIVE - Mobile optimizations
   ========================================== */
@media (max-width: 640px) {
  .runic-button--sm {
    padding: 0.5rem 0.875rem;
    font-size: 0.6875rem;
    gap: 0.5rem;
  }
  
  .runic-button--md {
    padding: 0.625rem 1.25rem;
    font-size: 0.75rem;
    gap: 0.75rem;
  }
  
  .runic-button--lg {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    gap: 0.875rem;
  }
  
  .runic-button--sm .runic-button__icon {
    width: 12px;
    height: 12px;
  }
  
  .runic-button--md .runic-button__icon,
  .runic-button__icon {
    width: 14px;
    height: 14px;
  }
  
  .runic-button--lg .runic-button__icon {
    width: 16px;
    height: 16px;
  }
  
  /* Hide runes on mobile for cleaner look */
  .runic-button__rune {
    display: none;
  }
}
</style>

