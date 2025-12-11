<script setup lang="ts">
import {
  useActivityLogs,
  type ActivityNotification,
} from "~/composables/useActivityLogs";
import { VAAL_OUTCOMES, type VaalOutcome } from "~/types/vaalOutcome";
import poeUniques from "~/data/poe_uniques.json";

const { t } = useI18n();

const { notifications, dismissNotification, openPanel } = useActivityLogs();

// Get card name from ID
const getCardName = (cardId: string): string => {
  const card = poeUniques.find((c: any) => c.id === cardId);
  return card?.name || cardId;
};

// Get outcome config
const getOutcomeEmoji = (outcome: string): string => {
  return VAAL_OUTCOMES[outcome as VaalOutcome]?.emoji || "❓";
};

const getOutcomeLabel = (outcome: string): string => {
  const config = VAAL_OUTCOMES[outcome as VaalOutcome];
  return config ? t(config.label) : outcome;
};

// Get outcome color class
const getOutcomeClass = (outcome: string): string => {
  const outcomeMap: Record<string, string> = {
    destroyed: "outcome-destroyed",
    foil: "outcome-foil",
    transform: "outcome-transform",
    duplicate: "outcome-duplicate",
    nothing: "outcome-nothing",
  };
  return outcomeMap[outcome] || "";
};

// Get tier color class
const getTierClass = (tier: string): string => {
  const tierMap: Record<string, string> = {
    T0: "tier-t0",
    T1: "tier-t1",
    T2: "tier-t2",
    T3: "tier-t3",
  };
  return tierMap[tier] || "";
};

// Handle notification click - open the panel
const handleNotificationClick = () => {
  openPanel();
};

// Handle dismiss button click
const handleDismiss = (e: Event, notificationId: string) => {
  e.stopPropagation();
  dismissNotification(notificationId);
};
</script>

<template>
  <div class="activity-notifications">
    <TransitionGroup name="notif">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notif-entry"
        @click="handleNotificationClick"
      >
        <RunicBox padding="none" class="notif-entry__box">
          <!-- Header strip with outcome - same as log entry -->
          <div
            class="notif-entry__header"
            :class="getOutcomeClass(notification.log.outcome)"
          >
            <span class="notif-entry__header-rune">◆</span>
            <span class="notif-entry__header-emoji">{{
              getOutcomeEmoji(notification.log.outcome)
            }}</span>
            <span class="notif-entry__header-title">{{
              getOutcomeLabel(notification.log.outcome)
            }}</span>

            <!-- Spacer to push close button to right -->
            <span class="notif-entry__header-spacer" />

            <!-- Close button -->
            <RunicButton
              icon="close"
              size="sm"
              variant="ghost"
              rune-left=""
              rune-right=""
              class="notif-entry__close-btn"
              :title="t('common.close')"
              @click="(e: Event) => handleDismiss(e, notification.id)"
            />
          </div>

          <!-- Content section - same as log entry -->
          <div class="notif-entry__content">
            <!-- Card info row -->
            <div class="notif-entry__card-row">
              <span
                class="notif-entry__tier"
                :class="getTierClass(notification.log.card_tier)"
              >
                {{ notification.log.card_tier }}
              </span>
              <span class="notif-entry__card-name">{{
                getCardName(notification.log.card_id)
              }}</span>
              <template
                v-if="
                  notification.log.outcome === 'transform' &&
                  notification.log.result_card_id
                "
              >
                <span class="notif-entry__arrow">→</span>
                <span class="notif-entry__card-name">{{
                  getCardName(notification.log.result_card_id)
                }}</span>
              </template>
            </div>

            <!-- User row -->
            <div class="notif-entry__user-row">
              <div class="notif-entry__avatar">
                <img
                  v-if="notification.log.user_avatar"
                  :src="notification.log.user_avatar"
                  :alt="notification.log.username"
                  class="notif-entry__avatar-img"
                />
                <span v-else class="notif-entry__avatar-placeholder">
                  {{ notification.log.username.charAt(0).toUpperCase() }}
                </span>
              </div>
              <span class="notif-entry__username">{{
                notification.log.username
              }}</span>
            </div>
          </div>

          <!-- Progress bar for auto-dismiss -->
          <div class="notif-entry__progress" />
        </RunicBox>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.activity-notifications {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
  width: 320px;
}

@media (max-width: 640px) {
  .activity-notifications {
    bottom: 16px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}

/* ==========================================
   NOTIFICATION ENTRY - Same as log entry
   ========================================== */
.notif-entry {
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.notif-entry:hover {
  transform: translateX(-4px);
}

.notif-entry__box {
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Header strip - same as log entry but with close button */
.notif-entry__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem 0.375rem 0.75rem;
  border-bottom: 1px solid rgba(50, 48, 45, 0.4);
}

.notif-entry__header-rune {
  font-size: 0.3125rem;
  opacity: 0.4;
}

.notif-entry__header-emoji {
  font-size: 0.875rem;
}

.notif-entry__header-title {
  font-family: "Cinzel", serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.notif-entry__header-spacer {
  flex: 1;
}

/* Close button styling */
.notif-entry__close-btn {
  padding: 0.25rem !important;
  min-width: unset !important;
  height: auto !important;
}

.notif-entry__close-btn :deep(.runic-button__text) {
  display: none;
}

/* Content section - same as log entry */
.notif-entry__content {
  padding: 0.5rem 0.75rem 0.625rem;
}

/* Card row - same as log entry */
.notif-entry__card-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.375rem;
}

.notif-entry__tier {
  font-family: "Cinzel", serif;
  font-size: 0.5rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  letter-spacing: 0.05em;
}

.notif-entry__tier.tier-t0 {
  background: rgba(109, 90, 42, 0.4);
  color: #c9a227;
  border: 1px solid rgba(201, 162, 39, 0.3);
}

.notif-entry__tier.tier-t1 {
  background: rgba(58, 52, 69, 0.4);
  color: #9a8aaa;
  border: 1px solid rgba(122, 106, 138, 0.3);
}

.notif-entry__tier.tier-t2 {
  background: rgba(58, 69, 80, 0.4);
  color: #7a90a0;
  border: 1px solid rgba(90, 112, 128, 0.3);
}

.notif-entry__tier.tier-t3 {
  background: rgba(50, 50, 53, 0.4);
  color: #7a7a7d;
  border: 1px solid rgba(90, 90, 93, 0.3);
}

.notif-entry__card-name {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(200, 195, 190, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-entry__arrow {
  color: rgba(140, 135, 130, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
}

/* User row - same as log entry */
.notif-entry__user-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.notif-entry__avatar {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.3);
}

.notif-entry__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notif-entry__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Cinzel", serif;
  font-size: 0.5rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.6);
  background: rgba(30, 28, 26, 0.8);
}

.notif-entry__username {
  font-family: "Cinzel", serif;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.02em;
  color: rgba(160, 155, 150, 0.85);
}

/* Progress bar for auto-dismiss */
.notif-entry__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(175, 96, 37, 0.6);
  transform-origin: left;
  animation: notif-progress 5s linear forwards;
}

@keyframes notif-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* ==========================================
   OUTCOME THEMES - Same as log entry
   ========================================== */

/* Destroyed - Subtle blood red */
.notif-entry__header.outcome-destroyed {
  background: linear-gradient(
    180deg,
    rgba(60, 20, 20, 0.5) 0%,
    rgba(40, 15, 15, 0.3) 100%
  );
  border-bottom-color: rgba(140, 50, 50, 0.3);
}

.notif-entry__header.outcome-destroyed .notif-entry__header-title {
  color: #c45050;
}

.notif-entry__header.outcome-destroyed .notif-entry__header-rune {
  color: rgba(180, 70, 70, 0.5);
}

.notif-entry__header.outcome-destroyed
  + .notif-entry__content
  + .notif-entry__progress {
  background: rgba(196, 80, 80, 0.6);
}

/* Foil - Prismatic/Rainbow shimmer */
.notif-entry__header.outcome-foil {
  background: linear-gradient(
    180deg,
    rgba(40, 30, 50, 0.5) 0%,
    rgba(30, 25, 35, 0.3) 100%
  );
  border-bottom-color: rgba(160, 140, 200, 0.3);
  position: relative;
  overflow: hidden;
}

/* Prismatic shimmer overlay - subtle */
.notif-entry__header.outcome-foil::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(192, 160, 255, 0.06) 0%,
    rgba(255, 160, 192, 0.06) 25%,
    rgba(160, 255, 192, 0.06) 50%,
    rgba(160, 192, 255, 0.06) 75%,
    rgba(192, 160, 255, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: notifFoilShimmer 8s ease-in-out infinite;
  pointer-events: none;
}

.notif-entry__header.outcome-foil .notif-entry__header-title {
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
  animation: notifFoilTextShimmer 3s linear infinite;
}

.notif-entry__header.outcome-foil .notif-entry__header-rune {
  color: rgba(192, 160, 255, 0.6);
}

@keyframes notifFoilShimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes notifFoilTextShimmer {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}

/* Transform - Subtle purple */
.notif-entry__header.outcome-transform {
  background: linear-gradient(
    180deg,
    rgba(45, 30, 60, 0.5) 0%,
    rgba(30, 20, 40, 0.3) 100%
  );
  border-bottom-color: rgba(100, 70, 130, 0.3);
}

.notif-entry__header.outcome-transform .notif-entry__header-title {
  color: #9a70b8;
}

.notif-entry__header.outcome-transform .notif-entry__header-rune {
  color: rgba(130, 90, 160, 0.5);
}

/* Duplicate - Subtle green */
.notif-entry__header.outcome-duplicate {
  background: linear-gradient(
    180deg,
    rgba(25, 50, 30, 0.5) 0%,
    rgba(15, 35, 20, 0.3) 100%
  );
  border-bottom-color: rgba(70, 120, 80, 0.3);
}

.notif-entry__header.outcome-duplicate .notif-entry__header-title {
  color: #5a9a65;
}

.notif-entry__header.outcome-duplicate .notif-entry__header-rune {
  color: rgba(80, 140, 90, 0.5);
}

/* Nothing - Subtle grey */
.notif-entry__header.outcome-nothing {
  background: linear-gradient(
    180deg,
    rgba(35, 35, 38, 0.4) 0%,
    rgba(25, 25, 28, 0.2) 100%
  );
  border-bottom-color: rgba(70, 68, 65, 0.25);
}

.notif-entry__header.outcome-nothing .notif-entry__header-title {
  color: rgba(140, 135, 130, 0.8);
}

.notif-entry__header.outcome-nothing .notif-entry__header-rune {
  color: rgba(100, 95, 90, 0.4);
}

/* ==========================================
   TRANSITIONS
   ========================================== */

/* Enter: slide up from bottom */
.notif-enter-active {
  animation: notif-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Leave: slide right out of screen */
.notif-leave-active {
  animation: notif-slide-right 0.3s ease-in forwards;
}

/* Move animation for reordering */
.notif-move {
  transition: transform 0.3s ease;
}

@keyframes notif-slide-up {
  0% {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes notif-slide-right {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(120%);
  }
}
</style>
