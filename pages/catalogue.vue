<script setup lang="ts">
import { allCards, mockUserCollection } from '~/data/mockCards'
import type { Card, CardTier } from '~/types/card'
import { TIER_CONFIG } from '~/types/card'

// SEO
useHead({
  title: 'Catalogue - Le Collecteur de Dose'
})

// Get owned card IDs from user collection
const ownedCardIds = computed(() => {
  // Get unique card IDs from the user's collection
  return [...new Set(mockUserCollection.map(card => card.id))]
})

// Filters
const searchQuery = ref('')
const selectedTier = ref<CardTier | 'all'>('all')

const tierOptions = [
  { value: 'all', label: 'Tous', color: 'default' },
  { value: 'T0', label: 'T0', color: 't0' },
  { value: 'T1', label: 'T1', color: 't1' },
  { value: 'T2', label: 'T2', color: 't2' },
  { value: 'T3', label: 'T3', color: 't3' }
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
        <h1 class="page-title">Le Registre des Âmes</h1>
        <p class="catalog-subtitle">
          Contemple ce que tu ne posséderas probablement jamais, exile.
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
          <span class="catalog-stats__label">T0</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t1">
          <span class="catalog-stats__value">{{ stats.t1 }}</span>
          <span class="catalog-stats__label">T1</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t2">
          <span class="catalog-stats__value">{{ stats.t2 }}</span>
          <span class="catalog-stats__label">T2</span>
        </div>
        <div class="catalog-stats__item catalog-stats__item--t3">
          <span class="catalog-stats__value">{{ stats.t3 }}</span>
          <span class="catalog-stats__label">T3</span>
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
            placeholder="Fouille dans les ténèbres..."
            class="catalog-filters__input"
          />
        </div>

        <!-- Tier filter -->
        <RunicRadio
          v-model="selectedTier"
          :options="tierOptions"
          size="md"
        />
      </div>

      <!-- Cards grid -->
      <CardGrid 
        :cards="filteredCards" 
        :owned-card-ids="ownedCardIds"
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

</style>

