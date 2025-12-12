<script setup lang="ts">
definePageMeta({
  middleware: ['admin'],
})

const { t } = useI18n()
const { user } = useUserSession()
const { altarOpen, isLoading, isConnected, toggleAltar } = useAppSettings()
const { dataSource, setDataSource } = useDataSource()

useHead({ title: t('admin.meta.title') })

// Local state for optimistic updates
const isTogglingAltar = ref(false)

// Handle altar toggle
const handleAltarToggle = async () => {
  if (isTogglingAltar.value) return
  isTogglingAltar.value = true
  
  try {
    await toggleAltar(user.value?.id)
  } finally {
    isTogglingAltar.value = false
  }
}

// Handle data source change - uses localStorage, no Supabase needed
const handleDataSourceChange = (source: 'mock' | 'api') => {
  if (dataSource.value === source) return
  setDataSource(source)
}

// Data source options for RunicRadio
const dataSourceOptions = computed(() => [
  { value: 'mock', label: t('admin.dataSource.mock'), color: 'default' },
  { value: 'api', label: t('admin.dataSource.api'), color: 'default' },
])

// Computed for data source v-model
const dataSourceModel = computed({
  get: () => dataSource.value,
  set: (value: 'mock' | 'api') => {
    handleDataSourceChange(value)
  }
})

// Computed for altar toggle v-model
const altarOpenModel = computed({
  get: () => altarOpen.value,
  set: async (value: boolean) => {
    // Only trigger if value actually changed and not already processing
    if (value !== altarOpen.value && !isTogglingAltar.value && !isLoading.value) {
      await handleAltarToggle()
    }
  }
})
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
            :class="isConnected ? 'admin-status__indicator--connected' : 'admin-status__indicator--disconnected'"
          />
          <span class="admin-status__text">
            {{ isConnected ? t('admin.connected') : t('admin.disconnected') }}
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
        <section class="admin-section">
          <h2 class="admin-section__title">
            <span class="admin-section__rune">◆</span>
            {{ t('admin.altar.title') }}
            <span class="admin-section__rune">◆</span>
          </h2>
          <p class="admin-section__desc">{{ t('admin.altar.description') }}</p>

          <div class="admin-toggle-panel">
            <div class="admin-toggle-panel__info">
              <span class="admin-toggle-panel__label">{{ t('admin.altar.status') }}</span>
              <span 
                class="admin-toggle-panel__status"
                :class="altarOpen ? 'admin-toggle-panel__status--open' : 'admin-toggle-panel__status--closed'"
              >
                {{ altarOpen ? t('admin.altar.open') : t('admin.altar.closed') }}
              </span>
            </div>
            
            <div 
              class="admin-toggle-panel__control"
              :class="{ 'admin-toggle-panel__control--disabled': isLoading || isTogglingAltar }"
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
            {{ t('admin.altar.hint') }}
          </p>
        </section>

        <RunicDivider />

        <!-- Data Source Panel -->
        <section class="admin-section">
          <h2 class="admin-section__title">
            <span class="admin-section__rune">◆</span>
            {{ t('admin.dataSource.title') }}
            <span class="admin-section__rune">◆</span>
          </h2>
          <p class="admin-section__desc">{{ t('admin.dataSource.description') }}</p>

          <div class="admin-data-source">
            <RunicRadio
              v-model="dataSourceModel"
              :options="dataSourceOptions"
              size="md"
              class="admin-data-source__radio"
            />
          </div>

          <p class="admin-section__hint">
            ⚠️ {{ t('admin.dataSource.warning') }}
          </p>
        </section>
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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

