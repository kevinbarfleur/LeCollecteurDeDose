<script setup lang="ts">
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    icon?: string;
    maxWidth?: "sm" | "md" | "lg" | "xl";
    showCloseButton?: boolean;
    closeOnOverlay?: boolean;
    closeOnEscape?: boolean;
  }>(),
  {
    maxWidth: "md",
    showCloseButton: true,
    closeOnOverlay: true,
    closeOnEscape: true,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const closeModal = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    closeModal();
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (props.closeOnEscape && e.key === "Escape") {
    closeModal();
  }
};

onMounted(() => {
  if (props.closeOnEscape) {
    document.addEventListener("keydown", handleKeydown);
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});

watch(
  () => props.closeOnEscape,
  (enabled) => {
    if (enabled) {
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }
  }
);

const maxWidthClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};
</script>

<template>
  <Teleport to="body">
    <Transition name="runic-modal">
      <div v-if="modelValue" class="runic-modal">
        <div class="runic-modal__overlay" @click="handleOverlayClick" />
        <div
          class="runic-modal__content runic-scrollbar"
          :class="maxWidthClasses[maxWidth]"
        >
          <div v-if="title || $slots.header" class="runic-modal__header">
            <slot name="header">
              <h2 class="runic-modal__title">
                <span v-if="icon" class="runic-modal__icon">{{ icon }}</span>
                {{ title }}
                <span v-if="icon" class="runic-modal__icon">{{ icon }}</span>
              </h2>
            </slot>
            <button
              v-if="showCloseButton"
              type="button"
              class="runic-modal__close"
              :aria-label="t('common.close')"
              @click="closeModal"
            >
              <RunicIcon name="close" size="sm" />
            </button>
          </div>

          <div class="runic-modal__body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="runic-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.runic-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.runic-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.runic-modal__content {
  position: relative;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;

  /* Dark stone background */
  background: linear-gradient(
    180deg,
    rgba(18, 18, 22, 0.98) 0%,
    rgba(12, 12, 15, 0.99) 50%,
    rgba(14, 14, 18, 0.98) 100%
  );

  border-radius: 8px;
  border: 1px solid rgba(60, 55, 50, 0.4);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(80, 75, 70, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

.runic-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.runic-modal__title {
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

.runic-modal__icon {
  font-size: 0.875rem;
  color: rgba(175, 96, 37, 0.6);
}

.runic-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  color: rgba(140, 130, 120, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.runic-modal__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.runic-modal__body {
  padding: 1.5rem;
}

.runic-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.3);
}

.runic-modal-enter-active,
.runic-modal-leave-active {
  transition: all 0.3s ease;
}

.runic-modal-enter-active .runic-modal__content,
.runic-modal-leave-active .runic-modal__content {
  transition: all 0.3s ease;
}

.runic-modal-enter-from,
.runic-modal-leave-to {
  opacity: 0;
}

.runic-modal-enter-from .runic-modal__content,
.runic-modal-leave-to .runic-modal__content {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

@media (max-width: 640px) {
  .runic-modal {
    padding: 0.5rem;
    align-items: flex-end;
  }

  .runic-modal__content {
    max-height: 85vh;
    border-radius: 12px 12px 0 0;
  }

  .runic-modal__header {
    padding: 1rem;
  }

  .runic-modal__title {
    font-size: 1rem;
  }

  .runic-modal__body {
    padding: 1rem;
  }

  .runic-modal__footer {
    padding: 1rem;
  }
}
</style>
