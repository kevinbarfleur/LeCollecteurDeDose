<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const navItems = computed(() => [
  { path: "/catalogue", label: t("nav.catalogue"), icon: "cards" },
  { path: "/collection", label: t("nav.collection"), icon: "user" },
  { path: "/about", label: t("nav.about"), icon: "info" },
]);
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="app-header">
      <div
        class="max-w-[1400px] mx-auto px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-4 sm:gap-8 flex-wrap sm:flex-nowrap"
      >
        <NuxtLink to="/" class="app-header__logo">
          <img
            :src="'/images/logo.png'"
            :alt="`Logo ${t('app.name')}`"
            class="w-9 h-9 sm:w-12 sm:h-12 object-contain transition-transform duration-fast hover:scale-105"
          />
          <div class="flex flex-col leading-tight">
            <span
              class="font-display text-base sm:text-xl font-semibold text-poe-text transition-colors duration-fast group-hover:text-white"
              >Le Collecteur</span
            >
            <span
              class="font-body text-xs sm:text-sm italic text-accent transition-colors duration-fast group-hover:text-accent-light"
              >{{ t("app.tagline") }}</span
            >
          </div>
        </NuxtLink>

        <nav
          class="flex order-3 sm:order-none w-full sm:w-auto justify-center mt-1 sm:mt-0"
        >
          <div class="app-header__nav-groove">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="app-header__nav-item"
              :class="{
                'app-header__nav-item--active': route.path === item.path,
              }"
            >
              <span class="app-header__nav-rune">◆</span>
              <span class="app-header__nav-label">{{ item.label }}</span>
              <span class="app-header__nav-rune">◆</span>
            </NuxtLink>
          </div>
        </nav>

        <div class="flex items-center">
          <TwitchLoginBtn />
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="p-4 sm:p-8 border-t border-poe-border/30">
      <div class="flex items-center justify-center gap-2 group">
        <img
          src="/images/card-back-logo.png"
          alt="Logo"
          class="w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-50 transition-opacity duration-base group-hover:opacity-80"
        />
        <p class="font-body text-xs sm:text-sm text-poe-text-muted m-0">
          {{ t("app.footer") }}
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(12, 12, 14, 0.85);
  border-bottom: 1px solid rgba(42, 42, 48, 0.5);
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.app-header__logo:hover span:first-of-type {
  color: #e0e0e0;
}

.app-header__logo:hover span:last-of-type {
  color: #c97a3a;
}

.app-header__nav-groove {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 3px;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.9) 0%,
    rgba(14, 14, 16, 0.85) 50%,
    rgba(10, 10, 12, 0.9) 100%
  );
  border-radius: 4px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.06),
    0 1px 0 rgba(45, 40, 35, 0.25);
  border: 1px solid rgba(35, 32, 28, 0.7);
  border-top-color: rgba(25, 22, 18, 0.8);
  border-bottom-color: rgba(55, 50, 45, 0.3);
}

@media (min-width: 640px) {
  .app-header__nav-groove {
    gap: 0.25rem;
    padding: 4px;
  }
}

.app-header__nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  font-family: "Cinzel", serif;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 3px;
  transition: all 0.3s ease;
  color: rgba(100, 95, 90, 0.7);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.1);
}

@media (min-width: 640px) {
  .app-header__nav-item {
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    letter-spacing: 0.05em;
  }
}

.app-header__nav-rune {
  font-size: 0.3rem;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s ease;
  display: none;
}

@media (min-width: 640px) {
  .app-header__nav-rune {
    display: inline;
    font-size: 0.4rem;
  }
}

.app-header__nav-item:hover {
  color: rgba(180, 175, 170, 0.9);
}

.app-header__nav-item:hover .app-header__nav-rune {
  opacity: 0.4;
  transform: scale(1);
}

.app-header__nav-item--active {
  color: #c97a3a;
  background: linear-gradient(
    180deg,
    rgba(45, 40, 35, 0.9) 0%,
    rgba(32, 28, 24, 0.95) 50%,
    rgba(28, 24, 20, 0.9) 100%
  );
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), 0 2px 5px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(100, 85, 65, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(80, 65, 50, 0.4);
  text-shadow: 0 0 10px rgba(175, 96, 37, 0.3), 0 1px 2px rgba(0, 0, 0, 0.5);
}

.app-header__nav-item--active .app-header__nav-rune {
  opacity: 0.6;
  transform: scale(1);
  color: #af6025;
}
</style>
