<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const { user, loggedIn } = useUserSession();
const { checkIsAdmin } = useDataSource();

const navItems = computed(() => [
  { path: "/catalogue", label: t("nav.catalogue"), icon: "cards" },
  { path: "/collection", label: t("nav.collection"), icon: "user" },
  { path: "/altar", label: t("nav.altar"), icon: "altar" },
  { path: "/about", label: t("nav.about"), icon: "info" },
]);

const showLegalModal = ref(false);

// Check if current user is an admin (uses Twitch user ID from Supabase)
const isAdmin = ref(false);

// Watch for user changes and check admin status
watch(
  () => user.value?.id,
  async (twitchUserId) => {
    if (twitchUserId && loggedIn.value) {
      isAdmin.value = await checkIsAdmin(twitchUserId);
    } else {
      isAdmin.value = false;
    }
  },
  { immediate: true }
);

// Computed for template usage
const canSeeAdminLink = computed(() => loggedIn.value && isAdmin.value);
</script>

<template>
  <div id="app-wrapper" class="min-h-screen flex flex-col forged-metal">
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
          <!-- Admin link - only visible for admin users -->
          <NuxtLink
            v-if="canSeeAdminLink"
            to="/admin"
            class="admin-link"
            :title="t('admin.title')"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1 main-content">
      <div class="page-backdrop" aria-hidden="true">
        <div class="page-backdrop__corner page-backdrop__corner--tl"></div>
        <div class="page-backdrop__corner page-backdrop__corner--tr"></div>
        <div class="page-backdrop__corner page-backdrop__corner--bl"></div>
        <div class="page-backdrop__corner page-backdrop__corner--br"></div>
      </div>
      <div class="main-content__inner">
        <slot />
      </div>
    </main>

    <footer class="app-footer">
      <div class="flex flex-col items-center gap-3 p-4 sm:p-6">
        <!-- Original footer content -->
        <div class="flex items-center gap-2 group">
          <img
            src="/images/vaal-risitas.png"
            alt="Logo"
            class="w-5 h-5 sm:w-6 sm:h-6 object-contain opacity-50 transition-opacity duration-base group-hover:opacity-80"
          />
          <p class="font-body text-xs sm:text-sm text-poe-text-muted m-0">
            {{ t("app.footer") }}
          </p>
        </div>

        <!-- Disclaimer line -->
        <div class="footer-disclaimer">
          <span class="footer-disclaimer__rune">◆</span>
          <p class="footer-disclaimer__text">
            {{ t("footer.disclaimer") }}
          </p>
          <span class="footer-disclaimer__separator">·</span>
          <button
            type="button"
            class="footer-disclaimer__link"
            @click="showLegalModal = true"
          >
            {{ t("footer.legal_link") }}
          </button>
          <span class="footer-disclaimer__rune">◆</span>
        </div>
      </div>
    </footer>

    <!-- Legal Modal -->
    <LegalModal v-model="showLegalModal" />

    <!-- Activity Logs Panel -->
    <ActivityLogsPanel />

    <!-- Activity Notifications (toast notifications when panel is closed) -->
    <ActivityNotifications />
  </div>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(12, 12, 14, 0.98);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.02), 0 4px 20px rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(50, 45, 40, 0.25);
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

/* Admin Link */
.admin-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: linear-gradient(
    180deg,
    rgba(35, 32, 28, 0.9) 0%,
    rgba(25, 22, 18, 0.95) 100%
  );
  border: 1px solid rgba(80, 70, 60, 0.4);
  border-radius: 4px;
  color: rgba(175, 96, 37, 0.7);
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(100, 85, 65, 0.1);
}

.admin-link:hover {
  background: linear-gradient(
    180deg,
    rgba(45, 40, 35, 0.95) 0%,
    rgba(35, 30, 25, 0.98) 100%
  );
  border-color: rgba(175, 96, 37, 0.5);
  color: #c97a3a;
  box-shadow: 0 0 10px rgba(175, 96, 37, 0.2), 0 2px 6px rgba(0, 0, 0, 0.4);
}

.admin-link svg {
  transition: transform 0.3s ease;
}

.admin-link:hover svg {
  transform: rotate(45deg);
}

.forged-metal {
  position: relative;
  background: #0a0a0c;
}

.main-content {
  position: relative;
  margin: 16px 12px;
}

@media (min-width: 640px) {
  .main-content {
    margin: 20px 16px;
  }
}
@media (min-width: 1024px) {
  .main-content {
    margin: 24px 24px;
  }
}

.main-content__inner {
  position: relative;
  z-index: 2;
}

.page-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: 6px;
  background: rgba(10, 10, 12, 0.97);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.015), inset 0 1px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(35, 33, 30, 0.4);
}

.app-footer {
  position: relative;
  z-index: 10;
  background: rgba(10, 10, 12, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 -4px 16px rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(40, 38, 35, 0.35);
}

/* Footer Disclaimer */
.footer-disclaimer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-disclaimer__rune {
  font-size: 0.375rem;
  color: rgba(80, 70, 60, 0.4);
  display: none;
}

@media (min-width: 640px) {
  .footer-disclaimer__rune {
    display: inline;
  }
}

.footer-disclaimer__text {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  color: rgba(100, 95, 90, 0.6);
  text-align: center;
}

@media (min-width: 640px) {
  .footer-disclaimer__text {
    font-size: 0.75rem;
  }
}

.footer-disclaimer__separator {
  color: rgba(80, 70, 60, 0.4);
  font-size: 0.75rem;
}

.footer-disclaimer__link {
  background: none;
  border: none;
  padding: 0;
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  color: rgba(175, 96, 37, 0.7);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

@media (min-width: 640px) {
  .footer-disclaimer__link {
    font-size: 0.75rem;
  }
}

.footer-disclaimer__link:hover {
  color: #c97a3a;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.page-backdrop__corner {
  position: absolute;
  pointer-events: none;
  z-index: 2;
}

.page-backdrop__corner--tl {
  top: 12px;
  left: 12px;
  width: 30px;
  height: 30px;
}
.page-backdrop__corner--tl::before {
  content: "";
  position: absolute;
  width: 30px;
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(175, 96, 37, 0.4),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}
.page-backdrop__corner--tl::after {
  content: "";
  position: absolute;
  width: 1px;
  height: 30px;
  background: linear-gradient(
    to bottom,
    rgba(175, 96, 37, 0.4),
    rgba(80, 70, 55, 0.2),
    transparent
  );
}

.page-backdrop__corner--tr {
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
}
.page-backdrop__corner--tr::before {
  content: "";
  position: absolute;
  right: 0;
  width: 20px;
  height: 1px;
  background: linear-gradient(to left, rgba(80, 70, 55, 0.35), transparent);
}
.page-backdrop__corner--tr::after {
  content: "";
  position: absolute;
  right: 0;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, rgba(80, 70, 55, 0.35), transparent);
}

.page-backdrop__corner--bl {
  bottom: 12px;
  left: 12px;
  width: 16px;
  height: 16px;
}
.page-backdrop__corner--bl::before {
  content: "";
  position: absolute;
  bottom: 0;
  width: 16px;
  height: 1px;
  background: linear-gradient(to right, rgba(80, 70, 55, 0.25), transparent);
}
.page-backdrop__corner--bl::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 16px;
  background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent);
}

.page-backdrop__corner--br {
  bottom: 12px;
  right: 12px;
  width: 35px;
  height: 35px;
}
.page-backdrop__corner--br::before {
  content: "";
  position: absolute;
  bottom: 0;
  right: 0;
  width: 35px;
  height: 1px;
  background: linear-gradient(
    to left,
    rgba(175, 96, 37, 0.3),
    rgba(80, 70, 55, 0.15),
    transparent
  );
}
.page-backdrop__corner--br::after {
  content: "";
  position: absolute;
  bottom: 0;
  right: 0;
  width: 1px;
  height: 35px;
  background: linear-gradient(
    to top,
    rgba(175, 96, 37, 0.3),
    rgba(80, 70, 55, 0.15),
    transparent
  );
}
</style>
