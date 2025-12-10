import { ref, readonly } from 'vue';

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
 * Available foil effects with labels
 */
export const FOIL_EFFECTS: FoilEffectOption[] = [
  { value: 'trainer-gallery', label: 'Trainer Gallery' },
  { value: 'holo-vertical', label: 'Holographique Vertical' },
  { value: 'holo-horizontal', label: 'Holographique Horizontal' },
  { value: 'cosmos', label: 'Cosmos' },
  { value: 'radial', label: 'Radial' },
];

// Global state - shared across all components using this composable
const _selectedFoilEffect = ref<FoilEffectType>('trainer-gallery');

/**
 * Composable for managing the foil effect type across the application
 * Uses shared state so the selection persists across components
 */
export function useFoilEffect() {
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
    foilEffects: FOIL_EFFECTS,
  };
}
