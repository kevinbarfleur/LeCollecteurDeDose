<script setup lang="ts">
import { allCards } from '~/data/mockCards'
import type { Card, CardTier } from '~/types/card'
import { TIER_CONFIG } from '~/types/card'

// SEO
useHead({
  title: 'Catalogue - Le Collecteur de Dose'
})

// Filters
const searchQuery = ref('')
const selectedTier = ref<CardTier | 'all'>('all')

const tiers: { value: CardTier | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'T0', label: 'Légendaire' },
  { value: 'T1', label: 'Rare' },
  { value: 'T2', label: 'Peu commun' },
  { value: 'T3', label: 'Commun' }
]

// Filtered cards
const filteredCards = computed(() => {
  let cards = [...allCards]
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    cards = cards.filter(card => 
      card.name.toLowerCase().includes(query) ||
      card.itemClass.toLowerCase().includes(query)
    )
  }
  
  // Filter by tier
  if (selectedTier.value !== 'all') {
    cards = cards.filter(card => card.tier === selectedTier.value)
  }
  
  // Sort by tier (T0 first)
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 }
  cards.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
  
  return cards
})

// Stats
const stats = computed(() => ({
  total: allCards.length,
  t0: allCards.filter(c => c.tier === 'T0').length,
  t1: allCards.filter(c => c.tier === 'T1').length,
  t2: allCards.filter(c => c.tier === 'T2').length,
  t3: allCards.filter(c => c.tier === 'T3').length
}))
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <!-- Page header -->
      <div class="catalog-header">
        <h1 class="page-title">Catalogue des Cartes</h1>
        <p class="catalog-subtitle">
          Découvrez toutes les cartes disponibles dans Le Collecteur de Dose
        </p>
      </div>

      <!-- Stats bar -->
      <div class="catalog-stats">
        <div class="catalog-stats__item">
          <span class="catalog-stats__value">{{ stats.total }}</span>
          <span class="catalog-stats__label">Total</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t0">
          <span class="catalog-stats__value">{{ stats.t0 }}</span>
          <span class="catalog-stats__label">Légendaires</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t1">
          <span class="catalog-stats__value">{{ stats.t1 }}</span>
          <span class="catalog-stats__label">Rares</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t2">
          <span class="catalog-stats__value">{{ stats.t2 }}</span>
          <span class="catalog-stats__label">Peu communs</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t3">
          <span class="catalog-stats__value">{{ stats.t3 }}</span>
          <span class="catalog-stats__label">Communs</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="catalog-filters">
        <!-- Search -->
        <div class="catalog-filters__search">
          <svg class="catalog-filters__search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une carte..."
            class="catalog-filters__input"
          />
        </div>

        <!-- Tier filter -->
        <div class="catalog-filters__tiers">
          <button
            v-for="tier in tiers"
            :key="tier.value"
            class="catalog-filters__tier-btn"
            :class="{ 
              'catalog-filters__tier-btn--active': selectedTier === tier.value,
              [`catalog-filters__tier-btn--${tier.value.toLowerCase()}`]: tier.value !== 'all'
            }"
            @click="selectedTier = tier.value"
          >
            {{ tier.label }}
          </button>
        </div>
      </div>

      <!-- Cards grid -->
      <CardGrid 
        :cards="filteredCards" 
        empty-message="Aucune carte ne correspond à votre recherche"
      />
    </div>
  </NuxtLayout>
</template>

<style scoped>
.catalog-header {
  text-align: center;
  margin-bottom: 2rem;
}

.catalog-subtitle {
  font-family: 'Crimson Text', serif;
  font-size: 1.125rem;
  color: #7f7f7f;
  margin-top: 0.5rem;
}

.catalog-stats {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(21, 21, 24, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(42, 42, 48, 0.5);
}

.catalog-stats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  min-width: 80px;
}

.catalog-stats__value {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #c8c8c8;
}

.catalog-stats__label {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: #7f7f7f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.catalog-stats__item--t0 .catalog-stats__value { color: #c9a227; }
.catalog-stats__item--t1 .catalog-stats__value { color: #7a6a8a; }
.catalog-stats__item--t2 .catalog-stats__value { color: #5a7080; }
.catalog-stats__item--t3 .catalog-stats__value { color: #4a4a4d; }

.catalog-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 768px) {
  .catalog-filters {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.catalog-filters__search {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.catalog-filters__search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #4a4a55;
}

.catalog-filters__input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: rgba(21, 21, 24, 0.8);
  border: 1px solid rgba(42, 42, 48, 0.8);
  border-radius: 8px;
  font-family: 'Crimson Text', serif;
  font-size: 1rem;
  color: #c8c8c8;
  transition: all 0.2s ease;
}

.catalog-filters__input::placeholder {
  color: #4a4a55;
}

.catalog-filters__input:focus {
  outline: none;
  border-color: #af6025;
  box-shadow: 0 0 0 2px rgba(175, 96, 37, 0.2);
}

.catalog-filters__tiers {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.catalog-filters__tier-btn {
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

.catalog-filters__tier-btn:hover {
  background: rgba(42, 42, 48, 0.4);
  color: #c8c8c8;
}

.catalog-filters__tier-btn--active {
  background: rgba(175, 96, 37, 0.2);
  border-color: #af6025;
  color: #af6025;
}

.catalog-filters__tier-btn--t0.catalog-filters__tier-btn--active {
  background: rgba(201, 162, 39, 0.15);
  border-color: #6d5a2a;
  color: #c9a227;
}

.catalog-filters__tier-btn--t1.catalog-filters__tier-btn--active {
  background: rgba(122, 106, 138, 0.15);
  border-color: #3a3445;
  color: #7a6a8a;
}

.catalog-filters__tier-btn--t2.catalog-filters__tier-btn--active {
  background: rgba(90, 112, 128, 0.15);
  border-color: #3a4550;
  color: #5a7080;
}

.catalog-filters__tier-btn--t3.catalog-filters__tier-btn--active {
  background: rgba(58, 58, 61, 0.2);
  border-color: #2a2a2d;
  color: #4a4a4d;
}
</style>

