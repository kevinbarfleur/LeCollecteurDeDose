<script setup lang="ts">
definePageMeta({
  middleware: ["admin"],
});

const { t } = useI18n();
const { user } = useUserSession();
const { altarOpen, isLoading, isConnected, toggleAltar, activityLogsEnabled, toggleActivityLogs } = useAppSettings();
const { dataSource, setDataSource, isApiData, isTestData } = useDataSource();
const { forcedOutcome } = useAltarDebug();
const { getForcedOutcomeOptions } = await import('~/types/vaalOutcome');
const { fetchUserCollections, fetchUniques, fetchUserCards } = useApi();

useHead({ title: t("admin.meta.title") });

// Local state for optimistic updates
const isTogglingAltar = ref(false);
const isTogglingActivityLogs = ref(false);

// Handle altar toggle
const handleAltarToggle = async () => {
  if (isTogglingAltar.value) return;
  isTogglingAltar.value = true;

  try {
    await toggleAltar(user.value?.id);
  } finally {
    isTogglingAltar.value = false;
  }
};

// Handle activity logs toggle
const handleActivityLogsToggle = async () => {
  if (isTogglingActivityLogs.value) return;
  isTogglingActivityLogs.value = true;

  try {
    await toggleActivityLogs(user.value?.id);
  } finally {
    isTogglingActivityLogs.value = false;
  }
};

// Data source options for RunicRadio
const dataSourceOptions = computed(() => [
  { value: "api", label: t("admin.dataSource.api"), color: "default" },
  { value: "test", label: t("admin.dataSource.test"), color: "default" },
]);


// Create manual backup
const isCreatingBackup = ref(false);
const createBackup = async () => {
  if (isCreatingBackup.value) return;
  
  // Check if user is authenticated
  if (!user.value?.id) {
    alert('Vous devez être connecté pour créer un backup.');
    return;
  }
  
  // Confirm action
  const confirmed = await confirm({
    title: t("admin.dataSource.backupConfirmTitle"),
    message: t("admin.dataSource.backupConfirmMessage"),
    confirmText: t("admin.dataSource.backupButton"),
    cancelText: t("common.cancel"),
    variant: "default",
  });
  
  if (!confirmed) {
    return;
  }
  
  isCreatingBackup.value = true;
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabase?.url || '';
    const supabaseKey = config.public.supabase?.key || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante');
    }
    
    // Call the daily-backup Edge Function
    const response = await $fetch(`${supabaseUrl}/functions/v1/daily-backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: {},
    });

    alert(t("admin.dataSource.backupSuccess"));
  } catch (error: any) {

    const errorMessage = error.data?.message || error.message || 'Erreur inconnue';
    alert(`${t("admin.dataSource.backupError")}\n\n${errorMessage}`);
  } finally {
    isCreatingBackup.value = false;
  }
};

// Sync test data from real API
const isSyncingTestData = ref(false);
const syncTestData = async () => {
  if (isSyncingTestData.value) return;
  
  // Check if user is authenticated
  if (!user.value?.id) {
    alert('Vous devez être connecté pour synchroniser les données de test.');
    return;
  }
  
  // Confirm action
  const confirmed = await confirm({
    title: t("admin.dataSource.syncConfirmTitle"),
    message: t("admin.dataSource.syncConfirmMessage"),
    confirmText: t("admin.dataSource.confirmButton"),
    cancelText: t("common.cancel"),
    variant: "warning",
  });
  
  if (!confirmed) {
    return;
  }
  
  isSyncingTestData.value = true;
  try {

    // Fetch data through Nuxt proxy (bypassing useApi to avoid mode issues)
    // The proxy handles authentication and routing to the real API

    // Fetch all data through the Nuxt proxy (server-side proxy handles auth)

    const userCollectionsResponse = await $fetch('/api/data/userCollection', {
      headers: {
        'Content-Type': 'application/json',
      }
    }).catch((error) => {

      return null;
    });
    const userCollections = userCollectionsResponse as Record<string, any> || null;

    const uniquesResponse = await $fetch('/api/data/uniques', {
      headers: {
        'Content-Type': 'application/json',
      }
    }).catch((error) => {

      return null;
    });
    const uniques = uniquesResponse as any[] || null;
    
    // Get all users from collections
    const users = userCollections ? Object.keys(userCollections) : [];

    // Fetch userCards for each user through Nuxt proxy

    const userCardsPromises = users.map(async (user) => {
      try {
        const cards = await $fetch(`/api/data/usercards/${user}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        }).catch((error) => {

          return [];
        });
        return { user, cards: cards || [] };
      } catch (error) {

        return { user, cards: [] };
      }
    });
    
    const userCardsResults = await Promise.all(userCardsPromises);
    const userCardsMap: Record<string, any[]> = {};
    userCardsResults.forEach((result) => {
      if (result && result.user && Array.isArray(result.cards)) {
        userCardsMap[result.user.toLowerCase()] = result.cards;
      }
    });
    
    // Save to Supabase using the normal client (RLS policies allow public access)
    const supabase = useSupabaseClient();
    
    // Use upsert with proper conflict handling
    const { data, error } = await supabase
      .from('dev_test_data')
      .upsert({
        test_set_name: 'default',
        user_collection: userCollections || {},
        user_cards: userCardsMap,
        uniques: uniques || [],
      }, {
        onConflict: 'test_set_name',
      })
      .select();
    
    if (error) {


      alert(`${t("admin.dataSource.syncError")}\n\n${error.message}`);
    } else {

      const stats = {
        usersCount: users.length,
        uniquesCount: uniques?.length || 0,
        userCardsCount: Object.keys(userCardsMap).length
      };
      alert(`${t("admin.dataSource.syncSuccess")}\n\n${t("admin.dataSource.syncStats", stats)}`);
    }
  } catch (error: any) {

    alert(`${t("admin.dataSource.syncError")}\n\n${error.message || error}`);
  } finally {
    isSyncingTestData.value = false;
  }
};

// Confirmation modal composable
const { confirm } = useConfirmModal();

// Computed for data source v-model - now with confirmation
const dataSourceModel = computed({
  get: () => dataSource.value,
  set: async (value: "api" | "test") => {
    // Ask for confirmation for any change
    if (value !== dataSource.value) {
      const confirmed = await confirm({
        title: t("admin.dataSource.confirmTitle"),
        message: t("admin.dataSource.confirmMessage", {
          from: dataSource.value === "api" ? t("admin.dataSource.api") : t("admin.dataSource.test"),
          to: value === "api" ? t("admin.dataSource.api") : t("admin.dataSource.test"),
        }),
        confirmText: t("admin.dataSource.confirmButton"),
        cancelText: t("common.cancel"),
        variant: value === "api" ? "warning" : "default", // Warning when switching to API (production)
      });
      
      if (!confirmed) {
        // User cancelled, don't change the value
        return;
      }
    }
    
    // User confirmed, proceed with change
    await setDataSource(value);
  },
});

// Computed for altar toggle v-model
const altarOpenModel = computed({
  get: () => altarOpen.value,
  set: async (value: boolean) => {
    // Only trigger if value actually changed and not already processing
    if (
      value !== altarOpen.value &&
      !isTogglingAltar.value &&
      !isLoading.value
    ) {
      await handleAltarToggle();
    }
  },
});

// Computed for activity logs toggle v-model
const activityLogsEnabledModel = computed({
  get: () => activityLogsEnabled.value,
  set: async (value: boolean) => {
    // Only trigger if value actually changed and not already processing
    if (
      value !== activityLogsEnabled.value &&
      !isTogglingActivityLogs.value &&
      !isLoading.value
    ) {
      await handleActivityLogsToggle();
    }
  },
});

// Altar Debug settings
const forcedOutcomeOptions = computed(() => getForcedOutcomeOptions(t));

// Vaal Orbs debug control (only in mock mode)
const debugVaalOrbs = ref(14);
const isUpdatingVaalOrbs = ref(false);

// Load debug vaalOrbs from localStorage
if (import.meta.client) {
  const stored = localStorage.getItem('altar_debugVaalOrbs');
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      debugVaalOrbs.value = parsed;
    }
  }
}

// Watch and save debug vaalOrbs to localStorage
watch(debugVaalOrbs, (value) => {
  if (import.meta.client) {
    localStorage.setItem('altar_debugVaalOrbs', String(value));
  }
});

// Function to update vaalOrbs in Altar (via localStorage event or direct access)
const updateDebugVaalOrbs = (delta: number) => {
  const newValue = Math.max(0, Math.min(99, debugVaalOrbs.value + delta));
  debugVaalOrbs.value = newValue;
  
  // Dispatch event to Altar if it's open
  if (import.meta.client) {
    window.dispatchEvent(new CustomEvent('altar:updateVaalOrbs', { detail: { value: newValue } }));
  }
};
</script>

<template>
  <NuxtLayout>
    <div class="page-container admin-page">
      <!-- Header -->
      <RunicHeader
        :title="t('admin.title')"
        :subtitle="t('admin.subtitle')"
        attached
      />

      <!-- Main content -->
      <RunicBox attached padding="lg">
        <div class="admin-content">
          <!-- Status Bar -->
          <div class="admin-status-bar">
            <div class="admin-status-bar__item">
              <span
                class="admin-status-bar__indicator"
                :class="
                  isConnected
                    ? 'admin-status-bar__indicator--connected'
                    : 'admin-status-bar__indicator--disconnected'
                "
              />
              <span class="admin-status-bar__text">
                {{ isConnected ? t("admin.connected") : t("admin.disconnected") }}
              </span>
            </div>
            <div class="admin-status-bar__divider"></div>
            <div class="admin-status-bar__item admin-status-bar__user">
              <img
                v-if="user?.avatar"
                :src="user.avatar"
                :alt="user.displayName"
                class="admin-status-bar__avatar"
              />
              <div class="admin-status-bar__user-info">
                <span class="admin-status-bar__name">{{ user?.displayName }}</span>
                <span class="admin-status-bar__id">{{ user?.id?.slice(0, 8) }}...</span>
              </div>
            </div>
          </div>

          <!-- Dashboard Grid -->
          <div class="admin-dashboard-grid">
            <!-- Card 1: Contrôles Principaux -->
            <ClientOnly>
              <div class="admin-card">
                <div class="admin-card__header admin-card__header--default">
                  <h2 class="admin-card__header-title">CONTRÔLES PRINCIPAUX</h2>
                </div>
                <div class="admin-card__content">
                  <!-- Altar Control -->
                  <div class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Contrôle de l'Autel</label>
                      <p class="admin-card__row-description">
                        {{ t("admin.altar.description") }}
                      </p>
                    </div>
                    <div class="admin-card__row-control">
                      <span class="admin-card__row-status" :class="altarOpen ? 'admin-card__row-status--open' : 'admin-card__row-status--closed'">
                        {{ altarOpen ? t("admin.altar.open") : t("admin.altar.closed") }}
                      </span>
                      <RunicRadio
                        v-model="altarOpenModel"
                        :toggle="true"
                        size="md"
                        toggle-color="default"
                        :disabled="isLoading || isTogglingAltar"
                      />
                    </div>
                  </div>

                  <!-- Activity Logs Control -->
                  <div class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Panneau de Logs d'Activité</label>
                      <p class="admin-card__row-description">
                        {{ t("admin.activityLogs.description") }}
                      </p>
                    </div>
                    <div class="admin-card__row-control">
                      <span class="admin-card__row-status" :class="activityLogsEnabled ? 'admin-card__row-status--open' : 'admin-card__row-status--closed'">
                        {{ activityLogsEnabled ? t("admin.activityLogs.enabled") : t("admin.activityLogs.disabled") }}
                      </span>
                      <RunicRadio
                        v-model="activityLogsEnabledModel"
                        :toggle="true"
                        size="md"
                        toggle-color="default"
                        :disabled="isLoading || isTogglingActivityLogs"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <template #fallback>
                <div class="admin-card">
                  <div class="admin-card__header admin-card__header--default">
                    <h2 class="admin-card__header-title">CONTRÔLES PRINCIPAUX</h2>
                  </div>
                </div>
              </template>
            </ClientOnly>

            <!-- Card 2: Outils de Test -->
            <ClientOnly>
              <div class="admin-card">
                <div class="admin-card__header admin-card__header--default">
                  <h2 class="admin-card__header-title">OUTILS DE TEST</h2>
                </div>
                <div class="admin-card__content">
                  <!-- Data Source -->
                  <div class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Source des Données</label>
                    </div>
                    <div class="admin-card__row-control">
                      <RunicRadio
                        v-model="dataSourceModel"
                        :options="dataSourceOptions"
                        size="md"
                      />
                    </div>
                  </div>

                  <!-- Force Outcome -->
                  <div class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Forcer l'Issue de Corruption</label>
                    </div>
                    <div class="admin-card__row-control">
                      <RunicSelect
                        v-model="forcedOutcome"
                        :options="forcedOutcomeOptions"
                        size="md"
                      />
                    </div>
                  </div>

                  <!-- Vaal Orbs -->
                  <div v-if="isTestData" class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Vaal Orbs</label>
                      <p class="admin-card__row-description">
                        Nombre de Vaal Orbs disponibles pour les tests
                      </p>
                    </div>
                    <div class="admin-card__row-control">
                      <div class="admin-card__number-control">
                        <button
                          class="admin-card__number-btn"
                          :disabled="debugVaalOrbs <= 0 || isUpdatingVaalOrbs"
                          @click="updateDebugVaalOrbs(-1)"
                        >
                          −
                        </button>
                        <span class="admin-card__number-value">{{ debugVaalOrbs }}</span>
                        <button
                          class="admin-card__number-btn"
                          :disabled="debugVaalOrbs >= 99 || isUpdatingVaalOrbs"
                          @click="updateDebugVaalOrbs(1)"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="admin-card__row">
                    <p class="admin-card__hint">
                      {{ t("admin.altarDebug.apiModeHint") }}
                    </p>
                  </div>
                </div>
              </div>
              <template #fallback>
                <div class="admin-card">
                  <div class="admin-card__header admin-card__header--default">
                    <h2 class="admin-card__header-title">OUTILS DE TEST</h2>
                  </div>
                </div>
              </template>
            </ClientOnly>

            <!-- Card 3: Gestion des Données -->
            <ClientOnly>
              <div class="admin-card">
                <div class="admin-card__header admin-card__header--default">
                  <h2 class="admin-card__header-title">GESTION DES DONNÉES</h2>
                </div>
                <div class="admin-card__content admin-card__content--actions">
                  <RunicButton
                    size="md"
                    variant="primary"
                    :disabled="isCreatingBackup"
                    @click="createBackup"
                    class="admin-card__action-btn"
                  >
                    <span v-if="isCreatingBackup" class="admin-card__action-loading">
                      <span class="admin-card__action-spinner"></span>
                      {{ t("admin.dataSource.backingUp") }}
                    </span>
                    <span v-else>
                      {{ t("admin.dataSource.backupButton") }}
                    </span>
                  </RunicButton>

                  <RunicButton
                    v-if="isTestData"
                    size="md"
                    variant="primary"
                    :disabled="isSyncingTestData"
                    @click="syncTestData"
                    class="admin-card__action-btn"
                  >
                    <span v-if="isSyncingTestData" class="admin-card__action-loading">
                      <span class="admin-card__action-spinner"></span>
                      {{ t("admin.dataSource.syncing") }}
                    </span>
                    <span v-else>
                      {{ t("admin.dataSource.syncButton") }}
                    </span>
                  </RunicButton>
                </div>
              </div>
              <template #fallback>
                <div class="admin-card">
                  <div class="admin-card__header admin-card__header--default">
                    <h2 class="admin-card__header-title">GESTION DES DONNÉES</h2>
                  </div>
                </div>
              </template>
            </ClientOnly>

            <!-- Card 4: Logs et Diagnostic -->
            <ClientOnly>
              <div class="admin-card">
                <div class="admin-card__header admin-card__header--accent">
                  <h2 class="admin-card__header-title">LOGS ET DIAGNOSTIC</h2>
                </div>
                <div class="admin-card__content">
                  <div class="admin-card__row">
                    <div class="admin-card__row-content">
                      <label class="admin-card__row-label">Logs d'Erreurs</label>
                      <p class="admin-card__row-description">
                        Visualiser et gérer les erreurs de l'application pour le débogage
                      </p>
                    </div>
                  </div>
                  <RunicButton
                    to="/admin/errors"
                    icon="external"
                    variant="primary"
                    size="md"
                    class="admin-card__action-btn admin-card__action-btn--full"
                  >
                    VOIR LES LOGS
                  </RunicButton>
                </div>
              </div>
              <template #fallback>
                <div class="admin-card">
                  <div class="admin-card__header admin-card__header--accent">
                    <h2 class="admin-card__header-title">LOGS ET DIAGNOSTIC</h2>
                  </div>
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </RunicBox>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.admin-page {
  max-width: 1200px;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ==========================================
   STATUS BAR
   ========================================== */
.admin-status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 6px;
}

.admin-status-bar__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.admin-status-bar__divider {
  width: 1px;
  height: 24px;
  background: rgba(60, 55, 50, 0.3);
}

.admin-status-bar__indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.admin-status-bar__indicator--connected {
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
}

.admin-status-bar__indicator--disconnected {
  background: #f87171;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.5);
  animation: none;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.admin-status-bar__text {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  color: rgba(160, 150, 140, 0.85);
  font-weight: 500;
}

.admin-status-bar__user {
  margin-left: auto;
  gap: 0.75rem;
}

.admin-status-bar__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(175, 96, 37, 0.5);
}

.admin-status-bar__user-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.admin-status-bar__name {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(200, 190, 180, 0.95);
}

.admin-status-bar__id {
  font-family: "Crimson Text", serif;
  font-size: 0.75rem;
  color: rgba(140, 130, 120, 0.7);
  font-style: italic;
}

/* ==========================================
   DASHBOARD GRID
   ========================================== */
.admin-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

/* ==========================================
   ADMIN CARDS
   ========================================== */
.admin-card {
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 22, 0.95);
  border: 1px solid rgba(50, 45, 40, 0.4);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.admin-card__header {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(50, 45, 40, 0.3);
}

.admin-card__header--default {
  background: rgba(40, 38, 35, 0.6);
}

.admin-card__header--accent {
  background: rgba(196, 80, 80, 0.2);
  border-bottom-color: rgba(196, 80, 80, 0.3);
}

.admin-card__header-title {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.admin-card__header--default .admin-card__header-title {
  color: rgba(200, 190, 180, 0.9);
}

.admin-card__header--accent .admin-card__header-title {
  color: rgba(255, 255, 255, 0.95);
}

.admin-card__content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-card__content--actions {
  gap: 0.875rem;
}

/* ==========================================
   CARD ROWS
   ========================================== */
.admin-card__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(50, 45, 40, 0.2);
}

.admin-card__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.admin-card__row-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.admin-card__row-label {
  font-family: "Cinzel", serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: rgba(220, 210, 200, 0.95);
  margin: 0;
  line-height: 1.3;
}

.admin-card__row-description {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(140, 130, 120, 0.7);
  line-height: 1.4;
  margin: 0;
}

.admin-card__row-control {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-shrink: 0;
}

.admin-card__row-status {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.375rem 0.625rem;
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.admin-card__row-status--open {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.admin-card__row-status--closed {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.admin-card__hint {
  font-family: "Crimson Text", serif;
  font-size: 0.8125rem;
  color: rgba(120, 115, 110, 0.6);
  text-align: center;
  font-style: italic;
  margin: 0;
  padding: 0.5rem 0;
}

/* ==========================================
   NUMBER CONTROL
   ========================================== */
.admin-card__number-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 6px;
}

.admin-card__number-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(175, 96, 37, 0.1);
  border: 1px solid rgba(175, 96, 37, 0.3);
  border-radius: 4px;
  color: rgba(200, 190, 180, 0.9);
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-card__number-btn:hover:not(:disabled) {
  background: rgba(175, 96, 37, 0.2);
  border-color: rgba(175, 96, 37, 0.5);
  color: #c9a227;
}

.admin-card__number-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.admin-card__number-value {
  font-family: "Cinzel", serif;
  font-size: 1.375rem;
  font-weight: 700;
  color: rgba(200, 190, 180, 0.95);
  min-width: 2.5ch;
  text-align: center;
}

/* ==========================================
   ACTION BUTTONS
   ========================================== */
.admin-card__action-btn {
  width: 100%;
}

.admin-card__action-btn--full {
  margin-top: 0.5rem;
}

.admin-card__action-loading {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.admin-card__action-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 1024px) {
  .admin-dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-page {
    padding: 0 0.5rem 1.5rem;
  }

  .admin-content {
    gap: 1.25rem;
  }

  .admin-status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .admin-status-bar__divider {
    display: none;
  }

  .admin-status-bar__user {
    margin-left: 0;
    width: 100%;
  }

  .admin-card__row {
    flex-direction: column;
    gap: 0.875rem;
    align-items: stretch;
  }

  .admin-card__row-control {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
