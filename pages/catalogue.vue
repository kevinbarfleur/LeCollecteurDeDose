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

      <!-- Stats bar - Runic tablet -->
      <RunicStats
        :stats="[
          { value: stats.total, label: 'Total', color: 'default' },
          { value: stats.t0, label: 'T0', color: 't0' },
          { value: stats.t1, label: 'T1', color: 't1' },
          { value: stats.t2, label: 'T2', color: 't2' },
          { value: stats.t3, label: 'T3', color: 't3' }
        ]"
      />

      <!-- Filters -->
      <div class="catalog-filters">
        <!-- Search - Runic input -->
        <div class="catalog-filters__search">
          <RunicInput
            v-model="searchQuery"
            placeholder="Fouille dans les ténèbres..."
            icon="search"
            size="md"
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

.catalog-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  margin-top: 2rem;
}

@media (min-width: 768px) {
  .catalog-filters {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.catalog-filters__search {
  flex: 1;
  max-width: 400px;
}
</style>

