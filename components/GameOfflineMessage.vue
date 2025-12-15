<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="game-offline min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 w-full">
    <RunicBox padding="lg" max-width="500px" centered>
      <div class="game-offline__icon">
        <img
          src="/images/vaal-risitas.png"
          alt="Vaal Orb"
          class="game-offline__icon-image"
        />
      </div>
      <h1 class="game-offline__title">
        {{ t("gameOffline.title") }}
      </h1>
      <p class="game-offline__description">
        {{ t("gameOffline.description") }}
      </p>
      <div class="game-offline__hint">
        <span class="game-offline__rune">◆</span>
        <span>{{ t("gameOffline.hint") }}</span>
        <span class="game-offline__rune">◆</span>
      </div>
      <div class="game-offline__actions">
        <RunicButton
          href="https://twitch.tv/les_doseurs"
          :external="true"
          variant="twitch"
          icon="twitch"
        >
          {{ t("gameOffline.button") }}
        </RunicButton>
      </div>
    </RunicBox>
  </div>
</template>

<style scoped>

.game-offline__icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 2rem;
  animation: gameOfflinePulse 3s ease-in-out infinite;
}

.game-offline__icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(248, 113, 113, 0.4));
}

@keyframes gameOfflinePulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.game-offline__title {
  font-family: "Cinzel", serif;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #f87171;
  text-shadow: 0 0 20px rgba(248, 113, 113, 0.3);
  margin: 0 0 1rem;
  text-align: center;
}

.game-offline__description {
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  color: rgba(140, 130, 120, 0.85);
  line-height: 1.6;
  margin: 0 0 1.5rem;
  max-width: 380px;
  text-align: center;
}

.game-offline__hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-family: "Crimson Text", serif;
  font-size: 0.9375rem;
  font-style: italic;
  color: rgba(120, 115, 110, 0.7);
  margin-bottom: 2rem;
}

.game-offline__rune {
  font-size: 0.5rem;
  color: rgba(248, 113, 113, 0.5);
}

.game-offline__actions {
  display: flex;
  justify-content: center;
}
</style>

