<script setup lang="ts">
import { mockUserCollection } from '~/data/mockCards'
import type { Card, CardTier } from '~/types/card'

// SEO
useHead({
  title: 'Ma Collection - Le Collecteur de Dose'
})

// Auth state from nuxt-auth-utils
const { loggedIn, user: authUser } = useUserSession()

// Reactive user data
const user = computed(() => ({
  name: authUser.value?.displayName || 'Test User',
  avatar: authUser.value?.avatar || 'https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png'
}))

// Collection data
const collection = computed(() => mockUserCollection)

// Group cards by id to count duplicates and collect all instances
const groupedCards = computed(() => {
  const groups = new Map<string, { cards: Card[]; count: number }>()
  
  collection.value.forEach(card => {
    const existing = groups.get(card.id)
    if (existing) {
      existing.cards.push(card)
      existing.count++
    } else {
      groups.set(card.id, { cards: [card], count: 1 })
    }
  })
  
  // Convert to array and sort by tier
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 }
  return Array.from(groups.values()).sort(
    (a, b) => tierOrder[a.cards[0].tier] - tierOrder[b.cards[0].tier]
  )
})

// Stats
const stats = computed(() => {
  const cards = collection.value
  return {
    total: cards.length,
    unique: groupedCards.value.length,
    t0: cards.filter(c => c.tier === 'T0').length,
    t1: cards.filter(c => c.tier === 'T1').length,
    t2: cards.filter(c => c.tier === 'T2').length,
    t3: cards.filter(c => c.tier === 'T3').length
  }
})

// Filters
const showDuplicates = ref(false)
const selectedTier = ref<CardTier | 'all'>('all')

// Filtered grouped cards (for stack view - default mode)
const filteredGroupedCards = computed(() => {
  let groups = groupedCards.value
  
  if (selectedTier.value !== 'all') {
    groups = groups.filter(g => g.cards[0].tier === selectedTier.value)
  }
  
  return groups
})

// Filtered individual cards (for duplicates view)
const filteredIndividualCards = computed(() => {
  let cards = collection.value
  
  if (selectedTier.value !== 'all') {
    cards = cards.filter(card => card.tier === selectedTier.value)
  }
  
  return cards
})

</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <!-- Not authenticated -->
      <div v-if="!loggedIn" class="collection-auth">
        <div class="collection-auth__card">
          <div class="collection-auth__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 class="collection-auth__title">Accédez à votre collection</h1>
          <p class="collection-auth__text">
            Connectez-vous avec votre compte Twitch pour voir vos cartes collectées
          </p>
          <a href="/auth/twitch" class="btn-twitch">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
            </svg>
            Connexion avec Twitch
          </a>
        </div>
      </div>

      <!-- Authenticated -->
      <div v-if="loggedIn">
        <!-- Profile & Stats Hero -->
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
                <span>Collectionneur</span>
                <span class="collection-profile__rune">◆</span>
              </div>
            </div>
          </div>

          <!-- Center: Main Stats -->
          <div class="collection-main-stats">
            <div class="collection-main-stats__item">
              <span class="collection-main-stats__value">{{ stats.total }}</span>
              <span class="collection-main-stats__label">Cartes</span>
            </div>
            <div class="collection-main-stats__divider"></div>
            <div class="collection-main-stats__item">
              <span class="collection-main-stats__value">{{ stats.unique }}</span>
              <span class="collection-main-stats__label">Uniques</span>
            </div>
          </div>

          <!-- Right: Tier Breakdown -->
          <div class="collection-tiers">
            <div 
              v-for="tier in ['T0', 'T1', 'T2', 'T3'] as const"
              :key="tier"
              class="collection-tiers__item"
              :class="`collection-tiers__item--${tier.toLowerCase()}`"
            >
              <span class="collection-tiers__value">{{ stats[tier.toLowerCase() as keyof typeof stats] }}</span>
              <span class="collection-tiers__label">{{ tier }}</span>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="collection-toolbar">
          <label class="collection-toolbar__toggle">
            <input 
              v-model="showDuplicates" 
              type="checkbox"
              class="collection-toolbar__checkbox"
            />
            <span class="collection-toolbar__toggle-track">
              <span class="collection-toolbar__toggle-thumb"></span>
            </span>
            <span class="collection-toolbar__toggle-label">Afficher les doublons</span>
          </label>
          
          <div class="collection-toolbar__filters">
            <button
              v-for="tier in ['all', 'T0', 'T1', 'T2', 'T3'] as const"
              :key="tier"
              class="collection-toolbar__filter-btn"
              :class="{ 
                'collection-toolbar__filter-btn--active': selectedTier === tier,
                [`collection-toolbar__filter-btn--${tier.toLowerCase()}`]: tier !== 'all'
              }"
              @click="selectedTier = tier"
            >
              {{ tier === 'all' ? 'Tous' : tier }}
            </button>
          </div>
        </div>

        <!-- Cards grid - Stack mode (default) -->
        <CardGrid 
          v-if="!showDuplicates"
          :grouped-cards="filteredGroupedCards"
          empty-message="Vous n'avez pas encore de cartes. Participez au stream pour en obtenir !"
        />
        
        <!-- Cards grid - Individual mode (duplicates) -->
        <CardGrid 
          v-else
          :cards="filteredIndividualCards"
          empty-message="Vous n'avez pas encore de cartes. Participez au stream pour en obtenir !"
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
  text-align: center;
  padding: 3rem;
  background: rgba(21, 21, 24, 0.6);
  border: 1px solid rgba(42, 42, 48, 0.5);
  border-radius: 16px;
  max-width: 400px;
}

.collection-auth__icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  padding: 1.25rem;
  background: rgba(145, 70, 255, 0.1);
  border-radius: 50%;
  color: #9146FF;
}

.collection-auth__icon svg {
  width: 100%;
  height: 100%;
}

.collection-auth__title {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  color: #c8c8c8;
  margin-bottom: 0.75rem;
}

.collection-auth__text {
  font-family: 'Crimson Text', serif;
  font-size: 1rem;
  color: #7f7f7f;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* ===========================================
   COLLECTION HERO SECTION
   =========================================== */
.collection-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(15, 15, 18, 0.9) 0%, rgba(10, 10, 12, 0.95) 100%);
  border: 1px solid rgba(50, 50, 55, 0.4);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

/* Decorative corner accents */
.collection-hero::before,
.collection-hero::after {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  border: 1px solid var(--color-accent-glow-subtle, rgba(175, 96, 37, 0.2));
  pointer-events: none;
}

.collection-hero::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
  border-radius: 16px 0 0 0;
}

.collection-hero::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 16px 0;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.collection-profile__avatar-ring::before {
  content: '';
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
  font-family: 'Cinzel', serif;
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
  font-family: 'Crimson Text', serif;
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
   MAIN STATS
   =========================================== */
.collection-main-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem 0;
}

@media (min-width: 768px) {
  .collection-main-stats {
    padding: 0 3rem;
    border-left: 1px solid rgba(60, 60, 65, 0.3);
    border-right: 1px solid rgba(60, 60, 65, 0.3);
  }
}

.collection-main-stats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.collection-main-stats__value {
  font-family: 'Cinzel', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #e8e8e8;
  line-height: 1;
  text-shadow: 0 0 30px var(--color-accent-glow-subtle, rgba(175, 96, 37, 0.15));
}

.collection-main-stats__label {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  font-weight: 500;
  color: #5a5a60;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.collection-main-stats__divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(100, 100, 105, 0.4),
    transparent
  );
}

/* ===========================================
   TIER BREAKDOWN
   =========================================== */
.collection-tiers {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
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
  width: 52px;
  height: 52px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 60, 65, 0.3);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.collection-tiers__item:hover {
  transform: translateY(-2px);
  border-color: var(--tier-color, rgba(60, 60, 65, 0.5));
}

.collection-tiers__value {
  font-family: 'Cinzel', serif;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.collection-tiers__label {
  font-family: 'Cinzel', serif;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.7;
}

/* Tier colors */
.collection-tiers__item--t0 {
  --tier-color: rgba(201, 162, 39, 0.4);
  border-color: rgba(201, 162, 39, 0.25);
}
.collection-tiers__item--t0 .collection-tiers__value,
.collection-tiers__item--t0 .collection-tiers__label { color: #c9a227; }

.collection-tiers__item--t1 {
  --tier-color: rgba(122, 106, 138, 0.4);
  border-color: rgba(122, 106, 138, 0.25);
}
.collection-tiers__item--t1 .collection-tiers__value,
.collection-tiers__item--t1 .collection-tiers__label { color: #9a8aaa; }

.collection-tiers__item--t2 {
  --tier-color: rgba(90, 112, 128, 0.4);
  border-color: rgba(90, 112, 128, 0.25);
}
.collection-tiers__item--t2 .collection-tiers__value,
.collection-tiers__item--t2 .collection-tiers__label { color: #7a9aaa; }

.collection-tiers__item--t3 {
  --tier-color: rgba(90, 90, 95, 0.4);
  border-color: rgba(90, 90, 95, 0.25);
}
.collection-tiers__item--t3 .collection-tiers__value,
.collection-tiers__item--t3 .collection-tiers__label { color: #7a7a80; }

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

/* Toggle Switch */
.collection-toolbar__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.collection-toolbar__checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.collection-toolbar__toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: rgba(40, 40, 45, 0.8);
  border: 1px solid rgba(60, 60, 65, 0.4);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.collection-toolbar__toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #5a5a60;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.collection-toolbar__checkbox:checked + .collection-toolbar__toggle-track {
  background: var(--color-accent-glow-subtle, rgba(175, 96, 37, 0.2));
  border-color: rgba(175, 96, 37, 0.5);
}

.collection-toolbar__checkbox:checked + .collection-toolbar__toggle-track .collection-toolbar__toggle-thumb {
  transform: translateX(20px);
  background: var(--color-accent, #af6025);
  box-shadow: 0 0 10px var(--color-accent-glow, rgba(175, 96, 37, 0.5));
}

.collection-toolbar__toggle-label {
  font-family: 'Crimson Text', serif;
  font-size: 0.9rem;
  color: #7a7a80;
  transition: color 0.3s ease;
}

.collection-toolbar__checkbox:checked ~ .collection-toolbar__toggle-label {
  color: #b8b8c0;
}

/* Filter Buttons */
.collection-toolbar__filters {
  display: flex;
  gap: 0.5rem;
}

.collection-toolbar__filter-btn {
  position: relative;
  padding: 0.5rem 1.25rem;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #5a5a60;
  background: transparent;
  border: 1px solid rgba(50, 50, 55, 0.5);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.collection-toolbar__filter-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.collection-toolbar__filter-btn:hover {
  color: #8a8a90;
  border-color: rgba(70, 70, 75, 0.6);
}

.collection-toolbar__filter-btn:hover::before {
  opacity: 1;
}

.collection-toolbar__filter-btn--active {
  color: var(--color-accent-light, #c97a3a);
  background: var(--color-accent-glow-subtle, rgba(175, 96, 37, 0.15));
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow: 0 0 15px rgba(175, 96, 37, 0.1);
}

/* Tier-specific active states */
.collection-toolbar__filter-btn--t0.collection-toolbar__filter-btn--active {
  color: #c9a227;
  background: rgba(201, 162, 39, 0.12);
  border-color: rgba(201, 162, 39, 0.35);
  box-shadow: 0 0 15px rgba(201, 162, 39, 0.08);
}

.collection-toolbar__filter-btn--t1.collection-toolbar__filter-btn--active {
  color: #9a8aaa;
  background: rgba(122, 106, 138, 0.12);
  border-color: rgba(122, 106, 138, 0.35);
  box-shadow: 0 0 15px rgba(122, 106, 138, 0.08);
}

.collection-toolbar__filter-btn--t2.collection-toolbar__filter-btn--active {
  color: #7a9aaa;
  background: rgba(90, 112, 128, 0.12);
  border-color: rgba(90, 112, 128, 0.35);
  box-shadow: 0 0 15px rgba(90, 112, 128, 0.08);
}

.collection-toolbar__filter-btn--t3.collection-toolbar__filter-btn--active {
  color: #8a8a90;
  background: rgba(90, 90, 95, 0.12);
  border-color: rgba(90, 90, 95, 0.35);
}
</style>

