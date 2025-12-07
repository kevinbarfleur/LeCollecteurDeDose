import { computed, type Ref } from 'vue'

export interface HolographicOptions {
  intensity?: number // 0-1
  enabled?: boolean
}

export function useHolographic(
  mouseXPercent: Ref<number>,
  mouseYPercent: Ref<number>,
  isHovering: Ref<boolean>,
  options: HolographicOptions = {}
) {
  const { 
    intensity = 0.35,
    enabled = true 
  } = options

  // Holographic gradient position based on mouse
  const holoBackground = computed(() => {
    if (!enabled) return 'none'
    
    // Create a conic gradient that moves with the mouse
    const angle = Math.atan2(
      mouseYPercent.value - 50,
      mouseXPercent.value - 50
    ) * (180 / Math.PI)
    
    return `conic-gradient(
      from ${angle + 180}deg at ${mouseXPercent.value}% ${mouseYPercent.value}%,
      #ff0000,
      #ff8000,
      #ffff00,
      #80ff00,
      #00ff00,
      #00ff80,
      #00ffff,
      #0080ff,
      #0000ff,
      #8000ff,
      #ff00ff,
      #ff0080,
      #ff0000
    )`
  })

  // Opacity based on hover state and intensity
  const holoOpacity = computed(() => {
    if (!enabled || !isHovering.value) return 0
    return intensity
  })

  // Glare effect - radial gradient following mouse
  const glareBackground = computed(() => {
    return `radial-gradient(
      circle at ${mouseXPercent.value}% ${mouseYPercent.value}%,
      rgba(255, 255, 255, 0.8) 0%,
      rgba(255, 255, 255, 0.4) 20%,
      transparent 60%
    )`
  })

  const glareOpacity = computed(() => {
    if (!isHovering.value) return 0
    // Intensity varies with mouse position (brighter near edges)
    const distanceFromCenter = Math.sqrt(
      Math.pow(mouseXPercent.value - 50, 2) + 
      Math.pow(mouseYPercent.value - 50, 2)
    ) / 50
    return Math.min(0.4, distanceFromCenter * 0.5)
  })

  // CSS custom properties for the effects
  const holoStyles = computed(() => ({
    '--holo-bg': holoBackground.value,
    '--holo-opacity': holoOpacity.value,
    '--glare-bg': glareBackground.value,
    '--glare-opacity': glareOpacity.value,
    '--glare-x': `${mouseXPercent.value}%`,
    '--glare-y': `${mouseYPercent.value}%`
  }))

  return {
    holoBackground,
    holoOpacity,
    glareBackground,
    glareOpacity,
    holoStyles
  }
}

