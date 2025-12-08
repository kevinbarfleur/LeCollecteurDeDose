// Foil effect type - currently only Trainer Gallery is used
export type FoilEffectType = 'trainer-gallery'

export function useFoilEffect() {
  // Currently only using trainer-gallery effect
  const selectedFoilEffect = ref<FoilEffectType>('trainer-gallery')

  return {
    selectedFoilEffect: readonly(selectedFoilEffect)
  }
}
