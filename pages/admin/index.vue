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
  const confirmed = await confirm({
    title: 'Restaurer un backup',
    message: '⚠️ ATTENTION : Cette opération va remplacer toutes les données actuelles par celles du backup sélectionné. Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?',
    confirmText: 'Oui, restaurer',
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
        backupId: selectedBackupId.value
      },
    }) as { ok: boolean; message?: string; report?: any };

    if (response.ok) {
      restoreBackupMessage.value = {
        type: 'success',
        text: `✅ Backup restauré avec succès ! ${response.report ? `Utilisateurs: ${response.report.users.updated}, Collections: ${response.report.collections.restored}, Boosters: ${response.report.boosters.created}` : ''}`
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
const activeTab = ref<'main' | 'advanced'>('main');
const tabOptions = computed(() => [
  { value: 'main', label: 'Actions Principales' },
  { value: 'advanced', label: 'Actions Avancées' },
]);

// Bot config modal
const showBotConfigModal = ref(false);
const botConfig = ref<Record<string, string>>({});
const botConfigLoading = ref(false);
const botConfigSaving = ref(false);
const botConfigMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// Load bot config
const loadBotConfig = async () => {
  botConfigLoading.value = true;
  try {
    const response = await $fetch('/api/admin/bot-config');
    if (response.ok && response.config) {
      botConfig.value = response.config;
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
      botConfigMessage.value = {
        type: 'success',
        text: response.message || 'Configuration sauvegardée'
      };
      
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
    title: 'Buffs Temporaires',
    keys: ['atlas_influence_duration', 'atlas_influence_foil_boost']
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
  atlas_influence_duration: 'Durée (minutes)',
  atlas_influence_foil_boost: 'Bonus chance foil',
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
  trigger_atlas_influence: 'Ajoute un buff temporaire qui augmente la chance de foil',
  atlas_influence_duration: 'Durée du buff Atlas Influence en minutes',
  atlas_influence_foil_boost: 'Bonus de chance de foil (0.0 - 1.0) appliqué pendant le buff',
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

          <!-- Actions Principales -->
          <div v-show="activeTab === 'main'" class="flex flex-col gap-8">
            <!-- Section: Contrôles Principaux -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="CONTRÔLES PRINCIPAUX"
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

                    <!-- Bot Triggers Configuration -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Triggers Automatiques</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Gérer les paramètres des triggers automatiques du bot Twitch
                        </p>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="secondary"
                          @click="showBotConfigModal = true"
                        >
                          ⚙️ Configurer
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

          <!-- Actions Avancées -->
          <div v-show="activeTab === 'advanced'" class="flex flex-col gap-8">
            <!-- Section: Logs et Diagnostic -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="LOGS ET DIAGNOSTIC"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Logs d'Erreurs</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Visualiser et gérer les erreurs de l'application pour le débogage
                        </p>
                      </div>
                    </div>
                    <RunicButton
                      to="/admin/errors"
                      icon="external"
                      variant="primary"
                      size="md"
                      class="w-full mt-2"
                    >
                      VOIR LES LOGS
                    </RunicButton>
                  </div>
                </RunicBox>
                <template #fallback>
                  <RunicBox attached padding="lg">
                    <div class="admin-section__content">
                      <p>Chargement...</p>
                    </div>
                  </RunicBox>
                </template>
              </ClientOnly>
            </div>

            <!-- Section: Outils de Test -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="OUTILS DE TEST"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Data Source -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Source des Données</label>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicSelect
                          v-model="dataSourceModel"
                          :options="dataSourceOptions"
                          size="md"
                        />
                      </div>
                    </div>

                    <!-- Force Outcome -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Forcer l'Issue de Corruption</label>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <RunicSelect
                          v-model="forcedOutcome"
                          :options="forcedOutcomeOptions"
                          size="md"
                        />
                      </div>
                    </div>

                    <!-- Credit Vaal Orbs (Production) -->
                    <div v-if="isSupabaseData" class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Créditer 5 Vaal Orbs</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Ajouter 5 Vaal Orbs directement dans Supabase pour l'utilisateur actuel
                        </p>
                      </div>
                      <div class="flex flex-col gap-3 flex-shrink-0">
                        <RunicButton
                          size="md"
                          variant="primary"
                          :disabled="!user?.id || isCreditingVaalOrbs"
                          @click="creditVaalOrbs"
                        >
                          <span v-if="!isCreditingVaalOrbs">✨ Créditer 5 Vaal Orbs</span>
                          <span v-else>Crédit en cours...</span>
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

                    <!-- Vaal Orbs -->
                    <div v-if="isMockData" class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Vaal Orbs</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Nombre de Vaal Orbs disponibles pour les tests
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
                    <div v-else class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <p class="font-body text-lg text-poe-text-dim/60 text-center italic m-0 py-2">
                        Les contrôles de debug Vaal Orbs sont disponibles uniquement en mode mock.
                      </p>
                    </div>

                    <!-- Bot Actions -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Actions du Bot</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Déclencher des actions du bot pour tester
                        </p>
                      </div>
                    </div>

                    <!-- Username input for bot actions -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Nom d'utilisateur</label>
                      </div>
                      <div class="flex items-center gap-3.5 flex-shrink-0">
                        <input
                          v-model="botActionUsername"
                          type="text"
                          class="w-full px-3 py-2 bg-[rgba(20,15,10,0.6)] border border-accent/30 rounded text-poe-text font-display text-lg transition-all focus:outline-none focus:border-accent/60 focus:bg-[rgba(20,15,10,0.8)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-poe-text/40"
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
                    <div v-if="botActionMessage" class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20 last:border-0 last:pb-0">
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

            <!-- Section: Gestion des Données -->
            <div class="flex flex-col w-full">
              <RunicHeader
                title="GESTION DES DONNÉES"
                attached
              />
              <ClientOnly>
                <RunicBox attached padding="lg">
                  <div class="flex flex-col gap-5">
                    <!-- Create Backup -->
                    <div class="flex items-start justify-between gap-6 pb-5 border-b border-poe-border/20">
                      <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Créer un Backup</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Créer une sauvegarde complète de toutes les données (utilisateurs, collections, boosters, cartes, configuration)
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
                            Restaurer les données depuis un backup précédent. ⚠️ Cette opération remplace toutes les données actuelles.
                          </p>
                        </div>
                      </div>
                      
                      <!-- Backup Select -->
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
                          placeholder="Sélectionner un backup"
                          :disabled="isRestoringBackup"
                        />
                        
                        <!-- Restore Button -->
                        <RunicButton
                          size="md"
                          variant="danger"
                          :disabled="!selectedBackupId || isRestoringBackup"
                          @click="restoreBackup"
                          class="w-full"
                        >
                          <span v-if="!isRestoringBackup">🔄 Restaurer le backup sélectionné</span>
                          <span v-else class="flex items-center gap-2.5">
                            <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            Restauration en cours...
                          </span>
                        </RunicButton>
                        
                        <!-- Restore Message -->
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
                        <label class="font-display text-lg font-bold text-poe-text m-0 leading-tight">Synchroniser les Données de Test</label>
                        <p class="font-body text-lg text-poe-text-dim leading-relaxed m-0">
                          Synchroniser les données de test depuis la base de données de production
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
        </div>
      </RunicBox>

      <!-- Bot Config Modal -->
      <ClientOnly>
        <div
          v-if="showBotConfigModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          @click.self="showBotConfigModal = false"
        >
          <RunicBox
            class="max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
            padding="lg"
          >
            <div class="flex flex-col gap-6">
              <!-- Header -->
              <div class="flex items-center justify-between">
                <RunicHeader
                  title="Triggers Automatiques"
                  attached
                />
                <button
                  @click="showBotConfigModal = false"
                  class="w-8 h-8 flex items-center justify-center text-poe-text-dim hover:text-poe-text transition-colors"
                >
                  ✕
                </button>
              </div>

              <!-- Loading state -->
              <div v-if="botConfigLoading" class="flex items-center justify-center py-8">
                <span class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
                <span class="ml-3 font-body text-lg text-poe-text-dim">Chargement...</span>
              </div>

              <!-- Config form -->
              <div v-else class="flex flex-col gap-6">
                <!-- Config save message -->
                <div
                  v-if="botConfigMessage"
                  class="p-3 rounded text-center font-display text-base"
                  :class="{
                    'bg-green-900/20 border border-green-700/40 text-green-200': botConfigMessage.type === 'success',
                    'bg-red-900/20 border border-red-700/40 text-red-200': botConfigMessage.type === 'error'
                  }"
                >
                  {{ botConfigMessage.text }}
                </div>

                <!-- Manual trigger message -->
                <div
                  v-if="manualTriggerMessage"
                  class="p-3 rounded text-center font-display text-base"
                  :class="{
                    'bg-green-900/20 border border-green-700/40 text-green-200': manualTriggerMessage.type === 'success',
                    'bg-red-900/20 border border-red-700/40 text-red-200': manualTriggerMessage.type === 'error'
                  }"
                >
                  {{ manualTriggerMessage.text }}
                </div>

                <!-- Config groups -->
                <div
                  v-for="(group, groupKey) in configGroups"
                  :key="groupKey"
                  class="flex flex-col gap-4 pb-6 border-b border-poe-border/20 last:border-0 last:pb-0"
                >
                  <h3 class="font-display text-xl font-bold text-poe-text">{{ group.title }}</h3>
                  
                  <div class="flex flex-col gap-4">
                    <div
                      v-for="key in group.keys"
                      :key="key"
                      class="flex items-start justify-between gap-4"
                    >
                      <div class="flex-1 flex flex-col gap-1 min-w-0">
                        <label class="font-display text-base font-semibold text-poe-text">
                          {{ configLabels[key] || key }}
                        </label>
                        <p v-if="configDescriptions[key]" class="font-body text-sm text-poe-text-dim leading-relaxed m-0">
                          {{ configDescriptions[key] }}
                        </p>
                        <span class="font-body text-xs text-poe-text-dim/60 font-mono">{{ key }}</span>
                      </div>
                      <div class="flex items-center gap-3 flex-shrink-0">
                        <!-- Boolean toggle -->
                        <RunicRadio
                          v-if="key === 'auto_triggers_enabled'"
                          :model-value="botConfig[key] === 'true'"
                          :toggle="true"
                          size="md"
                          toggle-color="default"
                          :disabled="botConfigSaving"
                          @update:model-value="saveBotConfigValue(key, $event ? 'true' : 'false')"
                        />
                        <!-- Number input with play button for triggers -->
                        <template v-else>
                          <input
                            v-model="botConfig[key]"
                            type="number"
                            step="any"
                            class="w-32 px-3 py-2 bg-[rgba(20,15,10,0.6)] border border-accent/30 rounded text-poe-text font-display text-base transition-all focus:outline-none focus:border-accent/60 focus:bg-[rgba(20,15,10,0.8)] disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="botConfigSaving"
                            @blur="saveBotConfigValue(key, botConfig[key])"
                          />
                          <!-- Play button for trigger probabilities -->
                          <RunicButton
                            v-if="configKeyToTriggerType[key]"
                            @click="triggerManualTrigger(configKeyToTriggerType[key])"
                            :disabled="manualTriggerLoading[configKeyToTriggerType[key]] || botConfigSaving"
                            variant="secondary"
                            size="sm"
                            :icon="manualTriggerLoading[configKeyToTriggerType[key]] ? undefined : 'play'"
                            :title="`Déclencher ${configLabels[key]} manuellement`"
                            class="!w-10 !h-10 !p-0 !min-w-0 !gap-0 !flex items-center justify-center"
                          >
                            <span v-if="manualTriggerLoading[configKeyToTriggerType[key]]" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"></span>
                          </RunicButton>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Info message -->
                <div class="p-4 bg-blue-900/20 border border-blue-700/40 rounded">
                  <p class="font-body text-sm text-blue-200 m-0">
                    💡 Les modifications sont sauvegardées automatiquement. Le bot rechargera la configuration au prochain redémarrage ou reconnexion.
                  </p>
                </div>
              </div>
            </div>
          </RunicBox>
        </div>
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
</style>
