<script setup lang="ts">
import type { Card } from "~/types/card";

const { t } = useI18n();

interface BoosterHistoryItem {
  booster: boolean;
  timestamp: string;
  content: Card[];
}

const props = defineProps<{
  modelValue: boolean;
  boosters: BoosterHistoryItem[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Format date to relative or absolute
const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `Il y a ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Il y a ${Math.floor(diffHours)}h`;
  } else if (diffDays < 7) {
    return `Il y a ${Math.floor(diffDays)} jour${Math.floor(diffDays) > 1 ? "s" : ""}`;
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};
</script>

<template>
  <RunicModal
    v-model="isOpen"
    :title="t('collection.history.title')"
    icon="✦"
    max-width="xl"
  >
    <!-- Loading state -->
    <div v-if="isLoading" class="history-empty">
      <div class="history-empty__icon-wrapper">
        <span class="history-empty__rune">◆</span>
        <span class="history-empty__icon">⏳</span>
        <span class="history-empty__rune">◆</span>
      </div>
      <p class="history-empty__text">Chargement de l'historique...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="boosters.length === 0" class="history-empty">
      <div class="history-empty__icon-wrapper">
        <span class="history-empty__rune">◆</span>
        <span class="history-empty__icon">📦</span>
        <span class="history-empty__rune">◆</span>
      </div>
      <p class="history-empty__text">Aucun booster ouvert pour le moment</p>
      <p class="history-empty__hint">Utilise !booster dans le chat Twitch pour ouvrir des boosters !</p>
    </div>

    <!-- Booster list -->
    <div v-else class="history-list">
      <RunicBox
        v-for="(booster, index) in boosters"
        :key="index"
        padding="none"
        class="history-booster"
      >
        <!-- Booster header -->
        <div class="history-booster__header">
          <div class="history-booster__title">
            <span class="history-booster__icon">📦</span>
            <span class="history-booster__number">Booster #{{ boosters.length - index }}</span>
          </div>
          <span class="history-booster__date">{{ formatDate(booster.timestamp) }}</span>
        </div>

        <!-- Cards table -->
        <div class="history-table">
          <div
            v-for="(card, cardIndex) in booster.content"
            :key="cardIndex"
            class="history-row"
            :class="{
              'history-row--foil': card.foil,
              [`history-row--${card.tier.toLowerCase()}`]: true
            }"
          >
            <!-- Image -->
            <div class="history-row__image">
              <img
                v-if="card.gameData?.img"
                :src="card.foil && card.gameData?.foilImg ? card.gameData.foilImg : card.gameData.img"
                :alt="card.name"
                loading="lazy"
              />
              <div v-else class="history-row__placeholder">?</div>
              <div v-if="card.foil" class="history-row__foil-badge">✨</div>
            </div>

            <!-- Name -->
            <span
              class="history-row__name"
              :class="{ 'history-row__name--foil': card.foil }"
            >
              {{ card.name }}
            </span>

            <!-- Tier -->
            <span
              class="history-row__tier"
              :class="`tier-${card.tier.toLowerCase()}`"
            >
              {{ card.tier }}
            </span>
          </div>
        </div>
      </RunicBox>
    </div>
  </RunicModal>
</template>

<style scoped>
/* Empty states */
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.history-empty__icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.history-empty__icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.history-empty__rune {
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
}

.history-empty__text {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.6);
  line-height: 1.5;
}

.history-empty__hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: rgba(120, 115, 110, 0.5);
}

/* Booster list */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Booster box */
.history-booster {
  overflow: hidden;
}

.history-booster__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(180deg, rgba(25, 23, 28, 0.8) 0%, rgba(18, 17, 20, 0.6) 100%);
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.history-booster__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-booster__icon {
  font-size: 1rem;
}

.history-booster__number {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #c9a227;
  text-shadow: 0 0 10px rgba(201, 162, 39, 0.3);
}

.history-booster__date {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(140, 130, 120, 0.7);
}

/* Cards table */
.history-table {
  display: flex;
  flex-direction: column;
}

/* Card row - data table style */
.history-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 18, 22, 0.4);
  border-bottom: 1px solid rgba(50, 45, 40, 0.2);
  transition: background 0.15s ease;
}

.history-row:last-child {
  border-bottom: none;
}

.history-row:hover {
  background: rgba(30, 28, 32, 0.5);
}

/* Row image */
.history-row__image {
  position: relative;
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(30, 28, 26, 0.5);
  flex-shrink: 0;
}

.history-row__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-row__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 55, 50, 0.5);
  color: rgba(140, 130, 120, 0.6);
  font-size: 0.875rem;
  font-weight: 600;
}

.history-row__foil-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 0.625rem;
}

/* Row name */
.history-row__name {
  flex: 1;
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  color: rgba(200, 195, 190, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Foil name with prismatic shimmer */
.history-row__name--foil {
  background: linear-gradient(
    90deg,
    #c0a0ff,
    #ffa0c0,
    #a0ffc0,
    #a0c0ff,
    #c0a0ff
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: foilTextShimmer 3s linear infinite;
}

/* Row tier badge */
.history-row__tier {
  font-family: "Cinzel", serif;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.1875rem 0.5rem;
  border-radius: 3px;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

/* Tier colors */
.tier-t0 {
  background: rgba(109, 90, 42, 0.4);
  color: #c9a227;
  border: 1px solid rgba(201, 162, 39, 0.3);
}

.tier-t1 {
  background: rgba(58, 52, 69, 0.4);
  color: #9a8aaa;
  border: 1px solid rgba(122, 106, 138, 0.3);
}

.tier-t2 {
  background: rgba(58, 69, 80, 0.4);
  color: #7a90a0;
  border: 1px solid rgba(90, 112, 128, 0.3);
}

.tier-t3 {
  background: rgba(50, 50, 53, 0.4);
  color: #7a7a7d;
  border: 1px solid rgba(90, 90, 93, 0.3);
}

/* Foil row with subtle shimmer */
.history-row--foil {
  position: relative;
  overflow: hidden;
}

.history-row--foil::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(192, 160, 255, 0.04) 0%,
    rgba(255, 160, 192, 0.04) 25%,
    rgba(160, 255, 192, 0.04) 50%,
    rgba(160, 192, 255, 0.04) 75%,
    rgba(192, 160, 255, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: foilShimmer 8s ease-in-out infinite;
  pointer-events: none;
}

/* Keyframes for foil effects */
@keyframes foilShimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes foilTextShimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* Responsive */
@media (max-width: 640px) {
  .history-row {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }

  .history-row__image {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .history-row__name {
    font-size: 0.8125rem;
  }
}
</style>
