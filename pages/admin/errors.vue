<script setup lang="ts">
import type { ErrorLog } from '~/types/errorLog'
import type { Database } from '~/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import ErrorLogsPanel from '~/components/admin/ErrorLogsPanel.vue'

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
const pageSize = 100 // Increased to show more logs
const isRealtimeConnected = ref(false)

// Filters
const selectedLevel = ref<string>('')
const selectedSource = ref<string>('')
const showResolved = ref(false)

// Realtime channel
let realtimeChannel: RealtimeChannel | null = null

// Fetch error logs
const fetchErrorLogs = async () => {
  loading.value = true
  error.value = null

  try {
    // Use API endpoint directly (bypasses RLS using service role key)
    // This ensures we can always fetch logs even if RLS policies have issues
    const apiResponse = await $fetch('/api/admin/error-logs', {
      query: {
        level: selectedLevel.value || undefined,
        source: selectedSource.value || undefined,
        showResolved: showResolved.value,
        limit: pageSize,
      },
    })
    
    logs.value = (apiResponse.logs || []) as ErrorLog[]
    console.log('[ErrorLogs] Fetched via API:', logs.value.length, 'logs')
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement des logs'
    console.error('Failed to fetch error logs:', err)
    
    // Fallback: try direct Supabase query if API fails
    if (err.statusCode === 404 || err.statusCode === 500) {
      console.log('[ErrorLogs] API failed, trying direct Supabase query...')
      try {
        let query = supabase
          .from('error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(pageSize)

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
          console.error('[ErrorLogs] Direct query also failed:', fetchError)
          if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission')) {
            error.value = 'Permission refusée. Vérifiez que la migration RLS a été appliquée.'
          }
        } else {
          logs.value = (data || []) as ErrorLog[]
          console.log('[ErrorLogs] Fetched via direct query:', logs.value.length, 'logs')
        }
      } catch (directErr: any) {
        console.error('[ErrorLogs] Direct query error:', directErr)
      }
    }
  } finally {
    loading.value = false
  }
}

// Setup realtime subscription
const setupRealtime = () => {
  if (!supabase || realtimeChannel) return

  try {
    realtimeChannel = supabase
      .channel('error-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_logs',
        },
        (payload) => {
          const newLog = payload.new as ErrorLog
          console.log('[ErrorLogs] New log received via realtime:', newLog.id)
          
          // Check if log matches current filters
          let shouldAdd = true
          
          if (selectedLevel.value && newLog.level !== selectedLevel.value) {
            shouldAdd = false
          }
          if (selectedSource.value && newLog.source !== selectedSource.value) {
            shouldAdd = false
          }
          if (!showResolved.value && newLog.resolved) {
            shouldAdd = false
          }
          
          if (shouldAdd) {
            // Add to the beginning of the list
            logs.value = [newLog, ...logs.value].slice(0, pageSize)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'error_logs',
        },
        (payload) => {
          const updatedLog = payload.new as ErrorLog
          console.log('[ErrorLogs] Log updated via realtime:', updatedLog.id)
          
          // Update the log in the list
          const index = logs.value.findIndex(log => log.id === updatedLog.id)
          if (index !== -1) {
            // Check if it should still be visible with current filters
            let shouldKeep = true
            
            if (selectedLevel.value && updatedLog.level !== selectedLevel.value) {
              shouldKeep = false
            }
            if (selectedSource.value && updatedLog.source !== selectedSource.value) {
              shouldKeep = false
            }
            if (!showResolved.value && updatedLog.resolved) {
              shouldKeep = false
            }
            
            if (shouldKeep) {
              logs.value[index] = updatedLog
            } else {
              logs.value.splice(index, 1)
            }
          } else if (updatedLog.resolved === false && !showResolved.value) {
            // If it was resolved and now isn't, and we're showing unresolved, add it
            let shouldAdd = true
            
            if (selectedLevel.value && updatedLog.level !== selectedLevel.value) {
              shouldAdd = false
            }
            if (selectedSource.value && updatedLog.source !== selectedSource.value) {
              shouldAdd = false
            }
            
            if (shouldAdd) {
              logs.value = [updatedLog, ...logs.value].slice(0, pageSize)
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          isRealtimeConnected.value = true
          console.log('[ErrorLogs] Realtime connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isRealtimeConnected.value = false
          console.error('[ErrorLogs] Realtime error:', err)
        } else {
          console.log('[ErrorLogs] Realtime status:', status)
        }
      })
  } catch (err) {
    console.error('[ErrorLogs] Failed to setup realtime:', err)
  }
}

// Cleanup realtime subscription
const cleanupRealtime = async () => {
  if (realtimeChannel && supabase) {
    await supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
    isRealtimeConnected.value = false
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

    // The realtime subscription will update the UI automatically
    // But we can also refresh to ensure consistency
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

// Initial fetch and setup
onMounted(() => {
  fetchErrorLogs()
  setupRealtime()
})

// Test error logging
const isTestingLog = ref(false)
const testErrorLog = async () => {
  if (isTestingLog.value) return
  
  isTestingLog.value = true
  try {
    const response = await $fetch('/api/admin/test-error-log', {
      method: 'POST',
      body: {
        level: 'error',
        message: 'Test de log d\'erreur depuis l\'interface admin',
      },
    })
    
    alert(`Test réussi: ${response.message}`)
    // Refresh logs after a short delay to see the new log
    setTimeout(() => {
      fetchErrorLogs()
    }, 500)
  } catch (err: any) {
    alert(`Erreur lors du test: ${err.message || 'Erreur inconnue'}`)
    console.error('Test error log failed:', err)
  } finally {
    isTestingLog.value = false
  }
}

// Cleanup on unmount
onUnmounted(() => {
  cleanupRealtime()
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
      <RunicHeader
        title="Logs d'erreurs"
        attached
      />

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
      <div class="admin-errors-page__realtime-status">
        <span
          class="admin-errors-page__realtime-indicator"
          :class="isRealtimeConnected ? 'admin-errors-page__realtime-indicator--connected' : 'admin-errors-page__realtime-indicator--disconnected'"
        />
        <span class="admin-errors-page__realtime-text">
          {{ isRealtimeConnected ? 'Temps réel actif' : 'Temps réel désactivé' }}
        </span>
      </div>
      <div class="admin-errors-page__action-buttons">
        <RunicButton
          @click="testErrorLog"
          variant="secondary"
          :disabled="loading || isTestingLog"
        >
          <span v-if="isTestingLog">Test en cours...</span>
          <span v-else>Tester les logs</span>
        </RunicButton>
        <RunicButton
          @click="refresh"
          icon="refresh"
          variant="default"
          :disabled="loading"
        >
          Actualiser
        </RunicButton>
      </div>
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
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.admin-errors-page__action-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.admin-errors-page__realtime-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-errors-page__realtime-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.admin-errors-page__realtime-indicator--connected {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.admin-errors-page__realtime-indicator--disconnected {
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.5);
  animation: none;
}

.admin-errors-page__realtime-text {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  color: rgba(140, 130, 120, 0.7);
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
