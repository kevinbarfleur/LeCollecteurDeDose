<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
  centered?: boolean;
  attached?: boolean;
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  centered: true,
  attached: false,
});
</script>

<template>
  <div
    class="runic-header-wrapper"
    :class="{ 'runic-header-wrapper--attached': attached }"
  >
    <div
      class="runic-header"
      :class="{
        'runic-header--centered': centered,
        'runic-header--attached': attached,
      }"
    >
      <div class="runic-header__accent runic-header__accent--left"></div>
      <div class="runic-header__accent runic-header__accent--right"></div>

      <div class="runic-header__content">
        <h1 class="runic-header__title">
          <span class="runic-header__rune">◆</span>
          {{ title }}
          <span class="runic-header__rune">◆</span>
        </h1>
        <p v-if="subtitle" class="runic-header__subtitle">{{ subtitle }}</p>
      </div>

      <div class="runic-header__edge"></div>
    </div>
  </div>
</template>

<style scoped>
.runic-header-wrapper {
  position: relative;
}

.runic-header-wrapper--attached {
  padding: 0 12px;
  margin-bottom: -1px;
}

@media (min-width: 640px) {
  .runic-header-wrapper--attached {
    padding: 0 16px;
  }
}

@media (min-width: 768px) {
  .runic-header-wrapper--attached {
    padding: 0 20px;
  }
}

.runic-header {
  position: relative;
  padding: 1.25rem 1.5rem 1rem;
  background: linear-gradient(
    180deg,
    rgba(16, 16, 18, 0.98) 0%,
    rgba(12, 12, 14, 0.95) 60%,
    rgba(10, 10, 12, 0.98) 100%
  );
  border-radius: 6px 6px 0 0;
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.6),
    inset 0 1px 3px rgba(0, 0, 0, 0.7), inset 0 -1px 2px rgba(50, 45, 40, 0.05),
    0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(40, 38, 35, 0.6);
  border-bottom: none;
}

.runic-header--centered {
  text-align: center;
}

.runic-header--attached {
  border-radius: 6px 6px 0 0;
}

.runic-header__accent {
  position: absolute;
  top: 10px;
  width: 35px;
  height: 1px;
  pointer-events: none;
}

.runic-header__accent--left {
  left: 10px;
  background: linear-gradient(
    to right,
    rgba(175, 96, 37, 0.5),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}

.runic-header__accent--right {
  right: 10px;
  background: linear-gradient(
    to left,
    rgba(175, 96, 37, 0.5),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}

.runic-header__content {
  position: relative;
  z-index: 1;
}

.runic-header__title {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4c4a8;
  margin: 0;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(175, 96, 37, 0.2),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

@media (max-width: 480px) {
  .runic-header__title {
    font-size: 1.125rem;
  }
  .runic-header__rune {
    margin: 0 0.5rem;
  }
}

.runic-header__rune {
  display: inline-block;
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.6);
  margin: 0 0.75rem;
  vertical-align: middle;
  text-shadow: 0 0 8px rgba(175, 96, 37, 0.4);
}

.runic-header__subtitle {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.125rem;
  font-style: italic;
  color: rgba(140, 130, 115, 0.8);
  margin: 0.5rem 0 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.runic-header__edge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(60, 55, 48, 0.4) 15%,
    rgba(80, 70, 55, 0.5) 50%,
    rgba(60, 55, 48, 0.4) 85%,
    transparent
  );
}

@media (min-width: 640px) {
  .runic-header {
    padding: 1.5rem 2rem 1.25rem;
  }
  .runic-header__title {
    font-size: 1.75rem;
  }
  .runic-header__subtitle {
    font-size: 1.1875rem;
  }
  .runic-header__accent {
    width: 45px;
  }
}

@media (min-width: 768px) {
  .runic-header__title {
    font-size: 2rem;
    letter-spacing: 0.1em;
  }
  .runic-header__subtitle {
    font-size: 1.25rem;
  }
}
</style>
