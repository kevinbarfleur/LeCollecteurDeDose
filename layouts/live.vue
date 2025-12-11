<script setup lang="ts">
const { t } = useI18n();
const showLegalModal = ref(false);
</script>

<template>
  <div class="h-screen flex flex-col live-layout">
    <main class="flex-1 min-h-0 live-content">
      <slot />
    </main>

    <footer class="live-footer">
      <div class="live-footer__inner">
        <NuxtLink to="/" class="live-footer__brand">
          <img
            src="/images/logo.png"
            alt="Le Collecteur"
            class="live-footer__logo"
          />
          <span class="live-footer__name">Le Collecteur de Dose</span>
        </NuxtLink>
        
        <div class="live-footer__separator">·</div>
        
        <p class="live-footer__disclaimer">
          {{ t("footer.disclaimer") }}
        </p>
        
        <button
          type="button"
          class="live-footer__link"
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
.live-layout {
  position: relative;
  background: #0a0a0c;
}

.live-layout::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(200, 50, 50, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(175, 96, 37, 0.02) 0%, transparent 40%),
    linear-gradient(180deg, rgba(8, 8, 10, 1) 0%, rgba(12, 12, 14, 0.98) 50%, rgba(8, 8, 10, 1) 100%);
}

.live-content {
  position: relative;
  z-index: 1;
}

.live-footer {
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

.live-footer__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}

.live-footer__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.live-footer__brand:hover {
  opacity: 0.8;
}

.live-footer__logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.6;
}

.live-footer__name {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  color: rgba(200, 180, 160, 0.5);
}

.live-footer__separator {
  color: rgba(80, 70, 60, 0.3);
}

.live-footer__disclaimer {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  color: rgba(100, 95, 90, 0.5);
}

.live-footer__link {
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

.live-footer__link:hover {
  color: #c97a3a;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .live-footer__inner {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .live-footer__separator {
    display: none;
  }
}
</style>
