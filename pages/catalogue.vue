<script setup lang="ts">
import { allCards, mockUserCollection } from '~/data/mockCards'
import type { Card, CardTier, CardVariation } from '~/types/card'
import { TIER_CONFIG, VARIATION_CONFIG, getCardVariation } from '~/types/card'

const { t } = useI18n()

useHead({ title: t('meta.catalogue.title') })

const ownedCardsWithBestVariation = computed(() => {
  const map = new Map<string, { owned: boolean; bestVariation: CardVariation | null; card: Card | null }>()
  
  allCards.forEach(card => {
    map.set(card.id, { owned: false, bestVariation: null, card: null })
  })
  
  mockUserCollection.forEach(card => {
    const variation: CardVariation = getCardVariation(card)
    const existing = map.get(card.id)
    
    if (existing) {
      existing.owned = true
      
      if (!existing.bestVariation || 
          VARIATION_CONFIG[variation].priority < VARIATION_CONFIG[existing.bestVariation].priority) {
        existing.bestVariation = variation
        existing.card = card
      }
    }
  })
  
  return map
})

const ownedCardIds = computed(() => 
  Array.from(ownedCardsWithBestVariation.value.entries())
    .filter(([_, data]) => data.owned)
    .map(([id]) => id)
)

const searchQuery = ref('')
const selectedTier = ref<CardTier | 'all'>('all')
const selectedCategories = ref<string[]>([])
const selectedSort = ref('rarity-asc')

// Sort options
type SortOption = 'rarity-asc' | 'rarity-desc' | 'alpha-asc' | 'alpha-desc' | 'category-asc' | 'category-desc'

const sortOptions = [
  { value: 'rarity-asc', label: 'Rareté ↑ (T0 → T3)' },
  { value: 'rarity-desc', label: 'Rareté ↓ (T3 → T0)' },
  { value: 'alpha-asc', label: 'Alphabétique (A → Z)' },
  { value: 'alpha-desc', label: 'Alphabétique (Z → A)' },
  { value: 'category-asc', label: 'Catégorie (A → Z)' },
  { value: 'category-desc', label: 'Catégorie (Z → A)' }
]

// Extract unique categories from all cards with count
const categoryOptions = computed(() => {
  const categoryMap = new Map<string, number>()
  
  allCards.forEach(card => {
    const current = categoryMap.get(card.itemClass) || 0
    categoryMap.set(card.itemClass, current + 1)
  })
  
  // Sort by count descending, then alphabetically
  return Array.from(categoryMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([category, count]) => ({
      value: category,
      label: category,
      count
    }))
})

const tierOptions = computed(() => [
  { value: 'all', label: t('collection.tiers.all'), color: 'default' },
  { value: 'T0', label: t('collection.tiers.t0'), color: 't0' },
  { value: 'T1', label: t('collection.tiers.t1'), color: 't1' },
  { value: 'T2', label: t('collection.tiers.t2'), color: 't2' },
  { value: 'T3', label: t('collection.tiers.t3'), color: 't3' }
])

// Sort function
const sortCards = (cards: Card[], sortType: SortOption): Card[] => {
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 }
  
  return [...cards].sort((a, b) => {
    switch (sortType) {
      case 'rarity-asc':
        // T0 first (most rare)
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[a.tier] - tierOrder[b.tier]
        }
        return a.name.localeCompare(b.name)
      
      case 'rarity-desc':
        // T3 first (most common)
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[b.tier] - tierOrder[a.tier]
        }
        return a.name.localeCompare(b.name)
      
      case 'alpha-asc':
        return a.name.localeCompare(b.name)
      
      case 'alpha-desc':
        return b.name.localeCompare(a.name)
      
      case 'category-asc':
        if (a.itemClass !== b.itemClass) {
          return a.itemClass.localeCompare(b.itemClass)
        }
        return a.name.localeCompare(b.name)
      
      case 'category-desc':
        if (a.itemClass !== b.itemClass) {
          return b.itemClass.localeCompare(a.itemClass)
        }
        return a.name.localeCompare(b.name)
      
      default:
        return 0
    }
  })
}

const filteredCards = computed(() => {
  let cards = allCards.map(card => {
    const ownedData = ownedCardsWithBestVariation.value.get(card.id)
    
    if (ownedData?.owned && ownedData.card) {
      return ownedData.card
    }
    
    return card
  })
  
  // Filter by search query - only return owned cards when searching
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    cards = cards.filter(card => {
      // Must be owned to appear in search results
      const isOwned = ownedCardIds.value.includes(card.id)
      if (!isOwned) return false
      
      // Then match the search query
      return card.name.toLowerCase().includes(query) ||
             card.itemClass.toLowerCase().includes(query)
    })
  }
  
  // Filter by selected categories
  if (selectedCategories.value.length > 0) {
    cards = cards.filter(card => selectedCategories.value.includes(card.itemClass))
  }
  
  // Filter by tier
  if (selectedTier.value !== 'all') {
    cards = cards.filter(card => card.tier === selectedTier.value)
  }
  
  // Apply sorting
  return sortCards(cards, selectedSort.value as SortOption)
})

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
      <div class="mb-4 sm:mb-8">
        <RunicHeader
          :title="t('catalogue.title')"
          :subtitle="t('catalogue.subtitle')"
          attached
        />
      <RunicStats
        :stats="[
          { value: stats.total, label: t('cards.stats.total'), color: 'default' },
          { value: stats.t0, label: t('collection.tiers.t0'), color: 't0' },
          { value: stats.t1, label: t('collection.tiers.t1'), color: 't1' },
          { value: stats.t2, label: t('collection.tiers.t2'), color: 't2' },
          { value: stats.t3, label: t('collection.tiers.t3'), color: 't3' }
        ]"
          attached
      />
      </div>

      <!-- Filters row -->
      <div class="flex flex-col gap-3 sm:gap-4 my-4 sm:my-6 md:my-8">
        <!-- Search, Category and Sort filters -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex-1 max-w-full sm:max-w-xs">
            <RunicInput
              v-model="searchQuery"
              :placeholder="t('catalogue.search.placeholder')"
              icon="search"
              size="md"
            />
          </div>
          
          <div class="flex-1 max-w-full sm:max-w-xs">
            <RunicSelect
              v-model="selectedCategories"
              :options="categoryOptions"
              placeholder="Catégories d'objets..."
              size="md"
              :searchable="true"
              :multiple="true"
              :max-visible-items="10"
            />
          </div>

          <div class="w-full sm:w-auto sm:min-w-[200px]">
            <RunicSelect
              v-model="selectedSort"
              :options="sortOptions"
              placeholder="Trier par..."
              size="md"
            />
          </div>
        </div>

        <!-- Tier filter -->
        <div class="flex justify-end">
          <RunicRadio
            v-model="selectedTier"
            :options="tierOptions"
            size="md"
          />
        </div>
      </div>

      <CardGrid 
        :cards="filteredCards" 
        :owned-card-ids="ownedCardIds"
        :empty-message="t('catalogue.empty')"
      />
    </div>
  </NuxtLayout>
</template>
