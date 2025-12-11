<script setup lang="ts">
import { useDataSource, type DataSource } from "~/composables/useDataSource";

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { dataSource, setDataSource } = useDataSource();

// Handle data source change
const handleDataSourceChange = (value: string) => {
  setDataSource(value as DataSource);
};

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
      <div v-if="modelValue" class="settings-modal">
        <!-- Overlay -->
        <div class="settings-modal__overlay" @click="closeModal" />

        <!-- Modal content -->
        <div class="settings-modal__content">
          <!-- Header -->
          <div class="settings-modal__header">
            <h2 class="settings-modal__title">
              <span class="settings-modal__rune">✧</span>
              {{ t("settings.title") }}
              <span class="settings-modal__rune">✧</span>
            </h2>
            <button
              type="button"
              class="settings-modal__close"
              :aria-label="t('common.close')"
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
          <div class="settings-modal__body">
            <!-- Data Source Section -->
            <div class="settings-modal__section">
              <h3 class="settings-modal__section-title">
                {{ t("settings.dataSource.title") }}
              </h3>
              <p class="settings-modal__section-desc">
                {{ t("settings.dataSource.description") }}
              </p>

              <!-- Radio buttons for data source -->
              <div class="settings-modal__radio-group">
                <label class="settings-modal__radio-label">
                  <input
                    type="radio"
                    name="dataSource"
                    value="mock"
                    :checked="dataSource === 'mock'"
                    class="settings-modal__radio-input"
                    @change="handleDataSourceChange('mock')"
                  />
                  <span class="settings-modal__radio-custom"></span>
                  <span class="settings-modal__radio-text">
                    <span class="settings-modal__radio-title">{{
                      t("settings.dataSource.mock")
                    }}</span>
                    <span class="settings-modal__radio-hint">{{
                      t("settings.dataSource.mockHint")
                    }}</span>
                  </span>
                </label>

                <label class="settings-modal__radio-label">
                  <input
                    type="radio"
                    name="dataSource"
                    value="api"
                    :checked="dataSource === 'api'"
                    class="settings-modal__radio-input"
                    @change="handleDataSourceChange('api')"
                  />
                  <span class="settings-modal__radio-custom"></span>
                  <span class="settings-modal__radio-text">
                    <span class="settings-modal__radio-title">{{
                      t("settings.dataSource.api")
                    }}</span>
                    <span class="settings-modal__radio-hint">{{
                      t("settings.dataSource.apiHint")
                    }}</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Info Section -->
            <div class="settings-modal__section settings-modal__section--info">
              <p class="settings-modal__info-text">
                ⚠️ {{ t("settings.dataSource.warning") }}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="settings-modal__footer">
            <RunicButton variant="secondary" size="sm" @click="closeModal">
              {{ t("settings.close") }}
            </RunicButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ==========================================
   SETTINGS MODAL - Highest z-index priority
   ========================================== */
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 10000; /* Above everything including card details */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ==========================================
   OVERLAY
   ========================================== */
.settings-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

/* ==========================================
   CONTENT
   ========================================== */
.settings-modal__content {
  position: relative;
  width: 100%;
  max-width: 480px;
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
.settings-modal__content::-webkit-scrollbar {
  width: 6px;
}

.settings-modal__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.settings-modal__content::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

/* ==========================================
   HEADER
   ========================================== */
.settings-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.settings-modal__title {
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

.settings-modal__rune {
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.6);
}

.settings-modal__close {
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

.settings-modal__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.settings-modal__close svg {
  width: 18px;
  height: 18px;
}

/* ==========================================
   BODY
   ========================================== */
.settings-modal__body {
  padding: 1.5rem;
}

.settings-modal__section {
  margin-bottom: 1.5rem;
}

.settings-modal__section:last-child {
  margin-bottom: 0;
}

.settings-modal__section-title {
  margin: 0 0 0.5rem 0;
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(180, 170, 160, 0.9);
}

.settings-modal__section-desc {
  margin: 0 0 1rem 0;
  font-family: "Crimson Text", serif;
  font-size: 1.125rem;
  color: rgba(140, 130, 120, 0.7);
  line-height: 1.5;
}

/* ==========================================
   RADIO GROUP
   ========================================== */
.settings-modal__radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings-modal__radio-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-modal__radio-label:hover {
  background: rgba(175, 96, 37, 0.05);
  border-color: rgba(175, 96, 37, 0.3);
}

.settings-modal__radio-label:has(.settings-modal__radio-input:checked) {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.5);
  box-shadow: 0 0 15px rgba(175, 96, 37, 0.1);
}

.settings-modal__radio-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.settings-modal__radio-custom {
  position: relative;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border: 2px solid rgba(100, 90, 80, 0.5);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.settings-modal__radio-custom::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #c97a3a;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s ease;
  box-shadow: 0 0 10px rgba(175, 96, 37, 0.5);
}

.settings-modal__radio-input:checked + .settings-modal__radio-custom {
  border-color: #c97a3a;
}

.settings-modal__radio-input:checked + .settings-modal__radio-custom::after {
  transform: translate(-50%, -50%) scale(1);
}

.settings-modal__radio-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-modal__radio-title {
  font-family: "Cinzel", serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(200, 190, 180, 0.9);
  letter-spacing: 0.02em;
}

.settings-modal__radio-input:checked
  ~ .settings-modal__radio-text
  .settings-modal__radio-title {
  color: #c97a3a;
}

.settings-modal__radio-hint {
  font-family: "Crimson Text", serif;
  font-size: 1rem;
  color: rgba(120, 115, 110, 0.7);
  line-height: 1.4;
}

/* ==========================================
   INFO SECTION
   ========================================== */
.settings-modal__section--info {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 1px solid rgba(60, 55, 50, 0.2);
}

.settings-modal__info-text {
  margin: 0;
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  color: rgba(120, 115, 110, 0.8);
  line-height: 1.6;
  font-style: italic;
}

.settings-modal__info-text strong {
  color: #c97a3a;
  font-style: normal;
}

/* ==========================================
   FOOTER
   ========================================== */
.settings-modal__footer {
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

.modal-enter-active .settings-modal__content,
.modal-leave-active .settings-modal__content {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .settings-modal__content,
.modal-leave-to .settings-modal__content {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .settings-modal {
    padding: 0.5rem;
    align-items: flex-end;
  }

  .settings-modal__content {
    max-height: 85vh;
    border-radius: 12px 12px 0 0;
  }

  .settings-modal__header {
    padding: 1rem;
  }

  .settings-modal__title {
    font-size: 1rem;
  }

  .settings-modal__body {
    padding: 1rem;
  }

  .settings-modal__footer {
    padding: 1rem;
  }
}
</style>
