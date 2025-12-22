<script setup lang="ts">
import type { Card, CardTier, CardVariation } from '~/types/card';

definePageMeta({
  middleware: ["admin"],
});

useHead({ title: "Playground - Effects Testing" });

// Fetch real cards from catalogue
const catalogueStore = useCatalogueStore();

// Load catalogue if not already loaded
onMounted(async () => {
  if (!catalogueStore.catalogue || catalogueStore.catalogue.length === 0) {
    await catalogueStore.fetchCatalogue();
  }
});

// Get one card per tier from the real catalogue
const sampleCards = computed<Card[]>(() => {
  if (!catalogueStore.catalogue || catalogueStore.catalogue.length === 0) {
    return [];
  }

  const tiers: CardTier[] = ['T0', 'T1', 'T2', 'T3'];
  const cards: Card[] = [];

  for (const tier of tiers) {
    const tierCards = catalogueStore.catalogue.filter(c => c.tier === tier);
    if (tierCards.length > 0) {
      // Pick a random card from this tier
      const randomIndex = Math.floor(Math.random() * tierCards.length);
      cards.push(tierCards[randomIndex]);
    }
  }

  return cards;
});

// Current variation for each card
const cardVariations = ref<Record<string, CardVariation>>({});

// Initialize variations when cards change
watch(sampleCards, (cards) => {
  cards.forEach(card => {
    if (!cardVariations.value[card.id]) {
      cardVariations.value[card.id] = 'standard';
    }
  });
}, { immediate: true });

// Variation options
const variationOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'foil', label: 'Foil' },
  { value: 'synthesised', label: 'Synthesised' },
];

// Get card with current variation applied
const getCardWithVariation = (card: Card): Card => {
  const variation = cardVariations.value[card.id] || 'standard';
  return {
    ...card,
    foil: variation === 'foil' || variation === 'synthesised',
    synthesised: variation === 'synthesised',
  };
};

// Set all cards to a specific variation
const setAllVariations = (variation: CardVariation) => {
  sampleCards.value.forEach(card => {
    cardVariations.value[card.id] = variation;
  });
};

// Get a random card for comparison (prefer T0/T1 for visual impact)
const comparisonCard = computed<Card | null>(() => {
  if (!catalogueStore.catalogue || catalogueStore.catalogue.length === 0) {
    return null;
  }

  // Prefer high tier cards for comparison
  const highTierCards = catalogueStore.catalogue.filter(c => c.tier === 'T0' || c.tier === 'T1');
  if (highTierCards.length > 0) {
    return highTierCards[Math.floor(Math.random() * highTierCards.length)];
  }

  return catalogueStore.catalogue[0];
});

// Random glitch delay for each card (0-2s)
const getGlitchDelay = (cardId: string): string => {
  // Use card id to generate a consistent but "random" delay
  const hash = cardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const delay = (hash % 20) / 10; // 0 to 2 seconds
  return `${delay}s`;
};
</script>

<template>
  <div class="playground">
    <header class="playground__header">
      <h1 class="playground__title">Playground</h1>
      <p class="playground__subtitle">Test card effects and variations</p>
    </header>

    <!-- Loading state -->
    <div v-if="!catalogueStore.catalogue || catalogueStore.catalogue.length === 0" class="playground__loading">
      <p>Loading catalogue...</p>
    </div>

    <template v-else>
      <!-- Global Controls -->
      <section class="playground__controls">
        <h2 class="playground__section-title">Global Controls</h2>
        <div class="playground__control-row">
          <span class="playground__control-label">Set all cards to:</span>
          <div class="playground__buttons">
            <button
              v-for="opt in variationOptions"
              :key="opt.value"
              class="playground__btn"
              :class="{ 'playground__btn--active': Object.values(cardVariations).every(v => v === opt.value) }"
              @click="setAllVariations(opt.value as CardVariation)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Cards Grid -->
      <section class="playground__cards-section">
        <h2 class="playground__section-title">Cards by Tier</h2>

        <div class="playground__cards-grid">
          <div
            v-for="card in sampleCards"
            :key="card.id"
            class="playground__card-wrapper"
            :style="{ '--glitch-delay': getGlitchDelay(card.id) }"
          >
            <div class="playground__card-info">
              <span class="playground__tier-badge" :class="`playground__tier-badge--${card.tier.toLowerCase()}`">
                {{ card.tier }}
              </span>
              <span class="playground__rarity">{{ card.rarity }}</span>
            </div>

            <GameCard
              :card="getCardWithVariation(card)"
              :owned="true"
              :preview-only="false"
            />

            <div class="playground__card-controls">
              <select
                v-model="cardVariations[card.id]"
                class="playground__select"
              >
                <option v-for="opt in variationOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="playground__card-name">{{ card.name }}</div>
          </div>
        </div>
      </section>

      <!-- Effect Comparison -->
      <section v-if="comparisonCard" class="playground__comparison">
        <h2 class="playground__section-title">Effect Comparison ({{ comparisonCard.name }})</h2>
        <div class="playground__comparison-grid">
          <div class="playground__comparison-item">
            <h3>Standard</h3>
            <GameCard
              :card="{ ...comparisonCard, foil: false, synthesised: false }"
              :owned="true"
              :preview-only="false"
            />
          </div>
          <div class="playground__comparison-item">
            <h3>Foil</h3>
            <GameCard
              :card="{ ...comparisonCard, foil: true, synthesised: false }"
              :owned="true"
              :preview-only="false"
            />
          </div>
          <div class="playground__comparison-item">
            <h3>Synthesised</h3>
            <GameCard
              :card="{ ...comparisonCard, foil: true, synthesised: true }"
              :owned="true"
              :preview-only="false"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.playground {
  min-height: 100vh;
  padding: 40px 24px;
  background: linear-gradient(180deg, #0a0a0c 0%, #12121a 100%);
}

.playground__header {
  text-align: center;
  margin-bottom: 48px;
}

.playground__title {
  font-family: 'Cinzel', serif;
  font-size: 36px;
  font-weight: 700;
  color: #e8e8e8;
  margin: 0 0 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.playground__subtitle {
  font-family: 'Crimson Text', serif;
  font-size: 18px;
  color: #888;
  margin: 0;
}

.playground__loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-family: 'Crimson Text', serif;
  font-size: 18px;
}

.playground__section-title {
  font-family: 'Cinzel', serif;
  font-size: 20px;
  font-weight: 600;
  color: #c0c0c0;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.playground__controls {
  max-width: 800px;
  margin: 0 auto 48px;
  padding: 24px;
  background: rgba(20, 20, 25, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.playground__control-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.playground__control-label {
  font-size: 14px;
  color: #999;
}

.playground__buttons {
  display: flex;
  gap: 8px;
}

.playground__btn {
  padding: 8px 16px;
  font-family: 'Cinzel', serif;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  background: rgba(30, 30, 35, 0.9);
  border: 1px solid rgba(60, 60, 65, 0.5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.playground__btn:hover {
  background: rgba(50, 50, 55, 0.9);
  color: #ccc;
  border-color: rgba(80, 80, 85, 0.6);
}

.playground__btn--active {
  background: rgba(60, 80, 100, 0.5);
  color: #fff;
  border-color: rgba(100, 150, 200, 0.5);
}

.playground__cards-section {
  max-width: 1200px;
  margin: 0 auto 64px;
}

.playground__cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
  justify-items: center;
}

.playground__card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 220px;
}

.playground__card-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground__tier-badge {
  padding: 4px 12px;
  font-family: 'Cinzel', serif;
  font-size: 12px;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.playground__tier-badge--t0 {
  background: linear-gradient(180deg, rgba(201, 162, 39, 0.2) 0%, rgba(150, 120, 30, 0.3) 100%);
  color: #c9a227;
  border: 1px solid rgba(201, 162, 39, 0.4);
}

.playground__tier-badge--t1 {
  background: linear-gradient(180deg, rgba(122, 106, 138, 0.2) 0%, rgba(90, 75, 105, 0.3) 100%);
  color: #9a8aaa;
  border: 1px solid rgba(122, 106, 138, 0.4);
}

.playground__tier-badge--t2 {
  background: linear-gradient(180deg, rgba(90, 112, 128, 0.2) 0%, rgba(70, 90, 105, 0.3) 100%);
  color: #7a9ab0;
  border: 1px solid rgba(90, 112, 128, 0.4);
}

.playground__tier-badge--t3 {
  background: linear-gradient(180deg, rgba(80, 80, 85, 0.2) 0%, rgba(60, 60, 65, 0.3) 100%);
  color: #888;
  border: 1px solid rgba(80, 80, 85, 0.4);
}

.playground__rarity {
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  color: #777;
  font-style: italic;
}

.playground__card-controls {
  width: 100%;
}

.playground__card-name {
  font-family: 'Cinzel', serif;
  font-size: 12px;
  color: #666;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground__select {
  width: 100%;
  padding: 8px 12px;
  font-family: 'Cinzel', serif;
  font-size: 12px;
  color: #ccc;
  background: rgba(20, 20, 25, 0.9);
  border: 1px solid rgba(60, 60, 65, 0.5);
  border-radius: 6px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}

.playground__select:hover {
  border-color: rgba(80, 80, 85, 0.6);
}

.playground__select:focus {
  outline: none;
  border-color: rgba(100, 150, 200, 0.5);
}

.playground__comparison {
  max-width: 900px;
  margin: 0 auto;
}

.playground__comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.playground__comparison-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.playground__comparison-item h3 {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: 600;
  color: #aaa;
  margin: 0;
}

@media (max-width: 768px) {
  .playground {
    padding: 24px 16px;
  }

  .playground__title {
    font-size: 28px;
  }

  .playground__comparison-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .playground__cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}
</style>
