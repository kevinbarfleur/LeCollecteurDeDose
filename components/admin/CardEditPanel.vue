<script setup lang="ts">
import type { Card, CardTier, CardRarity } from '~/types/card'
import type { CardFormData } from '~/services/supabase-collection.service'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  card?: Card | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
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

// Close modal
const closeModal = () => {
  emit('update:modelValue', false)
  emit('close')
}

// Cancel with confirmation if unsaved changes
const cancel = async () => {
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('Vous avez des modifications non sauvegardees. Voulez-vous vraiment fermer?')
    if (!confirmed) return
  }
  closeModal()
}

// Save card
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
      emit('save', result)

      // Close after short delay to show success
      setTimeout(() => {
        closeModal()
      }, 500)
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
  // Reset input for re-selecting same file
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
  <RunicModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isNewCard ? '✨ Nouvelle Carte' : `📝 Modifier: ${card?.name}`"
    max-width="xl"
    :close-on-overlay="!hasUnsavedChanges"
    :close-on-escape="!hasUnsavedChanges"
    @close="cancel"
  >
    <div class="card-edit-panel">
      <!-- Two column layout: Preview + Form -->
      <div class="card-edit-panel__layout">
        <!-- Preview Column -->
        <div class="card-edit-panel__preview">
          <div class="card-edit-panel__preview-label">Apercu</div>
          <div class="card-edit-panel__preview-card">
            <GameCard
              :card="previewCard"
              :owned="true"
              :preview-only="true"
            />
          </div>
        </div>

        <!-- Form Column -->
        <div class="card-edit-panel__form">
          <!-- Basic Info Section -->
          <div class="card-edit-panel__section">
            <h3 class="card-edit-panel__section-title">
              <span class="card-edit-panel__section-icon">📋</span>
              Informations de base
            </h3>

            <!-- UID (read-only) -->
            <div v-if="!isNewCard" class="card-edit-panel__field">
              <label class="card-edit-panel__label">UID</label>
              <div class="card-edit-panel__readonly">{{ formData.uid }}</div>
            </div>

            <!-- ID -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">
                ID (identifiant unique) *
                <RunicButton
                  v-if="formData.name && !formData.id"
                  size="xs"
                  variant="ghost"
                  @click="generateIdFromName"
                >
                  Générer depuis le nom
                </RunicButton>
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

            <!-- Item Class -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Classe d'objet</label>
              <RunicInput
                v-model="formData.itemClass"
                placeholder="ex: Divination Card"
                size="sm"
              />
            </div>

            <!-- Tier & Rarity Row -->
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
            <h3 class="card-edit-panel__section-title">
              <span class="card-edit-panel__section-icon">📜</span>
              Informations supplementaires
            </h3>

            <!-- Flavour Text -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Texte d'ambiance</label>
              <textarea
                v-model="formData.flavourText"
                class="card-edit-panel__textarea"
                rows="3"
                placeholder="Texte poetique de la carte..."
              />
            </div>

            <!-- Wiki URL -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">URL Wiki</label>
              <RunicInput
                :model-value="formData.wikiUrl ?? ''"
                @update:model-value="formData.wikiUrl = $event || null"
                placeholder="https://poewiki.net/wiki/..."
                size="sm"
              />
            </div>

            <!-- Relevance Score -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Score de pertinence</label>
              <RunicInput
                v-model.number="formData.relevanceScore"
                type="number"
                :min="0"
                placeholder="0"
                size="sm"
              />
            </div>
          </div>

          <!-- Game Data Section -->
          <div class="card-edit-panel__section">
            <h3 class="card-edit-panel__section-title">
              <span class="card-edit-panel__section-icon">🎮</span>
              Donnees de jeu
            </h3>

            <!-- Weight -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Poids (drop weight)</label>
              <RunicInput
                v-model.number="formData.gameData.weight"
                type="number"
                :min="0"
                placeholder="1000"
                size="sm"
              />
              <p class="card-edit-panel__hint">
                Plus le poids est eleve, plus la carte est commune
              </p>
            </div>

            <!-- Image Upload -->
            <div class="card-edit-panel__field">
              <label class="card-edit-panel__label">Image de la carte *</label>

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
                  <RunicButton
                    size="xs"
                    variant="danger"
                    class="card-edit-panel__upload-remove"
                    @click.stop="removeImage"
                  >
                    ×
                  </RunicButton>
                </div>

                <!-- Upload Progress -->
                <div v-else-if="isUploading" class="card-edit-panel__upload-progress">
                  <div class="card-edit-panel__upload-spinner"></div>
                  <span>Upload en cours...</span>
                </div>

                <!-- Placeholder -->
                <div v-else class="card-edit-panel__upload-placeholder">
                  <span class="card-edit-panel__upload-icon">📁</span>
                  <span>Cliquer ou glisser une image</span>
                  <span class="card-edit-panel__upload-hint">PNG, JPG, WebP, GIF - Max 5MB</span>
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
              <div v-if="uploadError" class="card-edit-panel__upload-error">
                {{ uploadError }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="saveError" class="card-edit-panel__message card-edit-panel__message--error">
        ❌ {{ saveError }}
      </div>
      <div v-if="saveSuccess" class="card-edit-panel__message card-edit-panel__message--success">
        ✅ Carte sauvegardee avec succes!
      </div>
    </div>

    <template #footer>
      <div class="card-edit-panel__footer">
        <div v-if="hasUnsavedChanges" class="card-edit-panel__unsaved-warning">
          ⚠️ Modifications non sauvegardees
        </div>
        <div class="card-edit-panel__actions">
          <RunicButton
            variant="secondary"
            @click="cancel"
            :disabled="isSaving"
          >
            Annuler
          </RunicButton>
          <RunicButton
            variant="primary"
            @click="save"
            :disabled="!isValid || isSaving"
          >
            {{ isSaving ? 'Sauvegarde...' : (isNewCard ? 'Creer' : 'Sauvegarder') }}
          </RunicButton>
        </div>
      </div>
    </template>
  </RunicModal>
</template>

<style scoped>
.card-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-edit-panel__layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .card-edit-panel__layout {
    grid-template-columns: 1fr;
  }
}

/* Preview Column */
.card-edit-panel__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.card-edit-panel__preview-label {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(201, 162, 39, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.card-edit-panel__preview-card {
  width: 160px;
  position: sticky;
  top: 1rem;
}

/* Form Column */
.card-edit-panel__form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Sections */
.card-edit-panel__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: rgba(20, 20, 25, 0.5);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 6px;
}

.card-edit-panel__section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-family: 'Cinzel', serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #c9a227;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-edit-panel__section-icon {
  font-size: 1rem;
}

/* Fields */
.card-edit-panel__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-edit-panel__field--half {
  flex: 1;
}

.card-edit-panel__row {
  display: flex;
  gap: 1rem;
}

.card-edit-panel__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(200, 200, 200, 0.9);
}

.card-edit-panel__readonly {
  padding: 0.5rem 0.75rem;
  background: rgba(40, 40, 45, 0.5);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
  color: rgba(150, 150, 150, 0.8);
}

.card-edit-panel__hint {
  margin: 0.25rem 0 0 0;
  font-size: 0.8125rem;
  color: rgba(140, 130, 120, 0.6);
  font-style: italic;
}

.card-edit-panel__generate-btn {
  padding: 0.125rem 0.5rem;
  background: rgba(175, 96, 37, 0.2);
  border: 1px solid rgba(175, 96, 37, 0.4);
  border-radius: 3px;
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-edit-panel__generate-btn:hover {
  background: rgba(175, 96, 37, 0.3);
  border-color: rgba(175, 96, 37, 0.6);
}

/* Textarea */
.card-edit-panel__textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border: 1px solid rgba(35, 32, 28, 0.8);
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
  color: #c8c8c8;
  resize: vertical;
  min-height: 80px;
  box-shadow:
    inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9);
  transition: all 0.3s ease;
}

.card-edit-panel__textarea:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.4);
  box-shadow:
    inset 0 3px 10px rgba(0, 0, 0, 0.8),
    inset 0 1px 3px rgba(0, 0, 0, 0.9),
    0 0 15px rgba(175, 96, 37, 0.1);
}

.card-edit-panel__textarea::placeholder {
  color: rgba(90, 85, 80, 0.5);
  font-style: italic;
}

/* Messages */
.card-edit-panel__message {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
}

.card-edit-panel__message--error {
  background: rgba(180, 50, 50, 0.2);
  border: 1px solid rgba(180, 50, 50, 0.4);
  color: #ff6b6b;
}

.card-edit-panel__message--success {
  background: rgba(50, 180, 50, 0.2);
  border: 1px solid rgba(50, 180, 50, 0.4);
  color: #6bff6b;
}

/* Footer */
.card-edit-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.card-edit-panel__unsaved-warning {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(201, 162, 39, 0.8);
}

.card-edit-panel__actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

@media (max-width: 640px) {
  .card-edit-panel__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .card-edit-panel__actions {
    margin-left: 0;
    justify-content: flex-end;
  }

  .card-edit-panel__row {
    flex-direction: column;
  }
}

/* Upload Zone */
.card-edit-panel__upload-zone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 1rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(14, 14, 16, 0.9) 40%,
    rgba(10, 10, 12, 0.95) 100%
  );
  border: 2px dashed rgba(60, 55, 50, 0.5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-edit-panel__upload-zone:hover {
  border-color: rgba(175, 96, 37, 0.5);
  background: rgba(175, 96, 37, 0.05);
}

.card-edit-panel__upload-zone--dragover {
  border-color: rgba(201, 162, 39, 0.8);
  background: rgba(201, 162, 39, 0.1);
  box-shadow: 0 0 20px rgba(201, 162, 39, 0.2);
}

.card-edit-panel__upload-zone--uploading {
  pointer-events: none;
  opacity: 0.8;
}

.card-edit-panel__upload-zone--has-image {
  border-style: solid;
  border-color: rgba(50, 180, 50, 0.4);
}

/* Upload Placeholder */
.card-edit-panel__upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: rgba(140, 130, 120, 0.7);
  font-family: 'Crimson Text', serif;
  text-align: center;
}

.card-edit-panel__upload-icon {
  font-size: 2rem;
  opacity: 0.6;
}

.card-edit-panel__upload-hint {
  font-size: 0.75rem;
  color: rgba(100, 95, 90, 0.6);
}

/* Upload Preview */
.card-edit-panel__upload-preview {
  position: relative;
  max-width: 150px;
  max-height: 200px;
}

.card-edit-panel__upload-preview img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.card-edit-panel__upload-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(180, 50, 50, 0.9);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-edit-panel__upload-remove:hover {
  background: rgba(220, 60, 60, 1);
  transform: scale(1.1);
}

/* Upload Progress */
.card-edit-panel__upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: rgba(201, 162, 39, 0.9);
  font-family: 'Crimson Text', serif;
}

.card-edit-panel__upload-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(201, 162, 39, 0.2);
  border-top-color: rgba(201, 162, 39, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Hidden File Input */
.card-edit-panel__file-input {
  display: none;
}

/* Upload Error */
.card-edit-panel__upload-error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(180, 50, 50, 0.2);
  border: 1px solid rgba(180, 50, 50, 0.4);
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: #ff6b6b;
}
</style>
