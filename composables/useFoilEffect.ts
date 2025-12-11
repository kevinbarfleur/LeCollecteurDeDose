import { ref, readonly, computed } from 'vue';

/**
 * Available foil effect types
 * Each corresponds to a CSS class in foil-effects.css
 */
export type FoilEffectType = 'trainer-gallery' | 'holo-vertical' | 'holo-horizontal' | 'cosmos' | 'radial';

/**
 * Foil effect option for the settings dropdown
 */
export interface FoilEffectOption {
  value: FoilEffectType;
  label: string;
}

/**
 * Foil effects with i18n keys
 */
const FOIL_EFFECTS_KEYS: Array<{ value: FoilEffectType; labelKey: string }> = [
  { value: 'trainer-gallery', labelKey: 'settings.foilEffect.effects.trainerGallery' },
  { value: 'holo-vertical', labelKey: 'settings.foilEffect.effects.holoVertical' },
  { value: 'holo-horizontal', labelKey: 'settings.foilEffect.effects.holoHorizontal' },
  { value: 'cosmos', labelKey: 'settings.foilEffect.effects.cosmos' },
  { value: 'radial', labelKey: 'settings.foilEffect.effects.radial' },
];

// Global state - shared across all components using this composable
const _selectedFoilEffect = ref<FoilEffectType>('trainer-gallery');

/**
 * Composable for managing the foil effect type across the application
 * Uses shared state so the selection persists across components
 */
export function useFoilEffect() {
  const { t } = useI18n();

  /**
   * Foil effects with translated labels
   */
  const foilEffects = computed<FoilEffectOption[]>(() =>
    FOIL_EFFECTS_KEYS.map(opt => ({
      value: opt.value,
      label: t(opt.labelKey),
    }))
  );

  /**
   * Update the selected foil effect
   */
  const setFoilEffect = (effect: FoilEffectType) => {
    _selectedFoilEffect.value = effect;
  };

  return {
    /** Currently selected foil effect (readonly) */
    selectedFoilEffect: readonly(_selectedFoilEffect),
    /** Function to update the selected foil effect */
    setFoilEffect,
    /** List of available foil effects for dropdowns */
    foilEffects,
  };
}
