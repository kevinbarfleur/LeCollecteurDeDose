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

const tierOptions = [
  { value: 'all', label: 'Tous', color: 'default' },
  { value: 'T0', label: 'T0', color: 't0' },
  { value: 'T1', label: 'T1', color: 't1' },
  { value: 'T2', label: 'T2', color: 't2' },
  { value: 'T3', label: 'T3', color: 't3' }
]

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
          <h1 class="collection-auth__title">Prouve ton existence</h1>
          <p class="collection-auth__text">
            Les ténèbres ne reconnaissent que ceux qui ont prouvé leur identité, exile.
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
                <span>Exile</span>
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
          <div class="collection-toolbar__toggle-wrapper">
            <RunicRadio
              v-model="showDuplicates"
              :toggle="true"
              toggle-color="default"
              size="sm"
            />
            <span class="collection-toolbar__toggle-label">Révéler les duplicatas</span>
          </div>
          
          <RunicRadio
            v-model="selectedTier"
            :options="tierOptions"
            size="md"
          />
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

/* Toggle Wrapper */
.collection-toolbar__toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collection-toolbar__toggle-label {
  font-family: 'Crimson Text', serif;
  font-size: 0.9rem;
  color: #7a7a80;
  transition: color 0.3s ease;
}

</style>

