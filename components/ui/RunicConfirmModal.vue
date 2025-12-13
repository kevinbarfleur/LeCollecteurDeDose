<script setup lang="ts">
import { useConfirmModal } from '~/composables/useConfirmModal'

const { t } = useI18n()
const { confirmState, handleConfirm, handleCancel } = useConfirmModal()

const variantClasses = {
  default: 'runic-confirm-modal--default',
  danger: 'runic-confirm-modal--danger',
  warning: 'runic-confirm-modal--warning',
}

const confirmButtonVariants = {
  default: 'primary',
  danger: 'danger',
  warning: 'primary',
} as const
</script>

<template>
  <RunicModal
    :model-value="confirmState.isOpen"
    :close-on-overlay="false"
    :close-on-escape="true"
    :show-close-button="false"
    max-width="sm"
    @close="handleCancel"
  >
    <template #header>
      <h2 class="runic-confirm-modal__title">
        <span class="runic-confirm-modal__icon">⚠</span>
        {{ confirmState.title }}
      </h2>
    </template>

    <template #default>
      <p class="runic-confirm-modal__message">
        {{ confirmState.message }}
      </p>
    </template>

    <template #footer>
      <div class="runic-confirm-modal__footer">
        <RunicButton
          size="sm"
          variant="ghost"
          @click="handleCancel"
        >
          {{ confirmState.cancelText }}
        </RunicButton>
        <RunicButton
          size="sm"
          :variant="confirmButtonVariants[confirmState.variant]"
          @click="handleConfirm"
        >
          {{ confirmState.confirmText }}
        </RunicButton>
      </div>
    </template>
  </RunicModal>
</template>

<style scoped>
.runic-confirm-modal__title {
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

.runic-confirm-modal__icon {
  font-size: 1.25rem;
  color: rgba(201, 162, 39, 0.8);
}

.runic-confirm-modal__message {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(180, 170, 160, 0.9);
  text-align: left;
  white-space: pre-line;
}

.runic-confirm-modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0;
}

.runic-confirm-modal__footer :deep(.runic-button) {
  flex: 1;
  min-width: 0;
}

.runic-confirm-modal--danger .runic-confirm-modal__icon {
  color: rgba(248, 113, 113, 0.8);
}

.runic-confirm-modal--warning .runic-confirm-modal__icon {
  color: rgba(251, 191, 36, 0.8);
}
</style>

