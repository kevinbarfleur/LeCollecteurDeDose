<script setup lang="ts">
/**
 * JsonEditorModal
 *
 * Modal with JSON editor for editing config/messages/presets.
 * Provides validation and save logic for each tab type.
 */

interface BotMessage {
  id: string
  category: string
  item_key: string
  message_type: string
  messages: string[]
  description?: string | null
  variables?: string[] | null
}

interface Preset {
  id: string
  category: string
  display_name: string
  emoji?: string
  description?: string
  announcement: string
  completion_message?: string
  delay_between_events_ms?: number
  actions?: any[]
  is_enabled?: boolean
  sort_order?: number
}

interface Category {
  id: string
  label: string
  emoji?: string
  sort_order?: number
}

type TabType = 'commands' | 'triggers' | 'events' | 'settings'

interface Props {
  modelValue: boolean
  title: string
  data: object
  tabType: TabType
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'refresh': []
}>()

// Local state
const jsonContent = ref('')
const validationError = ref<string | null>(null)
const isSaving = ref(false)

// Sync isOpen with modelValue
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Initialize JSON content when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    jsonContent.value = JSON.stringify(props.data, null, 2)
    validationError.value = null
    isSaving.value = false
  }
})

// Handle validation errors from editor
const handleValidationError = (error: string | null) => {
  validationError.value = error
}

// Close modal
const close = () => {
  isOpen.value = false
}

// Validate structure based on tab type
const validateStructure = (data: unknown): { ok: boolean; error?: string } => {
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Les données doivent être un objet' }
  }

  const obj = data as Record<string, unknown>

  switch (props.tabType) {
    case 'commands':
    case 'triggers':
      if (!('config' in obj) || typeof obj.config !== 'object') {
        return { ok: false, error: 'La propriété "config" est requise et doit être un objet' }
      }
      if ('messages' in obj && !Array.isArray(obj.messages)) {
        return { ok: false, error: 'La propriété "messages" doit être un tableau' }
      }
      // Validate each message has required fields
      if (Array.isArray(obj.messages)) {
        for (const msg of obj.messages as BotMessage[]) {
          if (!msg.id || !Array.isArray(msg.messages)) {
            return { ok: false, error: 'Chaque message doit avoir un "id" et un tableau "messages"' }
          }
        }
      }
      break

    case 'events':
      if (!('presets' in obj) || !Array.isArray(obj.presets)) {
        return { ok: false, error: 'La propriété "presets" doit être un tableau' }
      }
      // Validate presets have required fields
      for (const preset of obj.presets as Preset[]) {
        if (!preset.id || !preset.display_name) {
          return { ok: false, error: 'Chaque preset doit avoir un "id" et "display_name"' }
        }
      }
      if ('messages' in obj && !Array.isArray(obj.messages)) {
        return { ok: false, error: 'La propriété "messages" doit être un tableau' }
      }
      break

    case 'settings':
      if (!('config' in obj) || typeof obj.config !== 'object') {
        return { ok: false, error: 'La propriété "config" est requise et doit être un objet' }
      }
      break
  }

  return { ok: true }
}

// Save data
const handleSave = async () => {
  // 1. Parse JSON
  let parsedData: Record<string, unknown>
  try {
    parsedData = JSON.parse(jsonContent.value)
  } catch (e) {
    validationError.value = 'JSON invalide: ' + (e as Error).message
    return
  }

  // 2. Validate structure
  const validation = validateStructure(parsedData)
  if (!validation.ok) {
    validationError.value = validation.error || 'Structure invalide'
    return
  }

  // 3. Save based on tab type
  isSaving.value = true
  validationError.value = null

  try {
    switch (props.tabType) {
      case 'commands':
      case 'triggers':
      case 'settings':
        // Save config keys
        if (parsedData.config && typeof parsedData.config === 'object') {
          for (const [key, value] of Object.entries(parsedData.config)) {
            await $fetch('/api/admin/bot-config', {
              method: 'POST',
              body: { key, value: String(value) },
            })
          }
        }
        // Save messages (if present)
        if (Array.isArray(parsedData.messages)) {
          for (const msg of parsedData.messages as BotMessage[]) {
            await $fetch('/api/admin/bot-messages', {
              method: 'POST',
              body: {
                id: msg.id,
                category: msg.category,
                item_key: msg.item_key,
                message_type: msg.message_type,
                messages: msg.messages,
                description: msg.description,
                variables: msg.variables,
              },
            })
          }
        }
        break

      case 'events':
        // Save presets
        if (Array.isArray(parsedData.presets)) {
          for (const preset of parsedData.presets as Preset[]) {
            await $fetch('/api/admin/batch-event-presets', {
              method: 'POST',
              body: preset,
            })
          }
        }
        // Save messages
        if (Array.isArray(parsedData.messages)) {
          for (const msg of parsedData.messages as BotMessage[]) {
            await $fetch('/api/admin/bot-messages', {
              method: 'POST',
              body: {
                id: msg.id,
                category: msg.category,
                item_key: msg.item_key,
                message_type: msg.message_type,
                messages: msg.messages,
                description: msg.description,
                variables: msg.variables,
              },
            })
          }
        }
        break
    }

    // 4. Success - refresh and close
    emit('refresh')
    close()
  } catch (err) {
    console.error('Failed to save:', err)
    validationError.value = 'Erreur de sauvegarde: ' + (err as Error).message
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <RunicModal
    v-model="isOpen"
    :title="title"
    icon="◆"
    max-width="xl"
    :close-on-overlay="false"
    :close-on-escape="!isSaving"
  >
    <!-- Error banner -->
    <div v-if="validationError" class="json-editor-modal__error">
      {{ validationError }}
    </div>

    <!-- Editor -->
    <RunicJsonEditor
      v-model="jsonContent"
      min-height="400px"
      max-height="60vh"
      @validation-error="handleValidationError"
    />

    <template #footer>
      <div class="json-editor-modal__footer">
        <RunicButton
          variant="ghost"
          size="sm"
          :disabled="isSaving"
          @click="close"
        >
          Annuler
        </RunicButton>
        <RunicButton
          variant="primary"
          size="sm"
          :disabled="!!validationError || isSaving"
          @click="handleSave"
        >
          {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
        </RunicButton>
      </div>
    </template>
  </RunicModal>
</template>

<style scoped>
.json-editor-modal__error {
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgba(180, 60, 60, 0.15);
  border: 1px solid rgba(180, 60, 60, 0.4);
  border-radius: 4px;
  color: #e05555;
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.json-editor-modal__footer {
  display: flex;
  gap: 0.5rem;
}
</style>
