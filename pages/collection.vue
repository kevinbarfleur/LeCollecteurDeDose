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
  name: authUser.value?.displayName || 'Utilisateur',
  avatar: authUser.value?.avatar || 'https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png'
}))

// Collection data
const collection = computed(() => mockUserCollection)

// Group cards by id to count duplicates
const groupedCards = computed(() => {
  const groups = new Map<string, { card: Card; count: number }>()
  
  collection.value.forEach(card => {
    const existing = groups.get(card.id)
    if (existing) {
      existing.count++
    } else {
      groups.set(card.id, { card, count: 1 })
    }
  })
  
  // Convert to array and sort by tier
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 }
  return Array.from(groups.values()).sort(
    (a, b) => tierOrder[a.card.tier] - tierOrder[b.card.tier]
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

const filteredCards = computed(() => {
  let cards = showDuplicates.value 
    ? collection.value 
    : groupedCards.value.map(g => g.card)
  
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
        <!-- User header -->
        <div class="collection-header">
          <div class="collection-header__user">
            <img 
              :src="user.avatar" 
              :alt="user.name"
              class="collection-header__avatar"
            />
            <div>
              <h1 class="collection-header__name">{{ user.name }}</h1>
              <p class="collection-header__label">Ma Collection</p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="collection-stats">
          <div class="collection-stats__main">
            <div class="collection-stats__item collection-stats__item--large">
              <span class="collection-stats__value">{{ stats.total }}</span>
              <span class="collection-stats__label">Cartes totales</span>
            </div>
            <div class="collection-stats__item collection-stats__item--large">
              <span class="collection-stats__value">{{ stats.unique }}</span>
              <span class="collection-stats__label">Cartes uniques</span>
            </div>
          </div>
          <div class="collection-stats__tiers">
            <div class="collection-stats__tier collection-stats__tier--t0">
              <span class="collection-stats__tier-value">{{ stats.t0 }}</span>
              <span class="collection-stats__tier-label">T0</span>
            </div>
            <div class="collection-stats__tier collection-stats__tier--t1">
              <span class="collection-stats__tier-value">{{ stats.t1 }}</span>
              <span class="collection-stats__tier-label">T1</span>
            </div>
            <div class="collection-stats__tier collection-stats__tier--t2">
              <span class="collection-stats__tier-value">{{ stats.t2 }}</span>
              <span class="collection-stats__tier-label">T2</span>
            </div>
            <div class="collection-stats__tier collection-stats__tier--t3">
              <span class="collection-stats__tier-value">{{ stats.t3 }}</span>
              <span class="collection-stats__tier-label">T3</span>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="collection-filters">
          <label class="collection-filters__toggle">
            <input 
              v-model="showDuplicates" 
              type="checkbox"
              class="collection-filters__checkbox"
            />
            <span class="collection-filters__toggle-label">Afficher les doublons</span>
          </label>
          
          <div class="collection-filters__tiers">
            <button
              v-for="tier in ['all', 'T0', 'T1', 'T2', 'T3'] as const"
              :key="tier"
              class="collection-filters__tier-btn"
              :class="{ 
                'collection-filters__tier-btn--active': selectedTier === tier,
                [`collection-filters__tier-btn--${tier.toLowerCase()}`]: tier !== 'all'
              }"
              @click="selectedTier = tier"
            >
              {{ tier === 'all' ? 'Tous' : tier }}
            </button>
          </div>
        </div>

        <!-- Duplicates indicator -->
        <div v-if="!showDuplicates" class="collection-duplicates">
          <template v-for="group in groupedCards" :key="group.card.id">
            <span v-if="group.count > 1" class="collection-duplicates__badge">
              {{ group.card.name }} x{{ group.count }}
            </span>
          </template>
        </div>

        <!-- Cards grid -->
        <CardGrid 
          :cards="filteredCards"
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

/* Collection header */
.collection-header {
  margin-bottom: 2rem;
}

.collection-header__user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collection-header__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid #9146FF;
}

.collection-header__name {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  color: #c8c8c8;
}

.collection-header__label {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: #7f7f7f;
}

/* Stats */
.collection-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(21, 21, 24, 0.6);
  border: 1px solid rgba(42, 42, 48, 0.5);
  border-radius: 12px;
}

@media (min-width: 640px) {
  .collection-stats {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.collection-stats__main {
  display: flex;
  gap: 2rem;
}

.collection-stats__item {
  text-align: center;
}

.collection-stats__item--large .collection-stats__value {
  font-size: 2rem;
}

.collection-stats__value {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #c8c8c8;
  display: block;
}

.collection-stats__label {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: #7f7f7f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.collection-stats__tiers {
  display: flex;
  gap: 1rem;
}

.collection-stats__tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  min-width: 50px;
}

.collection-stats__tier-value {
  font-family: 'Cinzel', serif;
  font-size: 1.25rem;
  font-weight: 700;
}

.collection-stats__tier-label {
  font-family: 'Cinzel', serif;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.collection-stats__tier--t0 .collection-stats__tier-value,
.collection-stats__tier--t0 .collection-stats__tier-label { color: #b8860b; }

.collection-stats__tier--t1 .collection-stats__tier-value,
.collection-stats__tier--t1 .collection-stats__tier-label { color: #8b5cf6; }

.collection-stats__tier--t2 .collection-stats__tier-value,
.collection-stats__tier--t2 .collection-stats__tier-label { color: #38bdf8; }

.collection-stats__tier--t3 .collection-stats__tier-value,
.collection-stats__tier--t3 .collection-stats__tier-label { color: #94a3b8; }

/* Filters */
.collection-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .collection-filters {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.collection-filters__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.collection-filters__checkbox {
  width: 18px;
  height: 18px;
  accent-color: #9146FF;
}

.collection-filters__toggle-label {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: #7f7f7f;
}

.collection-filters__tiers {
  display: flex;
  gap: 0.5rem;
}

.collection-filters__tier-btn {
  padding: 0.5rem 1rem;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: #7f7f7f;
  background: rgba(21, 21, 24, 0.6);
  border: 1px solid rgba(42, 42, 48, 0.6);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collection-filters__tier-btn:hover {
  background: rgba(42, 42, 48, 0.4);
  color: #c8c8c8;
}

.collection-filters__tier-btn--active {
  background: rgba(145, 70, 255, 0.2);
  border-color: #9146FF;
  color: #9146FF;
}

.collection-filters__tier-btn--t0.collection-filters__tier-btn--active {
  background: rgba(184, 134, 11, 0.2);
  border-color: #b8860b;
  color: #b8860b;
}

.collection-filters__tier-btn--t1.collection-filters__tier-btn--active {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.collection-filters__tier-btn--t2.collection-filters__tier-btn--active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.collection-filters__tier-btn--t3.collection-filters__tier-btn--active {
  background: rgba(148, 163, 184, 0.2);
  border-color: #94a3b8;
  color: #94a3b8;
}

/* Duplicates */
.collection-duplicates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.collection-duplicates__badge {
  padding: 0.25rem 0.75rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: #af6025;
  background: rgba(175, 96, 37, 0.15);
  border: 1px solid rgba(175, 96, 37, 0.3);
  border-radius: 20px;
}
</style>

