<script setup lang="ts">
import { useReloadModal } from '~/composables/useReloadModal'

const { reloadModalState, handleReload } = useReloadModal()
</script>

<template>
  <RunicModal
    :model-value="reloadModalState.isOpen"
    :close-on-overlay="false"
    :close-on-escape="false"
    :show-close-button="false"
    max-width="sm"
  >
    <template #header>
      <h2 class="reload-modal__title">
        <span class="reload-modal__icon">⚠</span>
        {{ reloadModalState.title }}
      </h2>
    </template>

    <template #default>
      <p class="reload-modal__message">
        {{ reloadModalState.message }}
      </p>
      <p class="reload-modal__hint">
        Ne t'inquiète pas, tes données sont en sécurité. Il suffit juste de rafraîchir la page pour repartir sur de bonnes bases.
      </p>
    </template>

    <template #footer>
      <div class="reload-modal__footer">
        <RunicButton
          size="md"
          variant="primary"
          @click="handleReload"
        >
          {{ reloadModalState.reloadText }}
        </RunicButton>
      </div>
    </template>
  </RunicModal>
</template>

<style scoped>
.reload-modal__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
}

.reload-modal__icon {
  font-size: 1.25rem;
  color: rgba(248, 113, 113, 0.8);
}

.reload-modal__message {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(180, 170, 160, 0.9);
  text-align: left;
  margin-bottom: 1rem;
}

.reload-modal__hint {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(180, 170, 160, 0.7);
  font-style: italic;
  text-align: left;
  margin: 0;
}

.reload-modal__footer {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0;
}

.reload-modal__footer :deep(.runic-button) {
  min-width: 200px;
}
</style>

