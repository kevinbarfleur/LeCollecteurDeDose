<script setup lang="ts">
const { t } = useI18n();
const showLegalModal = ref(false);
</script>

<template>
  <div class="h-screen flex flex-col replay-layout">
    <main class="flex-1 min-h-0 replay-content">
      <slot />
    </main>

    <footer class="replay-footer">
      <div class="replay-footer__inner">
        <NuxtLink to="/" class="replay-footer__brand">
          <img
            src="/images/logo.png"
            alt="Le Collecteur"
            class="replay-footer__logo"
          />
          <span class="replay-footer__name">Le Collecteur de Dose</span>
        </NuxtLink>
        
        <div class="replay-footer__separator">·</div>
        
        <p class="replay-footer__disclaimer">
          {{ t("footer.disclaimer") }}
        </p>
        
        <button
          type="button"
          class="replay-footer__link"
          @click="showLegalModal = true"
        >
          {{ t("footer.legal_link") }}
        </button>
      </div>
    </footer>

    <LegalModal v-model="showLegalModal" />
  </div>
</template>

<style scoped>
.replay-layout {
  position: relative;
  background: #0a0a0c;
}

.replay-layout::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(175, 96, 37, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(157, 123, 59, 0.02) 0%, transparent 40%),
    linear-gradient(180deg, rgba(8, 8, 10, 1) 0%, rgba(12, 12, 14, 0.98) 50%, rgba(8, 8, 10, 1) 100%);
}

.replay-content {
  position: relative;
  z-index: 1;
}

.replay-footer {
  position: relative;
  z-index: 10;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.6) 0%,
    rgba(10, 10, 12, 0.8) 100%
  );
  border-top: 1px solid rgba(35, 33, 30, 0.3);
  padding: 1rem 1.5rem;
}

.replay-footer__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}

.replay-footer__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.replay-footer__brand:hover {
  opacity: 0.8;
}

.replay-footer__logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.6;
}

.replay-footer__name {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  color: rgba(200, 180, 160, 0.5);
}

.replay-footer__separator {
  color: rgba(80, 70, 60, 0.3);
}

.replay-footer__disclaimer {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  color: rgba(100, 95, 90, 0.5);
}

.replay-footer__link {
  background: none;
  border: none;
  padding: 0;
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  color: rgba(175, 96, 37, 0.6);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.replay-footer__link:hover {
  color: #c97a3a;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .replay-footer__inner {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .replay-footer__separator {
    display: none;
  }
}
</style>

