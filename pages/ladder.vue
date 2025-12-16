<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
useHead({ title: t('meta.ladder.title') })

const { user: authUser } = useUserSession()

const {
  players,
  globalStats,
  isLoading,
  error,
  fetchLadder,
} = useLadder()

// Fetch ladder on mount
onMounted(() => {
  fetchLadder()
})

// Check if a player is the current user
const isCurrentUser = (player: any) => {
  if (!authUser.value?.displayName) return false
  return player.displayName?.toLowerCase() === authUser.value?.displayName?.toLowerCase()
}

// Primary stats for RunicStats component
const statsItems = computed(() => [
  { value: globalStats.value?.totalPlayers ?? 0, label: t('ladder.stats.players') },
  { value: globalStats.value?.totalCardsDistributed ?? 0, label: t('ladder.stats.distributed') },
  { value: globalStats.value?.totalUniqueCards ?? 0, label: t('ladder.stats.catalogue') },
])

// Split players into podium (top 3) and rest
const podiumPlayers = computed(() => players.value.slice(0, 3))
const restPlayers = computed(() => players.value.slice(3))

// Reorder podium for visual display: 2nd | 1st | 3rd
const orderedPodium = computed(() => {
  const top3 = podiumPlayers.value
  if (top3.length < 3) return top3
  return [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd
})

// Get podium step class
const getPodiumStepClass = (rank: number) => {
  if (rank === 1) return 'podium-step--first'
  if (rank === 2) return 'podium-step--second'
  if (rank === 3) return 'podium-step--third'
  return ''
}

// Get rank medal style class
const getRankMedalClass = (rank: number) => {
  if (rank === 1) return 'rank-medal--gold'
  if (rank === 2) return 'rank-medal--silver'
  if (rank === 3) return 'rank-medal--bronze'
  return ''
}
</script>

<template>
  <NuxtLayout>
    <div class="ladder-page">
      <!-- Header -->
      <RunicHeader :title="t('ladder.title')" :subtitle="t('ladder.subtitle')" />

      <!-- Global Stats -->
      <div class="ladder-stats">
        <RunicStats :stats="statsItems" />
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="ladder-loading">
        <div class="ladder-loading__spinner"></div>
        <span>{{ t('ladder.loading') }}</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="ladder-error">
        <span class="ladder-error__icon">!</span>
        <span>{{ error }}</span>
        <RunicButton variant="secondary" size="sm" @click="fetchLadder">
          {{ t('ladder.retry') }}
        </RunicButton>
      </div>

      <!-- Podium - Top 3 Players (Staircase layout: 2nd | 1st | 3rd) -->
      <div v-else-if="podiumPlayers.length > 0" class="podium">
        <div class="podium__stage">
          <div
            v-for="player in orderedPodium"
            :key="player.userId"
            class="podium__step"
            :class="getPodiumStepClass(player.rank)"
          >
            <!-- Player Card with RunicHeader + RunicBox -->
            <div
              class="podium__card"
              :class="[
                { 'podium__card--current': isCurrentUser(player) },
                getRankMedalClass(player.rank)
              ]"
            >
              <!-- RunicHeader with rank as title -->
              <div class="podium__header-wrapper" :class="getRankMedalClass(player.rank)">
                <RunicHeader
                  :title="`#${player.rank}`"
                  :centered="true"
                  :attached="true"
                />
              </div>

              <!-- RunicBox attached below -->
              <RunicBox padding="none" :attached="true" class="podium__box">
                <div class="podium__content">
                  <!-- Avatar -->
                  <div class="podium__avatar" :class="getRankMedalClass(player.rank)">
                    <img
                      v-if="player.avatarUrl"
                      :src="player.avatarUrl"
                      :alt="player.displayName"
                      class="podium__avatar-img"
                    />
                    <span v-else class="podium__avatar-placeholder">
                      {{ player.displayName?.charAt(0)?.toUpperCase() || '?' }}
                    </span>
                  </div>

                  <!-- Username -->
                  <span class="podium__username">{{ player.displayName }}</span>

                  <!-- Progress -->
                  <div class="podium__progress">
                    <RunicProgressBar
                      :value="player.completionPercent"
                      size="md"
                    />
                  </div>

                  <!-- Stats with RunicNumber -->
                  <div class="podium__stats">
                    <div class="podium__stat-item">
                      <RunicNumber
                        :value="player.uniqueCards"
                        :label="`/ ${globalStats?.totalUniqueCards}`"
                        color="default"
                        size="sm"
                      />
                    </div>
                    <div class="podium__stat-item podium__stat-item--foil">
                      <RunicNumber
                        :value="player.foilCount"
                        label="foils"
                        color="t0"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </RunicBox>
            </div>
          </div>
        </div>
      </div>

      <!-- Rest of Ladder List -->
      <ul v-if="!isLoading && restPlayers.length > 0" class="ladder-list">
        <li v-for="player in restPlayers" :key="player.userId" class="ladder-entry">
          <RunicBox
            padding="none"
            class="ladder-entry__box"
            :class="{ 'ladder-entry__box--current': isCurrentUser(player) }"
          >
            <!-- Content with inline rank -->
            <div class="ladder-entry__content">
              <!-- User row with rank, name, and stats -->
              <div class="ladder-entry__user-row">
                <div class="ladder-entry__rank-badge">
                  <RunicNumber
                    :value="player.rank"
                    color="default"
                    size="sm"
                  />
                </div>
                <div class="ladder-entry__avatar">
                  <img
                    v-if="player.avatarUrl"
                    :src="player.avatarUrl"
                    :alt="player.displayName"
                    class="ladder-entry__avatar-img"
                  />
                  <span v-else class="ladder-entry__avatar-placeholder">
                    {{ player.displayName?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </div>
                <span class="ladder-entry__username">{{ player.displayName }}</span>

                <!-- Stats inline -->
                <div class="ladder-entry__stats">
                  <span class="ladder-entry__stat">
                    <span class="ladder-entry__stat-value">{{ player.uniqueCards }}</span>
                    <span class="ladder-entry__stat-separator">/</span>
                    <span class="ladder-entry__stat-total">{{ globalStats?.totalUniqueCards }}</span>
                  </span>
                  <span class="ladder-entry__stat-divider">◆</span>
                  <span class="ladder-entry__stat ladder-entry__stat--foil">
                    <span class="ladder-entry__stat-value">{{ player.foilCount }}</span>
                    <span class="ladder-entry__stat-label">foils</span>
                  </span>
                </div>
              </div>

              <!-- Progress row -->
              <div class="ladder-entry__progress-row">
                <RunicProgressBar
                  :value="player.completionPercent"
                  size="sm"
                />
              </div>
            </div>
          </RunicBox>
        </li>
      </ul>

      <!-- Empty State -->
      <div v-if="!isLoading && players.length === 0" class="ladder-empty">
        <RunicBox padding="lg">
          <div class="ladder-empty__content">
            <div class="ladder-empty__icon-wrapper">
              <span class="ladder-empty__rune">◆</span>
              <span class="ladder-empty__icon">📜</span>
              <span class="ladder-empty__rune">◆</span>
            </div>
            <p class="ladder-empty__text">
              {{ t('ladder.empty') }}
            </p>
          </div>
        </RunicBox>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.ladder-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.ladder-stats {
  margin: 1.5rem 0;
}

/* Loading */
.ladder-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: rgba(200, 190, 180, 0.7);
}

.ladder-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(80, 70, 60, 0.3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.ladder-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: #e57373;
  text-align: center;
}

.ladder-error__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  background: rgba(229, 115, 115, 0.2);
  border: 2px solid rgba(229, 115, 115, 0.4);
  border-radius: 50%;
}

/* ==========================================
   PODIUM - STAIRCASE LAYOUT
   ========================================== */
.podium {
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.podium__stage {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.75rem;
  padding-top: 2rem;
}

/* Podium Steps with different heights */
.podium__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 280px;
  transition: transform 0.3s ease;
}

.podium__step:hover {
  transform: translateY(-4px);
}

/* Staircase effect - 1st is tallest in center */
.podium-step--first {
  order: 2;
  margin-top: 0;
}

.podium-step--second {
  order: 1;
  margin-top: 2.5rem;
}

.podium-step--third {
  order: 3;
  margin-top: 3.5rem;
}

/* Player Card */
.podium__card {
  width: 100%;
  position: relative;
}

.podium__card--current::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(175, 96, 37, 0.4);
  border-radius: 6px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 20px rgba(175, 96, 37, 0.15);
}

.podium__box {
  overflow: hidden;
}

/* Header wrapper - styles the RunicHeader runes by rank color */
.podium__header-wrapper {
  position: relative;
}

/* Gold - Color the runes and title subtly */
.podium__header-wrapper.rank-medal--gold :deep(.runic-header__rune) {
  color: rgba(201, 162, 39, 0.7);
  text-shadow: 0 0 8px rgba(201, 162, 39, 0.4);
}

.podium__header-wrapper.rank-medal--gold :deep(.runic-header__title) {
  color: #d4af37;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 12px rgba(201, 162, 39, 0.3);
}

.podium__header-wrapper.rank-medal--gold :deep(.runic-header__accent--left) {
  background: linear-gradient(to right, rgba(201, 162, 39, 0.5), rgba(201, 162, 39, 0.2), transparent);
}

.podium__header-wrapper.rank-medal--gold :deep(.runic-header__accent--right) {
  background: linear-gradient(to left, rgba(201, 162, 39, 0.5), rgba(201, 162, 39, 0.2), transparent);
}

/* Silver - Color the runes and title subtly */
.podium__header-wrapper.rank-medal--silver :deep(.runic-header__rune) {
  color: rgba(192, 192, 192, 0.7);
  text-shadow: 0 0 8px rgba(192, 192, 192, 0.3);
}

.podium__header-wrapper.rank-medal--silver :deep(.runic-header__title) {
  color: #c0c0c0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(192, 192, 192, 0.25);
}

.podium__header-wrapper.rank-medal--silver :deep(.runic-header__accent--left) {
  background: linear-gradient(to right, rgba(192, 192, 192, 0.4), rgba(192, 192, 192, 0.15), transparent);
}

.podium__header-wrapper.rank-medal--silver :deep(.runic-header__accent--right) {
  background: linear-gradient(to left, rgba(192, 192, 192, 0.4), rgba(192, 192, 192, 0.15), transparent);
}

/* Bronze - Color the runes and title subtly */
.podium__header-wrapper.rank-medal--bronze :deep(.runic-header__rune) {
  color: rgba(205, 127, 50, 0.7);
  text-shadow: 0 0 8px rgba(205, 127, 50, 0.3);
}

.podium__header-wrapper.rank-medal--bronze :deep(.runic-header__title) {
  color: #cd7f32;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(205, 127, 50, 0.25);
}

.podium__header-wrapper.rank-medal--bronze :deep(.runic-header__accent--left) {
  background: linear-gradient(to right, rgba(205, 127, 50, 0.4), rgba(205, 127, 50, 0.15), transparent);
}

.podium__header-wrapper.rank-medal--bronze :deep(.runic-header__accent--right) {
  background: linear-gradient(to left, rgba(205, 127, 50, 0.4), rgba(205, 127, 50, 0.15), transparent);
}

/* Podium Content */
.podium__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.875rem;
  gap: 0.75rem;
}

/* Avatar */
.podium__avatar {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 100%
  );
  flex-shrink: 0;
  box-shadow:
    inset 0 3px 8px rgba(0, 0, 0, 0.7),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.podium__avatar::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid rgba(60, 55, 50, 0.6);
  border-radius: 50%;
  pointer-events: none;
}

.podium__avatar.rank-medal--gold::before {
  border-color: rgba(201, 162, 39, 0.5);
  box-shadow: 0 0 12px rgba(201, 162, 39, 0.3);
}

.podium__avatar.rank-medal--silver::before {
  border-color: rgba(192, 192, 192, 0.4);
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.2);
}

.podium__avatar.rank-medal--bronze::before {
  border-color: rgba(205, 127, 50, 0.4);
  box-shadow: 0 0 10px rgba(205, 127, 50, 0.2);
}

.podium__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.podium__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cinzel', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  background: rgba(20, 18, 16, 0.9);
}

/* First place gets bigger avatar */
.podium-step--first .podium__avatar {
  width: 80px;
  height: 80px;
}

.podium-step--first .podium__avatar-placeholder {
  font-size: 1.5rem;
}

/* Username */
.podium__username {
  font-family: 'Fontin SmallCaps', serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: rgba(200, 195, 190, 0.95);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.podium-step--first .podium__username {
  font-size: 1.25rem;
}

/* Progress */
.podium__progress {
  width: 100%;
}

/* Stats Grid */
.podium__stats {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  border-top: 1px solid rgba(50, 48, 45, 0.4);
}

.podium__stat-item {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* ==========================================
   LADDER LIST (REMAINING PLAYERS)
   ========================================== */
.ladder-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* ==========================================
   LADDER ENTRY - RunicBox based design
   ========================================== */
.ladder-entry {
  list-style: none;
}

.ladder-entry__box {
  overflow: hidden;
  position: relative;
  transition: box-shadow 0.3s ease;
}

.ladder-entry__box:hover {
  box-shadow: inset 0 0 15px rgba(175, 96, 37, 0.08), 0 0 10px rgba(175, 96, 37, 0.05);
}

.ladder-entry__box--current {
  box-shadow: inset 0 0 25px rgba(175, 96, 37, 0.15), 0 0 16px rgba(175, 96, 37, 0.1);
}

.ladder-entry__box--current::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(175, 96, 37, 0.35);
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
}

/* Content section */
.ladder-entry__content {
  padding: 0.875rem 1rem;
}

/* User row with integrated rank */
.ladder-entry__user-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
}

/* Rank badge using RunicNumber */
.ladder-entry__rank-badge {
  flex-shrink: 0;
}

.ladder-entry__rank-badge :deep(.runic-number__cavity) {
  min-width: 42px;
  min-height: 32px;
  padding: 0.25rem 0.5rem;
}

.ladder-entry__rank-badge :deep(.runic-number__value) {
  font-size: 0.9375rem;
}

.ladder-entry__avatar {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 100%
  );
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}

.ladder-entry__avatar::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgba(60, 55, 50, 0.5);
  border-radius: 50%;
  pointer-events: none;
}

.ladder-entry__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ladder-entry__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  background: rgba(20, 18, 16, 0.9);
}

.ladder-entry__username {
  flex: 1;
  font-family: 'Fontin SmallCaps', serif;
  font-size: 1.0625rem;
  font-weight: 600;
  color: rgba(200, 195, 190, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* Progress row */
.ladder-entry__progress-row {
  /* No bottom margin since stats moved inline */
}

/* Stats inline with username row */
.ladder-entry__stats {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-left: auto;
  flex-shrink: 0;
}

.ladder-entry__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(150, 145, 140, 0.9);
}

.ladder-entry__stat-value {
  font-family: 'Cinzel', serif;
  font-weight: 600;
  color: rgba(200, 190, 175, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.ladder-entry__stat-separator {
  color: rgba(100, 95, 90, 0.6);
  margin: 0 0.125rem;
}

.ladder-entry__stat-total {
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  color: rgba(120, 115, 110, 0.8);
}

.ladder-entry__stat-label {
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.7);
  margin-left: 0.125rem;
}

.ladder-entry__stat-divider {
  font-size: 0.375rem;
  color: rgba(100, 90, 75, 0.5);
}

/* Foil stat with gold accent */
.ladder-entry__stat--foil .ladder-entry__stat-value {
  color: rgba(212, 175, 55, 0.9);
  text-shadow: 0 0 6px rgba(212, 175, 55, 0.2), 0 1px 2px rgba(0, 0, 0, 0.5);
}

.ladder-entry__stat--foil .ladder-entry__stat-label {
  color: rgba(180, 150, 80, 0.7);
}

/* Empty State */
.ladder-empty__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.ladder-empty__icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ladder-empty__icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.ladder-empty__rune {
  font-size: 0.5rem;
  color: rgba(175, 135, 80, 0.4);
}

.ladder-empty__text {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.7);
  line-height: 1.5;
}

/* ==========================================
   RESPONSIVE
   ========================================== */

/* Tablet */
@media (max-width: 768px) {
  .podium__stage {
    gap: 0.5rem;
  }

  .podium__step {
    max-width: 220px;
  }

  .podium-step--second {
    margin-top: 2rem;
  }

  .podium-step--third {
    margin-top: 2.75rem;
  }

  .podium__avatar {
    width: 56px;
    height: 56px;
  }

  .podium-step--first .podium__avatar {
    width: 68px;
    height: 68px;
  }

  .podium__username {
    font-size: 1rem;
  }

  .podium-step--first .podium__username {
    font-size: 1.125rem;
  }

  .podium__stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Smaller header on tablet */
  .podium__header-wrapper :deep(.runic-header__title) {
    font-size: 1.25rem;
  }
}

/* Mobile - Stack podium vertically */
@media (max-width: 640px) {
  .podium__stage {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding-top: 1rem;
  }

  .podium__step {
    max-width: 100%;
    width: 100%;
    margin-top: 0 !important;
    order: unset !important;
  }

  /* Reorder for mobile: 1st, 2nd, 3rd from top to bottom */
  .podium-step--first { order: 1 !important; }
  .podium-step--second { order: 2 !important; }
  .podium-step--third { order: 3 !important; }

  .podium__step:hover {
    transform: none;
  }

  .podium__card {
    display: flex;
    flex-direction: column;
  }

  .podium__box {
    flex: 1;
  }

  .podium__content {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 0.625rem;
  }

  .podium__avatar {
    width: 48px;
    height: 48px;
  }

  .podium-step--first .podium__avatar {
    width: 56px;
    height: 56px;
  }

  .podium__username {
    flex: 1;
    text-align: left;
    font-size: 1.0625rem;
  }

  .podium-step--first .podium__username {
    font-size: 1.125rem;
  }

  .podium__progress {
    width: 100%;
    order: 3;
  }

  .podium__stats {
    width: 100%;
    order: 4;
    flex-direction: row;
    justify-content: space-around;
    gap: 0.75rem;
    padding-top: 0.625rem;
  }

  /* Compact header on mobile */
  .podium__header-wrapper :deep(.runic-header) {
    padding: 0.75rem 1rem 0.625rem;
  }

  .podium__header-wrapper :deep(.runic-header__title) {
    font-size: 1.125rem;
  }

  .podium__header-wrapper :deep(.runic-header__rune) {
    font-size: 0.4rem;
    margin: 0 0.5rem;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .ladder-entry__user-row {
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .ladder-entry__username {
    flex: 0 1 auto;
    min-width: 0;
  }

  .ladder-entry__stats {
    gap: 0.375rem;
    margin-left: auto;
  }

  .ladder-entry__stat {
    font-size: 0.75rem;
  }

  .ladder-entry__stat-value {
    font-size: 0.75rem;
  }

  .ladder-entry__stat-total {
    font-size: 0.6875rem;
  }

  .ladder-entry__stat-label {
    font-size: 0.625rem;
  }

  .ladder-entry__stat-divider {
    display: none;
  }

  .ladder-entry__rank-badge :deep(.runic-number__cavity) {
    min-width: 36px;
    min-height: 28px;
    padding: 0.1875rem 0.375rem;
  }

  .ladder-entry__rank-badge :deep(.runic-number__value) {
    font-size: 0.8125rem;
  }

  .ladder-entry__avatar {
    width: 32px;
    height: 32px;
  }

  .ladder-entry__username {
    font-size: 0.9375rem;
  }

  .podium__stats {
    gap: 0.5rem;
  }

  .podium__stat-item :deep(.runic-number__cavity) {
    min-width: 40px;
    min-height: 32px;
    padding: 0.25rem 0.375rem;
  }

  .podium__stat-item :deep(.runic-number__value) {
    font-size: 0.9375rem;
  }

  .podium__stat-item :deep(.runic-number__label) {
    font-size: 0.625rem;
  }
}
</style>
