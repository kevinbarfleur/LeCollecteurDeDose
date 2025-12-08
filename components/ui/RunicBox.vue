<script setup lang="ts">
interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: string;
  centered?: boolean;
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  maxWidth: undefined,
  centered: false,
});
</script>

<template>
  <div
    class="runic-box"
    :class="[
      `runic-box--padding-${padding}`,
      { 'runic-box--centered': centered }
    ]"
    :style="maxWidth ? { maxWidth } : {}"
  >
    <!-- Corner decorations -->
    <div class="runic-box__corner runic-box__corner--tl"></div>
    <div class="runic-box__corner runic-box__corner--tr"></div>
    <div class="runic-box__corner runic-box__corner--bl"></div>
    <div class="runic-box__corner runic-box__corner--br"></div>
    
    <!-- Content slot -->
    <div class="runic-box__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   RUNIC BOX - Carved stone tablet container
   ========================================== */
.runic-box {
  position: relative;
  width: 100%;
  
  /* Deep carved stone look */
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );
  
  border-radius: 6px;
  
  /* Multi-layered carved effect */
  box-shadow: 
    /* Deep inner shadow */
    inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    /* Bottom highlight for 3D */
    inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    /* Outer shadow */
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(50, 45, 40, 0.25);
  
  /* Stone border */
  border: 1px solid rgba(40, 38, 35, 0.7);
  border-top-color: rgba(30, 28, 25, 0.8);
  border-bottom-color: rgba(60, 55, 50, 0.3);
}

/* Stone texture overlay */
.runic-box::before {
  content: "";
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(60, 55, 50, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(40, 35, 30, 0.04) 0%, transparent 40%);
  pointer-events: none;
  border-radius: 5px;
}

/* ==========================================
   PADDING VARIANTS
   ========================================== */
.runic-box--padding-none {
  padding: 0;
}

.runic-box--padding-sm {
  padding: 1rem 1.5rem;
}

.runic-box--padding-md {
  padding: 1.5rem 2rem;
}

.runic-box--padding-lg {
  padding: 2.5rem 3rem;
}

/* ==========================================
   CENTERED CONTENT
   ========================================== */
.runic-box--centered {
  text-align: center;
}

/* ==========================================
   CONTENT WRAPPER
   ========================================== */
.runic-box__content {
  position: relative;
  z-index: 1;
}

/* ==========================================
   CORNER DECORATIONS
   ========================================== */
.runic-box__corner {
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: none;
  z-index: 2;
}

.runic-box__corner::before,
.runic-box__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    to right,
    rgba(80, 70, 55, 0.15),
    rgba(80, 70, 55, 0.4),
    rgba(80, 70, 55, 0.15)
  );
}

.runic-box__corner--tl { top: 8px; left: 8px; }
.runic-box__corner--tr { top: 8px; right: 8px; transform: rotate(90deg); }
.runic-box__corner--bl { bottom: 8px; left: 8px; transform: rotate(-90deg); }
.runic-box__corner--br { bottom: 8px; right: 8px; transform: rotate(180deg); }

.runic-box__corner::before {
  width: 20px;
  height: 1px;
  top: 0;
  left: 0;
}

.runic-box__corner::after {
  width: 1px;
  height: 20px;
  top: 0;
  left: 0;
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .runic-box--padding-md {
    padding: 1.25rem 1.5rem;
  }
  
  .runic-box--padding-lg {
    padding: 2rem 2rem;
  }
}
</style>

