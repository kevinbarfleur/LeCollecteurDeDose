<script setup lang="ts">
/**
 * Events View
 *
 * Configuration view for batch event presets using the form system.
 * All presets displayed as rows with inline editing.
 */

interface Preset {
  id: string
  category: string
  display_name: string
  emoji: string
  description: string
  announcement: string
  completion_message: string
  delay_between_events_ms: number
  is_enabled: boolean
  actions?: any[]
  sort_order?: number
}

interface EventMessage {
  id: string
  category: string
  item_key: string
  message_type: string
  messages: string[]
  description: string | null
  variables: string[] | null
}

interface Props {
  presets: Preset[]
  categories: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()

// Global settings
const batchDelay = ref(2500)
const maxUsers = ref(10)

// Editing state
const editingPresetId = ref<string | null>(null)
const editForm = reactive<Partial<Preset>>({})
const isSaving = ref(false)

// Event action messages state
const eventMessages = ref<EventMessage[]>([])
const loadingMessages = ref(false)
const editingMessageId = ref<string | null>(null)
const editingMessages = ref<string[]>([])
const savingMessage = ref(false)

// Fetch event action messages
const fetchEventMessages = async () => {
  loadingMessages.value = true
  try {
    const response = await $fetch<{ ok: boolean; messages: EventMessage[] }>('/api/admin/bot-messages', {
      query: { category: 'event' },
    })
    eventMessages.value = response.messages || []
  } catch (err) {
    console.error('Failed to fetch event messages:', err)
  } finally {
    loadingMessages.value = false
  }
}

// Group messages by item_key
const messagesByEvent = computed(() => {
  const grouped: Record<string, EventMessage[]> = {}
  for (const msg of eventMessages.value) {
    if (!grouped[msg.item_key]) {
      grouped[msg.item_key] = []
    }
    grouped[msg.item_key].push(msg)
  }
  return grouped
})

// Event display names
const eventDisplayNames: Record<string, string> = {
  buffBow: '🏹 Buff Bow',
  buffCaster: '🔮 Buff Caster',
  buffAll: '✨ Buff All (Divine Blessing)',
  nerfMelee: '⚔️ Nerf Melee',
  nerfCaster: '🔮 Nerf Caster',
  nerfJewelry: '💍 Nerf Jewelry',
  harvestNerf: '🌿 Harvest Nerf',
  auraStackerNerf: '🔊 Aura Stacker Nerf',
  vaalRoulette: '🎰 Vaal Roulette',
  mirrorEvent: '💎 Mirror Event',
  heist: '💰 Heist',
  steelmageRip: '☠️ Steelmage RIP',
  leagueStart: '🎮 League Start',
  leagueEndChaos: '🔥 League End Chaos',
  flashbackBuff: '⚡ Flashback Buff',
  flashbackGift: '⚡ Flashback Gift',
  pathOfMathDrama: '🎭 Path of Math Drama',
}

// Message type display names
const messageTypeDisplayNames: Record<string, string> = {
  success: 'Succès',
  noCards: 'Pas de carte',
  brick: 'Brick (échec)',
  upgrade: 'Upgrade (succès)',
  buff: 'Buff',
  nerf: 'Nerf',
  nothing: 'Rien',
  steal: 'Vol',
}

// Start editing messages
const startEditMessage = (msg: EventMessage) => {
  if (editingMessageId.value === msg.id) {
    editingMessageId.value = null
    editingMessages.value = []
    return
  }
  editingMessageId.value = msg.id
  editingMessages.value = [...msg.messages]
}

// Save message changes
const saveMessage = async () => {
  if (!editingMessageId.value) return

  const msg = eventMessages.value.find(m => m.id === editingMessageId.value)
  if (!msg) return

  savingMessage.value = true
  try {
    await $fetch('/api/admin/bot-messages', {
      method: 'POST',
      body: {
        id: msg.id,
        category: msg.category,
        item_key: msg.item_key,
        message_type: msg.message_type,
        messages: editingMessages.value.filter(m => m.trim()),
        description: msg.description,
        variables: msg.variables,
      },
    })
    editingMessageId.value = null
    editingMessages.value = []
    await fetchEventMessages()
  } catch (err) {
    console.error('Failed to save message:', err)
  } finally {
    savingMessage.value = false
  }
}

// Add message variant
const addMessageVariant = () => {
  editingMessages.value.push('')
}

// Remove message variant
const removeMessageVariant = (index: number) => {
  editingMessages.value.splice(index, 1)
}

// Load messages on mount
onMounted(() => {
  fetchEventMessages()
})

// Group presets by category
const presetsByCategory = computed(() => {
  const grouped: Record<string, Preset[]> = {}
  for (const preset of props.presets) {
    if (!grouped[preset.category]) {
      grouped[preset.category] = []
    }
    grouped[preset.category].push(preset)
  }
  return grouped
})

// Start editing a preset
const startEdit = (preset: Preset) => {
  if (editingPresetId.value === preset.id) {
    // Toggle off
    editingPresetId.value = null
    return
  }
  editingPresetId.value = preset.id
  Object.assign(editForm, {
    id: preset.id,
    category: preset.category,
    display_name: preset.display_name,
    emoji: preset.emoji,
    description: preset.description || '',
    announcement: preset.announcement || '',
    completion_message: preset.completion_message || '',
    delay_between_events_ms: preset.delay_between_events_ms || 2500,
    is_enabled: preset.is_enabled,
    actions: preset.actions || [],
    sort_order: preset.sort_order || 0,
  })
}

// Save preset changes
const savePreset = async () => {
  if (!editingPresetId.value) return

  isSaving.value = true
  try {
    await $fetch('/api/admin/batch-event-presets', {
      method: 'POST',
      body: editForm,
    })
    editingPresetId.value = null
    emit('refresh')
  } catch (err) {
    console.error('Failed to save preset:', err)
  } finally {
    isSaving.value = false
  }
}

// Cancel editing
const cancelEdit = () => {
  editingPresetId.value = null
}

// Launch event
const launchingPreset = ref<string | null>(null)
const launchEvent = async (presetId: string) => {
  launchingPreset.value = presetId
  try {
    await $fetch('/api/admin/trigger-batch-event', {
      method: 'POST',
      body: {
        presetId,
        delay: batchDelay.value,
        maxUsers: maxUsers.value,
      },
    })
  } catch (err) {
    console.error('Failed to launch event:', err)
  } finally {
    setTimeout(() => {
      launchingPreset.value = null
    }, 3000)
  }
}

// Toggle preset enabled
const togglePreset = async (presetId: string, enabled: boolean) => {
  try {
    const preset = props.presets.find((p) => p.id === presetId)
    if (!preset) return

    await $fetch('/api/admin/batch-event-presets', {
      method: 'POST',
      body: { ...preset, is_enabled: enabled },
    })
    emit('refresh')
  } catch (err) {
    console.error('Failed to toggle preset:', err)
  }
}

// JSON Editor state
const showJsonEditor = ref(false)

// Compute data structure for JSON editor
const jsonEditorData = computed(() => ({
  presets: props.presets,
  categories: props.categories,
  messages: eventMessages.value,
}))
</script>

<template>
  <div class="events-view">
    <!-- Global Settings -->
    <FormSection
      title="Paramètres des Events"
      subtitle="Configuration globale pour le lancement des événements batch"
    >
      <FormRowSlider
        v-model="batchDelay"
        label="Délai entre utilisateurs"
        description="Temps d'attente entre chaque action sur un utilisateur"
        :min="500"
        :max="10000"
        :step="100"
        value-suffix="ms"
      />

      <FormRowSlider
        v-model="maxUsers"
        label="Nombre max d'utilisateurs"
        description="Nombre maximum d'utilisateurs affectés par un événement"
        :min="1"
        :max="50"
        :step="1"
      />
    </FormSection>

    <!-- Buffs GGG -->
    <FormSection
      v-if="presetsByCategory['buff']?.length"
      title="Buffs GGG"
      subtitle="Événements positifs affectant plusieurs joueurs"
      variant="positive"
    >
      <template v-for="preset in presetsByCategory['buff']" :key="preset.id">
        <FormRow
          :label="`${preset.emoji} ${preset.display_name}`"
          :description="preset.description"
        >
          <div class="events-view__preset-actions">
            <RunicRadio
              :model-value="preset.is_enabled"
              toggle
              size="sm"
              @update:model-value="togglePreset(preset.id, $event as boolean)"
            />
            <RunicButton
              size="xs"
              :icon="editingPresetId === preset.id ? 'close' : 'edit'"
              :variant="editingPresetId === preset.id ? 'secondary' : 'ghost'"
              icon-only
              title="Modifier les paramètres"
              @click="startEdit(preset)"
            />
            <RunicButton
              size="xs"
              icon="play"
              variant="ghost"
              icon-only
              :disabled="!preset.is_enabled || launchingPreset === preset.id"
              title="Lancer l'événement"
              @click="launchEvent(preset.id)"
            />
          </div>
        </FormRow>

        <!-- Edit Form (inline) -->
        <div v-if="editingPresetId === preset.id" class="events-view__edit-form">
          <div class="events-view__edit-field">
            <div class="events-view__field-header">
              <label class="events-view__edit-label">Message d'annonce</label>
              <FormIndicator variant="code" size="sm" inline>{version}</FormIndicator>
            </div>
            <textarea
              v-model="editForm.announcement"
              class="events-view__edit-textarea"
              rows="2"
              placeholder="Message affiché au début de l'événement..."
            />
          </div>

          <div class="events-view__edit-field">
            <div class="events-view__field-header">
              <label class="events-view__edit-label">Message de fin</label>
              <FormIndicator variant="code" size="sm" inline>{count} {version}</FormIndicator>
            </div>
            <textarea
              v-model="editForm.completion_message"
              class="events-view__edit-textarea"
              rows="2"
              placeholder="Message affiché à la fin de l'événement..."
            />
          </div>

          <div class="events-view__edit-field">
            <label class="events-view__edit-label">Description</label>
            <input
              v-model="editForm.description"
              type="text"
              class="events-view__edit-input"
              placeholder="Description courte..."
            />
          </div>

          <div class="events-view__edit-actions">
            <RunicButton
              size="sm"
              variant="ghost"
              @click="cancelEdit"
            >
              Annuler
            </RunicButton>
            <RunicButton
              size="sm"
              variant="primary"
              :disabled="isSaving"
              @click="savePreset"
            >
              {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </RunicButton>
          </div>
        </div>
      </template>
    </FormSection>

    <!-- Nerfs Classiques -->
    <FormSection
      v-if="presetsByCategory['nerf']?.length"
      title="Nerfs Classiques"
      subtitle="Événements négatifs affectant plusieurs joueurs"
      variant="negative"
    >
      <template v-for="preset in presetsByCategory['nerf']" :key="preset.id">
        <FormRow
          :label="`${preset.emoji} ${preset.display_name}`"
          :description="preset.description"
        >
          <div class="events-view__preset-actions">
            <RunicRadio
              :model-value="preset.is_enabled"
              toggle
              size="sm"
              @update:model-value="togglePreset(preset.id, $event as boolean)"
            />
            <RunicButton
              size="xs"
              :icon="editingPresetId === preset.id ? 'close' : 'edit'"
              :variant="editingPresetId === preset.id ? 'secondary' : 'ghost'"
              icon-only
              title="Modifier les paramètres"
              @click="startEdit(preset)"
            />
            <RunicButton
              size="xs"
              icon="play"
              variant="ghost"
              icon-only
              :disabled="!preset.is_enabled || launchingPreset === preset.id"
              title="Lancer l'événement"
              @click="launchEvent(preset.id)"
            />
          </div>
        </FormRow>

        <!-- Edit Form (inline) -->
        <div v-if="editingPresetId === preset.id" class="events-view__edit-form">
          <div class="events-view__edit-field">
            <div class="events-view__field-header">
              <label class="events-view__edit-label">Message d'annonce</label>
              <FormIndicator variant="code" size="sm" inline>{version}</FormIndicator>
            </div>
            <textarea
              v-model="editForm.announcement"
              class="events-view__edit-textarea"
              rows="2"
              placeholder="Message affiché au début de l'événement..."
            />
          </div>

          <div class="events-view__edit-field">
            <div class="events-view__field-header">
              <label class="events-view__edit-label">Message de fin</label>
              <FormIndicator variant="code" size="sm" inline>{count} {version}</FormIndicator>
            </div>
            <textarea
              v-model="editForm.completion_message"
              class="events-view__edit-textarea"
              rows="2"
              placeholder="Message affiché à la fin de l'événement..."
            />
          </div>

          <div class="events-view__edit-field">
            <label class="events-view__edit-label">Description</label>
            <input
              v-model="editForm.description"
              type="text"
              class="events-view__edit-input"
              placeholder="Description courte..."
            />
          </div>

          <div class="events-view__edit-actions">
            <RunicButton
              size="sm"
              variant="ghost"
              @click="cancelEdit"
            >
              Annuler
            </RunicButton>
            <RunicButton
              size="sm"
              variant="primary"
              :disabled="isSaving"
              @click="savePreset"
            >
              {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </RunicButton>
          </div>
        </div>
      </template>
    </FormSection>

    <!-- Other categories -->
    <template v-for="category in categories" :key="category.id">
      <FormSection
        v-if="category.id !== 'buff' && category.id !== 'nerf' && presetsByCategory[category.id]?.length"
        :title="`${category.emoji} ${category.label}`"
        :subtitle="category.description || 'Événements de cette catégorie'"
      >
        <template v-for="preset in presetsByCategory[category.id]" :key="preset.id">
          <FormRow
            :label="`${preset.emoji} ${preset.display_name}`"
            :description="preset.description"
          >
            <div class="events-view__preset-actions">
              <RunicRadio
                :model-value="preset.is_enabled"
                toggle
                size="sm"
                @update:model-value="togglePreset(preset.id, $event as boolean)"
              />
              <RunicButton
                size="xs"
                :icon="editingPresetId === preset.id ? 'close' : 'edit'"
                :variant="editingPresetId === preset.id ? 'secondary' : 'ghost'"
                icon-only
                title="Modifier les paramètres"
                @click="startEdit(preset)"
              />
              <RunicButton
                size="xs"
                icon="play"
                variant="ghost"
                icon-only
                :disabled="!preset.is_enabled || launchingPreset === preset.id"
                title="Lancer l'événement"
                @click="launchEvent(preset.id)"
              />
            </div>
          </FormRow>

          <!-- Edit Form (inline) -->
          <div v-if="editingPresetId === preset.id" class="events-view__edit-form">
            <div class="events-view__edit-field">
              <div class="events-view__field-header">
                <label class="events-view__edit-label">Message d'annonce</label>
                <FormIndicator variant="code" size="sm" inline>{version}</FormIndicator>
              </div>
              <textarea
                v-model="editForm.announcement"
                class="events-view__edit-textarea"
                rows="2"
                placeholder="Message affiché au début de l'événement..."
              />
            </div>

            <div class="events-view__edit-field">
              <div class="events-view__field-header">
                <label class="events-view__edit-label">Message de fin</label>
                <FormIndicator variant="code" size="sm" inline>{count} {version}</FormIndicator>
              </div>
              <textarea
                v-model="editForm.completion_message"
                class="events-view__edit-textarea"
                rows="2"
                placeholder="Message affiché à la fin de l'événement..."
              />
            </div>

            <div class="events-view__edit-field">
              <label class="events-view__edit-label">Description</label>
              <input
                v-model="editForm.description"
                type="text"
                class="events-view__edit-input"
                placeholder="Description courte..."
              />
            </div>

            <div class="events-view__edit-actions">
              <RunicButton
                size="sm"
                variant="ghost"
                @click="cancelEdit"
              >
                Annuler
              </RunicButton>
              <RunicButton
                size="sm"
                variant="primary"
                :disabled="isSaving"
                @click="savePreset"
              >
                {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
              </RunicButton>
            </div>
          </div>
        </template>
      </FormSection>
    </template>

    <!-- Event Action Messages -->
    <FormSection
      v-if="Object.keys(messagesByEvent).length > 0"
      title="Messages d'Action"
      subtitle="Messages envoyés à chaque joueur pendant les événements"
    >
      <div class="events-view__messages-intro">
        <span class="events-view__messages-info">
          Ces messages sont affichés pour chaque joueur affecté par un événement.
          Plusieurs variantes sont choisies aléatoirement.
        </span>
      </div>

      <template v-for="(messages, eventKey) in messagesByEvent" :key="eventKey">
        <div class="events-view__event-group">
          <div class="events-view__event-header">
            {{ eventDisplayNames[eventKey] || eventKey }}
          </div>

          <template v-for="msg in messages" :key="msg.id">
            <FormRow
              :label="messageTypeDisplayNames[msg.message_type] || msg.message_type"
              :description="`${msg.messages.length} variante(s)`"
            >
              <div class="events-view__message-actions">
                <FormIndicator
                  v-if="msg.variables?.length"
                  variant="code"
                  size="sm"
                  inline
                >
                  {{ msg.variables.join(' ') }}
                </FormIndicator>
                <RunicButton
                  size="xs"
                  :icon="editingMessageId === msg.id ? 'close' : 'edit'"
                  :variant="editingMessageId === msg.id ? 'secondary' : 'ghost'"
                  icon-only
                  title="Modifier les messages"
                  @click="startEditMessage(msg)"
                />
              </div>
            </FormRow>

            <!-- Edit Messages Form -->
            <div v-if="editingMessageId === msg.id" class="events-view__messages-edit">
              <div class="events-view__messages-list">
                <div
                  v-for="(variant, index) in editingMessages"
                  :key="index"
                  class="events-view__message-row"
                >
                  <textarea
                    v-model="editingMessages[index]"
                    class="events-view__message-textarea"
                    rows="2"
                    :placeholder="`Variante ${index + 1}...`"
                  />
                  <RunicButton
                    v-if="editingMessages.length > 1"
                    size="xs"
                    variant="danger"
                    title="Supprimer cette variante"
                    @click="removeMessageVariant(index)"
                  >
                    ×
                  </RunicButton>
                </div>
              </div>

              <div class="events-view__messages-footer">
                <RunicButton
                  size="xs"
                  variant="ghost"
                  @click="addMessageVariant"
                >
                  + Ajouter variante
                </RunicButton>

                <div class="events-view__messages-save">
                  <RunicButton
                    size="sm"
                    variant="ghost"
                    @click="editingMessageId = null"
                  >
                    Annuler
                  </RunicButton>
                  <RunicButton
                    size="sm"
                    variant="primary"
                    :disabled="savingMessage"
                    @click="saveMessage"
                  >
                    {{ savingMessage ? 'Sauvegarde...' : 'Sauvegarder' }}
                  </RunicButton>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
    </FormSection>

    <!-- Loading state for messages -->
    <FormSection
      v-else-if="loadingMessages"
      title="Messages d'Action"
      subtitle="Chargement des messages..."
    >
      <div class="events-view__loading">
        <span class="events-view__loading-text">Chargement...</span>
      </div>
    </FormSection>

    <!-- Empty state -->
    <FormSection
      v-if="!presets.length"
      title="Aucun preset"
      subtitle="Aucun événement batch configuré"
    >
      <div class="events-view__empty">
        <span class="events-view__empty-icon">📭</span>
        <span class="events-view__empty-text">Aucun preset disponible</span>
      </div>
    </FormSection>

    <!-- JSON Editor Button -->
    <div class="events-view__json-action">
      <RunicButton
        size="xs"
        variant="ghost"
        icon="document"
        @click="showJsonEditor = true"
      >
        Editer en JSON
      </RunicButton>
    </div>

    <!-- JSON Editor Modal -->
    <JsonEditorModal
      v-model="showJsonEditor"
      title="Events - Edition JSON"
      :data="jsonEditorData"
      tab-type="events"
      @refresh="emit('refresh')"
    />
  </div>
</template>

<style scoped>
.events-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.events-view__json-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}

.events-view__preset-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Edit Form Styles */
.events-view__edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin: -0.5rem 0 0.5rem 0;
  background: rgba(20, 18, 15, 0.6);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.events-view__edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.events-view__field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}


.events-view__edit-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.events-view__edit-input,
.events-view__edit-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Crimson Text', serif;
  font-size: 0.9375rem;
  line-height: 1.5;
  transition: border-color 0.2s ease;
  resize: vertical;
}

.events-view__edit-input:focus,
.events-view__edit-textarea:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.events-view__edit-input::placeholder,
.events-view__edit-textarea::placeholder {
  color: rgba(150, 140, 125, 0.4);
}

.events-view__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}

/* Empty state */
.events-view__empty {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(40, 38, 35, 0.2);
  border: 1px dashed rgba(60, 55, 50, 0.3);
  border-radius: 6px;
}

.events-view__empty-icon {
  font-size: 1.5rem;
  opacity: 0.6;
}

.events-view__empty-text {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(150, 140, 125, 0.6);
  font-style: italic;
}

/* Event Action Messages */
.events-view__messages-intro {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgba(60, 55, 50, 0.1);
  border: 1px solid rgba(60, 55, 50, 0.2);
  border-radius: 4px;
}

.events-view__messages-info {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.7);
  font-style: italic;
}

.events-view__event-group {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(60, 55, 50, 0.15);
}

.events-view__event-group:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.events-view__event-header {
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(175, 96, 37, 0.9);
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

.events-view__message-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.events-view__messages-edit {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  margin: -0.25rem 0 0.5rem 0;
  background: rgba(20, 18, 15, 0.6);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.events-view__messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.events-view__message-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.events-view__message-textarea {
  flex: 1;
  padding: 0.5rem 0.625rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 60px;
}

.events-view__message-textarea:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.events-view__message-textarea::placeholder {
  color: rgba(150, 140, 125, 0.4);
}

.events-view__messages-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}

.events-view__messages-save {
  display: flex;
  gap: 0.5rem;
}

/* Loading state */
.events-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.events-view__loading-text {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(150, 140, 125, 0.6);
  font-style: italic;
}

/* Responsive */
@media (max-width: 640px) {
  .events-view__preset-actions {
    flex-wrap: wrap;
  }

  .events-view__edit-actions {
    flex-direction: column;
  }

  .events-view__edit-actions :deep(.runic-button) {
    width: 100%;
  }

  .events-view__messages-footer {
    flex-direction: column;
    gap: 0.75rem;
  }

  .events-view__messages-save {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
