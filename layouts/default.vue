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

        <!-- Navigation -->
        <nav class="app-header__nav">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="app-header__nav-item"
            :class="{
              'app-header__nav-item--active': route.path === item.path,
            }"
          >
            {{ item.label }}
          </NuxtLink>
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
  gap: 0.5rem;
}

.app-header__nav-item {
  padding: 0.5rem 1rem;
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: #7f7f7f;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.app-header__nav-item:hover {
  color: #c8c8c8;
  background: rgba(255, 255, 255, 0.05);
}

.app-header__nav-item--active {
  color: #af6025;
  background: rgba(175, 96, 37, 0.1);
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
