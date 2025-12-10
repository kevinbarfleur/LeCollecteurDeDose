<script setup lang="ts">
import {
  useFoilEffect,
  type FoilEffectType,
} from "~/composables/useFoilEffect";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { selectedFoilEffect, setFoilEffect, foilEffects } = useFoilEffect();

// Update when select changes - directly use the composable
const handleEffectChange = (value: string) => {
  setFoilEffect(value as FoilEffectType);
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
              Paramètres
              <span class="settings-modal__rune">✧</span>
            </h2>
            <button
              type="button"
              class="settings-modal__close"
              aria-label="Fermer"
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
            <!-- Foil Effect Section -->
            <div class="settings-modal__section">
              <h3 class="settings-modal__section-title">Effet Holographique</h3>
              <p class="settings-modal__section-desc">
                Choisissez le style d'effet foil appliqué à vos cartes
                brillantes.
              </p>

              <RunicSelect
                :model-value="selectedFoilEffect"
                :options="foilEffects"
                :max-visible-items="8"
                size="md"
                @update:model-value="handleEffectChange"
              />
            </div>

            <!-- Divider -->
            <div class="settings-modal__divider">
              <span class="settings-modal__divider-rune">◆</span>
            </div>

            <!-- Info Section -->
            <div class="settings-modal__section settings-modal__section--info">
              <p class="settings-modal__info-text">
                Les effets holographiques s'appliquent aux cartes avec la
                variation <strong>Foil</strong>. Certains effets utilisent des
                couleurs arc-en-ciel, d'autres sont adaptés aux couleurs de
                rareté.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="settings-modal__footer">
            <RunicButton variant="secondary" size="sm" @click="closeModal">
              Fermer
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
   DIVIDER
   ========================================== */
.settings-modal__divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  position: relative;
}

.settings-modal__divider::before,
.settings-modal__divider::after {
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

.settings-modal__divider-rune {
  padding: 0 1rem;
  font-size: 0.5rem;
  color: rgba(80, 70, 60, 0.4);
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
