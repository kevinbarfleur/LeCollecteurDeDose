<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const navItems = computed(() => [
  { path: "/catalogue", label: t("nav.catalogue"), icon: "cards" },
  { path: "/collection", label: t("nav.collection"), icon: "user" },
  { path: "/altar", label: t("nav.altar"), icon: "altar" },
  { path: "/about", label: t("nav.about"), icon: "info" },
]);

const showSettings = ref(false);
const showLegalModal = ref(false);
</script>

<template>
  <div class="min-h-screen flex flex-col forged-metal">
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
            src="/images/card-back-logo.png"
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
  </div>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(
    180deg,
    rgba(14, 14, 16, 0.98) 0%,
    rgba(10, 10, 12, 0.95) 50%,
    rgba(8, 8, 10, 0.98) 100%
  );
  box-shadow: inset 0 -4px 12px rgba(0, 0, 0, 0.6),
    inset 0 2px 4px rgba(50, 45, 40, 0.04), 0 4px 16px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(50, 45, 40, 0.15);
  border-bottom: 1px solid rgba(55, 50, 45, 0.3);
}

.app-header::before {
  content: "";
  position: absolute;
  bottom: 8px;
  left: 12px;
  width: 25px;
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(175, 96, 37, 0.35),
    rgba(80, 70, 55, 0.15),
    transparent
  );
  pointer-events: none;
}

.app-header::after {
  content: "";
  position: absolute;
  bottom: 8px;
  right: 12px;
  width: 20px;
  height: 1px;
  background: linear-gradient(to left, rgba(80, 70, 55, 0.25), transparent);
  pointer-events: none;
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

.forged-metal {
  position: relative;
  background: #0a0a0c;
}

.forged-metal::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(
      127deg,
      transparent 7.8%,
      rgba(200, 140, 60, 0.15) 7.802%,
      transparent 7.804%
    ),
    linear-gradient(
      124deg,
      transparent 9.2%,
      rgba(90, 70, 40, 0.06) 9.201%,
      transparent 9.202%
    ),
    linear-gradient(
      131deg,
      transparent 11.5%,
      rgba(180, 120, 50, 0.04) 11.501%,
      transparent 11.502%
    ),
    linear-gradient(
      -38deg,
      transparent 84.5%,
      rgba(175, 96, 37, 0.1) 84.501%,
      transparent 84.502%
    ),
    linear-gradient(
      -41deg,
      transparent 86.1%,
      rgba(120, 85, 50, 0.05) 86.101%,
      transparent 86.102%
    ),
    linear-gradient(
      -36deg,
      transparent 82.8%,
      rgba(210, 160, 80, 0.12) 82.801%,
      transparent 82.802%
    ),
    linear-gradient(
      163deg,
      transparent 71.3%,
      rgba(180, 120, 50, 0.11) 71.301%,
      transparent 71.302%
    ),
    linear-gradient(
      168deg,
      transparent 74.8%,
      rgba(100, 75, 45, 0.04) 74.801%,
      transparent 74.802%
    ),
    linear-gradient(
      161deg,
      transparent 69.1%,
      rgba(150, 100, 45, 0.07) 69.101%,
      transparent 69.102%
    ),
    linear-gradient(
      93deg,
      transparent 2.4%,
      rgba(160, 100, 40, 0.08) 2.401%,
      transparent 2.402%
    ),
    linear-gradient(
      96deg,
      transparent 4.1%,
      rgba(80, 60, 35, 0.03) 4.101%,
      transparent 4.102%
    ),
    linear-gradient(
      91deg,
      transparent 1.2%,
      rgba(190, 130, 55, 0.13) 1.201%,
      transparent 1.202%
    ),
    linear-gradient(
      -62deg,
      transparent 14.2%,
      rgba(190, 130, 55, 0.12) 14.201%,
      transparent 14.202%
    ),
    linear-gradient(
      -58deg,
      transparent 17.5%,
      rgba(110, 80, 45, 0.05) 17.501%,
      transparent 17.502%
    ),
    linear-gradient(
      -66deg,
      transparent 12.8%,
      rgba(170, 115, 50, 0.08) 12.801%,
      transparent 12.802%
    ),
    linear-gradient(
      174deg,
      transparent 44.6%,
      rgba(170, 110, 45, 0.07) 44.601%,
      transparent 44.602%
    ),
    linear-gradient(
      52deg,
      transparent 87.3%,
      rgba(200, 150, 70, 0.14) 87.301%,
      transparent 87.302%
    ),
    linear-gradient(
      58deg,
      transparent 89.8%,
      rgba(100, 70, 40, 0.04) 89.801%,
      transparent 89.802%
    ),
    linear-gradient(
      48deg,
      transparent 85.2%,
      rgba(220, 170, 80, 0.09) 85.201%,
      transparent 85.202%
    ),
    linear-gradient(
      -18deg,
      transparent 4.7%,
      rgba(150, 100, 50, 0.06) 4.701%,
      transparent 4.702%
    ),
    linear-gradient(
      -22deg,
      transparent 6.9%,
      rgba(180, 125, 55, 0.1) 6.901%,
      transparent 6.902%
    );
}

.forged-metal::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(
      144deg,
      transparent 24.3%,
      rgba(185, 125, 50, 0.09) 24.301%,
      transparent 24.302%
    ),
    linear-gradient(
      139deg,
      transparent 28.1%,
      rgba(95, 70, 40, 0.03) 28.101%,
      transparent 28.102%
    ),
    linear-gradient(
      147deg,
      transparent 21.6%,
      rgba(210, 155, 65, 0.12) 21.601%,
      transparent 21.602%
    ),
    linear-gradient(
      -78deg,
      transparent 91.4%,
      rgba(200, 140, 60, 0.11) 91.401%,
      transparent 91.402%
    ),
    linear-gradient(
      -83deg,
      transparent 93.7%,
      rgba(110, 80, 45, 0.04) 93.701%,
      transparent 93.702%
    ),
    linear-gradient(
      -75deg,
      transparent 89.2%,
      rgba(175, 120, 55, 0.08) 89.201%,
      transparent 89.202%
    ),
    linear-gradient(
      176deg,
      transparent 81.2%,
      rgba(165, 105, 45, 0.08) 81.201%,
      transparent 81.202%
    ),
    linear-gradient(
      -47deg,
      transparent 59.5%,
      rgba(180, 120, 55, 0.06) 59.501%,
      transparent 59.502%
    ),
    linear-gradient(
      -52deg,
      transparent 62.8%,
      rgba(90, 65, 35, 0.02) 62.801%,
      transparent 62.802%
    ),
    linear-gradient(
      -44deg,
      transparent 56.1%,
      rgba(195, 135, 60, 0.1) 56.101%,
      transparent 56.102%
    ),
    linear-gradient(
      112deg,
      transparent 33.4%,
      rgba(195, 135, 55, 0.1) 33.401%,
      transparent 33.402%
    ),
    linear-gradient(
      107deg,
      transparent 36.9%,
      rgba(105, 75, 42, 0.04) 36.901%,
      transparent 36.902%
    ),
    linear-gradient(
      118deg,
      transparent 30.2%,
      rgba(215, 160, 70, 0.13) 30.201%,
      transparent 30.202%
    ),
    linear-gradient(
      -28deg,
      transparent 78.6%,
      rgba(175, 115, 50, 0.07) 78.601%,
      transparent 78.602%
    ),
    linear-gradient(
      68deg,
      transparent 42.1%,
      rgba(210, 155, 70, 0.14) 42.101%,
      transparent 42.102%
    ),
    linear-gradient(
      73deg,
      transparent 45.5%,
      rgba(100, 72, 38, 0.03) 45.501%,
      transparent 45.502%
    ),
    linear-gradient(
      64deg,
      transparent 39.8%,
      rgba(185, 130, 55, 0.08) 39.801%,
      transparent 39.802%
    ),
    linear-gradient(
      155deg,
      transparent 52.3%,
      rgba(170, 115, 50, 0.05) 52.301%,
      transparent 52.302%
    ),
    linear-gradient(
      -8deg,
      transparent 95.1%,
      rgba(200, 145, 60, 0.11) 95.101%,
      transparent 95.102%
    ),
    linear-gradient(
      182deg,
      transparent 67.4%,
      rgba(155, 105, 48, 0.06) 67.401%,
      transparent 67.402%
    );
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
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(12, 12, 14, 0.95) 30%,
    rgba(10, 10, 12, 0.96) 70%,
    rgba(6, 6, 8, 0.99) 100%
  );
  box-shadow: inset 0 6px 20px rgba(0, 0, 0, 0.8),
    inset 0 2px 4px rgba(0, 0, 0, 0.9), inset 0 -2px 6px rgba(50, 45, 40, 0.06),
    inset 4px 0 12px rgba(0, 0, 0, 0.5), inset -4px 0 12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(35, 33, 30, 0.6);
  border-top-color: rgba(25, 23, 20, 0.7);
  border-bottom-color: rgba(55, 50, 45, 0.25);
}

.page-backdrop::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: radial-gradient(
      ellipse at 20% 15%,
      rgba(50, 45, 38, 0.025) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 80% 85%,
      rgba(35, 30, 25, 0.03) 0%,
      transparent 40%
    );
  pointer-events: none;
}

.app-footer {
  position: relative;
  z-index: 10;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.98) 0%,
    rgba(10, 10, 12, 0.95) 50%,
    rgba(12, 12, 14, 0.98) 100%
  );
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.6),
    inset 0 -2px 4px rgba(50, 45, 40, 0.04), 0 -2px 12px rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(35, 33, 30, 0.5);
}

.app-footer::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 12px;
  width: 18px;
  height: 1px;
  background: linear-gradient(to right, rgba(80, 70, 55, 0.2), transparent);
  pointer-events: none;
}

.app-footer::after {
  content: "";
  position: absolute;
  top: 8px;
  right: 12px;
  width: 28px;
  height: 1px;
  background: linear-gradient(
    to left,
    rgba(175, 96, 37, 0.3),
    rgba(80, 70, 55, 0.12),
    transparent
  );
  pointer-events: none;
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
