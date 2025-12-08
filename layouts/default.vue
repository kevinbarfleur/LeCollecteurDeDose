<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const navItems = computed(() => [
  { path: "/catalogue", label: t("nav.catalogue"), icon: "cards" },
  { path: "/collection", label: t("nav.collection"), icon: "user" },
  { path: "/about", label: t("nav.about"), icon: "info" },
]);

// Settings modal state
const showSettings = ref(false);
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

        <div class="flex items-center gap-3">
          <TwitchLoginBtn />
          <!-- Settings Button - Commented out for now
          <button
            type="button"
            class="app-header__settings-btn"
            aria-label="Paramètres"
            @click="showSettings = true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          -->
        </div>
      </div>
    </header>

    <!-- Settings Modal - Commented out for now
    <SettingsModal v-model="showSettings" />
    -->

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

/* Settings Button - Same size as logout button */
.app-header__settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  margin-left: 0.5rem;
  background: linear-gradient(
    180deg,
    rgba(30, 25, 20, 0.95) 0%,
    rgba(15, 12, 10, 0.98) 100%
  );
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 0 rgba(80, 70, 60, 0.15), 0 2px 8px rgba(0, 0, 0, 0.4);
}

.app-header__settings-btn::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(60, 50, 40, 0.2);
  border-radius: 1px;
  pointer-events: none;
}

.app-header__settings-btn svg {
  width: 12px;
  height: 12px;
  color: rgba(140, 130, 120, 0.7);
  transition: all 0.3s ease;
}

.app-header__settings-btn:hover {
  border-color: rgba(100, 85, 70, 0.5);
  box-shadow: inset 0 1px 0 rgba(100, 85, 70, 0.2),
    0 4px 15px rgba(0, 0, 0, 0.4);
}

.app-header__settings-btn:hover svg {
  color: rgba(160, 145, 130, 0.9);
  transform: rotate(45deg);
}

@media (min-width: 640px) {
  .app-header__settings-btn svg {
    width: 14px;
    height: 14px;
  }
}
</style>
