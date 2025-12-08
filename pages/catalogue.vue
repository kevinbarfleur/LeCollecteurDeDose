<script setup lang="ts">
import { allCards, mockUserCollection } from '~/data/mockCards'
import type { Card, CardTier } from '~/types/card'
import { TIER_CONFIG } from '~/types/card'

const { t } = useI18n()

useHead({ title: t('meta.catalogue.title') })

const ownedCardIds = computed(() => [...new Set(mockUserCollection.map(card => card.id))])

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
  let cards = [...allCards]
  
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
      <div class="text-center mb-4 sm:mb-8">
        <h1 class="page-title">{{ t('catalogue.title') }}</h1>
        <p class="font-body text-sm sm:text-base md:text-lg text-poe-text-dim mt-1 sm:mt-2 px-2">
          {{ t('catalogue.subtitle') }}
        </p>
      </div>

      <RunicStats
        :stats="[
          { value: stats.total, label: t('cards.stats.total'), color: 'default' },
          { value: stats.t0, label: t('collection.tiers.t0'), color: 't0' },
          { value: stats.t1, label: t('collection.tiers.t1'), color: 't1' },
          { value: stats.t2, label: t('collection.tiers.t2'), color: 't2' },
          { value: stats.t3, label: t('collection.tiers.t3'), color: 't3' }
        ]"
      />

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
