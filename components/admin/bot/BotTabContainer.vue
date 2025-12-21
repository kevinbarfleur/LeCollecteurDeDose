<script setup lang="ts">
/**
 * Bot Tab Container
 *
 * Main container for the bot configuration with vertical tab navigation.
 * Uses the FormContainer system for consistent layout.
 */

// Tab configuration
const tabs = [
  { key: 'commands', label: 'Commandes', icon: '⚡' },
  { key: 'triggers', label: 'Triggers', icon: '🎲' },
  { key: 'events', label: 'Events', icon: '🎉' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' },
]

// Current active tab
const activeTab = ref('commands')

// Data fetching states
const isLoading = ref(true)
const error = ref<string | null>(null)

// Bot configuration data
const botConfig = ref<Record<string, string>>({})
const botMessages = ref<any[]>([])
const batchEventPresets = ref<any[]>([])
const batchEventCategories = ref<any[]>([])

// Fetch all bot data on mount
const fetchBotData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Fetch all data in parallel
    const [configRes, messagesRes, presetsRes] = await Promise.all([
      $fetch('/api/admin/bot-config'),
      $fetch('/api/admin/bot-messages'),
      $fetch('/api/admin/batch-event-presets'),
    ])

    if (configRes.ok) {
      botConfig.value = configRes.config || {}
    }

    if (messagesRes.ok) {
      botMessages.value = messagesRes.messages || []
    }

    if (presetsRes.ok) {
      batchEventPresets.value = presetsRes.presets || []
      batchEventCategories.value = presetsRes.categories || []
    }
  } catch (err: any) {
    console.error('Failed to fetch bot data:', err)
    error.value = err.message || 'Erreur lors du chargement des données'
  } finally {
    isLoading.value = false
  }
}

// Refresh data
const refreshData = async () => {
  await fetchBotData()
}

// Provide data to child components
provide('botConfig', botConfig)
provide('botMessages', botMessages)
provide('batchEventPresets', batchEventPresets)
provide('batchEventCategories', batchEventCategories)
provide('refreshBotData', refreshData)

// Fetch data on mount
onMounted(() => {
  fetchBotData()
})
</script>

<template>
  <div class="bot-tab-container">
    <!-- Loading state -->
    <div v-if="isLoading" class="bot-tab-container__loading">
      <div class="loading-spinner"></div>
      <span>Chargement de la configuration...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bot-tab-container__error">
      <span class="error-icon">!</span>
      <span>{{ error }}</span>
      <RunicButton size="sm" @click="refreshData">
        Réessayer
      </RunicButton>
    </div>

    <!-- Form container with tabs -->
    <FormContainer
      v-else
      v-model="activeTab"
      :tabs="tabs"
    >
      <!-- Commands -->
      <CommandsView
        v-if="activeTab === 'commands'"
        :config="botConfig"
        :messages="botMessages"
        @refresh="refreshData"
      />

      <!-- Triggers -->
      <TriggersView
        v-if="activeTab === 'triggers'"
        :config="botConfig"
        :messages="botMessages"
        @refresh="refreshData"
      />

      <!-- Events -->
      <EventsView
        v-if="activeTab === 'events'"
        :presets="batchEventPresets"
        :categories="batchEventCategories"
        @refresh="refreshData"
      />

      <!-- Settings -->
      <SettingsView
        v-if="activeTab === 'settings'"
        :config="botConfig"
        @refresh="refreshData"
      />
    </FormContainer>
  </div>
</template>

<style scoped>
.bot-tab-container {
  display: flex;
  flex-direction: column;
}

.bot-tab-container__loading,
.bot-tab-container__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  color: rgba(180, 170, 155, 0.7);
  font-family: 'Cinzel', serif;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(175, 96, 37, 0.2);
  border-top-color: #af6025;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(180, 60, 60, 0.2);
  border: 1px solid rgba(180, 60, 60, 0.4);
  border-radius: 50%;
  color: #e05555;
  font-weight: bold;
  font-size: 1.25rem;
}
</style>
