<script setup lang="ts">
import type { ErrorLog } from '~/types/errorLog'
import type { Database } from '~/types/database'

definePageMeta({
  middleware: ['admin'],
  layout: 'default',
})

const { t } = useI18n()
const { user } = useUserSession()
const supabase = useSupabaseClient<Database>()

useHead({ title: 'Logs d\'erreurs - Admin' })

// State
const logs = ref<ErrorLog[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = 50

// Filters
const selectedLevel = ref<string>('')
const selectedSource = ref<string>('')
const showResolved = ref(false)

// Fetch error logs
const fetchErrorLogs = async () => {
  loading.value = true
  error.value = null

  try {
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(pageSize)

    // Apply filters
    if (selectedLevel.value) {
      query = query.eq('level', selectedLevel.value)
    }
    if (selectedSource.value) {
      query = query.eq('source', selectedSource.value)
    }
    if (!showResolved.value) {
      query = query.eq('resolved', false)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      throw fetchError
    }

    logs.value = data || []
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement des logs'
    console.error('Failed to fetch error logs:', err)
  } finally {
    loading.value = false
  }
}

// Mark error as resolved
const markAsResolved = async (logId: string) => {
  if (!user.value?.id) return

  try {
    const { error: updateError } = await supabase
      .from('error_logs')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.value.id,
      })
      .eq('id', logId)

    if (updateError) {
      throw updateError
    }

    // Refresh logs
    await fetchErrorLogs()
  } catch (err: any) {
    console.error('Failed to mark error as resolved:', err)
    alert('Erreur lors de la mise à jour: ' + (err.message || 'Erreur inconnue'))
  }
}

// Refresh logs
const refresh = () => {
  fetchErrorLogs()
}

// Watch filters and refresh
watch([selectedLevel, selectedSource, showResolved], () => {
  fetchErrorLogs()
})

// Initial fetch
onMounted(() => {
  fetchErrorLogs()
})

// Statistics
const stats = computed(() => {
  const total = logs.value.length
  const errors = logs.value.filter(l => l.level === 'error').length
  const warnings = logs.value.filter(l => l.level === 'warn').length
  const infos = logs.value.filter(l => l.level === 'info').length
  const resolved = logs.value.filter(l => l.resolved).length
  const unresolved = total - resolved
  const client = logs.value.filter(l => l.source === 'client').length
  const server = logs.value.filter(l => l.source === 'server').length

  return {
    total,
    errors,
    warnings,
    infos,
    resolved,
    unresolved,
    client,
    server,
  }
})
</script>

<template>
  <NuxtLayout>
    <div class="admin-errors-page">
      <RunicHeader>
      <template #title>
        <span class="admin-errors-page__title-rune">✧</span>
        Logs d'erreurs
        <span class="admin-errors-page__title-rune">✧</span>
      </template>
    </RunicHeader>

    <!-- Statistics -->
    <div class="admin-errors-page__stats">
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Total</div>
        <div class="admin-errors-page__stat-value">{{ stats.total }}</div>
      </RunicBox>
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Erreurs</div>
        <div class="admin-errors-page__stat-value admin-errors-page__stat-value--error">
          {{ stats.errors }}
        </div>
      </RunicBox>
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Avertissements</div>
        <div class="admin-errors-page__stat-value admin-errors-page__stat-value--warn">
          {{ stats.warnings }}
        </div>
      </RunicBox>
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Non résolus</div>
        <div class="admin-errors-page__stat-value admin-errors-page__stat-value--unresolved">
          {{ stats.unresolved }}
        </div>
      </RunicBox>
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Client</div>
        <div class="admin-errors-page__stat-value">{{ stats.client }}</div>
      </RunicBox>
      <RunicBox padding="sm" class="admin-errors-page__stat">
        <div class="admin-errors-page__stat-label">Serveur</div>
        <div class="admin-errors-page__stat-value">{{ stats.server }}</div>
      </RunicBox>
    </div>

    <!-- Error message -->
    <div v-if="error" class="admin-errors-page__error">
      <RunicBox padding="sm" variant="error">
        {{ error }}
      </RunicBox>
    </div>

    <!-- Actions -->
    <div class="admin-errors-page__actions">
      <RunicButton
        @click="refresh"
        icon="refresh"
        variant="default"
        :disabled="loading"
      >
        Actualiser
      </RunicButton>
    </div>

    <!-- Error Logs Panel -->
    <ErrorLogsPanel
      :logs="logs"
      :loading="loading"
      @mark-resolved="markAsResolved"
      @refresh="refresh"
    />
    </div>
  </NuxtLayout>
</template>

<style scoped>
.admin-errors-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.admin-errors-page__title-rune {
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.5);
  margin: 0 0.5rem;
}

.admin-errors-page__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.admin-errors-page__stat {
  text-align: center;
}

.admin-errors-page__stat-label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(140, 130, 120, 0.7);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-errors-page__stat-value {
  font-family: 'Cinzel', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #c9a227;
}

.admin-errors-page__stat-value--error {
  color: #c45050;
}

.admin-errors-page__stat-value--warn {
  color: #c4a050;
}

.admin-errors-page__stat-value--unresolved {
  color: #c45050;
}

.admin-errors-page__error {
  margin-top: -0.5rem;
}

.admin-errors-page__actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .admin-errors-page {
    padding: 1rem;
  }

  .admin-errors-page__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
