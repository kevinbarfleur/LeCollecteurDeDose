<script setup lang="ts">
const route = useRoute();

const navItems = [
  { path: "/catalogue", label: "Catalogue", icon: "cards" },
  { path: "/collection", label: "Ma Collection", icon: "user" },
  { path: "/about", label: "À propos", icon: "info" },
];
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="app-header__container">
        <!-- Logo -->
        <NuxtLink to="/" class="app-header__logo">
          <img
            :src="'/images/logo.png'"
            alt="Logo Le Collecteur de Dose"
            class="app-header__logo-img"
          />
          <div class="app-header__logo-text-wrapper">
            <span class="app-header__logo-text">Le Collecteur</span>
            <span class="app-header__logo-accent">de Dose</span>
          </div>
        </NuxtLink>

        <!-- Navigation - Runic tablet style -->
        <nav class="app-header__nav">
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

        <!-- Auth -->
        <div class="app-header__auth">
          <TwitchLoginBtn />
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="app-main">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="app-footer__content">
        <img
          src="/images/card-back-logo.png"
          alt="Logo"
          class="app-footer__logo"
        />
        <p>Vaal or no balls</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(12, 12, 14, 0.85);
  border-bottom: 1px solid rgba(42, 42, 48, 0.5);
}

.app-header__container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.app-header__logo {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.app-header__logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  transition: transform 0.2s ease;
}

.app-header__logo-text-wrapper {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.app-header__logo-text {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #c8c8c8;
  transition: color 0.2s ease;
}

.app-header__logo-accent {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  font-style: italic;
  color: #af6025;
  transition: color 0.2s ease;
}

.app-header__logo:hover .app-header__logo-img {
  transform: scale(1.05);
}

.app-header__logo:hover .app-header__logo-text {
  color: #e0e0e0;
}

.app-header__logo:hover .app-header__logo-accent {
  color: #c97a3a;
}

.app-header__nav {
  display: flex;
}

/* Runic groove container for nav */
.app-header__nav-groove {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 4px;

  /* Carved groove effect */
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

.app-header__nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-family: "Cinzel", serif;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 3px;
  transition: all 0.3s ease;

  /* Engraved text look */
  color: rgba(100, 95, 90, 0.7);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.1);
}

.app-header__nav-rune {
  font-size: 0.4rem;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s ease;
}

.app-header__nav-item:hover {
  color: rgba(180, 175, 170, 0.9);
}

.app-header__nav-item:hover .app-header__nav-rune {
  opacity: 0.4;
  transform: scale(1);
}

/* Active state - raised stone tablet */
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

.app-header__auth {
  display: flex;
  align-items: center;
}

.app-main {
  flex: 1;
}

.app-footer {
  padding: 2rem;
  border-top: 1px solid rgba(42, 42, 48, 0.3);
}

.app-footer__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.app-footer__logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.app-footer__content:hover .app-footer__logo {
  opacity: 0.8;
}

.app-footer p {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  color: #4a4a55;
  margin: 0;
}

@media (max-width: 640px) {
  .app-header__container {
    flex-wrap: wrap;
  }

  .app-header__nav {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 0.5rem;
  }
}
</style>
