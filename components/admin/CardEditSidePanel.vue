<script setup lang="ts">
import type { Card, CardTier, CardRarity } from '~/types/card'
import type { CardFormData } from '~/services/supabase-collection.service'

const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  card?: Card | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'save': [card: Card]
  'close': []
}>()

// Check if creating new card
const isNewCard = computed(() => !props.card?.uid)

// Form state
const formData = ref<CardFormData>({
  uid: null,
  id: '',
  name: '',
  itemClass: 'Divination Card',
  rarity: 'Unique',
  tier: 'T3',
  flavourText: null,
  wikiUrl: null,
  gameData: {
    weight: 1000,
    img: '',
    foilImg: undefined
  },
  relevanceScore: 0
})

// Track original data for change detection
const originalData = ref<string>('')

// Loading state
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

// Upload state
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const isDragging = ref(false)
const uploadError = ref<string | null>(null)

// Options for selects
const rarityOptions = [
  { value: 'Unique', label: 'Unique' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Magic', label: 'Magic' },
  { value: 'Normal', label: 'Normal' }
]

const tierOptions = [
  { value: 'T0', label: 'T0 - Legendaire' },
  { value: 'T1', label: 'T1 - Epique' },
  { value: 'T2', label: 'T2 - Rare' },
  { value: 'T3', label: 'T3 - Commun' }
]

// Initialize form when card changes
watch(() => props.card, (card) => {
  if (card) {
    formData.value = {
      uid: card.uid,
      id: card.id,
      name: card.name,
      itemClass: card.itemClass,
      rarity: card.rarity,
      tier: card.tier,
      flavourText: card.flavourText,
      wikiUrl: card.wikiUrl,
      gameData: {
        weight: card.gameData?.weight ?? 1000,
        img: card.gameData?.img ?? '',
        foilImg: card.gameData?.foilImg
      },
      relevanceScore: card.relevanceScore ?? 0
    }
  } else {
    // Reset to defaults for new card
    formData.value = {
      uid: null,
      id: '',
      name: '',
      itemClass: 'Divination Card',
      rarity: 'Unique',
      tier: 'T3',
      flavourText: null,
      wikiUrl: null,
      gameData: {
        weight: 1000,
        img: '',
        foilImg: undefined
      },
      relevanceScore: 0
    }
  }
  originalData.value = JSON.stringify(formData.value)
  saveError.value = null
  saveSuccess.value = false
}, { immediate: true })

// Check for unsaved changes
const hasUnsavedChanges = computed(() => {
  return JSON.stringify(formData.value) !== originalData.value
})

// Validation
const isValid = computed(() => {
  return (
    formData.value.id.trim().length > 0 &&
    formData.value.name.trim().length > 0 &&
    formData.value.gameData.img.trim().length > 0
  )
})

// Preview card for display
const previewCard = computed<Card>(() => ({
  uid: formData.value.uid ?? 0,
  id: formData.value.id || 'preview',
  name: formData.value.name || 'Nouvelle Carte',
  itemClass: formData.value.itemClass,
  rarity: formData.value.rarity as CardRarity,
  tier: formData.value.tier as CardTier,
  flavourText: formData.value.flavourText,
  wikiUrl: formData.value.wikiUrl || '',
  gameData: {
    weight: formData.value.gameData.weight,
    img: formData.value.gameData.img || '/images/placeholder-card.png',
    foilImg: formData.value.gameData.foilImg
  },
  relevanceScore: formData.value.relevanceScore
}))

// Close panel
const closePanel = async () => {
  if (hasUnsavedChanges.value) {
    const confirmed = window.confirm('Vous avez des modifications non sauvegardees. Voulez-vous vraiment fermer?')
    if (!confirmed) return
  }
  emit('update:isOpen', false)
  emit('close')
}

// Save card - does NOT close the panel
const save = async () => {
  if (!isValid.value || isSaving.value) return

  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const { upsertUniqueCard } = await import('~/services/supabase-collection.service')

    const result = await upsertUniqueCard(formData.value)

    if (result) {
      saveSuccess.value = true
      originalData.value = JSON.stringify(formData.value)
      // Update the form with the result (in case uid was assigned)
      if (result.uid && !formData.value.uid) {
        formData.value.uid = result.uid
      }
      emit('save', result)

      // Clear success message after delay
      setTimeout(() => {
        saveSuccess.value = false
      }, 3000)
    } else {
      saveError.value = 'Erreur lors de la sauvegarde. Verifiez la console pour plus de details.'
    }
  } catch (error: any) {
    saveError.value = error.message || 'Erreur inconnue'
  } finally {
    isSaving.value = false
  }
}

// Generate ID from name
const generateIdFromName = () => {
  if (formData.value.name) {
    formData.value.id = formData.value.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
}

// Upload functions
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await uploadFile(file)
  }
  input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    await uploadFile(file)
  }
}

const uploadFile = async (file: File) => {
  uploadError.value = null
  isUploading.value = true

  try {
    const { uploadCardImage } = await import('~/services/supabase-storage.service')
    const cardId = formData.value.id || `new-${Date.now()}`
    const url = await uploadCardImage(file, cardId)
    formData.value.gameData.img = url
  } catch (error: any) {
    uploadError.value = error.message || 'Erreur lors de l\'upload'
  } finally {
    isUploading.value = false
  }
}

const removeImage = () => {
  formData.value.gameData.img = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="card-edit-wrapper">
      <!-- Panel -->
      <Transition name="slide-panel">
        <div v-if="isOpen" class="card-edit-panel">
        <!-- Corner accents -->
        <div class="card-edit-panel__corner card-edit-panel__corner--tl"></div>
        <div class="card-edit-panel__corner card-edit-panel__corner--tr"></div>
        <div class="card-edit-panel__corner card-edit-panel__corner--bl"></div>
        <div class="card-edit-panel__corner card-edit-panel__corner--br"></div>

        <!-- Header -->
        <div class="card-edit-panel__header">
          <div class="card-edit-panel__header-accent card-edit-panel__header-accent--left"></div>
          <div class="card-edit-panel__header-accent card-edit-panel__header-accent--right"></div>

          <h3 class="card-edit-panel__title">
            <span class="card-edit-panel__title-rune">✧</span>
            {{ isNewCard ? 'Nouvelle Carte' : 'Modifier' }}
            <span class="card-edit-panel__title-rune">✧</span>
          </h3>

          <button
            class="card-edit-panel__close"
            @click="closePanel"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="card-edit-panel__header-edge"></div>
        </div>

        <!-- Content -->
        <div class="card-edit-panel__content">
          <!-- Basic Info Section -->
          <div class="card-edit-panel__section">
            <h4 class="card-edit-panel__section-title">Informations</h4>

            <!-- UID (read-only) -->
            <div v-if="!isNewCard" class="card-edit-panel__field">
              <label class="card-edit-panel__label">UID</label>
              <div class="card-edit-panel__readonly">{{ formData.uid }}</div>
            </div>

            <!-- ID -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">
                ID *
                <button
                  v-if="formData.name && !formData.id"
                  type="button"
                  class="card-edit-panel__generate-btn"
                  @click="generateIdFromName"
                >
                  Auto
                </button>
              </label>
              <RunicInput
                v-model="formData.id"
                placeholder="ex: the-doctor"
                size="sm"
              />
            </div>

            <!-- Name -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Nom *</label>
              <RunicInput
                v-model="formData.name"
                placeholder="Nom de la carte"
                size="sm"
                @blur="!formData.id && generateIdFromName()"
              />
            </div>

            <!-- Tier & Rarity -->
            <div class="card-edit-panel__row">
              <div class="card-edit-panel__field card-edit-panel__field--half">
                <label class="card-edit-panel__label">Tier</label>
                <RunicSelect
                  v-model="formData.tier"
                  :options="tierOptions"
                  size="sm"
                />
              </div>
              <div class="card-edit-panel__field card-edit-panel__field--half">
                <label class="card-edit-panel__label">Rarete</label>
                <RunicSelect
                  v-model="formData.rarity"
                  :options="rarityOptions"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <!-- Additional Info Section -->
          <div class="card-edit-panel__section">
            <h4 class="card-edit-panel__section-title">Details</h4>

            <!-- Flavour Text -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Texte d'ambiance</label>
              <textarea
                v-model="formData.flavourText"
                class="card-edit-panel__textarea"
                rows="2"
                placeholder="Texte poetique..."
              />
            </div>

            <!-- Weight -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Poids</label>
              <RunicInput
                v-model.number="formData.gameData.weight"
                type="number"
                :min="0"
                placeholder="1000"
                size="sm"
              />
            </div>

            <!-- Relevance Score -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Pertinence</label>
              <RunicInput
                v-model.number="formData.relevanceScore"
                type="number"
                :min="0"
                placeholder="0"
                size="sm"
              />
            </div>
          </div>

          <!-- Image Section -->
          <div class="card-edit-panel__section">
            <h4 class="card-edit-panel__section-title">Image *</h4>

            <!-- Upload Zone -->
            <div
              class="card-edit-panel__upload-zone"
              :class="{
                'card-edit-panel__upload-zone--dragover': isDragging,
                'card-edit-panel__upload-zone--uploading': isUploading,
                'card-edit-panel__upload-zone--has-image': formData.gameData.img
              }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <!-- Image Preview -->
              <div v-if="formData.gameData.img && !isUploading" class="card-edit-panel__upload-preview">
                <img :src="formData.gameData.img" alt="Preview" />
                <button
                  type="button"
                  class="card-edit-panel__upload-remove"
                  @click.stop="removeImage"
                >
                  ✕
                </button>
              </div>

              <!-- Upload Progress -->
              <div v-else-if="isUploading" class="card-edit-panel__upload-progress">
                <div class="card-edit-panel__upload-spinner"></div>
                <span>Upload...</span>
              </div>

              <!-- Placeholder -->
              <div v-else class="card-edit-panel__upload-placeholder">
                <span class="card-edit-panel__upload-icon">📁</span>
                <span>Cliquer ou glisser</span>
                <span class="card-edit-panel__upload-hint">Max 5MB</span>
              </div>
            </div>

            <!-- Hidden File Input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="card-edit-panel__file-input"
              @change="handleFileSelect"
            />

            <!-- Upload Error -->
            <div v-if="uploadError" class="card-edit-panel__error">
              {{ uploadError }}
            </div>
          </div>

          <!-- Messages -->
          <div v-if="saveError" class="card-edit-panel__message card-edit-panel__message--error">
            {{ saveError }}
          </div>
          <div v-if="saveSuccess" class="card-edit-panel__message card-edit-panel__message--success">
            Sauvegarde reussie!
          </div>
        </div>

        <!-- Footer -->
        <div class="card-edit-panel__footer">
          <div v-if="hasUnsavedChanges" class="card-edit-panel__unsaved">
            Modifications non sauvegardees
          </div>
          <div class="card-edit-panel__actions">
            <RunicButton
              variant="secondary"
              size="sm"
              @click="closePanel"
              :disabled="isSaving"
            >
              Fermer
            </RunicButton>
            <RunicButton
              variant="primary"
              size="sm"
              @click="save"
              :disabled="!isValid || isSaving"
            >
              {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </RunicButton>
          </div>
        </div>
      </div>
    </Transition>

      <!-- Backdrop for mobile -->
      <Transition name="fade">
        <div v-if="isOpen" class="card-edit-backdrop" @click="closePanel" />
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.card-edit-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1010;
  pointer-events: none;
}

/* ==========================================
   PANEL - Runic style sidebar
   ========================================== */
.card-edit-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
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

  box-shadow: inset 1px 0 0 rgba(80, 75, 70, 0.08),
    -8px 0 30px rgba(0, 0, 0, 0.7);
}

/* Corner accents */
.card-edit-panel__corner {
  position: absolute;
  pointer-events: none;
  z-index: 2;
}

.card-edit-panel__corner--tl {
  top: 60px;
  left: 10px;
  width: 20px;
  height: 20px;
}
.card-edit-panel__corner--tl::before {
  content: "";
  position: absolute;
  width: 20px;
  height: 1px;
  background: linear-gradient(to right, rgba(175, 96, 37, 0.4), transparent);
}
.card-edit-panel__corner--tl::after {
  content: "";
  position: absolute;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, rgba(175, 96, 37, 0.4), transparent);
}

.card-edit-panel__corner--tr {
  top: 60px;
  right: 10px;
  width: 20px;
  height: 20px;
}
.card-edit-panel__corner--tr::before {
  content: "";
  position: absolute;
  right: 0;
  width: 20px;
  height: 1px;
  background: linear-gradient(to left, rgba(80, 70, 55, 0.3), transparent);
}
.card-edit-panel__corner--tr::after {
  content: "";
  position: absolute;
  right: 0;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, rgba(80, 70, 55, 0.3), transparent);
}

.card-edit-panel__corner--bl {
  bottom: 80px;
  left: 10px;
  width: 15px;
  height: 15px;
}
.card-edit-panel__corner--bl::before {
  content: "";
  position: absolute;
  bottom: 0;
  width: 15px;
  height: 1px;
  background: linear-gradient(to right, rgba(80, 70, 55, 0.25), transparent);
}
.card-edit-panel__corner--bl::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 15px;
  background: linear-gradient(to top, rgba(80, 70, 55, 0.25), transparent);
}

.card-edit-panel__corner--br {
  bottom: 80px;
  right: 10px;
  width: 25px;
  height: 25px;
}
.card-edit-panel__corner--br::before {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 25px;
  height: 1px;
  background: linear-gradient(to left, rgba(175, 96, 37, 0.3), transparent);
}
.card-edit-panel__corner--br::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 25px;
  background: linear-gradient(to top, rgba(175, 96, 37, 0.3), transparent);
}

/* Header */
.card-edit-panel__header {
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

  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(0, 0, 0, 0.6), inset 0 -1px 2px rgba(50, 45, 40, 0.04);
}

.card-edit-panel__header-accent {
  position: absolute;
  top: 8px;
  width: 25px;
  height: 1px;
  pointer-events: none;
}

.card-edit-panel__header-accent--left {
  left: 8px;
  background: linear-gradient(to right, rgba(175, 96, 37, 0.5), transparent);
}

.card-edit-panel__header-accent--right {
  right: 8px;
  background: linear-gradient(to left, rgba(175, 96, 37, 0.5), transparent);
}

.card-edit-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: "Cinzel", serif;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 15px rgba(201, 162, 39, 0.25);
}

.card-edit-panel__title-rune {
  font-size: 0.625rem;
  color: rgba(175, 96, 37, 0.5);
}

.card-edit-panel__close {
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

.card-edit-panel__close:hover {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.card-edit-panel__close svg {
  width: 16px;
  height: 16px;
}

.card-edit-panel__header-edge {
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
.card-edit-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-edit-panel__content::-webkit-scrollbar {
  width: 6px;
}

.card-edit-panel__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.card-edit-panel__content::-webkit-scrollbar-thumb {
  background: rgba(80, 70, 60, 0.4);
  border-radius: 3px;
}

.card-edit-panel__content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 90, 80, 0.5);
}

/* Section */
.card-edit-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(50, 45, 40, 0.3);
}

.card-edit-panel__section:last-of-type {
  border-bottom: none;
}

.card-edit-panel__section-title {
  margin: 0;
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(175, 96, 37, 0.8);
}

/* Field */
.card-edit-panel__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-edit-panel__field--half {
  flex: 1;
}

.card-edit-panel__row {
  display: flex;
  gap: 0.75rem;
}

.card-edit-panel__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(180, 175, 170, 0.85);
}

.card-edit-panel__readonly {
  font-family: "Fira Code", monospace;
  font-size: 0.75rem;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(50, 45, 40, 0.3);
  border-radius: 4px;
  color: rgba(140, 135, 130, 0.7);
}

.card-edit-panel__generate-btn {
  font-family: "Crimson Text", serif;
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: rgba(175, 96, 37, 0.15);
  border: 1px solid rgba(175, 96, 37, 0.3);
  border-radius: 3px;
  color: rgba(175, 96, 37, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-edit-panel__generate-btn:hover {
  background: rgba(175, 96, 37, 0.25);
  border-color: rgba(175, 96, 37, 0.5);
}

.card-edit-panel__textarea {
  width: 100%;
  padding: 0.5rem;
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 4px;
  color: rgba(200, 195, 190, 0.95);
  resize: vertical;
}

.card-edit-panel__textarea:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

/* Upload zone */
.card-edit-panel__upload-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border: 2px dashed rgba(60, 55, 50, 0.4);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-edit-panel__upload-zone:hover {
  border-color: rgba(175, 96, 37, 0.4);
  background: rgba(175, 96, 37, 0.05);
}

.card-edit-panel__upload-zone--dragover {
  border-color: rgba(175, 96, 37, 0.6);
  background: rgba(175, 96, 37, 0.1);
}

.card-edit-panel__upload-zone--has-image {
  border-style: solid;
  border-color: rgba(80, 70, 55, 0.4);
}

.card-edit-panel__upload-preview {
  position: relative;
  max-width: 100%;
}

.card-edit-panel__upload-preview img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
}

.card-edit-panel__upload-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  background: rgba(180, 60, 60, 0.9);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.card-edit-panel__upload-remove:hover {
  transform: scale(1.1);
}

.card-edit-panel__upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: rgba(140, 130, 120, 0.7);
  font-size: 0.8125rem;
}

.card-edit-panel__upload-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(175, 96, 37, 0.2);
  border-top-color: rgba(175, 96, 37, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-edit-panel__upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: rgba(120, 115, 110, 0.6);
  font-size: 0.8125rem;
}

.card-edit-panel__upload-icon {
  font-size: 1.5rem;
  opacity: 0.5;
}

.card-edit-panel__upload-hint {
  font-size: 0.6875rem;
  opacity: 0.6;
}

.card-edit-panel__file-input {
  display: none;
}

/* Messages */
.card-edit-panel__message {
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
}

.card-edit-panel__message--error {
  background: rgba(180, 60, 60, 0.15);
  border: 1px solid rgba(180, 60, 60, 0.3);
  color: #c45050;
}

.card-edit-panel__message--success {
  background: rgba(74, 159, 90, 0.15);
  border: 1px solid rgba(74, 159, 90, 0.3);
  color: #5a9a65;
}

.card-edit-panel__error {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #c45050;
}

/* Footer */
.card-edit-panel__footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(
    180deg,
    rgba(14, 14, 17, 0.95) 0%,
    rgba(18, 18, 22, 0.98) 100%
  );
  border-top: 1px solid rgba(50, 45, 40, 0.4);
}

.card-edit-panel__unsaved {
  font-family: "Crimson Text", serif;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(201, 162, 39, 0.7);
  text-align: center;
}

.card-edit-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Backdrop */
.card-edit-backdrop {
  display: none;
}

@media (max-width: 640px) {
  .card-edit-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }

  .card-edit-panel {
    width: 100%;
    max-width: 420px;
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
</style>
