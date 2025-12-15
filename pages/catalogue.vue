<script setup lang="ts">
import { allCards } from "~/data/mockCards";
import type { Card, CardTier, CardVariation } from "~/types/card";
import { TIER_CONFIG, VARIATION_CONFIG, getCardVariation } from "~/types/card";
import { useCardSorting, type SortOption } from "~/composables/useCardSorting";
import { mergeUserDataToCards, transformUniquesToCards } from "~/utils/dataTransform";

const { t } = useI18n();

useHead({ title: t("meta.catalogue.title") });

const { loggedIn, user: authUser } = useUserSession();
const { isSupabaseData, isInitializing } = useDataSource();
const { fetchUserCollection, fetchUserCards } = useApi();
const { loadCatalogue, getCachedCatalogue, isLoading: isCatalogueLoading } = useCatalogueCache();

// Fetch real data when using API
const apiAllCards = ref<Card[]>([]);
const apiUserCollection = ref<Card[]>([]);
const isLoadingCatalogue = ref(false);

// Load catalogue data once on mount (cached, only fetches once per page session)
onMounted(async () => {
  if (isSupabaseData.value && !isInitializing.value) {
    isLoadingCatalogue.value = true;
    try {
      // Load catalogue from cache (or fetch if cache is empty)
      // Pass userId to limit information for non-owned cards
      const userId = loggedIn.value ? authUser.value?.id : undefined;
      const cachedCards = await loadCatalogue(false, userId);
      if (cachedCards) {
        apiAllCards.value = cachedCards;
      } else {
        // No data from API
        apiAllCards.value = [];
      }
    } catch (error) {
      // Try to use cached data on error
      const cached = getCachedCatalogue();
      apiAllCards.value = cached || [];
    } finally {
      isLoadingCatalogue.value = false;
    }
  }
});

// Watch for data source changes - reload data when switching between API and test
watch([isSupabaseData, isInitializing], async ([isSupabase, initializing]) => {
  // Don't do anything while initializing
  if (initializing) {
    return;
  }

  // Always load catalogue data (works for both API and test mode)
  // Pass userId to limit information for non-owned cards
  isLoadingCatalogue.value = true;
  try {
    const userId = loggedIn.value ? authUser.value?.id : undefined;
    const cachedCards = await loadCatalogue(false, userId);
    if (cachedCards) {
      apiAllCards.value = cachedCards;
    } else {
      apiAllCards.value = [];
    }
  } catch (error) {
    const cached = getCachedCatalogue();
    apiAllCards.value = cached || [];
  } finally {
    isLoadingCatalogue.value = false;
  }
});

// Watch for login/logout changes - reload catalogue with appropriate data limitation
watch([loggedIn, () => authUser.value?.id], async ([isLoggedIn, userId]) => {
  if (isSupabaseData.value && !isInitializing.value) {
    isLoadingCatalogue.value = true;
    try {
      // Force refresh to get correct limited/unlimited data based on login status
      const currentUserId = isLoggedIn ? userId : undefined;
      const cachedCards = await loadCatalogue(true, currentUserId);
      if (cachedCards) {
        apiAllCards.value = cachedCards;
      } else {
        apiAllCards.value = [];
      }
    } catch (error) {
      const cached = getCachedCatalogue();
      apiAllCards.value = cached || [];
    } finally {
      isLoadingCatalogue.value = false;
    }
  }
});

// Watch for user collection changes (this can change, so we always fetch it)
watch([loggedIn, () => authUser.value?.displayName, isSupabaseData, isInitializing], 
  async ([isLoggedIn, displayName, isApi, initializing]) => {
    // Don't do anything while initializing
    if (initializing) {
      return;
    }

    // Always fetch user collection if logged in (works for both API and test mode)
    if (isLoggedIn && displayName) {
      try {
        const [userCollectionData, userCardsData] = await Promise.all([
          fetchUserCollection(displayName),
          fetchUserCards(displayName),
        ]);
        
        if (userCollectionData || userCardsData) {
          apiUserCollection.value = mergeUserDataToCards(
            userCollectionData || {},
            userCardsData || null,
            displayName
          );
        } else {
          apiUserCollection.value = [];
        }
      } catch (error) {
        apiUserCollection.value = [];
      }
    } else {
      apiUserCollection.value = [];
    }
  },
  { immediate: true }
);

// Also watch for catalogue loading state
watch(isCatalogueLoading, (loading) => {
  if (loading && isSupabaseData.value) {
    isLoadingCatalogue.value = true;
  }
});

const currentAllCards = computed(() => {
  return apiAllCards.value;
});

const currentUserCollection = computed(() => {
  return apiUserCollection.value;
});

const ownedCardsWithBestVariation = computed(() => {
  const map = new Map<
    string,
    { owned: boolean; bestVariation: CardVariation | null; card: Card | null }
  >();

  currentAllCards.value.forEach((card) => {
    map.set(card.id, { owned: false, bestVariation: null, card: null });
  });

  currentUserCollection.value.forEach((card) => {
    const variation: CardVariation = getCardVariation(card);
    const existing = map.get(card.id);

    if (existing) {
      existing.owned = true;

      if (
        !existing.bestVariation ||
        VARIATION_CONFIG[variation].priority <
          VARIATION_CONFIG[existing.bestVariation].priority
      ) {
        existing.bestVariation = variation;
        existing.card = card;
      }
    }
  });

  return map;
});

const ownedCardIds = computed(() =>
  Array.from(ownedCardsWithBestVariation.value.entries())
    .filter(([_, data]) => data.owned)
    .map(([id]) => id)
);

// Persisted filters (stored in sessionStorage)
const searchQuery = usePersistedFilter("catalogue_search", "");
const selectedTier = usePersistedFilter<CardTier | "all">(
  "catalogue_tier",
  "all"
);
const selectedCategories = usePersistedFilter<string[]>(
  "catalogue_categories",
  []
);
const selectedSort = usePersistedFilter("catalogue_sort", "rarity-asc");

// Use shared sorting composable
const { sortCards, SORT_OPTIONS: sortOptions } = useCardSorting();

// Extract unique categories from all cards with count
const categoryOptions = computed(() => {
  const categoryMap = new Map<string, number>();

  currentAllCards.value.forEach((card) => {
    const current = categoryMap.get(card.itemClass) || 0;
    categoryMap.set(card.itemClass, current + 1);
  });

  // Sort by count descending, then alphabetically
  return Array.from(categoryMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([category, count]) => ({
      value: category,
      label: category,
      count,
    }));
});

const tierOptions = computed(() => [
  { value: "all", label: t("collection.tiers.all"), color: "default" },
  { value: "T0", label: t("collection.tiers.t0"), color: "t0" },
  { value: "T1", label: t("collection.tiers.t1"), color: "t1" },
  { value: "T2", label: t("collection.tiers.t2"), color: "t2" },
  { value: "T3", label: t("collection.tiers.t3"), color: "t3" },
]);

const filteredCards = computed(() => {
  let cards = currentAllCards.value.map((card) => {
    const ownedData = ownedCardsWithBestVariation.value.get(card.id);

    if (ownedData?.owned && ownedData.card) {
      return ownedData.card;
    }

    return card;
  });

  // Filter by search query - only return owned cards when searching
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    cards = cards.filter((card) => {
      // Must be owned to appear in search results
      const isOwned = ownedCardIds.value.includes(card.id);
      if (!isOwned) return false;

      // Then match the search query
      return (
        card.name.toLowerCase().includes(query) ||
        card.itemClass.toLowerCase().includes(query)
      );
    });
  }

  // Filter by selected categories
  if (selectedCategories.value.length > 0) {
    cards = cards.filter((card) =>
      selectedCategories.value.includes(card.itemClass)
    );
  }

  // Filter by tier
  if (selectedTier.value !== "all") {
    cards = cards.filter((card) => card.tier === selectedTier.value);
  }

  // Apply sorting
  return sortCards(cards, selectedSort.value as SortOption);
});

const stats = computed(() => ({
  total: currentAllCards.value.length,
  t0: currentAllCards.value.filter((c) => c.tier === "T0").length,
  t1: currentAllCards.value.filter((c) => c.tier === "T1").length,
  t2: currentAllCards.value.filter((c) => c.tier === "T2").length,
  t3: currentAllCards.value.filter((c) => c.tier === "T3").length,
}));
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <div v-if="!isInitializing && !isLoadingCatalogue" class="mb-4 sm:mb-8">
        <RunicHeader
          :title="t('catalogue.title')"
          :subtitle="t('catalogue.subtitle')"
          attached
        />
        <RunicStats
          :stats="[
            {
              value: stats.total,
              label: t('cards.stats.total'),
              color: 'default',
            },
            { value: stats.t0, label: t('collection.tiers.t0'), color: 't0' },
            { value: stats.t1, label: t('collection.tiers.t1'), color: 't1' },
            { value: stats.t2, label: t('collection.tiers.t2'), color: 't2' },
            { value: stats.t3, label: t('collection.tiers.t3'), color: 't3' },
          ]"
          attached
        />
      </div>

      <!-- Filters -->
      <RunicBox padding="md" class="mb-8">
        <div class="flex flex-col gap-4">
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
                :placeholder="t('catalogue.filters.categories')"
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
                :placeholder="t('catalogue.filters.sort')"
                size="md"
              />
            </div>
          </div>

          <!-- Runic separator -->
          <div class="runic-separator">
            <span class="runic-separator__rune">◆</span>
            <span class="runic-separator__line"></span>
            <span class="runic-separator__rune-center">✦</span>
            <span class="runic-separator__line"></span>
            <span class="runic-separator__rune">◆</span>
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
      </RunicBox>

      <CardGrid
        :cards="filteredCards"
        :owned-card-ids="ownedCardIds"
        :empty-message="t('catalogue.empty')"
        :is-loading="isInitializing || isLoadingCatalogue"
        :loading-message="t('catalogue.loading')"
      />
    </div>
  </NuxtLayout>
</template>

<style scoped>
.runic-separator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.runic-separator__rune {
  font-size: 0.5rem;
  color: var(--color-accent);
  opacity: 0.5;
}

.runic-separator__rune-center {
  font-size: 0.625rem;
  color: var(--color-accent);
  opacity: 0.7;
  text-shadow: 0 0 8px var(--color-accent);
}

.runic-separator__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(175, 135, 80, 0.15) 30%,
    rgba(175, 135, 80, 0.15) 70%,
    transparent
  );
}
</style>
