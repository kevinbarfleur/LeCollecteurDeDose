<script setup lang="ts">
/**
 * Command Card
 *
 * Configuration card for a single bot command with toggle and message editing.
 */

interface CommandMessage {
  id: string
  messages: string[]
  description?: string
  variables?: string[]
}

interface Props {
  command: string
  displayName: string
  description: string
  enabled: boolean
  hasLimit?: boolean
  limit?: number
  messages: CommandMessage[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:limit': [value: number]
  'update:messages': [id: string, messages: string[]]
}>()

// Local state
const isExpanded = ref(false)
const isSaving = ref(false)
const editingMessageId = ref<string | null>(null)
const editedMessages = ref<string[]>([])

// Start editing a message
const startEditingMessage = (msg: CommandMessage) => {
  editingMessageId.value = msg.id
  editedMessages.value = [...msg.messages]
}

// Cancel editing
const cancelEditing = () => {
  editingMessageId.value = null
  editedMessages.value = []
}

// Save edited messages
const saveMessages = async () => {
  if (!editingMessageId.value) return

  isSaving.value = true

  try {
    await $fetch('/api/admin/bot-messages', {
      method: 'POST',
      body: {
        id: editingMessageId.value,
        messages: editedMessages.value.filter((m) => m.trim() !== ''),
      },
    })

    emit('update:messages', editingMessageId.value, editedMessages.value)
    cancelEditing()
  } catch (err) {
    console.error('Failed to save messages:', err)
  } finally {
    isSaving.value = false
  }
}

// Add a new message variant
const addMessageVariant = () => {
  editedMessages.value.push('')
}

// Remove a message variant
const removeMessageVariant = (index: number) => {
  editedMessages.value.splice(index, 1)
}

// Update enabled state
const toggleEnabled = async (value: string | boolean) => {
  const boolValue = typeof value === 'boolean' ? value : value === 'on'
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: {
        key: `command_${props.command}_enabled`,
        value: String(boolValue),
      },
    })
    emit('update:enabled', boolValue)
  } catch (err) {
    console.error('Failed to update command state:', err)
  }
}

// Update limit
const updateLimit = async (value: number) => {
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: {
        key: `daily_limit_${props.command}`,
        value: String(value),
      },
    })
    emit('update:limit', value)
  } catch (err) {
    console.error('Failed to update limit:', err)
  }
}
</script>

<template>
  <div class="command-card" :class="{ 'command-card--disabled': !enabled }">
    <!-- Header -->
    <div class="command-card__header">
      <div class="command-card__info">
        <span class="command-card__name">!{{ command }}</span>
        <span class="command-card__display-name">{{ displayName }}</span>
      </div>

      <RunicRadio
        :model-value="enabled"
        toggle
        size="sm"
        @update:model-value="toggleEnabled"
      />
    </div>

    <!-- Description -->
    <p class="command-card__description">{{ description }}</p>

    <!-- Limit (if applicable) -->
    <div v-if="hasLimit" class="command-card__limit">
      <label class="command-card__limit-label">Limite quotidienne:</label>
      <input
        type="number"
        :value="limit"
        min="1"
        max="100"
        class="command-card__limit-input"
        @change="updateLimit(parseInt(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- Expand/collapse messages -->
    <RunicButton
      size="xs"
      variant="ghost"
      class="command-card__expand"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? '▼' : '▶' }} Messages ({{ messages.length }})
    </RunicButton>

    <!-- Messages section (expandable) -->
    <Transition name="expand">
      <div v-if="isExpanded" class="command-card__messages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="command-card__message"
        >
          <div class="command-card__message-header">
            <span class="command-card__message-type">
              {{ msg.id.split('_').pop() }}
            </span>
            <RunicButton
              v-if="editingMessageId !== msg.id"
              size="xs"
              variant="ghost"
              @click="startEditingMessage(msg)"
            >
              Modifier
            </RunicButton>
          </div>

          <!-- View mode -->
          <div v-if="editingMessageId !== msg.id" class="command-card__message-preview">
            <code v-for="(m, i) in msg.messages" :key="i">{{ m }}</code>
          </div>

          <!-- Edit mode -->
          <div v-else class="command-card__message-edit">
            <div v-if="msg.variables?.length" class="command-card__variables">
              <span>Variables:</span>
              <code v-for="v in msg.variables" :key="v">{{ v }}</code>
            </div>

            <div
              v-for="(m, i) in editedMessages"
              :key="i"
              class="command-card__message-input"
            >
              <textarea
                v-model="editedMessages[i]"
                rows="2"
                placeholder="Message variant..."
              ></textarea>
              <RunicButton
                v-if="editedMessages.length > 1"
                size="xs"
                variant="danger"
                @click="removeMessageVariant(i)"
              >
                Suppr.
              </RunicButton>
            </div>

            <div class="command-card__message-actions">
              <RunicButton size="xs" variant="secondary" @click="addMessageVariant">
                + Ajouter variant
              </RunicButton>
              <div class="command-card__message-buttons">
                <RunicButton size="xs" variant="ghost" @click="cancelEditing">
                  Annuler
                </RunicButton>
                <RunicButton size="xs" :disabled="isSaving" @click="saveMessages">
                  {{ isSaving ? '...' : 'Sauvegarder' }}
                </RunicButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.command-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(
    180deg,
    rgba(18, 17, 15, 0.95) 0%,
    rgba(14, 13, 11, 0.98) 100%
  );
  border-radius: 6px;
  border: 1px solid rgba(60, 55, 45, 0.3);
  transition: border-color 0.2s ease, opacity 0.2s ease;
}

.command-card:hover {
  border-color: rgba(80, 72, 58, 0.4);
}

.command-card--disabled {
  opacity: 0.6;
}

.command-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.command-card__info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.command-card__name {
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: #c9a227;
}

.command-card__display-name {
  font-size: 0.875rem;
  color: rgba(180, 170, 155, 0.6);
}

.command-card__description {
  font-size: 0.8125rem;
  color: rgba(150, 140, 125, 0.7);
  line-height: 1.4;
  margin: 0;
}

.command-card__limit {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.command-card__limit-label {
  font-size: 0.8125rem;
  color: rgba(180, 170, 155, 0.7);
}

.command-card__limit-input {
  width: 70px;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  text-align: center;
}

.command-card__limit-input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.command-card__expand {
  align-self: flex-start;
}

.command-card__messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 45, 0.2);
}

.command-card__message {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.command-card__message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.command-card__message-type {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(180, 170, 155, 0.6);
}

.command-card__message-preview {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.command-card__message-preview code {
  display: block;
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: rgba(180, 170, 155, 0.8);
  white-space: pre-wrap;
  word-break: break-word;
}

.command-card__message-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.command-card__variables {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgba(150, 140, 125, 0.6);
}

.command-card__variables code {
  padding: 0.125rem 0.375rem;
  background: rgba(100, 80, 60, 0.2);
  border-radius: 3px;
  color: #c97a3a;
}

.command-card__message-input {
  display: flex;
  gap: 0.5rem;
}

.command-card__message-input textarea {
  flex: 1;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(60, 55, 45, 0.3);
  border-radius: 4px;
  color: rgba(220, 210, 195, 0.9);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  resize: vertical;
}

.command-card__message-input textarea:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
}

.command-card__message-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.command-card__message-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
