<script setup lang="ts">
import { mockUserCollection } from "~/data/mockCards";
import type { Card, CardTier } from "~/types/card";

// SEO
useHead({
  title: "Ma Collection - Le Collecteur de Dose",
});

// Auth state from nuxt-auth-utils
const { loggedIn, user: authUser } = useUserSession();

// Reactive user data
const user = computed(() => ({
  name: authUser.value?.displayName || "Test User",
  avatar:
    authUser.value?.avatar ||
    "https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png",
}));

// Collection data
const collection = computed(() => mockUserCollection);

// Group cards by id to count duplicates and collect all instances
const groupedCards = computed(() => {
  const groups = new Map<string, { cards: Card[]; count: number }>();

  collection.value.forEach((card) => {
    const existing = groups.get(card.id);
    if (existing) {
      existing.cards.push(card);
      existing.count++;
    } else {
      groups.set(card.id, { cards: [card], count: 1 });
    }
  });

  // Convert to array and sort by tier
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
  return Array.from(groups.values()).sort(
    (a, b) => tierOrder[a.cards[0].tier] - tierOrder[b.cards[0].tier]
  );
});

// Stats
const stats = computed(() => {
  const cards = collection.value;
  return {
    total: cards.length,
    unique: groupedCards.value.length,
    t0: cards.filter((c) => c.tier === "T0").length,
    t1: cards.filter((c) => c.tier === "T1").length,
    t2: cards.filter((c) => c.tier === "T2").length,
    t3: cards.filter((c) => c.tier === "T3").length,
  };
});

// Filters
const showDuplicates = ref(false);
const selectedTier = ref<CardTier | "all">("all");

const tierOptions = [
  { value: "all", label: "Tous", color: "default" },
  { value: "T0", label: "T0", color: "t0" },
  { value: "T1", label: "T1", color: "t1" },
  { value: "T2", label: "T2", color: "t2" },
  { value: "T3", label: "T3", color: "t3" },
];

// Filtered grouped cards (for stack view - default mode)
const filteredGroupedCards = computed(() => {
  let groups = groupedCards.value;

  if (selectedTier.value !== "all") {
    groups = groups.filter((g) => g.cards[0].tier === selectedTier.value);
  }

  return groups;
});

// Filtered individual cards (for duplicates view)
const filteredIndividualCards = computed(() => {
  let cards = collection.value;

  if (selectedTier.value !== "all") {
    cards = cards.filter((card) => card.tier === selectedTier.value);
  }

  return cards;
});
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <!-- Not authenticated -->
      <div v-if="!loggedIn" class="collection-auth">
        <div class="collection-auth__card">
          <!-- Corner decorations -->
          <div
            class="collection-auth__corner collection-auth__corner--tl"
          ></div>
          <div
            class="collection-auth__corner collection-auth__corner--tr"
          ></div>
          <div
            class="collection-auth__corner collection-auth__corner--bl"
          ></div>
          <div
            class="collection-auth__corner collection-auth__corner--br"
          ></div>

          <div class="collection-auth__icon">
            <img
              src="/images/logo.png"
              alt="Logo"
              class="collection-auth__logo"
            />
          </div>
          <h1 class="collection-auth__title">Prouve ton existence</h1>
          <p class="collection-auth__text">
            Les ténèbres ne reconnaissent que ceux qui ont prouvé leur identité,
            exile.
          </p>
          <RunicButton
            href="/auth/twitch"
            :external="false"
            variant="twitch"
            icon="twitch"
            rune-left="✦"
            rune-right="✦"
          >
            Invoquer Twitch
          </RunicButton>
        </div>
      </div>

      <!-- Authenticated -->
      <div v-if="loggedIn">
        <!-- Profile & Stats Hero - Runic tablet style -->
        <div class="collection-hero">
          <!-- Left: User Profile -->
          <div class="collection-profile">
            <div class="collection-profile__avatar-wrapper">
              <div class="collection-profile__avatar-ring"></div>
              <img
                :src="user.avatar"
                :alt="user.name"
                class="collection-profile__avatar"
              />
            </div>
            <div class="collection-profile__info">
              <h1 class="collection-profile__name">{{ user.name }}</h1>
              <div class="collection-profile__subtitle">
                <span class="collection-profile__rune">◆</span>
                <span>Exile</span>
                <span class="collection-profile__rune">◆</span>
              </div>
            </div>
          </div>

          <!-- Center: Main Stats - Large engraved numbers -->
          <div class="collection-main-stats">
            <div class="collection-main-stats__item">
              <span class="collection-main-stats__rune">◆</span>
              <span class="collection-main-stats__value">{{
                stats.total
              }}</span>
              <span class="collection-main-stats__rune">◆</span>
              <span class="collection-main-stats__label">Cartes</span>
            </div>
            <div class="collection-main-stats__divider"></div>
            <div class="collection-main-stats__item">
              <span class="collection-main-stats__rune">◆</span>
              <span class="collection-main-stats__value">{{
                stats.unique
              }}</span>
              <span class="collection-main-stats__rune">◆</span>
              <span class="collection-main-stats__label">Uniques</span>
            </div>
          </div>

          <!-- Right: Tier Breakdown - Compact runic tiles -->
          <div class="collection-tiers">
            <div
              v-for="tier in ['T0', 'T1', 'T2', 'T3'] as const"
              :key="tier"
              class="collection-tiers__item"
              :class="`collection-tiers__item--${tier.toLowerCase()}`"
            >
              <span class="collection-tiers__value">{{
                stats[tier.toLowerCase() as keyof typeof stats]
              }}</span>
              <span class="collection-tiers__label">{{ tier }}</span>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="collection-toolbar">
          <div class="collection-toolbar__toggle-wrapper">
            <RunicRadio
              v-model="showDuplicates"
              :toggle="true"
              toggle-color="default"
              size="sm"
            />
            <span class="collection-toolbar__toggle-label"
              >Révéler les doublons</span
            >
          </div>

          <RunicRadio v-model="selectedTier" :options="tierOptions" size="md" />
        </div>

        <!-- Cards grid - Stack mode (default) -->
        <CardGrid
          v-if="!showDuplicates"
          :grouped-cards="filteredGroupedCards"
          empty-message="Ton inventaire est aussi vide que ton âme. Prouve ta dévotion sur le stream."
        />

        <!-- Cards grid - Individual mode (duplicates) -->
        <CardGrid
          v-else
          :cards="filteredIndividualCards"
          empty-message="Ton inventaire est aussi vide que ton âme. Prouve ta dévotion sur le stream."
        />
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
/* Auth view */
.collection-auth {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-auth__card {
  position: relative;
  text-align: center;
  padding: 3rem;
  max-width: 400px;

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
    /* Deep inner shadow */ inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8),
    /* Top highlight - subtle worn edge */ inset 0 1px 0 rgba(60, 55, 50, 0.15),
    /* Outer glow and depth */ 0 2px 8px rgba(0, 0, 0, 0.6),
    0 0 1px rgba(0, 0, 0, 0.8);

  /* Worn stone border */
  border: 1px solid rgba(45, 42, 38, 0.4);
  border-top-color: rgba(60, 55, 50, 0.3);
  border-bottom-color: rgba(25, 22, 18, 0.6);
}

.collection-auth__card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 30% 20%,
      rgba(60, 55, 50, 0.03) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      rgba(40, 35, 30, 0.04) 0%,
      transparent 40%
    );
  pointer-events: none;
  border-radius: 5px;
}

/* Corner decorations */
.collection-auth__corner {
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.collection-auth__corner::before,
.collection-auth__corner::after {
  content: "";
  position: absolute;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(90, 85, 75, 0.3) 50%,
    transparent 100%
  );
}

.collection-auth__corner::before {
  width: 100%;
  height: 1px;
}

.collection-auth__corner::after {
  width: 1px;
  height: 100%;
}

.collection-auth__corner--tl {
  top: 8px;
  left: 8px;
}

.collection-auth__corner--tl::before {
  top: 0;
  left: 0;
}

.collection-auth__corner--tl::after {
  top: 0;
  left: 0;
}

.collection-auth__corner--tr {
  top: 8px;
  right: 8px;
}

.collection-auth__corner--tr::before {
  top: 0;
  right: 0;
}

.collection-auth__corner--tr::after {
  top: 0;
  right: 0;
}

.collection-auth__corner--bl {
  bottom: 8px;
  left: 8px;
}

.collection-auth__corner--bl::before {
  bottom: 0;
  left: 0;
}

.collection-auth__corner--bl::after {
  bottom: 0;
  left: 0;
}

.collection-auth__corner--br {
  bottom: 8px;
  right: 8px;
}

.collection-auth__corner--br::before {
  bottom: 0;
  right: 0;
}

.collection-auth__corner--br::after {
  bottom: 0;
  right: 0;
}

.collection-auth__icon {
  width: 160px;
  height: 160px;
  margin: 0 auto 1.5rem;
}

.collection-auth__icon svg {
  width: 100%;
  height: 100%;
}

.collection-auth__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.collection-auth__title {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  color: #c8c8c8;
  margin-bottom: 0.75rem;
}

.collection-auth__text {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: #7f7f7f;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* ===========================================
   COLLECTION HERO SECTION - Runic carved tablet
   =========================================== */
.collection-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;

  /* Deep carved stone tablet */
  background: linear-gradient(
    180deg,
    rgba(12, 12, 14, 0.95) 0%,
    rgba(18, 18, 20, 0.9) 30%,
    rgba(15, 15, 17, 0.95) 70%,
    rgba(10, 10, 12, 0.98) 100%
  );

  border-radius: 6px;

  /* Multi-layered carved effect */
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.7),
    inset 0 1px 3px rgba(0, 0, 0, 0.8), inset 0 -2px 4px rgba(50, 45, 40, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(50, 45, 40, 0.25);

  border: 1px solid rgba(40, 38, 35, 0.7);
  border-top-color: rgba(30, 28, 25, 0.8);
  border-bottom-color: rgba(60, 55, 50, 0.3);
}

/* Stone texture overlay */
.collection-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 30% 20%,
      rgba(60, 55, 50, 0.03) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      rgba(40, 35, 30, 0.04) 0%,
      transparent 40%
    );
  pointer-events: none;
  border-radius: 5px;
}

/* Corner decorative runes */
.collection-hero::after {
  content: "◆";
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.3);
  pointer-events: none;
}

@media (min-width: 768px) {
  .collection-hero {
    grid-template-columns: auto 1fr auto;
    align-items: center;
    padding: 2rem 2.5rem;
  }
}

/* ===========================================
   PROFILE SECTION
   =========================================== */
.collection-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collection-profile__avatar-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
}

.collection-profile__avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(175, 96, 37, 0.7) 0%,
    rgba(175, 96, 37, 0.15) 25%,
    rgba(175, 96, 37, 0.7) 50%,
    rgba(175, 96, 37, 0.15) 75%,
    rgba(175, 96, 37, 0.7) 100%
  );
  animation: ring-rotate 8s linear infinite;
}

@keyframes ring-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.collection-profile__avatar-ring::before {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #0a0a0c;
}

.collection-profile__avatar {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  z-index: 1;
}

.collection-profile__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.collection-profile__name {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #e8e8e8;
  letter-spacing: 0.5px;
  margin: 0;
}

.collection-profile__subtitle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  color: #6a6a70;
  font-style: italic;
}

.collection-profile__rune {
  font-size: 0.5rem;
  color: var(--color-accent, #af6025);
  opacity: 0.7;
}

/* ===========================================
   MAIN STATS - Engraved numbers
   =========================================== */
.collection-main-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem 0;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .collection-main-stats {
    padding: 0 3rem;
    border-left: 1px solid rgba(50, 48, 45, 0.25);
    border-right: 1px solid rgba(50, 48, 45, 0.25);
  }
}

.collection-main-stats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.collection-main-stats__rune {
  display: inline-block;
  font-size: 0.5rem;
  color: rgba(100, 90, 75, 0.4);
  margin: 0 0.25rem;
}

.collection-main-stats__value {
  font-family: "Cinzel", serif;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;

  /* Engraved text effect */
  color: #d0d0d0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 25px rgba(175, 96, 37, 0.12),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

.collection-main-stats__label {
  font-family: "Cinzel", serif;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;

  /* Engraved look */
  color: rgba(100, 95, 90, 0.7);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.1);
}

.collection-main-stats__divider {
  width: 1px;
  height: 45px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(80, 70, 60, 0.3),
    transparent
  );
}

/* ===========================================
   TIER BREAKDOWN - Runic carved tiles
   =========================================== */
.collection-tiers {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .collection-tiers {
    justify-content: flex-end;
  }
}

.collection-tiers__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;

  /* Deep carved stone tile */
  background: linear-gradient(
    180deg,
    rgba(20, 20, 22, 0.95) 0%,
    rgba(15, 15, 17, 0.9) 50%,
    rgba(12, 12, 14, 0.95) 100%
  );

  border-radius: 4px;

  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.3);

  border: 1px solid rgba(45, 42, 38, 0.6);
  border-top-color: rgba(35, 32, 28, 0.7);
  border-bottom-color: rgba(60, 55, 50, 0.25);

  transition: all 0.3s ease;
}

.collection-tiers__item:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 3px 8px rgba(0, 0, 0, 0.4),
    0 0 15px var(--tier-glow, rgba(80, 70, 60, 0.1));
}

.collection-tiers__value {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;

  /* Engraved effect */
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 -1px 0 rgba(255, 255, 255, 0.03);
}

.collection-tiers__label {
  font-family: "Cinzel", serif;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 2px;

  /* Engraved look */
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.08);
  opacity: 0.7;
}

/* Tier colors */
/* T0 - Gold */
.collection-tiers__item--t0 {
  --tier-glow: rgba(201, 162, 39, 0.15);
  border-color: rgba(201, 162, 39, 0.2);
}
.collection-tiers__item--t0 .collection-tiers__value {
  color: #c9a227;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(201, 162, 39, 0.2);
}
.collection-tiers__item--t0 .collection-tiers__label {
  color: rgba(201, 162, 39, 0.7);
}

/* T1 - Purple */
.collection-tiers__item--t1 {
  --tier-glow: rgba(122, 106, 138, 0.15);
  border-color: rgba(122, 106, 138, 0.2);
}
.collection-tiers__item--t1 .collection-tiers__value {
  color: #9a8aaa;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(122, 106, 138, 0.2);
}
.collection-tiers__item--t1 .collection-tiers__label {
  color: rgba(122, 106, 138, 0.7);
}

/* T2 - Blue/Steel */
.collection-tiers__item--t2 {
  --tier-glow: rgba(90, 112, 128, 0.15);
  border-color: rgba(90, 112, 128, 0.2);
}
.collection-tiers__item--t2 .collection-tiers__value {
  color: #7a9aaa;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(90, 112, 128, 0.2);
}
.collection-tiers__item--t2 .collection-tiers__label {
  color: rgba(90, 112, 128, 0.7);
}

/* T3 - Gray/Iron */
.collection-tiers__item--t3 {
  --tier-glow: rgba(90, 90, 95, 0.1);
  border-color: rgba(70, 70, 75, 0.2);
}
.collection-tiers__item--t3 .collection-tiers__value {
  color: #7a7a80;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8);
}
.collection-tiers__item--t3 .collection-tiers__label {
  color: rgba(90, 90, 95, 0.6);
}

/* ===========================================
   TOOLBAR / FILTERS
   =========================================== */
.collection-toolbar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem 1.25rem;
  background: rgba(15, 15, 18, 0.6);
  border: 1px solid rgba(40, 40, 45, 0.4);
  border-radius: 12px;
}

@media (min-width: 640px) {
  .collection-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

/* Toggle Wrapper */
.collection-toolbar__toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collection-toolbar__toggle-label {
  font-family: "Crimson Text", serif;
  font-size: 0.9rem;
  color: #7a7a80;
  transition: color 0.3s ease;
}
</style>
