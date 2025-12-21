<script setup lang="ts">
/**
 * Settings View
 *
 * Global bot settings using the form system.
 */

interface Props {
  config: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()

// Settings with local state for editing
const settings = reactive({
  minInterval: parseInt(props.config.auto_triggers_min_interval || '300'),
  maxInterval: parseInt(props.config.auto_triggers_max_interval || '900'),
  targetCooldown: parseInt(props.config.auto_triggers_target_cooldown || '600000'),
  activityWindow: parseInt(props.config.auto_triggers_user_activity_window || '3600000'),
  minUsersForCooldown: parseInt(props.config.auto_triggers_min_users_for_cooldown || '3'),
  dailyLimitBooster: parseInt(props.config.daily_limit_booster || '10'),
  dailyLimitVaals: parseInt(props.config.daily_limit_vaals || '5'),
  atlasInfluenceFoilBoost: Math.round(parseFloat(props.config.atlas_influence_foil_boost || '0.10') * 100),
})

// Update config
const updateConfig = async (key: string, value: string | number) => {
  try {
    await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: { key, value: String(value) },
    })
    emit('refresh')
  } catch (err) {
    console.error('Failed to update config:', err)
  }
}

// Debounced update handlers
const debounceTimeout = ref<NodeJS.Timeout | null>(null)

const debouncedUpdate = (key: string, value: string | number) => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value)
  }
  debounceTimeout.value = setTimeout(() => {
    updateConfig(key, value)
  }, 500)
}

// Cleanup on unmount
onUnmounted(() => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value)
  }
})

// Format milliseconds to minutes for display
const msToMinutes = (ms: number) => Math.round(ms / 60000)
const minutesToMs = (min: number) => min * 60000

// JSON Editor state
const showJsonEditor = ref(false)

// Compute data structure for JSON editor
const jsonEditorData = computed(() => ({
  config: { ...props.config },
}))
</script>

<template>
  <div class="settings-view">
    <!-- Timing & Intervals -->
    <FormSection
      title="Timing & Intervalles"
      subtitle="Contrôle de la fréquence des triggers automatiques"
    >
      <FormRowSlider
        v-model="settings.minInterval"
        label="Intervalle minimum"
        description="Temps minimum entre deux triggers automatiques"
        :min="60"
        :max="1800"
        :step="30"
        value-suffix="s"
        @update:model-value="debouncedUpdate('auto_triggers_min_interval', $event)"
      />

      <FormRowSlider
        v-model="settings.maxInterval"
        label="Intervalle maximum"
        description="Temps maximum entre deux triggers automatiques"
        :min="120"
        :max="3600"
        :step="60"
        value-suffix="s"
        @update:model-value="debouncedUpdate('auto_triggers_max_interval', $event)"
      />
    </FormSection>

    <!-- Anti-Focus Protection -->
    <FormSection
      title="Protection Anti-Focus"
      subtitle="Empêche de cibler le même joueur trop souvent"
    >
      <FormRowSlider
        :model-value="msToMinutes(settings.targetCooldown)"
        label="Cooldown avant re-ciblage"
        description="Temps minimum avant de pouvoir re-cibler un même joueur"
        :min="1"
        :max="30"
        :step="1"
        value-suffix="min"
        @update:model-value="(v: number) => { settings.targetCooldown = minutesToMs(v); debouncedUpdate('auto_triggers_target_cooldown', minutesToMs(v)) }"
      />

      <FormRowSlider
        :model-value="msToMinutes(settings.activityWindow)"
        label="Fenêtre d'activité"
        description="Durée pendant laquelle un utilisateur est considéré comme actif"
        :min="5"
        :max="120"
        :step="5"
        value-suffix="min"
        @update:model-value="(v: number) => { settings.activityWindow = minutesToMs(v); debouncedUpdate('auto_triggers_user_activity_window', minutesToMs(v)) }"
      />

      <FormRowNumber
        v-model="settings.minUsersForCooldown"
        label="Min utilisateurs pour cooldown"
        description="Nombre minimum d'utilisateurs actifs pour appliquer le cooldown strict"
        :min="1"
        :max="20"
        @update:model-value="updateConfig('auto_triggers_min_users_for_cooldown', $event)"
      />
    </FormSection>

    <!-- Daily Limits -->
    <FormSection
      title="Limites Quotidiennes"
      subtitle="Limites par utilisateur, reset à 21h Paris"
    >
      <FormRowNumber
        v-model="settings.dailyLimitBooster"
        label="Boosters par jour"
        description="Nombre maximum de boosters ouverts par utilisateur par jour"
        :min="1"
        :max="100"
        unit="/jour"
        @update:model-value="updateConfig('daily_limit_booster', $event)"
      />

      <FormRowNumber
        v-model="settings.dailyLimitVaals"
        label="Commandes !vaals par jour"
        description="Nombre maximum d'utilisations de !vaals par utilisateur par jour"
        :min="1"
        :max="50"
        unit="/jour"
        @update:model-value="updateConfig('daily_limit_vaals', $event)"
      />
    </FormSection>

    <!-- Atlas Influence Buff -->
    <FormSection
      title="Atlas Influence Buff"
      subtitle="Buff actif jusqu'à la prochaine utilisation de l'autel"
    >
      <FormRowSlider
        v-model="settings.atlasInfluenceFoilBoost"
        label="Boost chance foil"
        description="Augmentation de la chance d'obtenir un foil lors de l'utilisation de l'autel"
        :min="1"
        :max="50"
        :step="1"
        value-suffix="%"
        @update:model-value="debouncedUpdate('atlas_influence_foil_boost', ($event / 100).toFixed(2))"
      />
    </FormSection>

    <!-- JSON Editor Button -->
    <div class="settings-view__json-action">
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
      title="Paramètres - Edition JSON"
      :data="jsonEditorData"
      tab-type="settings"
      @refresh="emit('refresh')"
    />
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-view__json-action {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid rgba(60, 55, 50, 0.2);
}
</style>
