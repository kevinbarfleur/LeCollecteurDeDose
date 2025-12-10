<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();

const closeModal = () => {
  emit("update:modelValue", false);
};

// Close on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    closeModal();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="legal-modal">
        <!-- Overlay -->
        <div class="legal-modal__overlay" @click="closeModal" />

        <!-- Modal content -->
        <div class="legal-modal__content">
          <!-- Header -->
          <div class="legal-modal__header">
            <h2 class="legal-modal__title">
              <span class="legal-modal__rune">⚖</span>
              {{ t("legal.title") }}
              <span class="legal-modal__rune">⚖</span>
            </h2>
            <button
              type="button"
              class="legal-modal__close"
              :aria-label="t('legal.close')"
              @click="closeModal"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="legal-modal__body">
            <!-- Disclaimer Section -->
            <div class="legal-modal__section">
              <h3 class="legal-modal__section-title">
                {{ t("legal.disclaimer.title") }}
              </h3>
              <p class="legal-modal__text">{{ t("legal.disclaimer.text") }}</p>
            </div>

            <!-- Divider -->
            <div class="legal-modal__divider">
              <span class="legal-modal__divider-rune">◆</span>
            </div>

            <!-- Trademarks Section -->
            <div class="legal-modal__section">
              <h3 class="legal-modal__section-title">
                {{ t("legal.trademarks.title") }}
              </h3>
              <p class="legal-modal__text">{{ t("legal.trademarks.text") }}</p>
            </div>

            <!-- Divider -->
            <div class="legal-modal__divider">
              <span class="legal-modal__divider-rune">◆</span>
            </div>

            <!-- Liability Section -->
            <div class="legal-modal__section">
              <h3 class="legal-modal__section-title">
                {{ t("legal.liability.title") }}
              </h3>
              <p class="legal-modal__text">{{ t("legal.liability.text") }}</p>
            </div>

            <!-- Divider -->
            <div class="legal-modal__divider">
              <span class="legal-modal__divider-rune">◆</span>
            </div>

            <!-- Links Section -->
            <div class="legal-modal__section">
              <h3 class="legal-modal__section-title">
                {{ t("legal.links.title") }}
              </h3>
              <div class="legal-modal__links">
                <a
                  href="https://www.pathofexile.com/legal/terms-of-use-and-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="legal-modal__link"
                >
                  <span class="legal-modal__link-icon">→</span>
                  {{ t("legal.links.poe_terms") }}
                </a>
                <a
                  href="https://www.pathofexile.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="legal-modal__link"
                >
                  <span class="legal-modal__link-icon">→</span>
                  {{ t("legal.links.poe_site") }}
                </a>
                <a
                  href="https://www.grindinggear.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="legal-modal__link"
                >
                  <span class="legal-modal__link-icon">→</span>
                  {{ t("legal.links.ggg_site") }}
                </a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="legal-modal__footer">
            <RunicButton variant="secondary" size="sm" @click="closeModal">
              {{ t("legal.close") }}
            </RunicButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ==========================================
   LEGAL MODAL - Highest z-index priority
   ========================================== */
.legal-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ==========================================
   OVERLAY
   ========================================== */
.legal-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

/* ==========================================
   CONTENT
   ========================================== */
.legal-modal__content {
  position: relative;
  width: 100%;
  max-width: 560px;
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

/* Custom scrollbar */
.legal-modal__content::-webkit-scrollbar {
  width: 6px;
}

.legal-modal__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.legal-modal__content::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

/* ==========================================
   HEADER
   ========================================== */
.legal-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.legal-modal__title {
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

.legal-modal__rune {
  font-size: 0.875rem;
  color: rgba(175, 96, 37, 0.6);
}

.legal-modal__close {
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

.legal-modal__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.legal-modal__close svg {
  width: 18px;
  height: 18px;
}

/* ==========================================
   BODY
   ========================================== */
.legal-modal__body {
  padding: 1.5rem;
}

.legal-modal__section {
  margin-bottom: 0;
}

.legal-modal__section-title {
  margin: 0 0 0.75rem 0;
  font-family: "Cinzel", serif;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(180, 170, 160, 0.9);
}

.legal-modal__text {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  color: rgba(140, 130, 120, 0.85);
  line-height: 1.65;
}

/* ==========================================
   DIVIDER
   ========================================== */
.legal-modal__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.25rem 0;
  position: relative;
}

.legal-modal__divider::before,
.legal-modal__divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(60, 55, 50, 0.4),
    transparent
  );
}

.legal-modal__divider-rune {
  padding: 0 1rem;
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
}

/* ==========================================
   LINKS
   ========================================== */
.legal-modal__links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legal-modal__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  color: #c97a3a;
  text-decoration: none;
  transition: all 0.2s ease;
}

.legal-modal__link:hover {
  color: #e89b5a;
  text-shadow: 0 0 10px rgba(201, 122, 58, 0.3);
}

.legal-modal__link-icon {
  font-size: 0.75rem;
  opacity: 0.6;
  transition: transform 0.2s ease;
}

.legal-modal__link:hover .legal-modal__link-icon {
  transform: translateX(3px);
  opacity: 1;
}

/* ==========================================
   FOOTER
   ========================================== */
.legal-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.3);
}

/* ==========================================
   ANIMATIONS
   ========================================== */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active .legal-modal__content,
.modal-leave-active .legal-modal__content {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .legal-modal__content,
.modal-leave-to .legal-modal__content {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .legal-modal {
    padding: 0.5rem;
    align-items: flex-end;
  }

  .legal-modal__content {
    max-height: 85vh;
    border-radius: 12px 12px 0 0;
  }

  .legal-modal__header {
    padding: 1rem;
  }

  .legal-modal__title {
    font-size: 1rem;
  }

  .legal-modal__body {
    padding: 1rem;
  }

  .legal-modal__footer {
    padding: 1rem;
  }
}
</style>
