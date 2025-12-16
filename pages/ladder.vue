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

// Stats for RunicStats component
const statsItems = computed(() => [
  { value: globalStats.value?.totalPlayers ?? 0, label: t('ladder.stats.players') },
  { value: globalStats.value?.totalCardsDistributed ?? 0, label: t('ladder.stats.distributed') },
])

// Split players into podium (top 3) and rest
const podiumPlayers = computed(() => players.value.slice(0, 3))
const restPlayers = computed(() => players.value.slice(3))

// Get rank class for header color
const getRankClass = (rank: number) => {
  if (rank === 1) return 'rank--gold'
  if (rank === 2) return 'rank--silver'
  if (rank === 3) return 'rank--bronze'
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

      <!-- Podium - Top 3 Players -->
      <div v-else-if="podiumPlayers.length > 0" class="ladder-podium">
        <div
          v-for="player in podiumPlayers"
          :key="player.userId"
          class="ladder-podium__card"
        >
          <RunicBox
            padding="none"
            class="ladder-podium__box"
            :class="{ 'ladder-podium__box--current': isCurrentUser(player) }"
          >
            <!-- Header with rank -->
            <div class="ladder-podium__header" :class="getRankClass(player.rank)">
              <span class="ladder-podium__header-rune">◆</span>
              <span class="ladder-podium__header-rank">#{{ player.rank }}</span>
              <span class="ladder-podium__header-rune">◆</span>
            </div>

            <!-- Content -->
            <div class="ladder-podium__content">
              <!-- Avatar -->
              <div class="ladder-podium__avatar">
                <img
                  v-if="player.avatarUrl"
                  :src="player.avatarUrl"
                  :alt="player.displayName"
                  class="ladder-podium__avatar-img"
                />
                <span v-else class="ladder-podium__avatar-placeholder">
                  {{ player.displayName?.charAt(0)?.toUpperCase() || '?' }}
                </span>
              </div>

              <!-- Username -->
              <span class="ladder-podium__username">{{ player.displayName }}</span>

              <!-- Progress -->
              <div class="ladder-podium__progress">
                <div class="ladder-podium__progress-bar">
                  <div
                    class="ladder-podium__progress-fill"
                    :style="{ width: `${player.completionPercent}%` }"
                  ></div>
                </div>
                <span class="ladder-podium__progress-text">{{ player.completionPercent }}%</span>
              </div>

              <!-- Stats -->
              <div class="ladder-podium__stats">
                <span class="ladder-podium__stat">
                  {{ player.uniqueCards }}/{{ globalStats?.totalUniqueCards }}
                </span>
                <span class="ladder-podium__stat ladder-podium__stat--foil">
                  {{ player.foilCount }} foils
                </span>
              </div>
            </div>
          </RunicBox>
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
            <!-- Header with rank -->
            <div class="ladder-entry__header">
              <span class="ladder-entry__header-rune">◆</span>
              <span class="ladder-entry__header-rank">#{{ player.rank }}</span>
              <span class="ladder-entry__header-rune">◆</span>
            </div>

            <!-- Content -->
            <div class="ladder-entry__content">
              <!-- User row -->
              <div class="ladder-entry__user-row">
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
              </div>

              <!-- Progress row -->
              <div class="ladder-entry__progress-row">
                <div class="ladder-entry__progress-bar">
                  <div
                    class="ladder-entry__progress-fill"
                    :style="{ width: `${player.completionPercent}%` }"
                  ></div>
                </div>
                <span class="ladder-entry__progress-text">{{ player.completionPercent }}%</span>
              </div>

              <!-- Stats row -->
              <div class="ladder-entry__stats-row">
                <span class="ladder-entry__stat">
                  {{ player.uniqueCards }}/{{ globalStats?.totalUniqueCards }} {{ t('ladder.columns.unique').toLowerCase() }}
                </span>
                <span class="ladder-entry__stat ladder-entry__stat--foil">
                  {{ player.foilCount }} foils
                </span>
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
   PODIUM - TOP 3 PLAYERS
   ========================================== */
.ladder-podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .ladder-podium {
    grid-template-columns: 1fr;
  }
}

.ladder-podium__card {
  display: flex;
}

.ladder-podium__box {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.ladder-podium__box--current {
  box-shadow: inset 0 0 25px rgba(175, 96, 37, 0.2), 0 0 20px rgba(175, 96, 37, 0.15);
}

.ladder-podium__box--current::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(175, 96, 37, 0.4);
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
}

/* Podium Header */
.ladder-podium__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border-bottom: 1px solid rgba(50, 48, 45, 0.5);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
}

.ladder-podium__header-rune {
  font-size: 0.5rem;
  color: rgba(100, 95, 90, 0.5);
  transition: color 0.3s ease;
}

.ladder-podium__header-rank {
  font-family: 'Cinzel', serif;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: rgba(140, 135, 130, 0.9);
}

/* Gold - Rank 1 */
.ladder-podium__header.rank--gold {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(201, 162, 39, 0.08) 4px,
      rgba(201, 162, 39, 0.08) 8px
    ),
    linear-gradient(
      180deg,
      rgba(60, 45, 15, 0.7) 0%,
      rgba(40, 30, 10, 0.4) 100%
    );
  border-bottom-color: rgba(201, 162, 39, 0.6);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(201, 162, 39, 0.2);
}

.ladder-podium__header.rank--gold .ladder-podium__header-rank {
  color: #d4af37;
  text-shadow: 0 0 15px rgba(201, 162, 39, 0.6);
}

.ladder-podium__header.rank--gold .ladder-podium__header-rune {
  color: rgba(201, 162, 39, 0.8);
}

/* Silver - Rank 2 */
.ladder-podium__header.rank--silver {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(192, 192, 192, 0.06) 4px,
      rgba(192, 192, 192, 0.06) 8px
    ),
    linear-gradient(
      180deg,
      rgba(50, 50, 55, 0.7) 0%,
      rgba(35, 35, 38, 0.4) 100%
    );
  border-bottom-color: rgba(192, 192, 192, 0.5);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(192, 192, 192, 0.15);
}

.ladder-podium__header.rank--silver .ladder-podium__header-rank {
  color: #d0d0d0;
  text-shadow: 0 0 12px rgba(192, 192, 192, 0.5);
}

.ladder-podium__header.rank--silver .ladder-podium__header-rune {
  color: rgba(192, 192, 192, 0.7);
}

/* Bronze - Rank 3 */
.ladder-podium__header.rank--bronze {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(205, 127, 50, 0.06) 4px,
      rgba(205, 127, 50, 0.06) 8px
    ),
    linear-gradient(
      180deg,
      rgba(55, 40, 25, 0.7) 0%,
      rgba(38, 28, 18, 0.4) 100%
    );
  border-bottom-color: rgba(205, 127, 50, 0.5);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(205, 127, 50, 0.15);
}

.ladder-podium__header.rank--bronze .ladder-podium__header-rank {
  color: #cd7f32;
  text-shadow: 0 0 12px rgba(205, 127, 50, 0.5);
}

.ladder-podium__header.rank--bronze .ladder-podium__header-rune {
  color: rgba(205, 127, 50, 0.7);
}

/* Podium Content */
.ladder-podium__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem 1rem;
  gap: 0.875rem;
}

/* Podium Avatar */
.ladder-podium__avatar {
  position: relative;
  width: 72px;
  height: 72px;
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

.ladder-podium__avatar::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid rgba(60, 55, 50, 0.6);
  border-radius: 50%;
  pointer-events: none;
}

.rank--gold + .ladder-podium__content .ladder-podium__avatar::before {
  border-color: rgba(201, 162, 39, 0.5);
  box-shadow: 0 0 12px rgba(201, 162, 39, 0.3);
}

.rank--silver + .ladder-podium__content .ladder-podium__avatar::before {
  border-color: rgba(192, 192, 192, 0.4);
  box-shadow: 0 0 10px rgba(192, 192, 192, 0.2);
}

.rank--bronze + .ladder-podium__content .ladder-podium__avatar::before {
  border-color: rgba(205, 127, 50, 0.4);
  box-shadow: 0 0 10px rgba(205, 127, 50, 0.2);
}

.ladder-podium__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ladder-podium__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  background: rgba(20, 18, 16, 0.9);
}

/* Podium Username */
.ladder-podium__username {
  font-family: 'Fontin SmallCaps', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(200, 195, 190, 0.95);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Podium Progress - Runic striped style */
.ladder-podium__progress {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ladder-podium__progress-bar {
  position: relative;
  flex: 1;
  height: 14px;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border-radius: 3px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8),
    0 1px 0 rgba(50, 45, 40, 0.3);
  border: 1px solid rgba(35, 32, 28, 0.8);
}

.ladder-podium__progress-fill {
  height: 100%;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.08) 3px,
      rgba(255, 255, 255, 0.08) 6px
    ),
    linear-gradient(
      180deg,
      rgba(201, 122, 58, 0.95) 0%,
      rgba(175, 96, 37, 0.9) 50%,
      rgba(168, 100, 40, 0.95) 100%
    );
  border-radius: 2px;
  transition: width 0.5s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 150, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 0 8px rgba(175, 96, 37, 0.4);
  border-right: 1px solid rgba(175, 135, 80, 0.5);
}

.ladder-podium__progress-text {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 700;
  color: #c97a3a;
  min-width: 50px;
  text-align: right;
  text-shadow: 0 0 8px rgba(175, 96, 37, 0.4);
}

/* Podium Stats */
.ladder-podium__stats {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.625rem;
  margin-top: 0.25rem;
  border-top: 1px solid rgba(50, 48, 45, 0.4);
}

.ladder-podium__stat {
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
  color: rgba(150, 145, 140, 0.9);
}

.ladder-podium__stat--foil {
  color: #d4af37;
  text-shadow: 0 0 6px rgba(212, 175, 55, 0.3);
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

/* Header with rank */
.ladder-entry__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(175, 135, 80, 0.04) 4px,
      rgba(175, 135, 80, 0.04) 8px
    ),
    linear-gradient(
      180deg,
      rgba(8, 8, 10, 0.95) 0%,
      rgba(14, 14, 16, 0.9) 40%,
      rgba(10, 10, 12, 0.95) 100%
    );
  border-bottom: 1px solid rgba(50, 48, 45, 0.5);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.4);
}

.ladder-entry__header-rune {
  font-size: 0.375rem;
  color: rgba(175, 135, 80, 0.5);
}

.ladder-entry__header-rank {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(175, 135, 80, 0.8);
}

/* Content section */
.ladder-entry__content {
  padding: 0.75rem 1rem;
}

/* User row */
.ladder-entry__user-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
}

.ladder-entry__avatar {
  position: relative;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
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
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  background: rgba(20, 18, 16, 0.9);
}

.ladder-entry__username {
  font-family: 'Fontin SmallCaps', serif;
  font-size: 1.0625rem;
  font-weight: 600;
  color: rgba(200, 195, 190, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* Progress row - Runic striped style */
.ladder-entry__progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
}

.ladder-entry__progress-bar {
  position: relative;
  flex: 1;
  height: 12px;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border-radius: 3px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.7),
    0 1px 0 rgba(50, 45, 40, 0.25);
  border: 1px solid rgba(35, 32, 28, 0.7);
}

.ladder-entry__progress-fill {
  height: 100%;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.08) 3px,
      rgba(255, 255, 255, 0.08) 6px
    ),
    linear-gradient(
      180deg,
      rgba(201, 122, 58, 0.95) 0%,
      rgba(175, 96, 37, 0.9) 50%,
      rgba(168, 100, 40, 0.95) 100%
    );
  border-radius: 2px;
  transition: width 0.5s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 150, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.25),
    0 0 6px rgba(175, 96, 37, 0.35);
  border-right: 1px solid rgba(175, 135, 80, 0.4);
}

.ladder-entry__progress-text {
  font-family: 'Cinzel', serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #c97a3a;
  min-width: 45px;
  text-align: right;
  text-shadow: 0 0 6px rgba(175, 96, 37, 0.3);
}

/* Stats row */
.ladder-entry__stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(50, 48, 45, 0.35);
}

.ladder-entry__stat {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(150, 145, 140, 0.9);
}

.ladder-entry__stat--foil {
  color: #d4af37;
  text-shadow: 0 0 5px rgba(212, 175, 55, 0.25);
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
@media (max-width: 480px) {
  .ladder-entry__stats-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .ladder-podium__progress-bar {
    height: 12px;
  }

  .ladder-entry__progress-bar {
    height: 10px;
  }
}
</style>
