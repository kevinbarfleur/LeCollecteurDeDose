<script setup lang="ts">
import { mockUserCollection } from "~/data/mockCards";
import type { Card, CardTier, CardVariation } from "~/types/card";
import { VARIATION_CONFIG } from "~/types/card";

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
  cards: Card[];
  count: number;
  variations: VariationGroup[];
  hasMultipleVariations: boolean;
}

const groupedCards = computed(() => {
  const groups = new Map<string, CardGroupWithVariations>();

  collection.value.forEach((card) => {
    const variation: CardVariation = card.variation ?? "standard";
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

const showDuplicates = ref(false);
const selectedTier = ref<CardTier | "all">("all");

const tierOptions = computed(() => [
  { value: "all", label: t("collection.tiers.all"), color: "default" },
  { value: "T0", label: t("collection.tiers.t0"), color: "t0" },
  { value: "T1", label: t("collection.tiers.t1"), color: "t1" },
  { value: "T2", label: t("collection.tiers.t2"), color: "t2" },
  { value: "T3", label: t("collection.tiers.t3"), color: "t3" },
]);

const filteredGroupedCards = computed(() => {
  let groups = groupedCards.value;
  if (selectedTier.value !== "all") {
    groups = groups.filter((g) => g.cards[0].tier === selectedTier.value);
  }
  return groups;
});

const filteredIndividualCards = computed(() => {
  let cards = collection.value;

  if (selectedTier.value !== "all") {
    cards = cards.filter((card) => card.tier === selectedTier.value);
  }

  return cards;
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
        <RunicBox padding="md" class="mb-8">
          <div class="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
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
              <div class="collection-main-stats__item">
                <span class="collection-main-stats__rune">◆</span>
                <span class="collection-main-stats__value">{{
                  stats.total
                }}</span>
                <span class="collection-main-stats__rune">◆</span>
                <span class="collection-main-stats__label">{{
                  t("collection.stats.cards")
                }}</span>
              </div>
              <div class="collection-main-stats__divider"></div>
              <div class="collection-main-stats__item">
                <span class="collection-main-stats__rune">◆</span>
                <span class="collection-main-stats__value">{{
                  stats.unique
                }}</span>
                <span class="collection-main-stats__rune">◆</span>
                <span class="collection-main-stats__label">{{
                  t("collection.stats.unique")
                }}</span>
              </div>
            </div>

            <div class="collection-tiers">
              <div
                v-for="tier in ['T0', 'T1', 'T2', 'T3'] as const"
                :key="tier"
                class="collection-tiers__item"
                :class="`collection-tiers__item--${tier.toLowerCase()}`"
              >
                <span class="collection-tiers__value">{{
                  stats[tier.toLowerCase() as keyof typeof stats]
                }}</span>
                <span class="collection-tiers__label">{{ tier }}</span>
              </div>
            </div>
          </div>
        </RunicBox>

        <div
          class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-8 p-4 bg-poe-surface/60 border border-poe-border/40 rounded-xl"
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

          <RunicRadio v-model="selectedTier" :options="tierOptions" size="md" />
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
  gap: 2rem;
  padding: 1rem 0;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .collection-main-stats {
    padding: 0 3rem;
    border-left: 1px solid rgba(50, 48, 45, 0.25);
    border-right: 1px solid rgba(50, 48, 45, 0.25);
  }
}

.collection-main-stats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.collection-main-stats__rune {
  display: inline-block;
  font-size: 0.5rem;
  color: rgba(100, 90, 75, 0.4);
  margin: 0 0.25rem;
}

.collection-main-stats__value {
  font-family: "Cinzel", serif;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  color: #d0d0d0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 25px rgba(175, 96, 37, 0.12),
    0 -1px 0 rgba(255, 255, 255, 0.05);
}

.collection-main-stats__label {
  font-family: "Cinzel", serif;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(100, 95, 90, 0.7);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.1);
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

.collection-tiers__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  background: linear-gradient(
    180deg,
    rgba(20, 20, 22, 0.95) 0%,
    rgba(15, 15, 17, 0.9) 50%,
    rgba(12, 12, 14, 0.95) 100%
  );

  border-radius: 4px;

  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.3);

  border: 1px solid rgba(45, 42, 38, 0.6);
  border-top-color: rgba(35, 32, 28, 0.7);
  border-bottom-color: rgba(60, 55, 50, 0.25);

  transition: all 0.3s ease;
}

.collection-tiers__item:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.08),
    0 3px 8px rgba(0, 0, 0, 0.4),
    0 0 15px var(--tier-glow, rgba(80, 70, 60, 0.1));
}

.collection-tiers__value {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 -1px 0 rgba(255, 255, 255, 0.03);
}

.collection-tiers__label {
  font-family: "Cinzel", serif;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 2px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(80, 75, 70, 0.08);
  opacity: 0.7;
}

.collection-tiers__item--t0 {
  --tier-glow: rgba(201, 162, 39, 0.15);
  border-color: rgba(201, 162, 39, 0.2);
}
.collection-tiers__item--t0 .collection-tiers__value {
  color: #c9a227;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(201, 162, 39, 0.2);
}
.collection-tiers__item--t0 .collection-tiers__label {
  color: rgba(201, 162, 39, 0.7);
}

.collection-tiers__item--t1 {
  --tier-glow: rgba(122, 106, 138, 0.15);
  border-color: rgba(122, 106, 138, 0.2);
}
.collection-tiers__item--t1 .collection-tiers__value {
  color: #9a8aaa;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(122, 106, 138, 0.2);
}
.collection-tiers__item--t1 .collection-tiers__label {
  color: rgba(122, 106, 138, 0.7);
}

.collection-tiers__item--t2 {
  --tier-glow: rgba(90, 112, 128, 0.15);
  border-color: rgba(90, 112, 128, 0.2);
}
.collection-tiers__item--t2 .collection-tiers__value {
  color: #7a9aaa;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8), 0 0 15px rgba(90, 112, 128, 0.2);
}
.collection-tiers__item--t2 .collection-tiers__label {
  color: rgba(90, 112, 128, 0.7);
}

.collection-tiers__item--t3 {
  --tier-glow: rgba(90, 90, 95, 0.1);
  border-color: rgba(70, 70, 75, 0.2);
}
.collection-tiers__item--t3 .collection-tiers__value {
  color: #7a7a80;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8);
}
.collection-tiers__item--t3 .collection-tiers__label {
  color: rgba(90, 90, 95, 0.6);
}
</style>
