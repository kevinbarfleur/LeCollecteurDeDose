<script setup lang="ts">
/**
 * Commands View
 *
 * Configuration view for bot commands using the form system.
 * Simple toggles and limits for each command.
 */

interface Props {
  config: Record<string, string>
  messages: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()

// Command definitions
const commands = ref([
  {
    command: 'booster',
    displayName: 'Booster',
    description: 'Ouvre un ou plusieurs boosters. Supporte !booster [count] et !booster all.',
    hasLimit: true,
    limitKey: 'daily_limit_booster',
  },
  {
    command: 'vaals',
    displayName: 'Vaals',
    description: 'Récupère des Vaal Orbs (5 par utilisation). Supporte !vaals [count] et !vaals all.',
    hasLimit: true,
    limitKey: 'daily_limit_vaals',
  },
])

// Reactive state for commands - initialize with defaults
const commandStates = reactive<Record<string, { enabled: boolean; limit: number }>>(
  Object.fromEntries(
    commands.value.map((cmd) => [
      cmd.command,
      { enabled: true, limit: 10 },
    ])
  )
)

// Sync states from props when config changes
watch(
  () => props.config,
  (config) => {
    if (!config) return
    commands.value.forEach((cmd) => {
      // Update each property individually to maintain reactivity
      const state = commandStates[cmd.command]
      state.enabled = config[`command_${cmd.command}_enabled`] !== 'false'
      state.limit = cmd.hasLimit && cmd.limitKey ? parseInt(config[cmd.limitKey] || '10') : 0
    })
  },
  { immediate: true }
)

// Update command enabled state
const updateEnabled = async (command: string, enabled: boolean) => {
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: {
        key: `command_${command}_enabled`,
        value: String(enabled),
      },
    })
    commandStates[command].enabled = enabled
    emit('refresh')
  } catch (err) {
    console.error('Failed to update command state:', err)
  }
}

// Update command limit
const updateLimit = async (command: string, limitKey: string, limit: number) => {
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: {
        key: limitKey,
        value: String(limit),
      },
    })
    commandStates[command].limit = limit
    emit('refresh')
  } catch (err) {
    console.error('Failed to update limit:', err)
  }
}

// JSON Editor state
const showJsonEditor = ref(false)

// Compute data structure for JSON editor
const jsonEditorData = computed(() => ({
  config: Object.fromEntries(
    Object.entries(props.config).filter(([k]) =>
      k.startsWith('command_') || k.startsWith('daily_limit_')
    )
  ),
  messages: props.messages.filter((m) => m.category === 'command'),
}))
</script>

<template>
  <div class="commands-view">
    <FormSection
      title="Commandes du Bot"
      subtitle="Activez ou désactivez les commandes disponibles dans le chat"
    >
      <template v-for="cmd in commands" :key="cmd.command">
        <!-- Command toggle -->
        <FormRowToggle
          :label="`!${cmd.command}`"
          :description="cmd.description"
          :model-value="commandStates[cmd.command]?.enabled ?? true"
          @update:model-value="updateEnabled(cmd.command, $event)"
        />

        <!-- Limit (if applicable and command is enabled) -->
        <FormRowNumber
          v-if="cmd.hasLimit && cmd.limitKey && commandStates[cmd.command]?.enabled"
          :label="`Limite quotidienne pour !${cmd.command}`"
          description="Nombre maximum d'utilisations par utilisateur par jour"
          :model-value="commandStates[cmd.command]?.limit ?? 10"
          :min="1"
          :max="100"
          unit="/jour"
          @update:model-value="updateLimit(cmd.command, cmd.limitKey!, $event)"
        />
      </template>
    </FormSection>

    <!-- JSON Editor Button -->
    <div class="commands-view__json-action">
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
      title="Commandes - Edition JSON"
      :data="jsonEditorData"
      tab-type="commands"
      @refresh="emit('refresh')"
    />
  </div>
</template>

<style scoped>
.commands-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.commands-view__json-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}
</style>
