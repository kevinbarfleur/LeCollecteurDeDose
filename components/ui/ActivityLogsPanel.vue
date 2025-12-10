<script setup lang="ts">
import { useActivityLogs } from '~/composables/useActivityLogs';
import { VAAL_OUTCOMES, type VaalOutcome } from '~/types/vaalOutcome';
import poeUniques from '~/data/poe_uniques.json';

const { t } = useI18n();

const {
  logs,
  unreadCount,
  isOpen,
  isConnected,
  hasUnread,
  togglePanel,
  closePanel,
} = useActivityLogs();

// Get card name from ID
const getCardName = (cardId: string): string => {
  const card = poeUniques.find((c: any) => c.id === cardId);
  return card?.name || cardId;
};

// Get outcome config
const getOutcomeEmoji = (outcome: string): string => {
  return VAAL_OUTCOMES[outcome as VaalOutcome]?.emoji || '❓';
};

const getOutcomeLabel = (outcome: string): string => {
  return VAAL_OUTCOMES[outcome as VaalOutcome]?.label || outcome;
};

// Format relative time
const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) return t('activityLogs.justNow');
  if (diffMins < 60) return t('activityLogs.minutesAgo', { n: diffMins });
  if (diffHours < 24) return t('activityLogs.hoursAgo', { n: diffHours });
  return date.toLocaleDateString('fr-FR');
};

// Get tier color class
const getTierClass = (tier: string): string => {
  const tierMap: Record<string, string> = {
    'T0': 'tier-t0',
    'T1': 'tier-t1',
    'T2': 'tier-t2',
    'T3': 'tier-t3',
  };
  return tierMap[tier] || '';
};

// Get outcome color class
const getOutcomeClass = (outcome: string): string => {
  const outcomeMap: Record<string, string> = {
    'destroyed': 'outcome-destroyed',
    'foil': 'outcome-foil',
    'transform': 'outcome-transform',
    'duplicate': 'outcome-duplicate',
    'nothing': 'outcome-nothing',
  };
  return outcomeMap[outcome] || '';
};
</script>

<template>
  <div class="activity-logs-wrapper">
    <!-- Toggle Tab (attached to edge) -->
    <button
      class="activity-tab"
      :class="{ 'activity-tab--open': isOpen, 'activity-tab--has-unread': hasUnread && !isOpen }"
      @click="togglePanel"
      :aria-label="t('activityLogs.toggleLabel')"
    >
      <div class="activity-tab__inner">
        <!-- Connection indicator -->
        <span 
          class="activity-tab__status"
          :class="{ 'activity-tab__status--connected': isConnected }"
        />
        
        <!-- Icon -->
        <svg class="activity-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>

        <!-- Badge -->
        <Transition name="badge-pop">
          <span v-if="hasUnread && !isOpen" class="activity-tab__badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </Transition>
      </div>
      
      <!-- Rune accent -->
      <span class="activity-tab__rune">◆</span>
    </button>

    <!-- Panel -->
    <Transition name="slide-panel">
      <div v-if="isOpen" class="activity-panel">
        <!-- Corner accents -->
        <div class="activity-panel__corner activity-panel__corner--tl"></div>
        <div class="activity-panel__corner activity-panel__corner--tr"></div>
        <div class="activity-panel__corner activity-panel__corner--bl"></div>
        <div class="activity-panel__corner activity-panel__corner--br"></div>

        <!-- Header -->
        <div class="activity-panel__header">
          <div class="activity-panel__header-accent activity-panel__header-accent--left"></div>
          <div class="activity-panel__header-accent activity-panel__header-accent--right"></div>
          
          <h3 class="activity-panel__title">
            <span class="activity-panel__title-rune">✧</span>
            {{ t('activityLogs.title') }}
            <span class="activity-panel__title-rune">✧</span>
          </h3>
          
          <button class="activity-panel__close" @click="closePanel" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="activity-panel__header-edge"></div>
        </div>

        <!-- Content -->
        <div class="activity-panel__content">
          <template v-if="logs.length === 0">
            <div class="activity-empty">
              <div class="activity-empty__icon-wrapper">
                <span class="activity-empty__rune activity-empty__rune--left">◆</span>
                <span class="activity-empty__icon">📜</span>
                <span class="activity-empty__rune activity-empty__rune--right">◆</span>
              </div>
              <p class="activity-empty__text">{{ t('activityLogs.empty') }}</p>
            </div>
          </template>

          <TransitionGroup v-else name="log-item" tag="ul" class="activity-list">
            <li
              v-for="log in logs"
              :key="log.id"
              class="activity-item"
            >
              <!-- Avatar -->
              <div class="activity-item__avatar">
                <img
                  v-if="log.user_avatar"
                  :src="log.user_avatar"
                  :alt="log.username"
                  class="activity-item__avatar-img"
                />
                <span v-else class="activity-item__avatar-placeholder">
                  {{ log.username.charAt(0).toUpperCase() }}
                </span>
              </div>

              <!-- Content -->
              <div class="activity-item__content">
                <div class="activity-item__header">
                  <span class="activity-item__username">{{ log.username }}</span>
                  <span class="activity-item__time">{{ formatRelativeTime(log.created_at) }}</span>
                </div>

                <div class="activity-item__card">
                  <span class="activity-item__tier" :class="getTierClass(log.card_tier)">
                    {{ log.card_tier }}
                  </span>
                  <span class="activity-item__card-name">{{ getCardName(log.card_id) }}</span>
                  <template v-if="log.outcome === 'transform' && log.result_card_id">
                    <span class="activity-item__arrow">→</span>
                    <span class="activity-item__card-name">{{ getCardName(log.result_card_id) }}</span>
                  </template>
                </div>
                
                <!-- Outcome & Replay Row -->
                <div class="activity-item__footer">
                  <!-- Outcome Box -->
                  <div class="outcome-box" :class="getOutcomeClass(log.outcome)">
                    <span class="outcome-box__rune outcome-box__rune--left">◆</span>
                    <span class="outcome-box__emoji">{{ getOutcomeEmoji(log.outcome) }}</span>
                    <span class="outcome-box__label">{{ getOutcomeLabel(log.outcome) }}</span>
                    <span class="outcome-box__rune outcome-box__rune--right">◆</span>
                  </div>
                  
                  <!-- Replay Link -->
                  <NuxtLink
                    v-if="log.replay_id"
                    :to="`/replay/${log.replay_id}`"
                    class="replay-link"
                    :title="t('activityLogs.watchReplay')"
                  >
                    <svg class="replay-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
                    </svg>
                    <span class="replay-link__text">{{ t('activityLogs.replay') }}</span>
                  </NuxtLink>
                </div>
              </div>
            </li>
          </TransitionGroup>
        </div>
      </div>
    </Transition>

    <!-- Backdrop for mobile -->
    <Transition name="fade">
      <div v-if="isOpen" class="activity-backdrop" @click="closePanel" />
    </Transition>
  </div>
</template>

<style scoped>
.activity-logs-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
}

/* ==========================================
   TOGGLE TAB - Runic style attached to edge
   ========================================== */
.activity-tab {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem 0.75rem 0.625rem;
  cursor: pointer;
  pointer-events: auto;
  z-index: 101;
  
  /* Runic dark stone background */
  background: linear-gradient(
    90deg,
    rgba(18, 18, 22, 0.98) 0%,
    rgba(14, 14, 17, 0.99) 100%
  );
  
  border: 1px solid rgba(60, 55, 50, 0.5);
  border-right: none;
  border-radius: 6px 0 0 6px;
  
  box-shadow: 
    inset 0 1px 0 rgba(80, 75, 70, 0.1),
    inset 1px 0 0 rgba(80, 75, 70, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    -4px 0 12px rgba(0, 0, 0, 0.5);
  
  transition: all 0.3s ease;
}

.activity-tab::before {
  content: "";
  position: absolute;
  inset: 3px;
  right: 0;
  border: 1px solid rgba(80, 65, 50, 0.15);
  border-right: none;
  border-radius: 4px 0 0 4px;
  pointer-events: none;
  transition: border-color 0.3s ease;
}

.activity-tab:hover {
  background: linear-gradient(
    90deg,
    rgba(28, 25, 22, 0.98) 0%,
    rgba(22, 20, 18, 0.99) 100%
  );
  border-color: rgba(100, 80, 60, 0.5);
  box-shadow: 
    inset 0 1px 0 rgba(100, 85, 70, 0.15),
    inset 1px 0 0 rgba(100, 85, 70, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    -6px 0 20px rgba(0, 0, 0, 0.6),
    0 0 15px rgba(175, 96, 37, 0.1);
}

.activity-tab:hover::before {
  border-color: rgba(120, 95, 70, 0.25);
}

.activity-tab--open {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(100%);
}

.activity-tab--has-unread {
  border-color: rgba(175, 96, 37, 0.5);
}

.activity-tab--has-unread::after {
  content: "";
  position: absolute;
  inset: -1px;
  right: 0;
  border-radius: 6px 0 0 6px;
  background: linear-gradient(
    90deg,
    rgba(175, 96, 37, 0.15),
    transparent
  );
  pointer-events: none;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.activity-tab__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-tab__status {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(80, 70, 60, 0.5);
  transition: all 0.3s ease;
}

.activity-tab__status--connected {
  background: #4a9f5a;
  box-shadow: 0 0 6px rgba(74, 159, 90, 0.6);
}

.activity-tab__icon {
  width: 20px;
  height: 20px;
  color: rgba(140, 130, 120, 0.7);
  transition: color 0.3s ease;
}

.activity-tab:hover .activity-tab__icon {
  color: rgba(175, 96, 37, 0.9);
}

.activity-tab--has-unread .activity-tab__icon {
  color: rgba(175, 96, 37, 0.8);
}

.activity-tab__badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  font-family: 'Cinzel', serif;
  font-size: 9px;
  font-weight: 600;
  color: #1a1a1a;
  
  background: linear-gradient(135deg, #c9a227 0%, #af6025 100%);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 0 0 8px rgba(175, 96, 37, 0.4);
}

.activity-tab__rune {
  font-size: 0.375rem;
  color: rgba(80, 70, 60, 0.4);
  transition: color 0.3s ease;
}

.activity-tab:hover .activity-tab__rune {
  color: rgba(175, 96, 37, 0.6);
}

/* ==========================================
   PANEL - Runic style sidebar
   ========================================== */
.activity-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  
  /* Dark stone background */
  background: linear-gradient(
    180deg,
    rgba(14, 14, 17, 0.99) 0%,
    rgba(10, 10, 12, 0.99) 50%,
    rgba(12, 12, 15, 0.99) 100%
  );
  
  border-left: 1px solid rgba(50, 48, 45, 0.5);
  
  box-shadow: 
    inset 1px 0 0 rgba(80, 75, 70, 0.08),
    -8px 0 30px rgba(0, 0, 0, 0.7);
}

/* Corner accents */
.activity-panel__corner {
  position: absolute;
  pointer-events: none;
  z-index: 2;
}

.activity-panel__corner--tl {
  top: 60px;
  left: 10px;
  width: 20px;
  height: 20px;
}
.activity-panel__corner--tl::before {
  content: "";
  position: absolute;
  width: 20px;
  height: 1px;
  background: linear-gradient(to right, rgba(175, 96, 37, 0.4), transparent);
}
.activity-panel__corner--tl::after {
  content: "";
  position: absolute;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, rgba(175, 96, 37, 0.4), transparent);
}

.activity-panel__corner--tr {
  top: 60px;
  right: 10px;
  width: 20px;
  height: 20px;
}
.activity-panel__corner--tr::before {
  content: "";
  position: absolute;
  right: 0;
  width: 20px;
  height: 1px;
  background: linear-gradient(to left, rgba(80, 70, 55, 0.3), transparent);
}
.activity-panel__corner--tr::after {
  content: "";
  position: absolute;
  right: 0;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, rgba(80, 70, 55, 0.3), transparent);
}

.activity-panel__corner--bl {
  bottom: 10px;
  left: 10px;
  width: 15px;
  height: 15px;
}
.activity-panel__corner--bl::before {
  content: "";
  position: absolute;
  bottom: 0;
  width: 15px;
  height: 1px;
  background: linear-gradient(to right, rgba(80, 70, 55, 0.25), transparent);
}
.activity-panel__corner--bl::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 15px;
  background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent);
}

.activity-panel__corner--br {
  bottom: 10px;
  right: 10px;
  width: 25px;
  height: 25px;
}
.activity-panel__corner--br::before {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 25px;
  height: 1px;
  background: linear-gradient(to left, rgba(175, 96, 37, 0.3), transparent);
}
.activity-panel__corner--br::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 25px;
  background: linear-gradient(to top, rgba(175, 96, 37, 0.3), transparent);
}

/* Header */
.activity-panel__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  
  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.98) 0%,
    rgba(14, 14, 17, 0.95) 100%
  );
  
  box-shadow: 
    inset 0 2px 8px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(0, 0, 0, 0.6),
    inset 0 -1px 2px rgba(50, 45, 40, 0.04);
}

.activity-panel__header-accent {
  position: absolute;
  top: 8px;
  width: 25px;
  height: 1px;
  pointer-events: none;
}

.activity-panel__header-accent--left {
  left: 8px;
  background: linear-gradient(to right, rgba(175, 96, 37, 0.5), transparent);
}

.activity-panel__header-accent--right {
  right: 8px;
  background: linear-gradient(to left, rgba(175, 96, 37, 0.5), transparent);
}

.activity-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 15px rgba(201, 162, 39, 0.25);
}

.activity-panel__title-rune {
  font-size: 0.625rem;
  color: rgba(175, 96, 37, 0.5);
}

.activity-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  color: rgba(140, 130, 120, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.activity-panel__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.activity-panel__close svg {
  width: 16px;
  height: 16px;
}

.activity-panel__header-edge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(60, 55, 48, 0.4) 15%,
    rgba(80, 70, 55, 0.5) 50%,
    rgba(60, 55, 48, 0.4) 85%,
    transparent
  );
}

/* Content */
.activity-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.activity-panel__content::-webkit-scrollbar {
  width: 6px;
}

.activity-panel__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.activity-panel__content::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

.activity-panel__content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 90, 80, 0.5);
}

/* Empty State */
.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.activity-empty__icon-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.activity-empty__icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.activity-empty__rune {
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
}

.activity-empty__text {
  margin: 0;
  font-family: 'Crimson Text', serif;
  font-size: 1.0625rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.6);
  line-height: 1.5;
}

/* Activity List */
.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Activity Item */
.activity-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  
  background: linear-gradient(
    135deg,
    rgba(20, 20, 24, 0.6) 0%,
    rgba(16, 16, 19, 0.7) 100%
  );
  
  border-radius: 4px;
  border: 1px solid rgba(50, 48, 45, 0.4);
  
  box-shadow: 
    inset 0 1px 0 rgba(80, 75, 70, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  
  transition: all 0.2s ease;
}

.activity-item:hover {
  background: linear-gradient(
    135deg,
    rgba(25, 25, 30, 0.7) 0%,
    rgba(20, 20, 24, 0.8) 100%
  );
  border-color: rgba(70, 65, 60, 0.5);
}


/* Avatar */
.activity-item__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.4);
}

.activity-item__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-item__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.6);
  background: rgba(30, 28, 26, 0.8);
}

/* Content */
.activity-item__content {
  flex: 1;
  min-width: 0;
}

.activity-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.activity-item__username {
  font-family: 'Cinzel', serif;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: rgba(200, 195, 190, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-item__time {
  font-family: 'Crimson Text', serif;
  font-size: 0.6875rem;
  color: rgba(100, 95, 90, 0.6);
  white-space: nowrap;
}

.activity-item__card {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.125rem;
}

.activity-item__tier {
  font-family: 'Cinzel', serif;
  font-size: 0.5625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  letter-spacing: 0.05em;
}

.activity-item__tier.tier-t0 {
  background: rgba(109, 90, 42, 0.4);
  color: #c9a227;
  border: 1px solid rgba(201, 162, 39, 0.3);
}

.activity-item__tier.tier-t1 {
  background: rgba(58, 52, 69, 0.4);
  color: #7a6a8a;
  border: 1px solid rgba(122, 106, 138, 0.3);
}

.activity-item__tier.tier-t2 {
  background: rgba(58, 69, 80, 0.4);
  color: #5a7080;
  border: 1px solid rgba(90, 112, 128, 0.3);
}

.activity-item__tier.tier-t3 {
  background: rgba(42, 42, 45, 0.4);
  color: #5a5a5d;
  border: 1px solid rgba(90, 90, 93, 0.3);
}

.activity-item__card-name {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(180, 175, 170, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-item__arrow {
  color: rgba(100, 95, 90, 0.5);
  font-size: 0.75rem;
}

/* Footer row with outcome and replay link */
.activity-item__footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
}

/* Replay Link Button */
.replay-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  
  font-family: 'Cinzel', serif;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
  
  color: rgba(175, 96, 37, 0.8);
  
  background: linear-gradient(
    180deg,
    rgba(30, 25, 20, 0.9) 0%,
    rgba(20, 18, 15, 0.95) 100%
  );
  
  border: 1px solid rgba(175, 96, 37, 0.35);
  border-radius: 3px;
  
  box-shadow: 
    inset 0 1px 0 rgba(175, 96, 37, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  
  transition: all 0.2s ease;
}

.replay-link::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px solid rgba(175, 96, 37, 0.08);
  border-radius: 2px;
  pointer-events: none;
}

.replay-link:hover {
  color: #c97a3a;
  border-color: rgba(175, 96, 37, 0.6);
  background: linear-gradient(
    180deg,
    rgba(40, 32, 25, 0.95) 0%,
    rgba(28, 24, 20, 0.98) 100%
  );
  box-shadow: 
    inset 0 1px 0 rgba(175, 96, 37, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 0 12px rgba(175, 96, 37, 0.2);
}

.replay-link__icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.replay-link__text {
  white-space: nowrap;
}

/* ==========================================
   OUTCOME BOX - Runic styled result box
   ========================================== */
.outcome-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  
  border-radius: 3px;
  
  /* Default dark stone background */
  background: linear-gradient(
    180deg,
    rgba(25, 25, 28, 0.9) 0%,
    rgba(18, 18, 20, 0.95) 100%
  );
  
  border: 1px solid rgba(60, 55, 50, 0.5);
  
  box-shadow: 
    inset 0 1px 0 rgba(80, 75, 70, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.outcome-box::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px solid rgba(80, 65, 50, 0.12);
  border-radius: 2px;
  pointer-events: none;
}

.outcome-box__rune {
  font-size: 0.375rem;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.outcome-box__emoji {
  font-size: 0.875rem;
}

.outcome-box__label {
  font-family: 'Cinzel', serif;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Destroyed - Blood red */
.outcome-box.outcome-destroyed {
  background: linear-gradient(
    180deg,
    rgba(50, 20, 20, 0.95) 0%,
    rgba(35, 12, 12, 0.98) 100%
  );
  border-color: rgba(180, 60, 60, 0.5);
}

.outcome-box.outcome-destroyed::before {
  border-color: rgba(180, 60, 60, 0.15);
}

.outcome-box.outcome-destroyed .outcome-box__label {
  color: #c45050;
  text-shadow: 0 0 10px rgba(180, 60, 60, 0.4);
}

.outcome-box.outcome-destroyed .outcome-box__rune {
  color: rgba(180, 60, 60, 0.6);
}

/* Foil - Gold / Amber */
.outcome-box.outcome-foil {
  background: linear-gradient(
    180deg,
    rgba(45, 38, 20, 0.95) 0%,
    rgba(30, 25, 12, 0.98) 100%
  );
  border-color: rgba(201, 162, 39, 0.5);
}

.outcome-box.outcome-foil::before {
  border-color: rgba(201, 162, 39, 0.15);
}

.outcome-box.outcome-foil .outcome-box__label {
  color: #c9a227;
  text-shadow: 0 0 10px rgba(201, 162, 39, 0.4);
}

.outcome-box.outcome-foil .outcome-box__rune {
  color: rgba(201, 162, 39, 0.6);
}

/* Transform - Purple / Amethyst */
.outcome-box.outcome-transform {
  background: linear-gradient(
    180deg,
    rgba(35, 25, 45, 0.95) 0%,
    rgba(22, 15, 30, 0.98) 100%
  );
  border-color: rgba(130, 90, 160, 0.5);
}

.outcome-box.outcome-transform::before {
  border-color: rgba(130, 90, 160, 0.15);
}

.outcome-box.outcome-transform .outcome-box__label {
  color: #9a70b8;
  text-shadow: 0 0 10px rgba(130, 90, 160, 0.4);
}

.outcome-box.outcome-transform .outcome-box__rune {
  color: rgba(130, 90, 160, 0.6);
}

/* Duplicate - Emerald green */
.outcome-box.outcome-duplicate {
  background: linear-gradient(
    180deg,
    rgba(20, 40, 25, 0.95) 0%,
    rgba(12, 28, 15, 0.98) 100%
  );
  border-color: rgba(80, 140, 90, 0.5);
}

.outcome-box.outcome-duplicate::before {
  border-color: rgba(80, 140, 90, 0.15);
}

.outcome-box.outcome-duplicate .outcome-box__label {
  color: #5a9a65;
  text-shadow: 0 0 10px rgba(80, 140, 90, 0.4);
}

.outcome-box.outcome-duplicate .outcome-box__rune {
  color: rgba(80, 140, 90, 0.6);
}

/* Nothing - Muted grey */
.outcome-box.outcome-nothing {
  background: linear-gradient(
    180deg,
    rgba(28, 28, 30, 0.9) 0%,
    rgba(20, 20, 22, 0.95) 100%
  );
  border-color: rgba(80, 78, 75, 0.4);
}

.outcome-box.outcome-nothing::before {
  border-color: rgba(80, 78, 75, 0.1);
}

.outcome-box.outcome-nothing .outcome-box__label {
  color: rgba(130, 125, 120, 0.8);
  text-shadow: none;
}

.outcome-box.outcome-nothing .outcome-box__rune {
  color: rgba(100, 95, 90, 0.4);
}

/* Backdrop */
.activity-backdrop {
  display: none;
}

@media (max-width: 640px) {
  .activity-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }

  .activity-panel {
    width: 100%;
    max-width: 340px;
  }
  
  .activity-tab {
    top: auto;
    bottom: 100px;
  }
}

/* ==========================================
   TRANSITIONS
   ========================================== */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.badge-pop-enter-active {
  animation: badge-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-pop-leave-active {
  animation: badge-pop-out 0.2s ease;
}

@keyframes badge-pop-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes badge-pop-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

.log-item-enter-active {
  animation: log-slide-in 0.3s ease;
}

.log-item-leave-active {
  animation: log-slide-out 0.2s ease;
}

.log-item-move {
  transition: transform 0.3s ease;
}

@keyframes log-slide-in {
  0% {
    opacity: 0;
    transform: translateX(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes log-slide-out {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-20px);
  }
}
</style>
