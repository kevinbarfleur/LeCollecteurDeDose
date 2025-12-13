<script setup lang="ts">
definePageMeta({
  middleware: ["admin"],
});

const { t } = useI18n();
const { user } = useUserSession();
const { altarOpen, isLoading, isConnected, toggleAltar, activityLogsEnabled, toggleActivityLogs } = useAppSettings();
const { dataSource, setDataSource, isApiData } = useDataSource();
const { forcedOutcome } = useAltarDebug();
const { getForcedOutcomeOptions } = await import('~/types/vaalOutcome');
const { devTestMode, isLocalhost, isTestMode, setDevTestMode } = useDevTestMode();
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
  { value: "mock", label: t("admin.dataSource.mock"), color: "default" },
  { value: "api", label: t("admin.dataSource.api"), color: "default" },
]);

// Dev/Test mode options for RunicRadio
const devTestModeOptions = computed(() => [
  { value: "real", label: t("admin.devTestMode.real"), color: "default" },
  { value: "test", label: t("admin.devTestMode.test"), color: "default" },
]);

// Computed for dev/test mode v-model
const devTestModeModel = computed({
  get: () => devTestMode.value,
  set: (value: "real" | "test") => {
    setDevTestMode(value);
  },
});

// Sync test data from real API
const isSyncingTestData = ref(false);
const syncTestData = async () => {
  if (isSyncingTestData.value || !isLocalhost.value) return;
  
  // Check if user is authenticated
  if (!user.value?.id) {
    alert('Vous devez être connecté pour synchroniser les données de test.');
    return;
  }
  
  // Confirm action
  if (!confirm(t("admin.devTestMode.syncConfirm"))) {
    return;
  }
  
  isSyncingTestData.value = true;
  try {
    console.log('[Admin] Starting sync from real API to Supabase...', {
      userId: user.value.id,
      isAuthenticated: !!user.value
    });
    
    // Fetch data through Nuxt proxy (bypassing useApi to avoid mode issues)
    // The proxy handles authentication and routing to the real API
    console.log('[Admin] Fetching from real API via Nuxt proxy...');
    
    // Fetch all data through the Nuxt proxy (server-side proxy handles auth)
    console.log('[Admin] Fetching userCollections...');
    const userCollectionsResponse = await $fetch('/api/data/userCollection', {
      headers: {
        'Content-Type': 'application/json',
      }
    }).catch((error) => {
      console.error('[Admin] Error fetching userCollections:', error);
      return null;
    });
    const userCollections = userCollectionsResponse as Record<string, any> || null;
    
    console.log('[Admin] Fetching uniques...');
    const uniquesResponse = await $fetch('/api/data/uniques', {
      headers: {
        'Content-Type': 'application/json',
      }
    }).catch((error) => {
      console.error('[Admin] Error fetching uniques:', error);
      return null;
    });
    const uniques = uniquesResponse as any[] || null;
    
    console.log('[Admin] Fetched data:', {
      userCollections: userCollections ? Object.keys(userCollections).length : 0,
      uniques: uniques ? uniques.length : 0
    });
    
    // Get all users from collections
    const users = userCollections ? Object.keys(userCollections) : [];
    console.log(`[Admin] Found ${users.length} users:`, users);
    
    // Fetch userCards for each user through Nuxt proxy
    console.log('[Admin] Fetching userCards for all users...');
    const userCardsPromises = users.map(async (user) => {
      try {
        const cards = await $fetch(`/api/data/usercards/${user}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        }).catch((error) => {
          console.warn(`[Admin] Failed to fetch cards for ${user}:`, error);
          return [];
        });
        return { user, cards: cards || [] };
      } catch (error) {
        console.warn(`[Admin] Failed to fetch cards for ${user}:`, error);
        return { user, cards: [] };
      }
    });
    
    const userCardsResults = await Promise.all(userCardsPromises);
    const userCardsMap: Record<string, any[]> = {};
    userCardsResults.forEach(({ user, cards }) => {
      userCardsMap[user.toLowerCase()] = cards;
    });
    
    console.log('[Admin] Saving to Supabase...', {
      usersCount: users.length,
      uniquesCount: uniques?.length || 0,
      userCardsCount: Object.keys(userCardsMap).length
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
      console.error('[Admin] Failed to sync test data:', error);
      console.error('[Admin] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      alert(`${t("admin.devTestMode.syncError")}\n\n${error.message}`);
    } else {
      console.log('[Admin] ✅ Sync successful!', data);
      const stats = {
        usersCount: users.length,
        uniquesCount: uniques?.length || 0,
        userCardsCount: Object.keys(userCardsMap).length
      };
      alert(`${t("admin.devTestMode.syncSuccess")}\n\n${t("admin.devTestMode.syncStats", stats)}`);
    }
    
    // Note: We don't need to restore test mode since we're fetching directly from real API
  } catch (error: any) {
    console.error('[Admin] Error syncing test data:', error);
    alert(`${t("admin.devTestMode.syncError")}\n\n${error.message || error}`);
  } finally {
    isSyncingTestData.value = false;
  }
};

// Computed for data source v-model - now enabled
const dataSourceModel = computed({
  get: () => dataSource.value,
  set: async (value: "mock" | "api") => {
    await setDataSource(value, user.value?.id);
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
          <!-- Connection status -->
          <div class="admin-status">
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

          <!-- User info -->
          <div class="admin-user-info">
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

          <RunicDivider />

          <!-- Altar Control Panel -->
          <ClientOnly>
            <section class="admin-section">
              <h2 class="admin-section__title">
                <span class="admin-section__rune">◆</span>
                {{ t("admin.altar.title") }}
                <span class="admin-section__rune">◆</span>
              </h2>
              <p class="admin-section__desc">
                {{ t("admin.altar.description") }}
              </p>

              <div class="admin-toggle-panel">
                <div class="admin-toggle-panel__info">
                  <span class="admin-toggle-panel__label">{{
                    t("admin.altar.status")
                  }}</span>
                  <span
                    class="admin-toggle-panel__status"
                    :class="
                      altarOpen
                        ? 'admin-toggle-panel__status--open'
                        : 'admin-toggle-panel__status--closed'
                    "
                  >
                    {{
                      altarOpen ? t("admin.altar.open") : t("admin.altar.closed")
                    }}
                  </span>
                </div>

                <div
                  class="admin-toggle-panel__control"
                  :class="{
                    'admin-toggle-panel__control--disabled':
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

              <p class="admin-section__hint">
                {{ t("admin.altar.hint") }}
              </p>
            </section>
            <template #fallback>
              <section class="admin-section">
                <h2 class="admin-section__title">
                  <span class="admin-section__rune">◆</span>
                  {{ t("admin.altar.title") }}
                  <span class="admin-section__rune">◆</span>
                </h2>
                <p class="admin-section__desc">
                  {{ t("admin.altar.description") }}
                </p>
                <div class="admin-toggle-panel">
                  <div class="admin-toggle-panel__info">
                    <span class="admin-toggle-panel__label">{{
                      t("admin.altar.status")
                    }}</span>
                    <span class="admin-toggle-panel__status admin-toggle-panel__status--closed">
                      {{ t("admin.altar.closed") }}
                    </span>
                  </div>
                  <div class="admin-toggle-panel__control admin-toggle-panel__control--disabled">
                    <RunicRadio
                      :model-value="false"
                      :toggle="true"
                      size="md"
                      toggle-color="default"
                      disabled
                    />
                  </div>
                </div>
              </section>
            </template>
          </ClientOnly>

          <RunicDivider />

          <!-- Activity Logs Panel -->
          <ClientOnly>
            <section class="admin-section">
              <h2 class="admin-section__title">
                <span class="admin-section__rune">◆</span>
                {{ t("admin.activityLogs.title") }}
                <span class="admin-section__rune">◆</span>
              </h2>
              <p class="admin-section__desc">
                {{ t("admin.activityLogs.description") }}
              </p>

              <div class="admin-toggle-panel">
                <div class="admin-toggle-panel__info">
                  <span class="admin-toggle-panel__label">{{
                    t("admin.activityLogs.status")
                  }}</span>
                  <span
                    class="admin-toggle-panel__status"
                    :class="
                      activityLogsEnabled
                        ? 'admin-toggle-panel__status--open'
                        : 'admin-toggle-panel__status--closed'
                    "
                  >
                    {{
                      activityLogsEnabled ? t("admin.activityLogs.enabled") : t("admin.activityLogs.disabled")
                    }}
                  </span>
                </div>

                <div
                  class="admin-toggle-panel__control"
                  :class="{
                    'admin-toggle-panel__control--disabled':
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

              <p class="admin-section__hint">
                {{ t("admin.activityLogs.hint") }}
              </p>
            </section>
            <template #fallback>
              <section class="admin-section">
                <h2 class="admin-section__title">
                  <span class="admin-section__rune">◆</span>
                  {{ t("admin.activityLogs.title") }}
                  <span class="admin-section__rune">◆</span>
                </h2>
                <p class="admin-section__desc">
                  {{ t("admin.activityLogs.description") }}
                </p>
                <div class="admin-toggle-panel">
                  <div class="admin-toggle-panel__info">
                    <span class="admin-toggle-panel__label">{{
                      t("admin.activityLogs.status")
                    }}</span>
                    <span class="admin-toggle-panel__status admin-toggle-panel__status--open">
                      {{ t("admin.activityLogs.enabled") }}
                    </span>
                  </div>
                  <div class="admin-toggle-panel__control admin-toggle-panel__control--disabled">
                    <RunicRadio
                      :model-value="true"
                      :toggle="true"
                      size="md"
                      toggle-color="default"
                      disabled
                    />
                  </div>
                </div>
              </section>
            </template>
          </ClientOnly>

          <RunicDivider />

          <!-- Data Source Panel -->
          <ClientOnly>
            <section class="admin-section">
              <h2 class="admin-section__title">
                <span class="admin-section__rune">◆</span>
                {{ t("admin.dataSource.title") }}
                <span class="admin-section__rune">◆</span>
              </h2>
              <p class="admin-section__desc">
                {{ t("admin.dataSource.description") }}
              </p>

              <div class="admin-data-source">
                <RunicRadio
                  v-model="dataSourceModel"
                  :options="dataSourceOptions"
                  size="md"
                  class="admin-data-source__radio"
                />
              </div>

              <p class="admin-section__hint">
                {{ t("admin.dataSource.warning") }}
              </p>
            </section>
            <template #fallback>
              <section class="admin-section">
                <h2 class="admin-section__title">
                  <span class="admin-section__rune">◆</span>
                  {{ t("admin.dataSource.title") }}
                  <span class="admin-section__rune">◆</span>
                </h2>
                <p class="admin-section__desc">
                  {{ t("admin.dataSource.description") }}
                </p>
                <div class="admin-data-source admin-data-source--disabled">
                  <RunicRadio
                    :model-value="'mock'"
                    :options="dataSourceOptions"
                    size="md"
                    class="admin-data-source__radio"
                    disabled
                  />
                </div>
              </section>
            </template>
          </ClientOnly>

          <!-- Dev/Test Mode Panel (localhost only) -->
          <ClientOnly v-if="isLocalhost">
            <RunicDivider />
            <section class="admin-section">
              <h2 class="admin-section__title">
                <span class="admin-section__rune">◆</span>
                {{ t("admin.devTestMode.title") }}
                <span class="admin-section__rune">◆</span>
              </h2>
              <p class="admin-section__desc">
                {{ t("admin.devTestMode.description") }}
              </p>

              <div class="admin-data-source">
                <RunicRadio
                  v-model="devTestModeModel"
                  :options="devTestModeOptions"
                  size="md"
                  class="admin-data-source__radio"
                />
              </div>

              <div class="admin-section__actions mt-4">
                <button
                  class="runic-button runic-button--primary runic-button--md"
                  :disabled="isSyncingTestData || !isLocalhost"
                  @click="syncTestData"
                >
                  <span v-if="isSyncingTestData" class="flex items-center gap-2">
                    <span class="loader ease-linear rounded-full border-2 border-t-2 border-current h-4 w-4"></span>
                    {{ t("admin.devTestMode.syncing") }}
                  </span>
                  <span v-else>
                    {{ t("admin.devTestMode.syncButton") }}
                  </span>
                </button>
                <p v-if="!isLocalhost" class="admin-section__hint mt-2 text-amber-400">
                  {{ t("admin.devTestMode.localhostOnly") }}
                </p>
              </div>

              <p class="admin-section__hint">
                {{ t("admin.devTestMode.hint") }}
              </p>
            </section>
          </ClientOnly>

          <RunicDivider />

          <!-- Altar Debug Panel -->
          <ClientOnly>
            <section class="admin-section">
              <h2 class="admin-section__title">
                <span class="admin-section__rune">◆</span>
                {{ t("altar.preferences.adminTitle") }}
                <span class="admin-section__rune">◆</span>
              </h2>
              <p class="admin-section__desc">
                {{ t("altar.preferences.forceOutcomeHint") }}
              </p>

              <div class="admin-debug-panel">
                <div class="admin-debug-field">
                  <label class="admin-debug-field__label">
                    {{ t("altar.preferences.forceOutcome") }}
                  </label>
                  <RunicSelect
                    v-model="forcedOutcome"
                    :options="forcedOutcomeOptions"
                    size="md"
                    class="admin-debug-field__select"
                  />
                  <p class="admin-section__hint">
                    {{ t("altar.preferences.forceOutcomeHint") }}
                  </p>
                </div>

                <div v-if="!isApiData" class="admin-debug-field">
                  <label class="admin-debug-field__label">
                    {{ t("altar.preferences.vaalOrbsLabel") }}
                  </label>
                  <p class="admin-section__hint">
                    {{ t("altar.preferences.vaalOrbsHint") }}
                  </p>
                  <div class="admin-debug-field__number">
                    <button
                      class="admin-debug-field__btn"
                      :disabled="debugVaalOrbs <= 0 || isUpdatingVaalOrbs"
                      @click="updateDebugVaalOrbs(-1)"
                    >
                      −
                    </button>
                    <span class="admin-debug-field__value">{{ debugVaalOrbs }}</span>
                    <button
                      class="admin-debug-field__btn"
                      :disabled="debugVaalOrbs >= 99 || isUpdatingVaalOrbs"
                      @click="updateDebugVaalOrbs(1)"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div v-else class="admin-debug-field">
                  <p class="admin-section__hint">
                    {{ t("admin.altarDebug.apiModeHint") }}
                  </p>
                </div>
              </div>
            </section>
            <template #fallback>
              <section class="admin-section">
                <h2 class="admin-section__title">
                  <span class="admin-section__rune">◆</span>
                  {{ t("altar.preferences.adminTitle") }}
                  <span class="admin-section__rune">◆</span>
                </h2>
                <p class="admin-section__desc">
                  {{ t("altar.preferences.forceOutcomeHint") }}
                </p>
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
   STATUS INDICATOR
   ========================================== */
.admin-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
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
.admin-user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.admin-user-info__avatar {
  width: 48px;
  height: 48px;
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
  font-size: 1rem;
  font-weight: 600;
  color: rgba(200, 190, 180, 0.9);
}

.admin-user-info__id {
  font-family: "Crimson Text", serif;
  font-size: 0.875rem;
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

.admin-section__hint--coming-soon {
  color: rgba(201, 162, 39, 0.7);
  font-weight: 500;
}

/* ==========================================
   TOGGLE PANEL (for Altar)
   ========================================== */
.admin-toggle-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.admin-toggle-panel__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-toggle-panel__label {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(180, 170, 160, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-toggle-panel__status {
  font-family: "Cinzel", serif;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.admin-toggle-panel__status--open {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.4);
}

.admin-toggle-panel__status--closed {
  color: #f87171;
  text-shadow: 0 0 15px rgba(248, 113, 113, 0.4);
}

.admin-toggle-panel__control {
  display: flex;
  align-items: center;
}

.admin-toggle-panel__control--disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

/* ==========================================
   DATA SOURCE
   ========================================== */
.admin-data-source {
  display: flex;
  width: 100%;
}

.admin-data-source--disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.admin-data-source__radio {
  width: 100%;
}

.admin-data-source__radio :deep(.runic-radio) {
  display: flex;
  width: 100%;
}

.admin-data-source__radio :deep(.runic-radio__groove) {
  width: 100%;
  flex: 1;
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

.admin-debug-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-debug-field__label {
  font-family: "Cinzel", serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(180, 170, 160, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-debug-field__select {
  width: 100%;
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

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 640px) {
  .admin-page {
    padding: 0 0.5rem 1.5rem;
  }

  .admin-toggle-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    text-align: center;
  }

  .admin-toggle-panel__info {
    align-items: center;
  }

  .admin-toggle-panel__control {
    justify-content: center;
  }

  .admin-section__title {
    font-size: 1rem;
  }
}
</style>
