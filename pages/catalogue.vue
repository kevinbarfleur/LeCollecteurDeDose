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

const tierOptions = computed(() => [
  { value: 'all', label: t('collection.tiers.all'), color: 'default' },
  { value: 'T0', label: t('collection.tiers.t0'), color: 't0' },
  { value: 'T1', label: t('collection.tiers.t1'), color: 't1' },
  { value: 'T2', label: t('collection.tiers.t2'), color: 't2' },
  { value: 'T3', label: t('collection.tiers.t3'), color: 't3' }
])

const filteredCards = computed(() => {
  let cards = allCards.map(card => {
    const ownedData = ownedCardsWithBestVariation.value.get(card.id)
    
    if (ownedData?.owned && ownedData.card) {
      return ownedData.card
    }
    
    return card
  })
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    cards = cards.filter(card => 
      card.name.toLowerCase().includes(query) ||
      card.itemClass.toLowerCase().includes(query)
    )
  }
  
  if (selectedTier.value !== 'all') {
    cards = cards.filter(card => card.tier === selectedTier.value)
  }
  
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 }
  cards.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
  
  return cards
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

      <div class="flex flex-col gap-3 sm:gap-4 my-4 sm:my-6 md:my-8 md:flex-row md:items-center md:justify-between">
        <div class="flex-1 max-w-full md:max-w-md">
          <RunicInput
            v-model="searchQuery"
            :placeholder="t('catalogue.search.placeholder')"
            icon="search"
            size="md"
          />
        </div>

        <RunicRadio
          v-model="selectedTier"
          :options="tierOptions"
          size="md"
        />
      </div>

      <CardGrid 
        :cards="filteredCards" 
        :owned-card-ids="ownedCardIds"
        :empty-message="t('catalogue.empty')"
      />
    </div>
  </NuxtLayout>
</template>
