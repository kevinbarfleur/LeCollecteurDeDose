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
      <RunicBox attached padding="md">
        <div class="admin-content">
          <!-- Compact header with status and user -->
          <div class="admin-header-compact">
            <div class="admin-status-compact">
              <span
                class="admin-status__indicator"
                :class="
                  isConnected
                    ? 'admin-status__indicator--connected'
                    : 'admin-status__indicator--disconnected'
                "
              />
              <span class="admin-status__text">
                {{ isConnected ? t("admin.connected") : t("admin.disconnected") }}
              </span>
            </div>
            <div class="admin-user-info-compact">
              <img
                v-if="user?.avatar"
                :src="user.avatar"
                :alt="user.displayName"
                class="admin-user-info__avatar"
              />
              <div class="admin-user-info__details">
                <span class="admin-user-info__name">{{ user?.displayName }}</span>
                <span class="admin-user-info__id">ID: {{ user?.id }}</span>
              </div>
            </div>
          </div>

          <RunicDivider />

          <!-- Altar Control -->
          <ClientOnly>
            <RunicBox padding="lg">
              <div class="admin-section-enhanced__header">
                <div class="admin-section-enhanced__icon">
                  <img
                    src="/images/vaal-risitas.png"
                    alt="Vaal Orb"
                    class="admin-section-enhanced__icon-image"
                  />
                </div>
                <div class="admin-section-enhanced__content">
                  <h3 class="admin-section-enhanced__title">
                    {{ t("admin.altar.title") }}
                  </h3>
                  <p class="admin-section-enhanced__description">
                    {{ t("admin.altar.description") }}
                  </p>
                </div>
              </div>
              <div class="admin-section-enhanced__footer">
                <span
                  class="admin-section-enhanced__status"
                  :class="
                    altarOpen
                      ? 'admin-section-enhanced__status--open'
                      : 'admin-section-enhanced__status--closed'
                  "
                >
                  {{
                    altarOpen ? t("admin.altar.open") : t("admin.altar.closed")
                  }}
                </span>
                <div
                  class="admin-section-enhanced__control"
                  :class="{
                    'admin-section-enhanced__control--disabled':
                      isLoading || isTogglingAltar,
                  }"
                >
                  <RunicRadio
                    v-model="altarOpenModel"
                    :toggle="true"
                    size="md"
                    toggle-color="default"
                  />
                </div>
              </div>
            </RunicBox>
            <template #fallback>
              <RunicBox padding="lg">
                <div class="admin-section-enhanced__header">
                  <div class="admin-section-enhanced__icon">
                    <img
                      src="/images/vaal-risitas.png"
                      alt="Vaal Orb"
                      class="admin-section-enhanced__icon-image"
                    />
                  </div>
                  <div class="admin-section-enhanced__content">
                    <h3 class="admin-section-enhanced__title">
                      {{ t("admin.altar.title") }}
                    </h3>
                    <p class="admin-section-enhanced__description">
                      {{ t("admin.altar.description") }}
                    </p>
                  </div>
                </div>
                <div class="admin-section-enhanced__footer">
                  <span class="admin-section-enhanced__status admin-section-enhanced__status--closed">
                    {{ t("admin.altar.closed") }}
                  </span>
                  <div class="admin-section-enhanced__control admin-section-enhanced__control--disabled">
                    <RunicRadio
                      :model-value="false"
                      :toggle="true"
                      size="md"
                      toggle-color="default"
                      disabled
                    />
                  </div>
                </div>
              </RunicBox>
            </template>
          </ClientOnly>

          <RunicDivider />

          <!-- Activity Logs Control -->
          <ClientOnly>
            <RunicBox padding="lg">
              <div class="admin-section-enhanced__header">
                <div class="admin-section-enhanced__icon admin-section-enhanced__icon--activity-logs">
                  <!-- Users icon (same as ActivityLogsPanel) -->
                  <svg
                    class="admin-section-enhanced__icon-image"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <div class="admin-section-enhanced__content">
                  <h3 class="admin-section-enhanced__title">
                    {{ t("admin.activityLogs.title") }}
                  </h3>
                  <p class="admin-section-enhanced__description">
                    {{ t("admin.activityLogs.description") }}
                  </p>
                </div>
              </div>
              <div class="admin-section-enhanced__footer">
                <span
                  class="admin-section-enhanced__status"
                  :class="
                    activityLogsEnabled
                      ? 'admin-section-enhanced__status--open'
                      : 'admin-section-enhanced__status--closed'
                  "
                >
                  {{
                    activityLogsEnabled ? t("admin.activityLogs.enabled") : t("admin.activityLogs.disabled")
                  }}
                </span>
                <div
                  class="admin-section-enhanced__control"
                  :class="{
                    'admin-section-enhanced__control--disabled':
                      isLoading || isTogglingActivityLogs,
                  }"
                >
                  <RunicRadio
                    v-model="activityLogsEnabledModel"
                    :toggle="true"
                    size="md"
                    toggle-color="default"
                  />
                </div>
              </div>
            </RunicBox>
            <template #fallback>
              <RunicBox padding="lg">
                <div class="admin-section-enhanced__header">
                  <div class="admin-section-enhanced__icon admin-section-enhanced__icon--activity-logs">
                    <!-- Users icon (same as ActivityLogsPanel) -->
                    <svg
                      class="admin-section-enhanced__icon-image"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </div>
                  <div class="admin-section-enhanced__content">
                    <h3 class="admin-section-enhanced__title">
                      {{ t("admin.activityLogs.title") }}
                    </h3>
                    <p class="admin-section-enhanced__description">
                      {{ t("admin.activityLogs.description") }}
                    </p>
                  </div>
                </div>
                <div class="admin-section-enhanced__footer">
                  <span class="admin-section-enhanced__status admin-section-enhanced__status--open">
                    {{ t("admin.activityLogs.enabled") }}
                  </span>
                  <div class="admin-section-enhanced__control admin-section-enhanced__control--disabled">
                    <RunicRadio
                      :model-value="true"
                      :toggle="true"
                      size="md"
                      toggle-color="default"
                      disabled
                    />
                  </div>
                </div>
              </RunicBox>
            </template>
          </ClientOnly>

          <RunicDivider />

          <!-- Admin Debug Panel -->
          <ClientOnly>
            <section class="admin-section admin-section--compact">
              <h2 class="admin-section__title admin-section__title--compact">
                <span class="admin-section__rune">◆</span>
                {{ t("altar.preferences.adminTitle") }}
                <span class="admin-section__rune">◆</span>
              </h2>

              <div class="admin-debug-panel admin-debug-panel--compact">
                <!-- Data Source Configuration -->
                <div class="admin-debug-field admin-debug-field--compact">
                  <label class="admin-debug-field__label admin-debug-field__label--compact">
                    {{ t("admin.dataSource.title") }}
                  </label>
                  <RunicRadio
                    v-model="dataSourceModel"
                    :options="dataSourceOptions"
                    size="sm"
                    class="admin-debug-field__select"
                  />
                </div>

                <!-- Create Backup Button (always visible) -->
                <div class="admin-debug-field admin-debug-field--compact">
                  <RunicButton
                    size="sm"
                    variant="secondary"
                    :disabled="isCreatingBackup"
                    @click="createBackup"
                    class="admin-debug-field__sync-btn"
                  >
                    <span v-if="isCreatingBackup" class="flex items-center gap-2">
                      <span class="loader ease-linear rounded-full border-2 border-t-2 border-current h-3 w-3"></span>
                      {{ t("admin.dataSource.backingUp") }}
                    </span>
                    <span v-else>
                      {{ t("admin.dataSource.backupButton") }}
                    </span>
                  </RunicButton>
                </div>

                <!-- Sync Test Data Button (only visible in test mode) -->
                <div v-if="isTestData" class="admin-debug-field admin-debug-field--compact">
                  <RunicButton
                    size="sm"
                    variant="secondary"
                    :disabled="isSyncingTestData"
                    @click="syncTestData"
                    class="admin-debug-field__sync-btn"
                  >
                    <span v-if="isSyncingTestData" class="flex items-center gap-2">
                      <span class="loader ease-linear rounded-full border-2 border-t-2 border-current h-3 w-3"></span>
                      {{ t("admin.dataSource.syncing") }}
                    </span>
                    <span v-else>
                      {{ t("admin.dataSource.syncButton") }}
                    </span>
                  </RunicButton>
                </div>

                <!-- Force Outcome -->
                <div class="admin-debug-field admin-debug-field--compact">
                  <label class="admin-debug-field__label admin-debug-field__label--compact">
                    {{ t("altar.preferences.forceOutcome") }}
                  </label>
                  <RunicSelect
                    v-model="forcedOutcome"
                    :options="forcedOutcomeOptions"
                    size="sm"
                    class="admin-debug-field__select"
                  />
                </div>

                <!-- Vaal Orbs Debug (test mode only) -->
                <div v-if="isTestData" class="admin-debug-field admin-debug-field--compact">
                  <label class="admin-debug-field__label admin-debug-field__label--compact">
                    {{ t("altar.preferences.vaalOrbsLabel") }}
                  </label>
                  <div class="admin-debug-field__number admin-debug-field__number--compact">
                    <button
                      class="admin-debug-field__btn admin-debug-field__btn--compact"
                      :disabled="debugVaalOrbs <= 0 || isUpdatingVaalOrbs"
                      @click="updateDebugVaalOrbs(-1)"
                    >
                      −
                    </button>
                    <span class="admin-debug-field__value admin-debug-field__value--compact">{{ debugVaalOrbs }}</span>
                    <button
                      class="admin-debug-field__btn admin-debug-field__btn--compact"
                      :disabled="debugVaalOrbs >= 99 || isUpdatingVaalOrbs"
                      @click="updateDebugVaalOrbs(1)"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div v-else class="admin-debug-field admin-debug-field--compact">
                  <p class="admin-section__hint admin-section__hint--compact">
                    {{ t("admin.altarDebug.apiModeHint") }}
                  </p>
                </div>
              </div>
            </section>
            <template #fallback>
              <section class="admin-section admin-section--compact">
                <h2 class="admin-section__title admin-section__title--compact">
                  <span class="admin-section__rune">◆</span>
                  {{ t("altar.preferences.adminTitle") }}
                  <span class="admin-section__rune">◆</span>
                </h2>
              </section>
            </template>
          </ClientOnly>
        </div>
      </RunicBox>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.admin-page {
  max-width: 800px;
}

/* ==========================================
   COMPACT HEADER
   ========================================== */
.admin-header-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 6px;
}

.admin-status-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-user-info-compact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* ==========================================
   STATUS INDICATOR
   ========================================== */
.admin-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-status__indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.admin-status__indicator--connected {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.admin-status__indicator--disconnected {
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.5);
  animation: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.admin-status__text {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
  color: rgba(140, 130, 120, 0.7);
}

/* ==========================================
   USER INFO
   ========================================== */
.admin-user-info__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(175, 96, 37, 0.5);
}

.admin-user-info__details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-user-info__name {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(200, 190, 180, 0.9);
}

.admin-user-info__id {
  font-family: "Crimson Text", serif;
  font-size: 0.75rem;
  color: rgba(120, 115, 110, 0.7);
  font-style: italic;
}

/* ==========================================
   SECTIONS
   ========================================== */
.admin-content {
  display: flex;
  flex-direction: column;
}

.admin-section {
  padding: 1.5rem 0;
}

.admin-section--compact {
  padding: 1rem 0;
}

.admin-section__title--compact {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.admin-section__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c9a227;
  text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
}

.admin-section__rune {
  font-size: 0.5rem;
  color: rgba(175, 96, 37, 0.6);
}

.admin-section__desc {
  margin: 0 0 1.5rem;
  font-family: "Crimson Text", serif;
  font-size: 1.0625rem;
  color: rgba(140, 130, 120, 0.8);
  text-align: center;
  line-height: 1.5;
}

.admin-section__hint {
  margin: 1rem 0 0;
  font-family: "Crimson Text", serif;
  font-size: 0.9375rem;
  color: rgba(120, 115, 110, 0.6);
  text-align: center;
  font-style: italic;
}

.admin-section__hint--compact {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
}

.admin-section__hint--coming-soon {
  color: rgba(201, 162, 39, 0.7);
  font-weight: 500;
}

/* ==========================================
   GRID LAYOUT FOR QUICK CONTROLS
   ========================================== */
.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* ==========================================
   COMPACT SECTION (for grid items)
   ========================================== */
.admin-section-compact {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(12, 12, 14, 0.9) 40%,
    rgba(8, 8, 10, 0.95) 100%
  );
  border-radius: 6px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.06),
    0 1px 0 rgba(45, 40, 35, 0.25);
  border: 1px solid rgba(35, 32, 28, 0.7);
  border-top-color: rgba(25, 22, 18, 0.8);
  border-bottom-color: rgba(55, 50, 45, 0.3);
}

.admin-section-compact--full {
  width: 100%;
}

.admin-section-compact__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 1;
}

.admin-section-compact__title {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(180, 170, 160, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.admin-section-compact__status {
  font-family: "Cinzel", serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.admin-section-compact__status--open {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
}

.admin-section-compact__status--closed {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  text-shadow: 0 0 10px rgba(248, 113, 113, 0.3);
}

.admin-section-compact__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.admin-section-compact__control--disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

/* ==========================================
   ENHANCED SECTION (for Altar and Activity Logs)
   Now using RunicBox, so we only style the inner content
   ========================================== */
.admin-section-enhanced {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-section-enhanced__header {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.admin-section-enhanced__icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(248, 113, 113, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 100%
  );
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  padding: 0.75rem;
  position: relative;
}

.admin-section-enhanced__icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.4));
  color: rgba(248, 113, 113, 0.8);
}

/* SVG icons in activity logs - using accent color from design system */
.admin-section-enhanced__icon--activity-logs svg {
  width: 100%;
  height: 100%;
  color: var(--color-accent);
  filter: drop-shadow(0 0 8px var(--color-accent-glow));
}

.admin-section-enhanced__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-section-enhanced__title {
  font-family: "Cinzel", serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(220, 210, 200, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.admin-section-enhanced__description {
  font-family: "Crimson Text", serif;
  font-size: 0.9375rem;
  color: rgba(160, 150, 140, 0.85);
  line-height: 1.5;
  margin: 0;
}

.admin-section-enhanced__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(35, 32, 28, 0.5);
}

.admin-section-enhanced__status {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.admin-section-enhanced__status--open {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.admin-section-enhanced__status--closed {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
  text-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.admin-section-enhanced__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

.admin-section-enhanced__control--disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

/* ==========================================
   DATA CONFIGURATION
   ========================================== */
.admin-data-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(12, 12, 14, 0.9) 40%,
    rgba(8, 8, 10, 0.95) 100%
  );
  border-radius: 6px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.06),
    0 1px 0 rgba(45, 40, 35, 0.25);
  border: 1px solid rgba(35, 32, 28, 0.7);
  border-top-color: rgba(25, 22, 18, 0.8);
  border-bottom-color: rgba(55, 50, 45, 0.3);
}

.admin-data-config--disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.admin-data-config__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-data-config__label {
  font-family: "Cinzel", serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(180, 170, 160, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-data-config__radio {
  width: 100%;
}

.admin-data-config__radio :deep(.runic-radio) {
  display: flex;
  width: 100%;
}

.admin-data-config__radio :deep(.runic-radio__groove) {
  width: 100%;
  flex: 1;
}

.admin-data-config__sync-btn {
  margin-top: 0.5rem;
  width: 100%;
}

/* ==========================================
   DEBUG PANEL
   ========================================== */
.admin-debug-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 10, 0.95) 0%,
    rgba(12, 12, 14, 0.9) 40%,
    rgba(8, 8, 10, 0.95) 100%
  );
  border-radius: 6px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7),
    inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 -1px 1px rgba(60, 55, 50, 0.06),
    0 1px 0 rgba(45, 40, 35, 0.25);
  border: 1px solid rgba(35, 32, 28, 0.7);
  border-top-color: rgba(25, 22, 18, 0.8);
  border-bottom-color: rgba(55, 50, 45, 0.3);
}

.admin-debug-panel--compact {
  gap: 1rem;
  padding: 1rem;
}

.admin-debug-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-debug-field--compact {
  gap: 0.375rem;
}

.admin-debug-field__label {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(180, 170, 160, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-debug-field__label--compact {
  font-size: 0.8125rem;
}

.admin-debug-field__select {
  width: 100%;
  position: relative;
  z-index: 1;
}

/* Ensure dropdown appears above RunicBox and other admin content */
.admin-debug-field__select :deep(.runic-select__dropdown) {
  z-index: 10002 !important; /* Above admin page content */
  position: fixed !important; /* Use fixed positioning to escape RunicBox overflow */
}

/* Ensure RunicBox doesn't clip the dropdown */
.admin-debug-panel :deep(.runic-box) {
  overflow: visible;
}

.admin-debug-panel :deep(.runic-box__content) {
  overflow: visible;
}

.admin-debug-field__select :deep(.runic-radio) {
  display: flex;
  width: 100%;
}

.admin-debug-field__select :deep(.runic-radio__groove) {
  width: 100%;
  flex: 1;
}

.admin-debug-field__number {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.4);
  border-radius: 4px;
}

.admin-debug-field__number--compact {
  padding: 0.5rem;
  gap: 0.75rem;
}

.admin-debug-field__btn {
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
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-debug-field__btn--compact {
  width: 28px;
  height: 28px;
  font-size: 1rem;
}

.admin-debug-field__btn:hover:not(:disabled) {
  background: rgba(175, 96, 37, 0.2);
  border-color: rgba(175, 96, 37, 0.5);
  color: #c9a227;
}

.admin-debug-field__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.admin-debug-field__value {
  font-family: "Cinzel", serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(200, 190, 180, 0.95);
  min-width: 3ch;
  text-align: center;
}

.admin-debug-field__value--compact {
  font-size: 1.25rem;
}

.admin-debug-field__sync-btn {
  margin-top: 0.5rem;
  width: 100%;
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .admin-page {
    padding: 0 0.5rem 1.5rem;
  }

  .admin-header-compact {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .admin-grid {
    grid-template-columns: 1fr;
  }

  .admin-section-compact {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .admin-section-compact__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .admin-section-compact__control {
    width: 100%;
    justify-content: center;
  }

  .admin-section__title {
    font-size: 1rem;
  }

  .admin-section__title--compact {
    font-size: 0.9375rem;
  }

  .admin-data-config {
    padding: 0.75rem;
  }
}
</style>
