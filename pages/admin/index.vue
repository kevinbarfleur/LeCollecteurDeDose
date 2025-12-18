<script setup lang="ts">
definePageMeta({
  middleware: ["admin"],
});

const { t } = useI18n();
const { user } = useUserSession();
const { altarOpen, isLoading, isConnected, toggleAltar, activityLogsEnabled, toggleActivityLogs } = useAppSettings();
const { isMaintenanceMode, toggleMaintenanceMode, isLoading: isMaintenanceLoading } = useMaintenanceMode();
const { dataSource, setDataSource, isSupabaseData, isMockData } = useDataSource();
const { forcedOutcome } = useAltarDebug();
const { getForcedOutcomeOptions } = await import('~/types/vaalOutcome');
const { fetchUserCollections, fetchUniques, fetchUserCards } = useApi();

// Bot action triggers
const botActionUsername = ref('');
const isTriggeringBooster = ref(false);
const isTriggeringVaalOrbs = ref(false);
const botActionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Credit Vaal Orbs for current user
const isCreditingVaalOrbs = ref(false);
const creditVaalOrbsMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

useHead({ title: t("admin.meta.title") });

// Local state for optimistic updates
const isTogglingAltar = ref(false);
const isTogglingActivityLogs = ref(false);
const isTogglingMaintenance = ref(false);

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

// Handle maintenance mode toggle
const handleMaintenanceToggle = async () => {
  if (isTogglingMaintenance.value || !user.value?.id) return;
  
  // Ask for confirmation
  const confirmed = await confirm({
    title: isMaintenanceMode.value ? 'Désactiver le mode maintenance' : 'Activer le mode maintenance',
    message: isMaintenanceMode.value 
      ? 'Le royaume sera à nouveau accessible aux utilisateurs.'
      : 'Le royaume sera mis en maintenance et les utilisateurs verront le message de maintenance.',
    confirmText: isMaintenanceMode.value ? 'Désactiver' : 'Activer',
    cancelText: t("common.cancel"),
    variant: isMaintenanceMode.value ? "default" : "warning",
  });
  
  if (!confirmed) return;
  
  isTogglingMaintenance.value = true;
  try {
    await toggleMaintenanceMode(user.value.id);
  } finally {
    isTogglingMaintenance.value = false;
  }
};

// Data source options for RunicSelect
const dataSourceOptions = computed(() => [
  { value: "supabase", label: t("admin.dataSource.supabase") },
  { value: "mock", label: t("admin.dataSource.test") },
]);


// Backup management
const isCreatingBackup = ref(false);
const backupsList = ref<Array<{ id: string; backup_date: string; backup_time: string; created_at: string; user_collection?: any; uniques?: any }>>([]);
const isLoadingBackups = ref(false);
const selectedBackupId = ref<string>('');
const restoreMode = ref<'strict' | 'permissive'>('permissive');
const isRestoringBackup = ref(false);
const restoreBackupMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Load backups list
const loadBackups = async () => {
  if (isLoadingBackups.value) return;
  
  isLoadingBackups.value = true;
  try {
    const supabase = useSupabaseClient();
    const { data, error } = await supabase
      .from('backup')
      .select('id, backup_date, backup_time, created_at, user_collection, uniques')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading backups:', error);
      return;
    }

    backupsList.value = (data || []).map(backup => ({
      id: backup.id,
      backup_date: backup.backup_date,
      backup_time: backup.backup_time,
      created_at: backup.created_at,
      user_collection: backup.user_collection,
      uniques: backup.uniques
    }));
  } catch (error: any) {
    console.error('Error loading backups:', error);
  } finally {
    isLoadingBackups.value = false;
  }
};

// Format backup display name
const formatBackupName = (backup: { backup_date: string; backup_time: string; created_at: string; user_collection?: any; uniques?: any }) => {
  const date = new Date(backup.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const usersCount = backup.user_collection ? Object.keys(backup.user_collection).length : 0;
  const uniquesArray = Array.isArray(backup.uniques) ? backup.uniques : [];
  const cardsCount = uniquesArray.length;
  return `${dateStr} ${timeStr} (${usersCount} utilisateurs, ${cardsCount} cartes)`;
};

// Create manual backup
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
    // Reload backups list after creating
    await loadBackups();
  } catch (error: any) {

    const errorMessage = error.data?.message || error.message || 'Erreur inconnue';
    alert(`${t("admin.dataSource.backupError")}\n\n${errorMessage}`);
  } finally {
    isCreatingBackup.value = false;
  }
};

// Restore backup
const restoreBackup = async () => {
  if (isRestoringBackup.value || !selectedBackupId.value) return;
  
  // Check if user is authenticated
  if (!user.value?.id) {
    alert('Vous devez être connecté pour restaurer un backup.');
    return;
  }
  
  // Confirm action (critical operation)
  const modeDescription = restoreMode.value === 'strict' 
    ? t("admin.dataSource.restoreMode.strict.description")
    : t("admin.dataSource.restoreMode.permissive.description");
  
  const confirmed = await confirm({
    title: t("admin.dataSource.restoreConfirmTitle"),
    message: `${t("admin.dataSource.restoreConfirmMessage")}\n\n${modeDescription}`,
    confirmText: t("admin.dataSource.restoreConfirmButton"),
    cancelText: t("common.cancel"),
    variant: 'warning',
  });
  
  if (!confirmed) {
    return;
  }
  
  isRestoringBackup.value = true;
  restoreBackupMessage.value = null;
  
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabase?.url || '';
    const supabaseKey = config.public.supabase?.key || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante');
    }
    
    // Call the restore-backup Edge Function
    const response = await $fetch(`${supabaseUrl}/functions/v1/restore-backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: {
        backupId: selectedBackupId.value,
        restoreMode: restoreMode.value
      },
    }) as { ok: boolean; message?: string; report?: any };

    if (response.ok) {
      const report = response.report;
      let successText = t("admin.dataSource.restoreSuccess");
      if (report) {
        const stats = [];
        if (report.users?.updated) stats.push(`${t("admin.dataSource.restoreStats.users")}: ${report.users.updated}`);
        if (report.users?.deleted) stats.push(`${t("admin.dataSource.restoreStats.deleted")}: ${report.users.deleted}`);
        if (report.collections?.restored) stats.push(`${t("admin.dataSource.restoreStats.collections")}: ${report.collections.restored}`);
        if (report.boosters?.created) stats.push(`${t("admin.dataSource.restoreStats.boosters")}: ${report.boosters.created}`);
        if (stats.length > 0) {
          successText += ` ${stats.join(", ")}`;
        }
      }
      restoreBackupMessage.value = {
        type: 'success',
        text: successText
      };
      // Clear selection
      selectedBackupId.value = '';
    } else {
      const errorDetails = response.report ? JSON.stringify(response.report, null, 2) : '';
      throw new Error(response.message || 'Erreur lors de la restauration' + (errorDetails ? `\n\n${errorDetails}` : ''));
    }
  } catch (error: any) {
    const errorMessage = error.data?.message || error.message || 'Erreur inconnue';
    restoreBackupMessage.value = {
      type: 'error',
      text: `❌ Erreur lors de la restauration : ${errorMessage}`
    };
  } finally {
    isRestoringBackup.value = false;
    
    // Clear message after 10 seconds
    if (restoreBackupMessage.value) {
      setTimeout(() => {
        restoreBackupMessage.value = null;
      }, 10000);
    }
  }
};

// Load backups on mount
if (import.meta.client) {
  onMounted(() => {
    loadBackups();
  });
}

// Sync mock data from Supabase production data
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
    // Fetch data directly from Supabase production database
    const { getAllUserCollections, getAllUniqueCards, getUserCards } = await import('~/services/supabase-collection.service');
    
    const userCollections = await getAllUserCollections().catch(() => null);
    const uniques = await getAllUniqueCards().catch(() => null);
    
    // Get all users from collections
    const users = userCollections ? Object.keys(userCollections) : [];

    // Fetch userCards for each user
    const userCardsPromises = users.map(async (user) => {
      try {
        const cards = await getUserCards(user).catch(() => []);
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

// Helper function to get data source label
const getDataSourceLabel = (source: "supabase" | "mock") => {
  if (source === "mock") return t("admin.dataSource.test");
  return t("admin.dataSource.supabase");
};

// Computed for data source v-model - now with confirmation
const dataSourceModel = computed({
  get: () => dataSource.value,
  set: async (value: "supabase" | "mock") => {
    // Ask for confirmation for any change
    if (value !== dataSource.value) {
      const confirmed = await confirm({
        title: t("admin.dataSource.confirmTitle"),
        message: t("admin.dataSource.confirmMessage", {
          from: getDataSourceLabel((dataSource.value as any) === "mock" ? "mock" : "supabase"),
          to: getDataSourceLabel(value),
        }),
        confirmText: t("admin.dataSource.confirmButton"),
        cancelText: t("common.cancel"),
        variant: "default",
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

// Bot action handlers
const triggerBooster = async () => {
  if (!botActionUsername.value || isTriggeringBooster.value) return;
  
  isTriggeringBooster.value = true;
  botActionMessage.value = null;

  try {
    const response = await $fetch('/api/admin/trigger-bot-action', {
      method: 'POST',
      body: {
        action: 'booster',
        username: botActionUsername.value
      }
    });

    if (response.ok) {
      botActionMessage.value = {
        type: 'success',
        text: response.message || `✅ Booster ouvert pour ${botActionUsername.value} !`
      };
      
      // Clear message after 5 seconds
      setTimeout(() => {
        botActionMessage.value = null;
      }, 5000);
    } else {
      throw new Error('Failed to trigger booster');
    }
  } catch (error: any) {
    botActionMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.message || 'Impossible d\'ouvrir le booster'}`
    };
  } finally {
    isTriggeringBooster.value = false;
  }
};

const triggerVaalOrbs = async () => {
  if (!botActionUsername.value || isTriggeringVaalOrbs.value) return;
  
  isTriggeringVaalOrbs.value = true;
  botActionMessage.value = null;

  try {
    const response = await $fetch('/api/admin/trigger-bot-action', {
      method: 'POST',
      body: {
        action: 'vaal_orbs',
        username: botActionUsername.value
      }
    });

    if (response.ok) {
      botActionMessage.value = {
        type: 'success',
        text: response.message || `✅ 5 Vaal Orbs ajoutés pour ${botActionUsername.value} !`
      };
      
      // Clear message after 5 seconds
      setTimeout(() => {
        botActionMessage.value = null;
      }, 5000);
    } else {
      throw new Error('Failed to trigger vaal orbs');
    }
  } catch (error: any) {
    botActionMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.message || 'Impossible d\'ajouter les Vaal Orbs'}`
    };
  } finally {
    isTriggeringVaalOrbs.value = false;
  }
};

// Credit 5 Vaal Orbs for current user (direct Supabase update)
const creditVaalOrbs = async () => {
  if (!user.value?.login || isCreditingVaalOrbs.value) return;
  
  isCreditingVaalOrbs.value = true;
  creditVaalOrbsMessage.value = null;

  try {
    console.log(`[Admin] creditVaalOrbs: Starting credit for user ${user.value.login}`);
    
    const supabase = useSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Get or create user to obtain Supabase UUID (not Twitch ID)
    // update_vaal_orbs requires the Supabase UUID, not the Twitch user ID
    const { data: userId, error: userError } = await supabase.rpc('get_or_create_user', {
      p_twitch_username: user.value.login.toLowerCase()
    });

    if (userError || !userId) {
      console.error('[Admin] creditVaalOrbs: Error getting user UUID:', userError);
      throw new Error(`Failed to get user UUID: ${userError?.message || 'Unknown error'}`);
    }

    console.log(`[Admin] creditVaalOrbs: Got Supabase UUID ${userId} for user ${user.value.login}`);

    // Call update_vaal_orbs RPC function with Supabase UUID
    const { data, error } = await supabase.rpc('update_vaal_orbs', {
      p_user_id: userId,
      p_amount: 5
    });

    if (error) {
      console.error('[Admin] creditVaalOrbs: Error updating vaal orbs:', error);
      throw error;
    }

    console.log('[Admin] creditVaalOrbs: Successfully credited 5 Vaal Orbs');
    
    creditVaalOrbsMessage.value = {
      type: 'success',
      text: '✅ 5 Vaal Orbs ajoutés avec succès !'
    };
    
    // Clear message after 5 seconds
    setTimeout(() => {
      creditVaalOrbsMessage.value = null;
    }, 5000);
  } catch (error: any) {
    console.error('[Admin] creditVaalOrbs: Failed:', error);
    creditVaalOrbsMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.message || 'Impossible de créditer les Vaal Orbs'}`
    };
  } finally {
    isCreditingVaalOrbs.value = false;
  }
};

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

// Navigation tabs
type AdminTab = 'system' | 'bot' | 'data' | 'registry' | 'diagnostics';
const activeTab = ref<AdminTab>('system');
const tabOptions = computed(() => [
  { value: 'system', label: 'Systeme' },
  { value: 'bot', label: 'Bot' },
  { value: 'data', label: 'Donnees' },
  { value: 'registry', label: 'Registre' },
  { value: 'diagnostics', label: 'Diagnostics' },
]);

// ==========================================
// REGISTRE - Card Registry Management
// ==========================================
const registryCatalogue = ref<any[]>([]);
const registryLoading = ref(false);
const registrySearch = ref('');
const registryTierFilter = ref('');
const showCardEditPanel = ref(false);
const editingCard = ref<any | null>(null);
const openedGameCardRef = ref<{ close: () => void } | null>(null);

// Tier options for filter (with colors for RunicRadio)
const tierFilterOptions = [
  { value: '', label: 'Tous' },
  { value: 'T0', label: 'T0', color: 't0' },
  { value: 'T1', label: 'T1', color: 't1' },
  { value: 'T2', label: 'T2', color: 't2' },
  { value: 'T3', label: 'T3', color: 't3' },
];

// Load catalogue for registry
const loadRegistryCatalogue = async () => {
  if (registryLoading.value) return;
  registryLoading.value = true;
  try {
    const { getAllUniqueCards } = await import('~/services/supabase-collection.service');
    const cards = await getAllUniqueCards();
    registryCatalogue.value = cards || [];
  } catch (error) {
    console.error('Error loading catalogue:', error);
  } finally {
    registryLoading.value = false;
  }
};

// Filter cards for registry
const filteredRegistryCards = computed(() => {
  let cards = registryCatalogue.value;

  if (registrySearch.value) {
    const query = registrySearch.value.toLowerCase();
    cards = cards.filter((card: any) =>
      card.name?.toLowerCase().includes(query) ||
      card.id?.toLowerCase().includes(query)
    );
  }

  if (registryTierFilter.value) {
    cards = cards.filter((card: any) => card.tier === registryTierFilter.value);
  }

  return cards;
});

// Open card edit panel
const openCardEdit = (card: any) => {
  editingCard.value = card;
  showCardEditPanel.value = true;
};

// Open new card panel
const openNewCard = () => {
  editingCard.value = null;
  showCardEditPanel.value = true;
};

// Handle card save from edit panel
const handleCardSave = (savedCard: any) => {
  if (!savedCard) return;

  // Update the card directly in registryCatalogue for reactivity
  const index = registryCatalogue.value.findIndex((c: any) => c.uid === savedCard.uid);
  if (index !== -1) {
    // Use splice to ensure Vue reactivity triggers
    registryCatalogue.value.splice(index, 1, { ...savedCard });
  } else {
    // New card - add to catalogue
    registryCatalogue.value.unshift({ ...savedCard });
  }

  // Update editingCard to reflect changes in the panel
  editingCard.value = { ...savedCard };
};

// Close everything (panel + detail view)
const closeCardEditAll = () => {
  showCardEditPanel.value = false;
  editingCard.value = null;
  if (openedGameCardRef.value?.close) {
    openedGameCardRef.value.close();
  }
  openedGameCardRef.value = null;
};

// Handle GameCard detail view close -> close panel too
const handleGameCardClose = () => {
  showCardEditPanel.value = false;
  editingCard.value = null;
  openedGameCardRef.value = null;
};

// Store ref to opened GameCard
const setGameCardRef = (el: any, card: any) => {
  if (el && editingCard.value?.uid === card.uid) {
    openedGameCardRef.value = el;
  }
};

// Watch for tab change to load registry data
watch(activeTab, (newTab) => {
  if (newTab === 'registry' && registryCatalogue.value.length === 0) {
    loadRegistryCatalogue();
  }
});

// Bot config modal
const showBotConfigModal = ref(false);
const botConfig = ref<Record<string, string>>({});
const botConfigLoading = ref(false);
const botConfigSaving = ref(false);
const botConfigMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// New state management for pending changes (no auto-save)
const pendingBotConfig = ref<Record<string, any>>({});
const originalBotConfig = ref<Record<string, any>>({});
const lockedTriggers = ref<Set<string>>(new Set());

// Check if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  return JSON.stringify(pendingBotConfig.value) !== JSON.stringify(originalBotConfig.value);
});

// Trigger list with emojis and effects for better UX
const triggerList = [
  { key: 'trigger_blessing_rngesus', emoji: '✨', label: 'Blessing RNGesus', effect: '+1 Vaal Orb', type: 'positive' },
  { key: 'trigger_cartographers_gift', emoji: '🗺️', label: "Cartographer's Gift", effect: '+1 carte', type: 'positive' },
  { key: 'trigger_mirror_tier', emoji: '💎', label: 'Mirror-Tier', effect: 'Duplique carte', type: 'positive' },
  { key: 'trigger_einhar_approved', emoji: '🦎', label: 'Einhar Approved', effect: 'Normal → Foil', type: 'positive' },
  { key: 'trigger_heist_tax', emoji: '💰', label: 'Heist Tax', effect: '-1 Vaal Orb', type: 'negative' },
  { key: 'trigger_sirus_voice', emoji: '💀', label: 'Sirus Voice', effect: 'Détruit carte', type: 'negative' },
  { key: 'trigger_alch_misclick', emoji: '⚗️', label: 'Alch Misclick', effect: 'Reroll carte', type: 'neutral' },
  { key: 'trigger_trade_scam', emoji: '🤝', label: 'Trade Scam', effect: 'Vole carte', type: 'negative' },
  { key: 'trigger_chris_vision', emoji: '👓', label: 'Chris Vision', effect: 'Retire foil', type: 'negative' },
  { key: 'trigger_atlas_influence', emoji: '🌟', label: 'Atlas Influence', effect: 'Buff foil', type: 'positive' },
];

// Calculate total probability percentage
const totalTriggerPercent = computed(() => {
  return triggerList.reduce((sum, trigger) => {
    const value = parseFloat(pendingBotConfig.value[trigger.key]) || 0;
    return sum + Math.round(value * 100);
  }, 0);
});

const isTotalValid = computed(() => totalTriggerPercent.value === 100);

// Toggle lock on a trigger
const toggleTriggerLock = (key: string) => {
  if (lockedTriggers.value.has(key)) {
    lockedTriggers.value.delete(key);
  } else {
    lockedTriggers.value.add(key);
  }
};

// Auto-balance probabilities when one changes
const adjustProbabilities = (changedKey: string, newValuePercent: number) => {
  const newValue = newValuePercent / 100; // Convert to decimal
  const triggerKeys = triggerList.map(t => t.key);
  const unlockedTriggers = triggerKeys.filter(k => !lockedTriggers.value.has(k) && k !== changedKey);

  // Calculate locked total (including the changed one)
  let lockedTotal = newValue;
  triggerKeys.forEach(k => {
    if (lockedTriggers.value.has(k)) {
      lockedTotal += parseFloat(pendingBotConfig.value[k]) || 0;
    }
  });

  const remaining = Math.max(0, 1 - lockedTotal);

  // Distribute proportionally to unlocked triggers
  const currentUnlockedTotal = unlockedTriggers.reduce((sum, k) => sum + (parseFloat(pendingBotConfig.value[k]) || 0), 0);

  unlockedTriggers.forEach(key => {
    let ratio: number;
    if (currentUnlockedTotal > 0) {
      ratio = (parseFloat(pendingBotConfig.value[key]) || 0) / currentUnlockedTotal;
    } else {
      ratio = 1 / unlockedTriggers.length;
    }
    // Round to 2 decimal places
    pendingBotConfig.value[key] = Math.max(0, Math.round(remaining * ratio * 100) / 100).toString();
  });

  pendingBotConfig.value[changedKey] = newValue.toString();
};

// Distribute probabilities evenly
const distributeEvenly = () => {
  const triggerKeys = triggerList.map(t => t.key);
  const evenValue = Math.round(100 / triggerKeys.length) / 100;
  const remainder = 1 - (evenValue * triggerKeys.length);

  triggerKeys.forEach((key, index) => {
    // Add remainder to first trigger to ensure total is 100%
    const value = index === 0 ? evenValue + remainder : evenValue;
    pendingBotConfig.value[key] = value.toString();
  });

  lockedTriggers.value.clear();
};

// Convert seconds to minutes for display
const getMinutesFromSeconds = (key: string) => {
  const seconds = parseFloat(pendingBotConfig.value[key]) || 0;
  return Math.round(seconds / 60);
};

const setMinutesToSeconds = (key: string, minutes: number) => {
  pendingBotConfig.value[key] = (minutes * 60).toString();
};

// Convert milliseconds to minutes for display
const getMinutesFromMs = (key: string) => {
  const ms = parseFloat(pendingBotConfig.value[key]) || 0;
  return Math.round(ms / 60000);
};

const setMinutesToMs = (key: string, minutes: number) => {
  pendingBotConfig.value[key] = (minutes * 60000).toString();
};

// Save all pending changes
const saveAllBotConfig = async () => {
  botConfigSaving.value = true;
  botConfigMessage.value = null;

  try {
    const changedKeys = Object.keys(pendingBotConfig.value).filter(
      key => pendingBotConfig.value[key] !== originalBotConfig.value[key]
    );

    for (const key of changedKeys) {
      await $fetch('/api/admin/bot-config', {
        method: 'POST',
        body: { key, value: pendingBotConfig.value[key] }
      });
    }

    // Update original to match pending
    originalBotConfig.value = { ...pendingBotConfig.value };
    botConfig.value = { ...pendingBotConfig.value };

    // Reload bot config
    try {
      await $fetch('/api/admin/reload-bot-config', { method: 'POST' });
    } catch (e) {
      // Ignore reload errors
    }

    botConfigMessage.value = {
      type: 'success',
      text: '✅ Configuration sauvegardée et bot mis à jour'
    };

    setTimeout(() => {
      botConfigMessage.value = null;
    }, 3000);
  } catch (error: any) {
    botConfigMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.data?.message || error.message || 'Impossible de sauvegarder'}`
    };
  } finally {
    botConfigSaving.value = false;
  }
};

// Cancel pending changes
const cancelBotConfigChanges = () => {
  pendingBotConfig.value = { ...originalBotConfig.value };
  lockedTriggers.value.clear();
  botConfigMessage.value = null;
};

// Load bot config
const loadBotConfig = async () => {
  botConfigLoading.value = true;
  try {
    const response = await $fetch('/api/admin/bot-config');
    if (response.ok && response.config) {
      botConfig.value = response.config;
      // Initialize pending and original config for change tracking
      pendingBotConfig.value = { ...response.config };
      originalBotConfig.value = { ...response.config };
      lockedTriggers.value.clear();
    }
  } catch (error: any) {
    console.error('Error loading bot config:', error);
    botConfigMessage.value = {
      type: 'error',
      text: `Erreur lors du chargement: ${error.message || 'Erreur inconnue'}`
    };
  } finally {
    botConfigLoading.value = false;
  }
};

// Save bot config value
const saveBotConfigValue = async (key: string, value: string) => {
  botConfigSaving.value = true;
  botConfigMessage.value = null;

  try {
    const response = await $fetch('/api/admin/bot-config', {
      method: 'POST',
      body: {
        key,
        value
      }
    });

    if (response.ok) {
      botConfig.value[key] = value;

      // Notify bot to reload config
      try {
        const reloadResponse = await $fetch('/api/admin/reload-bot-config', {
          method: 'POST'
        });

        if (reloadResponse.botReloaded) {
          botConfigMessage.value = {
            type: 'success',
            text: 'Configuration sauvegardée et bot mis à jour'
          };
        } else {
          botConfigMessage.value = {
            type: 'success',
            text: 'Configuration sauvegardée (bot sera mis à jour au prochain cycle)'
          };
        }
      } catch (reloadError) {
        // Config was saved, just bot notification failed
        botConfigMessage.value = {
          type: 'success',
          text: 'Configuration sauvegardée (notification bot échouée)'
        };
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        botConfigMessage.value = null;
      }, 3000);
    } else {
      throw new Error('Failed to save config');
    }
  } catch (error: any) {
    botConfigMessage.value = {
      type: 'error',
      text: `Erreur: ${error.message || 'Impossible de sauvegarder'}`
    };
  } finally {
    botConfigSaving.value = false;
  }
};

// Watch modal visibility to load config when opened
watch(showBotConfigModal, (isOpen) => {
  if (isOpen) {
    loadBotConfig();
  }
});

// Config groups for organization
const configGroups = computed(() => ({
  activation: {
    title: 'Activation',
    keys: ['auto_triggers_enabled']
  },
  intervals: {
    title: 'Intervalles (secondes)',
    keys: ['auto_triggers_min_interval', 'auto_triggers_max_interval']
  },
  probabilities: {
    title: 'Probabilités des Triggers (0.0 - 1.0)',
    keys: [
      'trigger_blessing_rngesus',
      'trigger_cartographers_gift',
      'trigger_mirror_tier',
      'trigger_einhar_approved',
      'trigger_heist_tax',
      'trigger_sirus_voice',
      'trigger_alch_misclick',
      'trigger_trade_scam',
      'trigger_chris_vision',
      'trigger_atlas_influence'
    ]
  },
  buffs: {
    title: 'Buffs (Usage unique)',
    keys: ['atlas_influence_foil_boost']
  },
  dailyLimits: {
    title: 'Limites Journalières (!booster, !vaals)',
    keys: [
      'daily_limit_booster',
      'daily_limit_vaals'
    ]
  },
  antiFocus: {
    title: 'Anti-Focus (millisecondes)',
    keys: [
      'auto_triggers_target_cooldown',
      'auto_triggers_min_users_for_cooldown',
      'auto_triggers_user_activity_window'
    ]
  }
}));

// Config labels
const configLabels: Record<string, string> = {
  auto_triggers_enabled: 'Activer les triggers automatiques',
  auto_triggers_min_interval: 'Intervalle minimum',
  auto_triggers_max_interval: 'Intervalle maximum',
  trigger_blessing_rngesus: 'Blessing of RNGesus',
  trigger_cartographers_gift: 'Cartographer\'s Gift',
  trigger_mirror_tier: 'Mirror-tier Moment',
  trigger_einhar_approved: 'Einhar Approved',
  trigger_heist_tax: 'Heist Tax',
  trigger_sirus_voice: 'Sirus Voice Line',
  trigger_alch_misclick: 'Alch & Go Misclick',
  trigger_trade_scam: 'Trade Scam',
  trigger_chris_vision: 'Chris Wilson\'s Vision',
  trigger_atlas_influence: 'Atlas Influence',
  atlas_influence_foil_boost: 'Bonus chance foil (autel)',
  daily_limit_booster: 'Limite !booster par jour',
  daily_limit_vaals: 'Limite !vaals par jour',
  auto_triggers_target_cooldown: 'Cooldown de ciblage',
  auto_triggers_min_users_for_cooldown: 'Minimum utilisateurs actifs',
  auto_triggers_user_activity_window: 'Fenêtre d\'activité'
};

// Config descriptions
const configDescriptions: Record<string, string> = {
  auto_triggers_enabled: 'Active ou désactive le système de triggers automatiques',
  auto_triggers_min_interval: 'Délai minimum entre deux triggers (en secondes)',
  auto_triggers_max_interval: 'Délai maximum entre deux triggers (en secondes)',
  trigger_blessing_rngesus: 'Donne +1 Vaal Orb à l\'utilisateur',
  trigger_cartographers_gift: 'Donne 1 carte aléatoire (non-foil) à l\'utilisateur',
  trigger_mirror_tier: 'Duplique une carte aléatoire de la collection (nécessite des cartes)',
  trigger_einhar_approved: 'Transforme une carte normale en foil (nécessite des cartes normales)',
  trigger_heist_tax: 'Retire 1 Vaal Orb à l\'utilisateur (nécessite des Vaal Orbs)',
  trigger_sirus_voice: 'Détruit une carte aléatoire de la collection (nécessite des cartes)',
  trigger_alch_misclick: 'Reroll une carte aléatoire (nécessite des cartes)',
  trigger_trade_scam: 'Transfère une carte à un autre utilisateur aléatoire (nécessite des cartes)',
  trigger_chris_vision: 'Retire le foil d\'une carte foil (nécessite des cartes foil)',
  trigger_atlas_influence: 'Ajoute un buff à usage unique qui augmente la chance de foil sur l\'autel',
  atlas_influence_foil_boost: 'Bonus de chance de foil (0.0 - 1.0) appliqué sur la prochaine utilisation de l\'autel',
  daily_limit_booster: 'Nombre maximum de !booster par utilisateur par jour (reset à minuit UTC)',
  daily_limit_vaals: 'Nombre maximum de !vaals par utilisateur par jour (reset à minuit UTC)',
  auto_triggers_target_cooldown: 'Temps avant de pouvoir cibler le même utilisateur (en millisecondes)',
  auto_triggers_min_users_for_cooldown: 'Nombre minimum d\'utilisateurs actifs pour appliquer le cooldown strict',
  auto_triggers_user_activity_window: 'Fenêtre de temps pour considérer un utilisateur comme actif (en millisecondes)'
};

// Map config keys to trigger types for manual triggering
const configKeyToTriggerType: Record<string, string> = {
  trigger_blessing_rngesus: 'blessingRNGesus',
  trigger_cartographers_gift: 'cartographersGift',
  trigger_mirror_tier: 'mirrorTier',
  trigger_einhar_approved: 'einharApproved',
  trigger_heist_tax: 'heistTax',
  trigger_sirus_voice: 'sirusVoice',
  trigger_alch_misclick: 'alchMisclick',
  trigger_trade_scam: 'tradeScam',
  trigger_chris_vision: 'chrisVision',
  trigger_atlas_influence: 'atlasInfluence'
};

// Manual trigger execution
const manualTriggerLoading = ref<Record<string, boolean>>({});
const manualTriggerMessage = ref<{ type: 'success' | 'error'; text: string; triggerType?: string } | null>(null);

// Daily limits reset
const isResettingDailyLimits = ref(false);
const dailyLimitsResetMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const resetDailyLimits = async () => {
  if (isResettingDailyLimits.value) return;

  isResettingDailyLimits.value = true;
  dailyLimitsResetMessage.value = null;

  try {
    const response = await $fetch<any>('/api/admin/reset-daily-limits', {
      method: 'POST'
    });

    if (response.ok) {
      dailyLimitsResetMessage.value = {
        type: 'success',
        text: `✅ Limites réinitialisées ! (${response.resetCount} enregistrements) - Message envoyé: ${response.announcement}`
      };

      setTimeout(() => {
        dailyLimitsResetMessage.value = null;
      }, 5000);
    } else {
      throw new Error(response.message || 'Échec de la réinitialisation');
    }
  } catch (error: any) {
    dailyLimitsResetMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.data?.message || error.message || 'Impossible de réinitialiser les limites'}`
    };

    setTimeout(() => {
      dailyLimitsResetMessage.value = null;
    }, 5000);
  } finally {
    isResettingDailyLimits.value = false;
  }
};

const triggerManualTrigger = async (triggerType: string) => {
  manualTriggerLoading.value[triggerType] = true;
  manualTriggerMessage.value = null;
  
  try {
    const response = await $fetch<any>('/api/admin/trigger-manual', {
      method: 'POST',
      body: {
        triggerType
      }
    });

    if (response.ok && response.result?.success) {
      manualTriggerMessage.value = {
        type: 'success',
        text: response.result.message || `✅ Trigger "${triggerType}" exécuté avec succès sur @${response.result.targetUser}`,
        triggerType
      };
      
      // Clear message after 5 seconds
      setTimeout(() => {
        manualTriggerMessage.value = null;
      }, 5000);
    } else {
      throw new Error(response.result?.message || response.message || 'Échec du déclenchement');
    }
  } catch (error: any) {
    manualTriggerMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.data?.message || error.message || 'Impossible de déclencher le trigger'}`,
      triggerType
    };
    
    // Clear message after 5 seconds
    setTimeout(() => {
      manualTriggerMessage.value = null;
    }, 5000);
  } finally {
    manualTriggerLoading.value[triggerType] = false;
  }
};

// ============================================================================
// BATCH EVENTS (Patch Notes style)
// ============================================================================

interface BatchEventPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

const batchEventPresets: BatchEventPreset[] = [
  {
    id: 'patch_notes',
    label: 'Patch Notes 3.26',
    emoji: '📜',
    description: 'Buff bows, nerf melee - The classic GGG experience'
  },
  {
    id: 'hotfix',
    label: "Hotfix d'urgence",
    emoji: '🔧',
    description: 'Nerf melee uniquement (T3 seulement)'
  },
  {
    id: 'league_start',
    label: 'League Start Event',
    emoji: '🎮',
    description: 'Buff de départ pour tous les joueurs'
  }
];

const batchEventDelayMs = ref(2500);
const isTriggeringBatchEvent = ref<Record<string, boolean>>({});
const batchEventMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const triggerBatchEvent = async (presetId: string) => {
  isTriggeringBatchEvent.value[presetId] = true;
  batchEventMessage.value = null;

  try {
    const response = await $fetch<any>('/api/admin/trigger-batch-event', {
      method: 'POST',
      body: {
        presetId,
        delayMs: batchEventDelayMs.value
      }
    });

    if (response.ok) {
      batchEventMessage.value = {
        type: 'success',
        text: `✅ Batch event "${presetId}" lancé avec succès !`
      };
    } else {
      throw new Error(response.message || 'Failed');
    }
  } catch (error: any) {
    batchEventMessage.value = {
      type: 'error',
      text: `❌ Erreur: ${error.data?.message || error.message}`
    };
  } finally {
    isTriggeringBatchEvent.value[presetId] = false;
    setTimeout(() => {
      batchEventMessage.value = null;
    }, 5000);
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
        <div class="flex flex-col gap-6">
          <!-- Status Bar -->
          <div class="flex items-center gap-4 p-3.5 px-4 bg-black/20 border border-poe-border/30 rounded-md">
            <div class="flex items-center gap-2.5">
              <span
                class="w-2.5 h-2.5 rounded-full animate-pulse"
                :class="
                  isConnected
                    ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]'
                    : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
                "
              />
              <span class="font-body text-lg text-poe-text-dim font-medium">
                {{ isConnected ? t("admin.connected") : t("admin.disconnected") }}
              </span>
            </div>
            <div class="w-px h-6 bg-poe-border/30"></div>
            <div class="flex items-center gap-3 ml-auto">
              <img
                v-if="user?.avatar"
                :src="user.avatar"
                :alt="user.displayName"
                class="w-8 h-8 rounded-full border-2 border-accent/50"
              />
              <div class="flex flex-col gap-0.5">
                <span class="font-display text-lg font-semibold text-poe-text">{{ user?.displayName }}</span>
                <span class="font-body text-base text-poe-text-dim italic">{{ user?.id?.slice(0, 8) }}...</span>
              </div>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex justify-center my-6">
            <RunicRadio
              v-model="activeTab"
              :options="tabOptions"
              size="md"
            />
          </div>

          <!-- Onglet: Controles Systeme -->
          <div v-show="activeTab === 'system'" class="flex flex-col gap-8">
            <!-- Section: Contrôles Principaux -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="CONTROLES SYSTEME"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Altar Control -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Contrôle de l'Autel</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          {{ t("admin.altar.description") }}
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <span 
                          class="font-display text-[0.9375rem] font-bold tracking-wider uppercase whitespace-nowrap px-2.5 py-1.5 rounded"
                          :class="altarOpen ? 'text-green-400 bg-green-400/15 border border-green-400/30' : 'text-red-400 bg-red-400/15 border border-red-400/30'"
                        >
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
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Panneau de Logs d'Activité</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          {{ t("admin.activityLogs.description") }}
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <span
                          class="font-display text-[0.9375rem] font-bold tracking-wider uppercase whitespace-nowrap px-2.5 py-1.5 rounded"
                          :class="activityLogsEnabled ? 'text-green-400 bg-green-400/15 border border-green-400/30' : 'text-red-400 bg-red-400/15 border border-red-400/30'"
                        >
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

                    <!-- Maintenance Mode Control -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Mode Maintenance</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Active le mode maintenance pour afficher le message "Le royaume est en service" sur toutes les pages interactives (catalogue, collection, autel).
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <span
                          class="font-display text-[0.9375rem] font-bold tracking-wider uppercase whitespace-nowrap px-2.5 py-1.5 rounded"
                          :class="isMaintenanceMode ? 'text-yellow-400 bg-yellow-400/15 border border-yellow-400/30' : 'text-gray-400 bg-gray-400/15 border border-gray-400/30'"
                        >
                          {{ isMaintenanceMode ? 'Activé' : 'Désactivé' }}
                        </span>
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="isMaintenanceLoading || isTogglingMaintenance"
                          @click="handleMaintenanceToggle"
                        >
                          <span v-if="!isTogglingMaintenance">
                            {{ isMaintenanceMode ? 'Désactiver' : 'Activer' }}
                          </span>
                          <span v-else>En cours...</span>
                        </RunicButton>
                      </div>
                    </div>

                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Onglet: Bot & Actions -->
          <div v-show="activeTab === 'bot'" class="flex flex-col gap-8">
            <!-- Section: Configuration Bot -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="CONFIGURATION BOT"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Bot Triggers Configuration -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Triggers Automatiques</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Gerer les parametres des triggers automatiques du bot Twitch
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          @click="showBotConfigModal = true"
                        >
                          ⚙️ Configurer
                        </RunicButton>
                      </div>
                    </div>

                    <!-- Daily Limits Reset -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Reset Limites Quotidiennes</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Reinitialise les !booster et !vaals pour tous les utilisateurs
                        </p>
                        <p
                          v-if="dailyLimitsResetMessage"
                          class="font-body text-base mt-1 m-0"
                          :class="dailyLimitsResetMessage.type === 'success' ? 'text-green-400' : 'text-red-400'"
                        >
                          {{ dailyLimitsResetMessage.text }}
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="danger"
                          :disabled="isResettingDailyLimits"
                          @click="resetDailyLimits"
                        >
                          <span v-if="!isResettingDailyLimits">🌀 Reset All</span>
                          <span v-else>En cours...</span>
                        </RunicButton>
                      </div>
                    </div>

                    <!-- Credit Vaal Orbs -->
                    <div v-if="isSupabaseData" class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Crediter 5 Vaal Orbs</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Ajouter 5 Vaal Orbs pour l'utilisateur actuel
                        </p>
                      </div>
                      <div class="flex flex-col gap-3 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="!user?.id || isCreditingVaalOrbs"
                          @click="creditVaalOrbs"
                        >
                          <span v-if="!isCreditingVaalOrbs">✨ Crediter</span>
                          <span v-else>Credit en cours...</span>
                        </RunicButton>
                        <div v-if="creditVaalOrbsMessage"
                          class="w-full p-2 rounded text-center font-display text-sm"
                          :class="{
                            'bg-green-900/20 border border-green-700/40 text-green-200': creditVaalOrbsMessage.type === 'success',
                            'bg-red-900/20 border border-red-700/40 text-red-200': creditVaalOrbsMessage.type === 'error'
                          }"
                        >
                          {{ creditVaalOrbsMessage.text }}
                        </div>
                      </div>
                    </div>
                  </div>
                </RunicBox>

                <!-- Section: Batch Events (Patch Notes) -->
                <RunicHeader
                  title="BATCH EVENTS / PATCH NOTES"
                  attached
                />
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Delay Configuration -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">
                          Delai entre evenements
                        </label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Temps d'attente entre chaque action (en ms)
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicSlider
                          :model-value="batchEventDelayMs"
                          @update:model-value="batchEventDelayMs = $event"
                          :min="1000"
                          :max="10000"
                          :step="500"
                          value-suffix="ms"
                          size="sm"
                        />
                      </div>
                    </div>

                    <!-- Batch Event Presets -->
                    <div class="flex flex-col gap-4">
                      <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">
                        Presets disponibles
                      </label>

                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div
                          v-for="preset in batchEventPresets"
                          :key="preset.id"
                          class="flex flex-col gap-3 p-4 bg-black/30 border border-poe-border/40 rounded-lg"
                        >
                          <div class="flex items-center gap-2">
                            <span class="text-2xl">{{ preset.emoji }}</span>
                            <span class="font-display text-lg font-bold text-poe-text">
                              {{ preset.label }}
                            </span>
                          </div>
                          <p class="font-body text-sm text-poe-text-dim">
                            {{ preset.description }}
                          </p>
                          <RunicButton
                            size="md"
                            variant="danger"
                            :disabled="isTriggeringBatchEvent[preset.id]"
                            @click="triggerBatchEvent(preset.id)"
                            class="w-full mt-auto"
                          >
                            <span v-if="!isTriggeringBatchEvent[preset.id]">
                              🚀 Lancer
                            </span>
                            <span v-else>
                              En cours...
                            </span>
                          </RunicButton>
                        </div>
                      </div>
                    </div>

                    <!-- Message feedback -->
                    <div
                      v-if="batchEventMessage"
                      class="w-full p-3 rounded text-center font-display text-lg"
                      :class="{
                        'bg-green-900/20 border border-green-700/40 text-green-200': batchEventMessage.type === 'success',
                        'bg-red-900/20 border border-red-700/40 text-red-200': batchEventMessage.type === 'error'
                      }"
                    >
                      {{ batchEventMessage.text }}
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>

            <!-- Section: Actions Bot -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="ACTIONS BOT"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Username input -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Nom d'utilisateur</label>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <input
                          v-model="botActionUsername"
                          type="text"
                          class="w-full px-3 py-2 bg-[rgba(20,15,10,0.6)] border border-accent/30 rounded text-poe-text font-display text-lg transition-all focus:outline-none focus:border-accent/60 focus:bg-[rgba(20,15,10,0.8)] placeholder:text-poe-text/40"
                          placeholder="Nom d'utilisateur Twitch"
                          :disabled="isTriggeringBooster || isTriggeringVaalOrbs"
                        />
                      </div>
                    </div>

                    <!-- Bot action buttons -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Actions disponibles</label>
                      </div>
                      <div class="flex flex-col gap-3 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="!botActionUsername || isTriggeringBooster || isTriggeringVaalOrbs"
                          @click="triggerBooster"
                          class="w-full"
                        >
                          <span v-if="!isTriggeringBooster">🎁 Ouvrir un Booster</span>
                          <span v-else>Ouverture...</span>
                        </RunicButton>
                        <RunicButton
                          size="md"
                          variant="secondary"
                          :disabled="!botActionUsername || isTriggeringBooster || isTriggeringVaalOrbs"
                          @click="triggerVaalOrbs"
                          class="w-full"
                        >
                          <span v-if="!isTriggeringVaalOrbs">✨ Acheter 5 Vaal Orbs</span>
                          <span v-else>Achat...</span>
                        </RunicButton>
                      </div>
                    </div>

                    <!-- Bot action message -->
                    <div v-if="botActionMessage" class="flex items-start justify-between gap-6">
                      <div
                        class="w-full p-3 rounded text-center font-display text-lg"
                        :class="{
                          'bg-green-900/20 border border-green-700/40 text-green-200': botActionMessage.type === 'success',
                          'bg-red-900/20 border border-red-700/40 text-red-200': botActionMessage.type === 'error'
                        }"
                      >
                        {{ botActionMessage.text }}
                      </div>
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Onglet: Donnees & Backups -->
          <div v-show="activeTab === 'data'" class="flex flex-col gap-8">
            <!-- Section: Source des Donnees -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="SOURCE DES DONNEES"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Data Source -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Source des Donnees</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Basculer entre les donnees de production et les donnees de test
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicSelect
                          v-model="dataSourceModel"
                          :options="dataSourceOptions"
                          size="md"
                        />
                      </div>
                    </div>

                    <!-- Vaal Orbs Debug (Mock mode only) -->
                    <div v-if="isMockData" class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Vaal Orbs (Debug)</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Nombre de Vaal Orbs pour les tests
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <div class="flex items-center justify-center gap-4 p-2 px-3 bg-black/30 border border-poe-border/40 rounded-md">
                          <button
                            class="w-8 h-8 flex items-center justify-center bg-accent/10 border border-accent/30 rounded text-poe-text font-display text-lg font-semibold cursor-pointer transition-all hover:bg-accent/20 hover:border-accent/50 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
                            :disabled="debugVaalOrbs <= 0 || isUpdatingVaalOrbs"
                            @click="updateDebugVaalOrbs(-1)"
                          >
                            −
                          </button>
                          <span class="font-display text-[1.375rem] font-bold text-poe-text min-w-[2.5ch] text-center">{{ debugVaalOrbs }}</span>
                          <button
                            class="w-8 h-8 flex items-center justify-center bg-accent/10 border border-accent/30 rounded text-poe-text font-display text-lg font-semibold cursor-pointer transition-all hover:bg-accent/20 hover:border-accent/50 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
                            :disabled="debugVaalOrbs >= 99 || isUpdatingVaalOrbs"
                            @click="updateDebugVaalOrbs(1)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>

            <!-- Section: Backups -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="GESTION DES BACKUPS"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Create Backup -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Creer un Backup</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Sauvegarde complete de toutes les donnees
                        </p>
                      </div>
                      <div class="flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="isCreatingBackup"
                          @click="createBackup"
                        >
                          <span v-if="isCreatingBackup" class="flex items-center gap-2.5">
                            <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            {{ t("admin.dataSource.backingUp") }}
                          </span>
                          <span v-else>
                            {{ t("admin.dataSource.backupButton") }}
                          </span>
                        </RunicButton>
                      </div>
                    </div>

                    <!-- Restore Backup -->
                    <div class="flex flex-col gap-4 pb-5 border-b border-poe-border/20">
                      <div class="flex items-start justify-between gap-6">
                        <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                          <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Restaurer un Backup</label>
                          <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                            ⚠️ Remplace toutes les donnees actuelles
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-col gap-3">
                        <div v-if="isLoadingBackups" class="flex items-center gap-2 text-poe-text-dim">
                          <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          <span>Chargement des backups...</span>
                        </div>
                        <div v-else-if="backupsList.length === 0" class="text-poe-text-dim italic">
                          Aucun backup disponible
                        </div>
                        <RunicSelect
                          v-else
                          v-model="selectedBackupId"
                          :options="backupsList.map(b => ({ value: b.id, label: formatBackupName(b) }))"
                          size="md"
                          placeholder="Selectionner un backup"
                          :disabled="isRestoringBackup"
                        />

                        <div v-if="selectedBackupId" class="flex flex-col gap-2">
                          <label class="font-display text-sm font-semibold text-poe-text">
                            {{ t("admin.dataSource.restoreMode.label") }}
                          </label>
                          <RunicSelect
                            v-model="restoreMode"
                            :options="[
                              { value: 'permissive', label: t('admin.dataSource.restoreMode.permissive.label') },
                              { value: 'strict', label: t('admin.dataSource.restoreMode.strict.label') }
                            ]"
                            size="md"
                            :disabled="isRestoringBackup"
                          />
                          <p class="font-body text-xs text-poe-text-dim leading-relaxed">
                            <span v-if="restoreMode === 'strict'">
                              {{ t("admin.dataSource.restoreMode.strict.description") }}
                            </span>
                            <span v-else>
                              {{ t("admin.dataSource.restoreMode.permissive.description") }}
                            </span>
                          </p>
                        </div>

                        <RunicButton
                          size="md"
                          variant="danger"
                          :disabled="!selectedBackupId || isRestoringBackup"
                          @click="restoreBackup"
                          class="w-full"
                        >
                          <span v-if="!isRestoringBackup">🔄 Restaurer</span>
                          <span v-else class="flex items-center gap-2.5">
                            <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            Restauration...
                          </span>
                        </RunicButton>

                        <div v-if="restoreBackupMessage"
                          class="w-full p-3 rounded text-center font-display text-sm"
                          :class="{
                            'bg-green-900/20 border border-green-700/40 text-green-200': restoreBackupMessage.type === 'success',
                            'bg-red-900/20 border border-red-700/40 text-red-200': restoreBackupMessage.type === 'error'
                          }"
                        >
                          {{ restoreBackupMessage.text }}
                        </div>
                      </div>
                    </div>

                    <!-- Sync Test Data -->
                    <div v-if="isMockData" class="flex items-start justify-between gap-6">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Sync Donnees de Test</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Synchroniser depuis la production
                        </p>
                      </div>
                      <div class="flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="isSyncingTestData"
                          @click="syncTestData"
                        >
                          <span v-if="isSyncingTestData" class="flex items-center gap-2.5">
                            <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            {{ t("admin.dataSource.syncing") }}
                          </span>
                          <span v-else>
                            {{ t("admin.dataSource.syncButton") }}
                          </span>
                        </RunicButton>
                      </div>
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Onglet: Registre -->
          <div v-show="activeTab === 'registry'" class="flex flex-col gap-8">
            <div class="flex flex-col w-full">
              <RunicHeader
                title="REGISTRE DES CARTES"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Header with button -->
                    <div class="flex items-center justify-between">
                      <span class="font-body text-lg text-poe-text-dim">
                        {{ filteredRegistryCards.length }} / {{ registryCatalogue.length }} carte(s)
                      </span>
                      <RunicButton
                        size="md"
                        variant="primary"
                        @click="openNewCard"
                      >
                        ✨ Nouvelle Carte
                      </RunicButton>
                    </div>

                    <!-- Search and Filters -->
                    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <!-- Search -->
                      <RunicInput
                        v-model="registrySearch"
                        placeholder="Rechercher une carte..."
                        class="flex-1 w-full sm:w-auto"
                      />

                      <!-- Tier Radio -->
                      <RunicRadio
                        v-model="registryTierFilter"
                        :options="tierFilterOptions"
                        size="sm"
                      />
                    </div>

                    <!-- Loading -->
                    <div v-if="registryLoading" class="flex items-center justify-center gap-3 py-12">
                      <span class="w-6 h-6 border-2 border-accent/30 border-t-accent/80 rounded-full animate-spin"></span>
                      <span class="font-body text-lg text-poe-text-dim">Chargement du catalogue...</span>
                    </div>

                    <!-- Card Grid -->
                    <div v-else-if="filteredRegistryCards.length > 0" class="registry-grid">
                      <GameCard
                        v-for="card in filteredRegistryCards"
                        :key="card.uid"
                        :ref="(el: any) => setGameCardRef(el, card)"
                        :card="card"
                        :owned="true"
                        :center-offset="420"
                        :class="{ 'registry-grid__card--selected': editingCard?.uid === card.uid }"
                        @click="openCardEdit"
                        @close="handleGameCardClose"
                      />
                    </div>

                    <!-- Empty State -->
                    <div v-else class="flex flex-col items-center justify-center gap-4 py-12 text-poe-text-dim">
                      <span class="text-4xl">📭</span>
                      <p class="font-body text-lg">Aucune carte trouvée</p>
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Onglet: Diagnostics -->
          <div v-show="activeTab === 'diagnostics'" class="flex flex-col gap-8">
            <div class="flex flex-col w-full">
              <RunicHeader
                title="DIAGNOSTICS"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Error Logs -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Logs d'Erreurs</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Visualiser et gerer les erreurs de l'application
                        </p>
                      </div>
                    </div>
                    <RunicButton
                      to="/admin/errors"
                      icon="external"
                      variant="primary"
                      size="md"
                      class="w-full"
                    >
                      VOIR LES LOGS
                    </RunicButton>

                    <!-- Force Outcome (debug) -->
                    <div class="flex items-start justify-between gap-6 pt-5 border-t border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Forcer Issue (Debug)</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Forcer un resultat specifique pour l'autel
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicSelect
                          v-model="forcedOutcome"
                          :options="forcedOutcomeOptions"
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="flex flex-col gap-5">
                      <p class="font-body text-lg">Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </RunicBox>

      <!-- Card Edit Side Panel -->
      <AdminCardEditSidePanel
        :is-open="showCardEditPanel"
        :card="editingCard"
        @update:is-open="(val) => { if (!val) closeCardEditAll(); else showCardEditPanel = val; }"
        @save="handleCardSave"
        @close="closeCardEditAll"
      />

      <!-- Bot Config Modal - Runic Interface -->
      <ClientOnly>
        <Teleport to="body">
          <Transition name="triggers-modal">
            <div
              v-if="showBotConfigModal"
              class="triggers-modal"
              @click.self="!hasUnsavedChanges && (showBotConfigModal = false)"
            >
              <div class="triggers-modal__container">
                <!-- Fixed Header -->
                <div class="triggers-modal__header">
                  <h2 class="triggers-modal__title">
                    <span class="triggers-modal__icon">◆</span>
                    Configuration des Triggers
                    <span class="triggers-modal__icon">◆</span>
                  </h2>
                  <button
                    @click="hasUnsavedChanges ? null : (showBotConfigModal = false)"
                    :disabled="hasUnsavedChanges"
                    class="triggers-modal__close"
                    :title="hasUnsavedChanges ? 'Sauvegardez ou annulez les changements' : 'Fermer'"
                  >
                    <RunicIcon name="close" size="sm" />
                  </button>
                </div>

                <!-- Scrollable Body -->
                <div class="triggers-modal__body runic-scrollbar">
                  <!-- Loading state -->
                  <div v-if="botConfigLoading" class="triggers-modal__loading">
                    <span class="triggers-modal__spinner"></span>
                    <span>Chargement de la configuration...</span>
                  </div>

                  <!-- Config form -->
                  <div v-else class="triggers-modal__content">
                    <!-- Messages -->
                    <div
                      v-if="botConfigMessage"
                      class="triggers-message"
                      :class="botConfigMessage.type === 'success' ? 'triggers-message--success' : 'triggers-message--error'"
                    >
                      {{ botConfigMessage.text }}
                    </div>

                    <div
                      v-if="manualTriggerMessage"
                      class="triggers-message"
                      :class="manualTriggerMessage.type === 'success' ? 'triggers-message--success' : 'triggers-message--error'"
                    >
                      {{ manualTriggerMessage.text }}
                    </div>

                    <!-- Section 1: Activation -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Activation</h3>
                      </div>
                      <div class="triggers-box__row">
                        <div class="triggers-box__info">
                          <span class="triggers-box__label">Triggers automatiques</span>
                          <span class="triggers-box__desc">Active ou désactive le système de triggers</span>
                        </div>
                        <RunicRadio
                          :model-value="pendingBotConfig['auto_triggers_enabled'] === 'true'"
                          :toggle="true"
                          size="md"
                          toggle-color="default"
                          :disabled="botConfigSaving"
                          @update:model-value="pendingBotConfig['auto_triggers_enabled'] = $event ? 'true' : 'false'"
                        />
                      </div>
                    </RunicBox>

                    <!-- Section 2: Distribution des Triggers -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Distribution des Triggers</h3>
                        <div class="triggers-box__badge" :class="isTotalValid ? 'triggers-box__badge--valid' : 'triggers-box__badge--invalid'">
                          Total: {{ totalTriggerPercent }}%
                        </div>
                      </div>

                      <p class="triggers-box__intro">
                        Ajustez les probabilités de chaque trigger. Verrouillez une valeur pour la protéger lors de l'auto-balance.
                      </p>

                      <!-- Trigger List -->
                      <div class="trigger-list">
                        <div
                          v-for="trigger in triggerList"
                          :key="trigger.key"
                          class="trigger-row"
                        >
                          <div class="trigger-row__info">
                            <span class="trigger-row__emoji">{{ trigger.emoji }}</span>
                            <div class="trigger-row__text">
                              <span class="trigger-row__label">{{ trigger.label }}</span>
                              <span class="trigger-row__effect" :class="`trigger-row__effect--${trigger.type}`">{{ trigger.effect }}</span>
                            </div>
                          </div>
                          <div class="trigger-row__controls">
                            <RunicSlider
                              :model-value="Math.round((parseFloat(pendingBotConfig[trigger.key]) || 0) * 100)"
                              @update:model-value="adjustProbabilities(trigger.key, $event)"
                              :min="0"
                              :max="50"
                              :step="1"
                              :disabled="botConfigSaving || lockedTriggers.has(trigger.key)"
                              value-suffix="%"
                              size="sm"
                            />
                            <button
                              @click="toggleTriggerLock(trigger.key)"
                              :disabled="botConfigSaving"
                              class="trigger-row__btn"
                              :class="{ 'trigger-row__btn--locked': lockedTriggers.has(trigger.key) }"
                              :title="lockedTriggers.has(trigger.key) ? 'Déverrouiller' : 'Verrouiller'"
                            >
                              {{ lockedTriggers.has(trigger.key) ? '🔒' : '🔓' }}
                            </button>
                            <button
                              @click="triggerManualTrigger(configKeyToTriggerType[trigger.key])"
                              :disabled="manualTriggerLoading[configKeyToTriggerType[trigger.key]] || botConfigSaving"
                              class="trigger-row__btn trigger-row__btn--test"
                              :title="`Tester ${trigger.label}`"
                            >
                              <span v-if="manualTriggerLoading[configKeyToTriggerType[trigger.key]]" class="trigger-row__spinner"></span>
                              <span v-else>▶</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <button @click="distributeEvenly" :disabled="botConfigSaving" class="triggers-box__action">
                        🔄 Répartir également
                      </button>
                    </RunicBox>

                    <!-- Section 3: Timing -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Timing des Triggers</h3>
                      </div>

                      <div class="triggers-box__grid">
                        <div class="triggers-box__card">
                          <span class="triggers-box__label">Intervalle minimum</span>
                          <RunicSlider
                            :model-value="getMinutesFromSeconds('auto_triggers_min_interval')"
                            @update:model-value="setMinutesToSeconds('auto_triggers_min_interval', $event)"
                            :min="1"
                            :max="30"
                            :step="1"
                            :disabled="botConfigSaving"
                            value-suffix=" min"
                            size="sm"
                          />
                        </div>
                        <div class="triggers-box__card">
                          <span class="triggers-box__label">Intervalle maximum</span>
                          <RunicSlider
                            :model-value="getMinutesFromSeconds('auto_triggers_max_interval')"
                            @update:model-value="setMinutesToSeconds('auto_triggers_max_interval', $event)"
                            :min="1"
                            :max="60"
                            :step="1"
                            :disabled="botConfigSaving"
                            value-suffix=" min"
                            size="sm"
                          />
                        </div>
                      </div>

                      <p class="triggers-box__hint">
                        Un trigger se déclenchera aléatoirement entre {{ getMinutesFromSeconds('auto_triggers_min_interval') }} et {{ getMinutesFromSeconds('auto_triggers_max_interval') }} minutes.
                      </p>
                    </RunicBox>

                    <!-- Section 4: Protection Anti-Focus -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Protection Anti-Focus</h3>
                      </div>

                      <div class="triggers-box__grid">
                        <div class="triggers-box__card">
                          <span class="triggers-box__label">Cooldown par joueur</span>
                          <RunicSlider
                            :model-value="getMinutesFromMs('auto_triggers_target_cooldown')"
                            @update:model-value="setMinutesToMs('auto_triggers_target_cooldown', $event)"
                            :min="1"
                            :max="30"
                            :step="1"
                            :disabled="botConfigSaving"
                            value-suffix=" min"
                            size="sm"
                          />
                          <span class="triggers-box__desc">Délai avant de re-cibler le même joueur</span>
                        </div>
                        <div class="triggers-box__card">
                          <span class="triggers-box__label">Fenêtre d'activité</span>
                          <RunicSlider
                            :model-value="getMinutesFromMs('auto_triggers_user_activity_window')"
                            @update:model-value="setMinutesToMs('auto_triggers_user_activity_window', $event)"
                            :min="5"
                            :max="60"
                            :step="5"
                            :disabled="botConfigSaving"
                            value-suffix=" min"
                            size="sm"
                          />
                          <span class="triggers-box__desc">Temps pour considérer un joueur actif</span>
                        </div>
                      </div>

                      <div class="triggers-box__row triggers-box__row--spaced">
                        <div class="triggers-box__info">
                          <span class="triggers-box__label">Joueurs min. pour cooldown strict</span>
                          <span class="triggers-box__desc">Joueurs actifs requis pour appliquer le cooldown</span>
                        </div>
                        <input
                          v-model="pendingBotConfig['auto_triggers_min_users_for_cooldown']"
                          type="number"
                          min="1"
                          max="20"
                          :disabled="botConfigSaving"
                          class="triggers-box__input"
                        />
                      </div>
                    </RunicBox>

                    <!-- Section 5: Limites Journalières -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Limites Journalières</h3>
                      </div>

                      <div class="triggers-box__grid">
                        <div class="triggers-box__row triggers-box__row--compact">
                          <div class="triggers-box__info">
                            <span class="triggers-box__label">!booster par jour</span>
                            <span class="triggers-box__desc">Max par utilisateur</span>
                          </div>
                          <input
                            v-model="pendingBotConfig['daily_limit_booster']"
                            type="number"
                            min="1"
                            max="100"
                            :disabled="botConfigSaving"
                            class="triggers-box__input"
                          />
                        </div>
                        <div class="triggers-box__row triggers-box__row--compact">
                          <div class="triggers-box__info">
                            <span class="triggers-box__label">!vaals par jour</span>
                            <span class="triggers-box__desc">Max par utilisateur</span>
                          </div>
                          <input
                            v-model="pendingBotConfig['daily_limit_vaals']"
                            type="number"
                            min="1"
                            max="100"
                            :disabled="botConfigSaving"
                            class="triggers-box__input"
                          />
                        </div>
                      </div>
                    </RunicBox>

                    <!-- Section 6: Buff Atlas Influence -->
                    <RunicBox padding="md" class="triggers-box">
                      <div class="triggers-box__header">
                        <h3 class="triggers-box__title">Buff Atlas Influence</h3>
                      </div>

                      <div class="triggers-box__card">
                        <span class="triggers-box__label">Bonus chance foil sur l'autel</span>
                        <RunicSlider
                          :model-value="Math.round((parseFloat(pendingBotConfig['atlas_influence_foil_boost']) || 0) * 100)"
                          @update:model-value="pendingBotConfig['atlas_influence_foil_boost'] = ($event / 100).toString()"
                          :min="0"
                          :max="100"
                          :step="5"
                          :disabled="botConfigSaving"
                          value-prefix="+"
                          value-suffix="%"
                          size="sm"
                        />
                        <span class="triggers-box__desc">Bonus appliqué lors de la prochaine utilisation de l'autel (usage unique)</span>
                      </div>
                    </RunicBox>
                  </div>
                </div>

                <!-- Fixed Footer -->
                <div class="triggers-modal__footer">
                  <div v-if="hasUnsavedChanges" class="triggers-modal__warning">
                    ⚠️ Modifications non sauvegardées
                  </div>
                  <div class="triggers-modal__actions">
                    <RunicButton
                      @click="cancelBotConfigChanges"
                      :disabled="!hasUnsavedChanges || botConfigSaving"
                      variant="secondary"
                      size="md"
                    >
                      Annuler
                    </RunicButton>
                    <RunicButton
                      @click="saveAllBotConfig"
                      :disabled="!hasUnsavedChanges || botConfigSaving || !isTotalValid"
                      variant="primary"
                      size="md"
                    >
                      <span v-if="botConfigSaving" class="triggers-modal__btn-spinner"></span>
                      {{ botConfigSaving ? 'Sauvegarde...' : 'Sauvegarder' }}
                    </RunicButton>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </ClientOnly>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.admin-page {
  @apply max-w-[1200px];
}

.admin-content {
  @apply flex flex-col gap-6;
}

@media (max-width: 768px) {
  .admin-page {
    @apply px-2 pb-6;
  }

  .admin-content {
    @apply gap-5;
  }
}

/* ==========================================
   TRIGGERS MODAL
   ========================================== */

.triggers-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
}

.triggers-modal__container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 56rem;
  max-height: calc(100vh - 2rem);
  background: linear-gradient(180deg, rgba(18, 18, 22, 0.98) 0%, rgba(12, 12, 15, 0.99) 50%, rgba(14, 14, 18, 0.98) 100%);
  border-radius: 8px;
  border: 1px solid rgba(60, 55, 50, 0.4);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(80, 75, 70, 0.15);
  overflow: hidden;
}

/* Fixed Header */
.triggers-modal__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: linear-gradient(180deg, rgba(25, 25, 30, 0.95) 0%, rgba(18, 18, 22, 0.9) 100%);
  border-bottom: 1px solid rgba(60, 55, 50, 0.3);
}

.triggers-modal__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #c9a227;
  text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
}

.triggers-modal__icon {
  font-size: 0.75rem;
  color: rgba(175, 96, 37, 0.6);
}

.triggers-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  color: rgba(140, 130, 120, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.triggers-modal__close:hover:not(:disabled) {
  background: rgba(175, 96, 37, 0.1);
  border-color: rgba(175, 96, 37, 0.3);
  color: rgba(175, 96, 37, 0.8);
}

.triggers-modal__close:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Scrollable Body */
.triggers-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.triggers-modal__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.triggers-modal__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  font-family: 'Crimson Text', serif;
  font-size: 1rem;
  color: rgba(200, 200, 200, 0.7);
}

.triggers-modal__spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(175, 96, 37, 0.3);
  border-top-color: rgba(175, 96, 37, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Fixed Footer */
.triggers-modal__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(180deg, rgba(18, 18, 22, 0.9) 0%, rgba(14, 14, 18, 0.95) 100%);
  border-top: 1px solid rgba(60, 55, 50, 0.3);
}

.triggers-modal__warning {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(255, 200, 100, 0.9);
}

.triggers-modal__actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.triggers-modal__btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
}

/* Modal Transitions */
.triggers-modal-enter-active,
.triggers-modal-leave-active {
  transition: all 0.3s ease;
}

.triggers-modal-enter-active .triggers-modal__container,
.triggers-modal-leave-active .triggers-modal__container {
  transition: all 0.3s ease;
}

.triggers-modal-enter-from,
.triggers-modal-leave-to {
  opacity: 0;
}

.triggers-modal-enter-from .triggers-modal__container,
.triggers-modal-leave-to .triggers-modal__container {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* ==========================================
   TRIGGERS BOX (Content Sections)
   ========================================== */

.triggers-box {
  margin-bottom: 0;
}

.triggers-box__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.triggers-box__title {
  font-family: 'Cinzel', serif;
  font-size: 1rem;
  font-weight: 700;
  color: #c9a227;
  margin: 0;
  text-shadow: 0 0 12px rgba(201, 162, 39, 0.2);
}

.triggers-box__badge {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  white-space: nowrap;
}

.triggers-box__badge--valid {
  background: rgba(34, 84, 61, 0.3);
  color: #6ee7b7;
  border: 1px solid rgba(34, 84, 61, 0.5);
}

.triggers-box__badge--invalid {
  background: rgba(127, 29, 29, 0.3);
  color: #fca5a5;
  border: 1px solid rgba(127, 29, 29, 0.5);
}

.triggers-box__intro {
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  color: rgba(200, 200, 200, 0.6);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.triggers-box__hint {
  font-family: 'Crimson Text', serif;
  font-size: 0.8125rem;
  font-style: italic;
  color: rgba(175, 96, 37, 0.7);
  margin: 0.75rem 0 0 0;
}

.triggers-box__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .triggers-box__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.triggers-box__card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(40, 38, 35, 0.3);
  border-radius: 4px;
}

.triggers-box__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.triggers-box__row--spaced {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(60, 55, 50, 0.15);
}

.triggers-box__row--compact {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(40, 38, 35, 0.3);
  border-radius: 4px;
}

.triggers-box__info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.triggers-box__label {
  font-family: 'Cinzel', serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e8e4df;
}

.triggers-box__desc {
  font-family: 'Crimson Text', serif;
  font-size: 0.75rem;
  color: rgba(200, 200, 200, 0.5);
  line-height: 1.3;
}

.triggers-box__input {
  width: 4rem;
  padding: 0.375rem 0.5rem;
  background: linear-gradient(180deg, rgba(8, 8, 10, 0.95) 0%, rgba(14, 14, 16, 0.9) 100%);
  border: 1px solid rgba(35, 32, 28, 0.8);
  border-radius: 4px;
  color: #e8e4df;
  font-family: 'Cinzel', serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.triggers-box__input:focus {
  outline: none;
  border-color: rgba(175, 96, 37, 0.5);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(175, 96, 37, 0.2);
}

.triggers-box__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.triggers-box__action {
  margin-top: 0.75rem;
  padding: 0.375rem 0.75rem;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(200, 200, 200, 0.7);
  background: rgba(40, 38, 35, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.triggers-box__action:hover:not(:disabled) {
  color: #e8e4df;
  background: rgba(40, 38, 35, 0.5);
  border-color: rgba(80, 70, 60, 0.4);
}

.triggers-box__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ==========================================
   TRIGGER LIST & ROWS
   ========================================== */

.trigger-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.trigger-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(40, 38, 35, 0.25);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.trigger-row:hover {
  border-color: rgba(60, 55, 50, 0.4);
  background: rgba(0, 0, 0, 0.25);
}

.trigger-row__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trigger-row__emoji {
  font-size: 1.125rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.trigger-row__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.trigger-row__label {
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #e8e4df;
}

.trigger-row__effect {
  font-family: 'Crimson Text', serif;
  font-size: 0.6875rem;
}

.trigger-row__effect--positive { color: #6ee7b7; }
.trigger-row__effect--negative { color: #fca5a5; }
.trigger-row__effect--neutral { color: #fcd34d; }

.trigger-row__controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-left: 2rem;
}

.trigger-row__btn {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 38, 35, 0.3);
  border: 1px solid rgba(60, 55, 50, 0.3);
  border-radius: 4px;
  font-size: 0.75rem;
  color: rgba(200, 200, 200, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.trigger-row__btn:hover:not(:disabled) {
  background: rgba(60, 55, 50, 0.4);
  border-color: rgba(80, 70, 60, 0.5);
  color: #e8e4df;
}

.trigger-row__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.trigger-row__btn--locked {
  color: #fcd34d;
  border-color: rgba(180, 150, 40, 0.3);
}

.trigger-row__btn--test:hover:not(:disabled) {
  background: rgba(175, 96, 37, 0.2);
  border-color: rgba(175, 96, 37, 0.4);
  color: rgba(175, 96, 37, 1);
}

.trigger-row__spinner {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ==========================================
   MESSAGES
   ========================================== */

.triggers-message {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-family: 'Crimson Text', serif;
  font-size: 0.875rem;
  text-align: center;
}

.triggers-message--success {
  background: rgba(34, 84, 61, 0.2);
  border: 1px solid rgba(34, 84, 61, 0.4);
  color: #6ee7b7;
}

.triggers-message--error {
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(127, 29, 29, 0.4);
  color: #fca5a5;
}

/* ==========================================
   ANIMATIONS
   ========================================== */

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==========================================
   RESPONSIVE
   ========================================== */

@media (max-width: 640px) {
  .triggers-modal {
    padding: 0;
    align-items: flex-end;
  }

  .triggers-modal__container {
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
  }

  .triggers-modal__header {
    padding: 0.875rem 1rem;
  }

  .triggers-modal__title {
    font-size: 1rem;
  }

  .triggers-modal__body {
    padding: 1rem;
  }

  .triggers-modal__footer {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
  }

  .triggers-modal__warning {
    text-align: center;
  }

  .triggers-modal__actions {
    width: 100%;
    margin-left: 0;
  }

  .triggers-modal__actions > * {
    flex: 1;
  }

  .triggers-box__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .trigger-row__controls {
    padding-left: 0;
  }
}

/* ==========================================
   REGISTRY GRID
   ========================================== */

.registry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .registry-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .registry-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.75rem;
  }
}

/* Selected card indicator in grid */
.registry-grid__card--selected {
  outline: 2px solid rgba(175, 96, 37, 0.8);
  outline-offset: 4px;
  border-radius: 8px;
}
</style>
