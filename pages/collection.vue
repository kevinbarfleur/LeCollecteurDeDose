<script setup lang="ts">
import { mockUserCollection } from "~/data/mockCards";
import type { Card, CardTier, CardVariation } from "~/types/card";
import { VARIATION_CONFIG, getCardVariation } from "~/types/card";

const { t } = useI18n();

useHead({ title: t("meta.collection.title") });

const { loggedIn, user: authUser } = useUserSession();

const user = computed(() => ({
  name: authUser.value?.displayName || "Test User",
  avatar:
    authUser.value?.avatar ||
    "https://static-cdn.jtvnw.net/jtv_user_pictures/default-profile_image-300x300.png",
}));

const collection = computed(() => mockUserCollection);

// Interface for variation grouping
interface VariationGroup {
  variation: CardVariation;
  cards: Card[];
  count: number;
}

interface CardGroupWithVariations {
  cardId: string;
  name: string;
  tier: CardTier;
  itemClass: string;
  cards: Card[];
  count: number;
  variations: VariationGroup[];
  hasMultipleVariations: boolean;
}

const groupedCards = computed(() => {
  const groups = new Map<string, CardGroupWithVariations>();

  collection.value.forEach((card) => {
    const variation: CardVariation = getCardVariation(card);
    const existing = groups.get(card.id);

    if (existing) {
      existing.cards.push(card);
      existing.count++;

      // Update variation groups
      const existingVariation = existing.variations.find(
        (v) => v.variation === variation
      );
      if (existingVariation) {
        existingVariation.cards.push(card);
        existingVariation.count++;
      } else {
        existing.variations.push({
          variation,
          cards: [card],
          count: 1,
        });
      }
    } else {
      groups.set(card.id, {
        cardId: card.id,
        name: card.name,
        tier: card.tier,
        itemClass: card.itemClass,
        cards: [card],
        count: 1,
        variations: [
          {
            variation,
            cards: [card],
            count: 1,
          },
        ],
        hasMultipleVariations: false,
      });
    }
  });

  // Sort variations by priority (foil first) and update hasMultipleVariations flag
  groups.forEach((group) => {
    group.variations.sort(
      (a, b) =>
        VARIATION_CONFIG[a.variation].priority -
        VARIATION_CONFIG[b.variation].priority
    );
    group.hasMultipleVariations = group.variations.length > 1;
  });

  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };
  return Array.from(groups.values()).sort(
    (a, b) => tierOrder[a.tier] - tierOrder[b.tier]
  );
});

const stats = computed(() => {
  const cards = collection.value;
  return {
    total: cards.length,
    unique: groupedCards.value.length,
    t0: cards.filter((c) => c.tier === "T0").length,
    t1: cards.filter((c) => c.tier === "T1").length,
    t2: cards.filter((c) => c.tier === "T2").length,
    t3: cards.filter((c) => c.tier === "T3").length,
  };
});

// Filters
const searchQuery = ref("");
const selectedCategories = ref<string[]>([]);
const showDuplicates = ref(false);
const selectedTier = ref<CardTier | "all">("all");
const selectedSort = ref("rarity-asc");

// Sort options
type SortOption = "rarity-asc" | "rarity-desc" | "alpha-asc" | "alpha-desc" | "category-asc" | "category-desc";

const sortOptions = [
  { value: "rarity-asc", label: "Rareté ↑ (T0 → T3)" },
  { value: "rarity-desc", label: "Rareté ↓ (T3 → T0)" },
  { value: "alpha-asc", label: "Alphabétique (A → Z)" },
  { value: "alpha-desc", label: "Alphabétique (Z → A)" },
  { value: "category-asc", label: "Catégorie (A → Z)" },
  { value: "category-desc", label: "Catégorie (Z → A)" },
];

// Sort function for cards
const sortCards = (cards: Card[], sortType: SortOption): Card[] => {
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

  return [...cards].sort((a, b) => {
    switch (sortType) {
      case "rarity-asc":
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[a.tier] - tierOrder[b.tier];
        }
        return a.name.localeCompare(b.name);

      case "rarity-desc":
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[b.tier] - tierOrder[a.tier];
        }
        return a.name.localeCompare(b.name);

      case "alpha-asc":
        return a.name.localeCompare(b.name);

      case "alpha-desc":
        return b.name.localeCompare(a.name);

      case "category-asc":
        if (a.itemClass !== b.itemClass) {
          return a.itemClass.localeCompare(b.itemClass);
        }
        return a.name.localeCompare(b.name);

      case "category-desc":
        if (a.itemClass !== b.itemClass) {
          return b.itemClass.localeCompare(a.itemClass);
        }
        return a.name.localeCompare(b.name);

      default:
        return 0;
    }
  });
};

// Sort function for grouped cards
const sortGroupedCards = (groups: CardGroupWithVariations[], sortType: SortOption): CardGroupWithVariations[] => {
  const tierOrder: Record<CardTier, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

  return [...groups].sort((a, b) => {
    switch (sortType) {
      case "rarity-asc":
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[a.tier] - tierOrder[b.tier];
        }
        return a.name.localeCompare(b.name);

      case "rarity-desc":
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
          return tierOrder[b.tier] - tierOrder[a.tier];
        }
        return a.name.localeCompare(b.name);

      case "alpha-asc":
        return a.name.localeCompare(b.name);

      case "alpha-desc":
        return b.name.localeCompare(a.name);

      case "category-asc":
        if (a.itemClass !== b.itemClass) {
          return a.itemClass.localeCompare(b.itemClass);
        }
        return a.name.localeCompare(b.name);

      case "category-desc":
        if (a.itemClass !== b.itemClass) {
          return b.itemClass.localeCompare(a.itemClass);
        }
        return a.name.localeCompare(b.name);

      default:
        return 0;
    }
  });
};

// Extract unique categories from player's collection only (with count)
const categoryOptions = computed(() => {
  const categoryMap = new Map<string, number>();

  collection.value.forEach((card) => {
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

const filteredGroupedCards = computed(() => {
  let groups = groupedCards.value;

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    groups = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.itemClass.toLowerCase().includes(query)
    );
  }

  // Filter by selected categories
  if (selectedCategories.value.length > 0) {
    groups = groups.filter((g) =>
      selectedCategories.value.includes(g.itemClass)
    );
  }

  // Filter by tier
  if (selectedTier.value !== "all") {
    groups = groups.filter((g) => g.tier === selectedTier.value);
  }

  // Apply sorting
  return sortGroupedCards(groups, selectedSort.value as SortOption);
});

const filteredIndividualCards = computed(() => {
  let cards = collection.value;

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    cards = cards.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.itemClass.toLowerCase().includes(query)
    );
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
</script>

<template>
  <NuxtLayout>
    <div class="page-container">
      <div
        v-if="!loggedIn"
        class="min-h-[60vh] flex items-center justify-center"
      >
        <RunicBox padding="lg" max-width="400px" centered>
          <div class="w-40 h-40 mx-auto mb-6">
            <img
              src="/images/logo.png"
              alt="Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <h1 class="font-display text-2xl text-poe-text mb-3">
            {{ t("collection.auth.title") }}
          </h1>
          <p class="font-body text-poe-text-dim mb-8 leading-relaxed">
            {{ t("collection.auth.description") }}
          </p>
          <RunicButton
            href="/auth/twitch"
            :external="false"
            variant="twitch"
            icon="twitch"
            rune-left="✦"
            rune-right="✦"
          >
            {{ t("collection.auth.button") }}
          </RunicButton>
        </RunicBox>
      </div>

      <div v-if="loggedIn">
        <div class="mb-8">
          <RunicHeader
            :title="t('collection.title')"
            :subtitle="t('collection.subtitle')"
            attached
          />
          <RunicBox padding="md" attached>
            <div
              class="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <div class="collection-profile">
                <div class="collection-profile__avatar-wrapper">
                  <div class="collection-profile__avatar-ring"></div>
                  <img
                    :src="user.avatar"
                    :alt="user.name"
                    class="collection-profile__avatar"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <h1
                    class="font-display text-2xl font-semibold text-white/90 tracking-wide m-0"
                  >
                    {{ user.name }}
                  </h1>
                  <div
                    class="flex items-center gap-2 font-body text-sm text-poe-text-muted italic"
                  >
                    <span class="text-[0.5rem] text-accent opacity-70">◆</span>
                    <span>{{ t("collection.profile.role") }}</span>
                    <span class="text-[0.5rem] text-accent opacity-70">◆</span>
                  </div>
                </div>
              </div>

              <div class="collection-main-stats">
                <RunicNumber
                  :value="stats.total"
                  :label="t('collection.stats.cards')"
                  color="default"
                  size="lg"
                />
                <div class="collection-main-stats__divider"></div>
                <RunicNumber
                  :value="stats.unique"
                  :label="t('collection.stats.unique')"
                  color="default"
                  size="lg"
                />
              </div>

              <div class="collection-tiers">
                <RunicNumber
                  v-for="tier in ['T0', 'T1', 'T2', 'T3'] as const"
                  :key="tier"
                  :value="stats[tier.toLowerCase() as keyof typeof stats]"
                  :label="tier"
                  :color="tier.toLowerCase() as 't0' | 't1' | 't2' | 't3'"
                  size="sm"
                />
              </div>
            </div>
          </RunicBox>
        </div>

        <!-- Filters -->
        <div class="flex flex-col gap-3 sm:gap-4 mb-8">
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
                placeholder="Catégories possédées..."
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

          <!-- Duplicates toggle and Tier filter -->
          <RunicBox padding="sm">
            <div
              class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
            >
              <div class="flex items-center gap-3">
                <RunicRadio
                  v-model="showDuplicates"
                  :toggle="true"
                  toggle-color="default"
                  size="sm"
                />
                <span
                  class="font-body text-sm text-poe-text-dim transition-colors duration-base"
                  >{{ t("collection.filters.showDuplicates") }}</span
                >
              </div>

              <RunicRadio
                v-model="selectedTier"
                :options="tierOptions"
                size="md"
              />
            </div>
          </RunicBox>
        </div>

        <CardGrid
          v-if="!showDuplicates"
          :grouped-cards="filteredGroupedCards"
          :empty-message="t('collection.empty')"
        />

        <CardGrid
          v-else
          :cards="filteredIndividualCards"
          :empty-message="t('collection.empty')"
        />
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.collection-profile__avatar-ring::before {
  content: "";
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

.collection-main-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem 0;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .collection-main-stats {
    padding: 0 2rem;
    gap: 2rem;
    border-left: 1px solid rgba(50, 48, 45, 0.25);
    border-right: 1px solid rgba(50, 48, 45, 0.25);
  }
}

.collection-main-stats__divider {
  width: 1px;
  height: 45px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(80, 70, 60, 0.3),
    transparent
  );
}

.collection-tiers {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .collection-tiers {
    justify-content: flex-end;
  }
}
</style>
