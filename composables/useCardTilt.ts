import { ref, computed, type Ref } from 'vue'
import { useMouseInElement } from '@vueuse/core'

export interface CardTiltOptions {
  maxTilt?: number
  perspective?: number
  scale?: number
  transitionDuration?: number
}

export function useCardTilt(
  cardRef: Ref<HTMLElement | null>,
  options: CardTiltOptions = {}
) {
  const {
    maxTilt = 15,
    perspective = 1000,
    scale = 1.05,
    transitionDuration = 400
  } = options

  const isHovering = ref(false)
  
  const { elementX, elementY, elementWidth, elementHeight, isOutside } = useMouseInElement(cardRef)

  // Calculate tilt based on mouse position
  const tiltX = computed(() => {
    if (isOutside.value || !isHovering.value) return 0
    // Normalize to -1 to 1
    const normalizedY = (elementY.value / elementHeight.value - 0.5) * 2
    return -normalizedY * maxTilt
  })

  const tiltY = computed(() => {
    if (isOutside.value || !isHovering.value) return 0
    // Normalize to -1 to 1
    const normalizedX = (elementX.value / elementWidth.value - 0.5) * 2
    return normalizedX * maxTilt
  })

  // Mouse position as percentage (0-100) for glare/holo effects
  const mouseXPercent = computed(() => {
    if (isOutside.value) return 50
    return (elementX.value / elementWidth.value) * 100
  })

  const mouseYPercent = computed(() => {
    if (isOutside.value) return 50
    return (elementY.value / elementHeight.value) * 100
  })

  // Parallax offset for internal elements (moves opposite to tilt)
  const parallaxX = computed(() => {
    if (isOutside.value || !isHovering.value) return 0
    const normalizedX = (elementX.value / elementWidth.value - 0.5) * 2
    return -normalizedX * 10 // Max 10px movement
  })

  const parallaxY = computed(() => {
    if (isOutside.value || !isHovering.value) return 0
    const normalizedY = (elementY.value / elementHeight.value - 0.5) * 2
    return -normalizedY * 10 // Max 10px movement
  })

  // CSS transform string
  const cardTransform = computed(() => {
    const scaleValue = isHovering.value ? scale : 1
    return `perspective(${perspective}px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg) scale3d(${scaleValue}, ${scaleValue}, ${scaleValue})`
  })

  // Parallax transform for image
  const imageTransform = computed(() => {
    return `translate3d(${parallaxX.value}px, ${parallaxY.value}px, 20px)`
  })

  // CSS transition
  const cardTransition = computed(() => {
    return `transform ${transitionDuration}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`
  })

  // Event handlers
  const onMouseEnter = () => {
    isHovering.value = true
  }

  const onMouseLeave = () => {
    isHovering.value = false
  }

  return {
    isHovering,
    tiltX,
    tiltY,
    mouseXPercent,
    mouseYPercent,
    parallaxX,
    parallaxY,
    cardTransform,
    imageTransform,
    cardTransition,
    onMouseEnter,
    onMouseLeave
  }
}

