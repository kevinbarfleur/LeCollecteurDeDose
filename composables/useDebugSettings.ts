import { useLocalStorageRef } from './useLocalStorageRef';

const DEBUG_SETTINGS_KEY = 'debug_settings';

interface DebugSettings {
  liveEnabled: boolean;
}

const defaultSettings: DebugSettings = {
  liveEnabled: false, // Disabled by default
};

/**
 * Composable for admin/debug settings
 * These settings are stored in localStorage and persist across sessions
 */
export function useDebugSettings() {
  const settings = useLocalStorageRef<DebugSettings>(DEBUG_SETTINGS_KEY, defaultSettings);

  const liveEnabled = computed({
    get: () => settings.value.liveEnabled,
    set: (value: boolean) => {
      settings.value = { ...settings.value, liveEnabled: value };
    },
  });

  const toggleLiveEnabled = () => {
    liveEnabled.value = !liveEnabled.value;
  };

  return {
    liveEnabled,
    toggleLiveEnabled,
  };
}

