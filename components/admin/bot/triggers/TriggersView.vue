<script setup lang="ts">
/**
 * Triggers View
 *
 * Configuration view for auto-triggers with probability settings
 * and message template editing with variables support.
 */

interface BotMessage {
  id: string
  category: string
  item_key: string
  message_type: string
  messages: string[]
  description: string
  variables: string[]
}

interface Props {
  config: Record<string, string>
  messages: BotMessage[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()

// Trigger definitions with message types
const triggerDefs = [
  {
    key: 'blessingRNGesus',
    configKey: 'blessing_rngesus',
    name: 'Blessing of RNGesus',
    emoji: '✨',
    description: 'Donne +1 Vaal Orb au joueur ciblé',
    positive: true,
    messageTypes: ['success'],
  },
  {
    key: 'cartographersGift',
    configKey: 'cartographers_gift',
    name: "Cartographer's Gift",
    emoji: '🗺️',
    description: 'Donne une carte aléatoire non-foil',
    positive: true,
    messageTypes: ['success'],
  },
  {
    key: 'mirrorTier',
    configKey: 'mirror_tier',
    name: 'Mirror-tier Moment',
    emoji: '💎',
    description: 'Duplique une carte aléatoire',
    positive: true,
    messageTypes: ['success', 'failure'],
  },
  {
    key: 'einharApproved',
    configKey: 'einhar_approved',
    name: 'Einhar Approved',
    emoji: '🦎',
    description: 'Transforme une carte normale en foil',
    positive: true,
    messageTypes: ['success', 'failure'],
  },
  {
    key: 'atlasInfluence',
    configKey: 'atlas_influence',
    name: 'Atlas Influence',
    emoji: '🌟',
    description: 'Buff +% chance foil au prochain autel',
    positive: true,
    messageTypes: ['success'],
  },
  {
    key: 'heistTax',
    configKey: 'heist_tax',
    name: 'Heist Tax',
    emoji: '💰',
    description: 'Vole 1 Vaal Orb au joueur ciblé',
    positive: false,
    messageTypes: ['success', 'failure'],
  },
  {
    key: 'sirusVoice',
    configKey: 'sirus_voice',
    name: 'Sirus Voice Line',
    emoji: '💀',
    description: 'Détruit une carte aléatoire',
    positive: false,
    messageTypes: ['success', 'failure'],
  },
  {
    key: 'alchMisclick',
    configKey: 'alch_misclick',
    name: 'Alch & Go Misclick',
    emoji: '⚗️',
    description: 'Reroll une carte en une autre',
    positive: false,
    messageTypes: ['success', 'failure'],
  },
  {
    key: 'tradeScam',
    configKey: 'trade_scam',
    name: 'Trade Scam',
    emoji: '🤝',
    description: 'Vole une carte pour la donner à un autre joueur',
    positive: false,
    messageTypes: ['success', 'failureNoTarget', 'failureNoCards'],
  },
  {
    key: 'chrisVision',
    configKey: 'chris_vision',
    name: "Chris Wilson's Vision",
    emoji: '👓',
    description: "Retire le foil d'une carte foil",
    positive: false,
    messageTypes: ['success', 'failure'],
  },
]

// Message type labels
const messageTypeLabels: Record<string, string> = {
  success: 'Succès',
  failure: 'Échec',
  failureNoTarget: 'Échec (pas de cible)',
  failureNoCards: 'Échec (pas de cartes)',
}

// Reactive state
const masterEnabled = computed(() => props.config.auto_triggers_enabled === 'true')
const editingTrigger = ref<string | null>(null)
const editingMessages = ref<Record<string, string[]>>({})
const isSaving = ref(false)

// Get trigger probability (0-50 scale, stored as 0-0.5)
const getTriggerProbability = (configKey: string) => {
  return Math.round(parseFloat(props.config[`trigger_${configKey}`] || '0') * 100)
}

// Total probability
const totalProbability = computed(() => {
  return triggerDefs.reduce((sum, t) => {
    return sum + parseFloat(props.config[`trigger_${t.configKey}`] || '0')
  }, 0)
})

const totalProbabilityPercent = computed(() => Math.round(totalProbability.value * 100))

// Positive and negative triggers
const positiveTriggers = computed(() => triggerDefs.filter((t) => t.positive))
const negativeTriggers = computed(() => triggerDefs.filter((t) => !t.positive))

// Get messages for a trigger
const getMessagesForTrigger = (triggerKey: string) => {
  return props.messages.filter(
    (m) => m.category === 'trigger' && m.item_key === triggerKey
  )
}

// Get a specific message
const getMessage = (triggerKey: string, messageType: string): BotMessage | undefined => {
  return props.messages.find(
    (m) => m.category === 'trigger' && m.item_key === triggerKey && m.message_type === messageType
  )
}

// Start editing a trigger
const startEdit = (triggerKey: string) => {
  if (editingTrigger.value === triggerKey) {
    editingTrigger.value = null
    return
  }

  editingTrigger.value = triggerKey
  editingMessages.value = {}

  // Load current messages
  const triggerMessages = getMessagesForTrigger(triggerKey)
  for (const msg of triggerMessages) {
    editingMessages.value[msg.message_type] = [...msg.messages]
  }
}

// Add a message variant
const addMessageVariant = (messageType: string) => {
  if (!editingMessages.value[messageType]) {
    editingMessages.value[messageType] = []
  }
  editingMessages.value[messageType].push('')
}

// Remove a message variant
const removeMessageVariant = (messageType: string, index: number) => {
  if (editingMessages.value[messageType] && editingMessages.value[messageType].length > 1) {
    editingMessages.value[messageType].splice(index, 1)
  }
}

// Save messages
const saveMessages = async () => {
  if (!editingTrigger.value) return

  isSaving.value = true
  try {
    // Save each message type
    for (const [messageType, messages] of Object.entries(editingMessages.value)) {
      const filteredMessages = messages.filter((m) => m.trim() !== '')
      if (filteredMessages.length === 0) continue

      const messageId = `trigger_${editingTrigger.value}_${messageType}`
      await $fetch('/api/admin/bot-messages', {
        method: 'POST',
        body: {
          id: messageId,
          messages: filteredMessages,
        },
      })
    }

    editingTrigger.value = null
    emit('refresh')
  } catch (err) {
    console.error('Failed to save messages:', err)
  } finally {
    isSaving.value = false
  }
}

// Cancel editing
const cancelEdit = () => {
  editingTrigger.value = null
  editingMessages.value = {}
}

// Toggle master switch
const toggleMaster = async (value: boolean) => {
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: { key: 'auto_triggers_enabled', value: String(value) },
    })
    emit('refresh')
  } catch (err) {
    console.error('Failed to toggle master:', err)
  }
}

// Update trigger probability (value is 0-50, store as 0-0.5)
const updateProbability = async (configKey: string, event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseInt(target.value) || 0
  value = Math.max(0, Math.min(50, value))

  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: { key: `trigger_${configKey}`, value: (value / 100).toFixed(2) },
    })
    emit('refresh')
  } catch (err) {
    console.error('Failed to update probability:', err)
  }
}

// Distribute probabilities evenly
const isDistributing = ref(false)
const distributeEvenly = async () => {
  isDistributing.value = true

  const perTrigger = 1 / triggerDefs.length

  for (const t of triggerDefs) {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: { key: `trigger_${t.configKey}`, value: perTrigger.toFixed(2) },
    })
  }

  emit('refresh')
  isDistributing.value = false
}

// Test individual trigger
const testingTrigger = ref<string | null>(null)
const testTrigger = async (triggerKey: string) => {
  testingTrigger.value = triggerKey
  try {
    await $fetch('/api/admin/trigger-manual', {
      method: 'POST',
      body: { triggerType: triggerKey },
    })
  } catch (err) {
    console.error('Failed to test trigger:', err)
  } finally {
    setTimeout(() => {
      testingTrigger.value = null
    }, 2000)
  }
}

// JSON Editor state
const showJsonEditor = ref(false)

// Compute data structure for JSON editor
const jsonEditorData = computed(() => ({
  config: Object.fromEntries(
    Object.entries(props.config).filter(([k]) =>
      k.startsWith('trigger_') || k.startsWith('auto_triggers_')
    )
  ),
  messages: props.messages.filter((m) => m.category === 'trigger'),
}))
</script>

<template>
  <div class="triggers-view">
    <!-- Global Controls -->
    <FormSection
      title="Contrôle Global"
      subtitle="Active ou désactive le système de triggers automatiques"
    >
      <FormRowToggle
        label="Système de Triggers"
        description="Active tous les triggers automatiques pendant le stream"
        :model-value="masterEnabled"
        @update:model-value="toggleMaster"
      />

      <FormRowAction
        label="Équilibrer les probabilités"
        description="Distribue équitablement les probabilités entre tous les triggers"
      >
        <RunicButton
          size="sm"
          variant="secondary"
          :disabled="isDistributing"
          @click="distributeEvenly"
        >
          {{ isDistributing ? 'Distribution...' : 'Distribuer' }}
        </RunicButton>
      </FormRowAction>

      <!-- Probability indicator -->
      <FormRow
        label="Probabilité totale"
        description="La somme de toutes les probabilités devrait être de 100%"
      >
        <FormIndicator
          variant="status"
          :status="totalProbabilityPercent === 100 ? 'success' : 'warning'"
        >
          {{ totalProbabilityPercent }}%
        </FormIndicator>
      </FormRow>
    </FormSection>

    <!-- Positive Triggers -->
    <FormSection
      title="Effets Positifs"
      subtitle="Ces triggers apportent des bénéfices aux joueurs"
      variant="positive"
    >
      <template v-for="t in positiveTriggers" :key="t.key">
        <FormRow
          :label="`${t.emoji} ${t.name}`"
          :description="t.description"
        >
          <div class="triggers-view__control">
            <div class="triggers-view__input-group">
              <input
                type="number"
                :value="getTriggerProbability(t.configKey)"
                min="0"
                max="50"
                class="triggers-view__input"
                @change="updateProbability(t.configKey, $event)"
              />
              <span class="triggers-view__suffix">%</span>
            </div>
            <RunicButton
              size="xs"
              :icon="editingTrigger === t.key ? 'close' : 'edit'"
              :variant="editingTrigger === t.key ? 'secondary' : 'ghost'"
              icon-only
              title="Modifier les messages"
              @click="startEdit(t.key)"
            />
            <RunicButton
              size="xs"
              icon="play"
              variant="ghost"
              icon-only
              :disabled="testingTrigger === t.key"
              title="Tester ce trigger"
              @click="testTrigger(t.key)"
            />
          </div>
        </FormRow>

        <!-- Message Editor -->
        <div v-if="editingTrigger === t.key" class="triggers-view__messages">
          <template v-for="msgType in t.messageTypes" :key="msgType">
            <div class="triggers-view__message-section">
              <div class="triggers-view__message-header">
                <span class="triggers-view__message-type">{{ messageTypeLabels[msgType] || msgType }}</span>
                <FormIndicator
                  v-if="getMessage(t.key, msgType)?.variables?.length"
                  variant="code"
                  size="sm"
                  inline
                >
                  {{ getMessage(t.key, msgType)?.variables?.join(' ') }}
                </FormIndicator>
              </div>

              <div class="triggers-view__message-list">
                <div
                  v-for="(msg, idx) in (editingMessages[msgType] || getMessage(t.key, msgType)?.messages || [])"
                  :key="idx"
                  class="triggers-view__message-item"
                >
                  <textarea
                    v-model="editingMessages[msgType][idx]"
                    class="triggers-view__message-input"
                    rows="2"
                    :placeholder="`Variante ${idx + 1}...`"
                  />
                  <RunicButton
                    v-if="(editingMessages[msgType]?.length || 0) > 1"
                    size="xs"
                    variant="danger"
                    @click="removeMessageVariant(msgType, idx)"
                  >
                    ×
                  </RunicButton>
                </div>
              </div>

              <RunicButton
                size="xs"
                variant="ghost"
                @click="addMessageVariant(msgType)"
              >
                + Ajouter variante
              </RunicButton>
            </div>
          </template>

          <div class="triggers-view__message-actions">
            <RunicButton size="sm" variant="ghost" @click="cancelEdit">
              Annuler
            </RunicButton>
            <RunicButton size="sm" variant="primary" :disabled="isSaving" @click="saveMessages">
              {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </RunicButton>
          </div>
        </div>
      </template>
    </FormSection>

    <!-- Negative Triggers -->
    <FormSection
      title="Effets Négatifs"
      subtitle="Ces triggers peuvent pénaliser les joueurs"
      variant="negative"
    >
      <template v-for="t in negativeTriggers" :key="t.key">
        <FormRow
          :label="`${t.emoji} ${t.name}`"
          :description="t.description"
        >
          <div class="triggers-view__control">
            <div class="triggers-view__input-group">
              <input
                type="number"
                :value="getTriggerProbability(t.configKey)"
                min="0"
                max="50"
                class="triggers-view__input"
                @change="updateProbability(t.configKey, $event)"
              />
              <span class="triggers-view__suffix">%</span>
            </div>
            <RunicButton
              size="xs"
              :icon="editingTrigger === t.key ? 'close' : 'edit'"
              :variant="editingTrigger === t.key ? 'secondary' : 'ghost'"
              icon-only
              title="Modifier les messages"
              @click="startEdit(t.key)"
            />
            <RunicButton
              size="xs"
              icon="play"
              variant="ghost"
              icon-only
              :disabled="testingTrigger === t.key"
              title="Tester ce trigger"
              @click="testTrigger(t.key)"
            />
          </div>
        </FormRow>

        <!-- Message Editor -->
        <div v-if="editingTrigger === t.key" class="triggers-view__messages">
          <template v-for="msgType in t.messageTypes" :key="msgType">
            <div class="triggers-view__message-section">
              <div class="triggers-view__message-header">
                <span class="triggers-view__message-type">{{ messageTypeLabels[msgType] || msgType }}</span>
                <FormIndicator
                  v-if="getMessage(t.key, msgType)?.variables?.length"
                  variant="code"
                  size="sm"
                  inline
                >
                  {{ getMessage(t.key, msgType)?.variables?.join(' ') }}
                </FormIndicator>
              </div>

              <div class="triggers-view__message-list">
                <div
                  v-for="(msg, idx) in (editingMessages[msgType] || getMessage(t.key, msgType)?.messages || [])"
                  :key="idx"
                  class="triggers-view__message-item"
                >
                  <textarea
                    v-model="editingMessages[msgType][idx]"
                    class="triggers-view__message-input"
                    rows="2"
                    :placeholder="`Variante ${idx + 1}...`"
                  />
                  <RunicButton
                    v-if="(editingMessages[msgType]?.length || 0) > 1"
                    size="xs"
                    variant="danger"
                    @click="removeMessageVariant(msgType, idx)"
                  >
                    ×
                  </RunicButton>
                </div>
              </div>

              <RunicButton
                size="xs"
                variant="ghost"
                @click="addMessageVariant(msgType)"
              >
                + Ajouter variante
              </RunicButton>
            </div>
          </template>

          <div class="triggers-view__message-actions">
            <RunicButton size="sm" variant="ghost" @click="cancelEdit">
              Annuler
            </RunicButton>
            <RunicButton size="sm" variant="primary" :disabled="isSaving" @click="saveMessages">
              {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </RunicButton>
          </div>
        </div>
      </template>
    </FormSection>

    <!-- JSON Editor Button -->
    <div class="triggers-view__json-action">
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
      title="Triggers - Edition JSON"
      :data="jsonEditorData"
      tab-type="triggers"
      @refresh="emit('refresh')"
    />
  </div>
</template>

<style scoped>
.triggers-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.triggers-view__json-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}

.triggers-view__control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.triggers-view__input-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.triggers-view__input {
  width: 55px;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  text-align: center;
  transition: border-color 0.2s ease;
}

.triggers-view__input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.triggers-view__suffix {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.6);
}

/* Message Editor Styles */
.triggers-view__messages {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  margin: -0.5rem 0 0.5rem 0;
  background: rgba(20, 18, 15, 0.6);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.triggers-view__message-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.triggers-view__message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.triggers-view__message-type {
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(180, 170, 155, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.triggers-view__message-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.triggers-view__message-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.triggers-view__message-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  line-height: 1.4;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.triggers-view__message-input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.triggers-view__message-input::placeholder {
  color: rgba(150, 140, 125, 0.4);
}

.triggers-view__message-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}

/* Remove spinner buttons */
.triggers-view__input::-webkit-outer-spin-button,
.triggers-view__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.triggers-view__input[type="number"] {
  -moz-appearance: textfield;
}

/* Responsive */
@media (max-width: 640px) {
  .triggers-view__control {
    flex-wrap: wrap;
  }

  .triggers-view__message-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .triggers-view__message-actions {
    flex-direction: column;
  }

  .triggers-view__message-actions :deep(.runic-button) {
    width: 100%;
  }
}
</style>
