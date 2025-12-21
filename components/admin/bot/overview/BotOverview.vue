<script setup lang="ts">
/**
 * Bot Overview
 *
 * Dashboard view showing quick status cards and actions for all bot features.
 */

interface Props {
  config: Record<string, string>
  presets: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  navigate: [tab: string]
}>()

// Computed status values
const triggersEnabled = computed(() => props.config.auto_triggers_enabled === 'true')

const commandsCount = computed(() => {
  const commands = ['ping', 'ladder', 'vaalorb', 'booster', 'vaals']
  const enabled = commands.filter((cmd) => props.config[`command_${cmd}_enabled`] !== 'false')
  return `${enabled.length}/${commands.length} actives`
})

const triggersStatus = computed(() => {
  if (!triggersEnabled.value) return 'OFF'

  // Calculate total probability of enabled triggers
  const triggers = [
    'blessing_rngesus',
    'cartographers_gift',
    'mirror_tier',
    'einhar_approved',
    'heist_tax',
    'sirus_voice',
    'alch_misclick',
    'trade_scam',
    'chris_vision',
    'atlas_influence',
  ]

  let total = 0
  for (const t of triggers) {
    if (props.config[`trigger_${t}_enabled`] !== 'false') {
      total += parseFloat(props.config[`trigger_${t}`] || '0')
    }
  }

  return `ON - ${Math.round(total * 100)}%`
})

const timingInfo = computed(() => {
  const min = parseInt(props.config.auto_triggers_min_interval || '300')
  const max = parseInt(props.config.auto_triggers_max_interval || '900')
  return `${Math.round(min / 60)}-${Math.round(max / 60)} min`
})

const limitsInfo = computed(() => {
  const booster = props.config.daily_limit_booster || '10'
  const vaals = props.config.daily_limit_vaals || '5'
  return `B:${booster} V:${vaals}/jour`
})

const presetsCount = computed(() => {
  const enabled = props.presets.filter((p) => p.is_enabled !== false).length
  return `${enabled} presets`
})

// Quick actions
const isResettingLimits = ref(false)
const isReloadingConfig = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const resetDailyLimits = async () => {
  isResettingLimits.value = true
  message.value = null

  try {
    const response = await $fetch('/api/admin/reset-daily-limits', {
      method: 'POST',
    })

    if (response.ok) {
      message.value = { type: 'success', text: 'Limites quotidiennes réinitialisées' }
    }
  } catch (err: any) {
    message.value = { type: 'error', text: err.message || 'Erreur' }
  } finally {
    isResettingLimits.value = false
  }
}

const reloadBotConfig = async () => {
  isReloadingConfig.value = true
  message.value = null

  try {
    const response = await $fetch('/api/admin/reload-bot-config', {
      method: 'POST',
    })

    if (response.ok) {
      message.value = { type: 'success', text: 'Configuration rechargée par le bot' }
    }
  } catch (err: any) {
    message.value = { type: 'error', text: err.message || 'Erreur' }
  } finally {
    isReloadingConfig.value = false
  }
}
</script>

<template>
  <div class="bot-overview">
    <!-- Status Cards Grid -->
    <div class="bot-overview__grid">
      <StatusCard
        title="Commandes"
        icon="/"
        :value="commandsCount"
        description="Commandes chat actives"
        status="neutral"
        action-label="Configurer"
        @action="emit('navigate', 'commands')"
      />

      <StatusCard
        title="Triggers"
        icon="🎲"
        :value="triggersStatus"
        description="Triggers automatiques"
        :status="triggersEnabled ? 'enabled' : 'disabled'"
        action-label="Configurer"
        @action="emit('navigate', 'triggers')"
      />

      <StatusCard
        title="Batch Events"
        icon="📜"
        :value="presetsCount"
        description="Presets d'événements"
        status="neutral"
        action-label="Lancer"
        @action="emit('navigate', 'events')"
      />

      <StatusCard
        title="Timing"
        icon="⏱️"
        :value="timingInfo"
        description="Intervalle entre triggers"
        status="neutral"
        action-label="Modifier"
        @action="emit('navigate', 'settings')"
      />

      <StatusCard
        title="Limites"
        icon="📊"
        :value="limitsInfo"
        description="Limites quotidiennes"
        status="neutral"
        action-label="Modifier"
        @action="emit('navigate', 'settings')"
      />
    </div>

    <!-- Quick Actions -->
    <RunicBox padding="md">
      <RunicHeader title="Actions Rapides" />

      <div class="bot-overview__actions">
        <RunicButton
          :disabled="isResettingLimits"
          @click="resetDailyLimits"
        >
          <template v-if="isResettingLimits">
            Réinitialisation...
          </template>
          <template v-else>
            Reset Limites Quotidiennes
          </template>
        </RunicButton>

        <RunicButton
          :disabled="isReloadingConfig"
          @click="reloadBotConfig"
        >
          <template v-if="isReloadingConfig">
            Rechargement...
          </template>
          <template v-else>
            Recharger Config Bot
          </template>
        </RunicButton>
      </div>

      <!-- Message feedback -->
      <Transition name="fade">
        <div
          v-if="message"
          class="bot-overview__message"
          :class="message.type === 'success' ? 'message--success' : 'message--error'"
        >
          {{ message.text }}
        </div>
      </Transition>
    </RunicBox>
  </div>
</template>

<style scoped>
.bot-overview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bot-overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.bot-overview__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.bot-overview__message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-family: 'Cinzel', serif;
  text-align: center;
}

.message--success {
  background: rgba(80, 180, 100, 0.15);
  border: 1px solid rgba(80, 180, 100, 0.3);
  color: #55cc70;
}

.message--error {
  background: rgba(180, 80, 80, 0.15);
  border: 1px solid rgba(180, 80, 80, 0.3);
  color: #cc5555;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .bot-overview__grid {
    grid-template-columns: 1fr;
  }

  .bot-overview__actions {
    flex-direction: column;
  }

  .bot-overview__actions :deep(.runic-button) {
    width: 100%;
  }
}
</style>
