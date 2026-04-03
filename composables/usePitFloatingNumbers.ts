import gsap from 'gsap'

/**
 * The Pit — Floating Damage/Heal Numbers with GSAP
 * 3-phase animation: Pop → Float → Sink+Fade
 * Object pool pattern for performance
 */

export type FloatType = 'dmg' | 'crit' | 'heal' | 'poison' | 'burn' | 'dodge' | 'block' | 'special'

interface FloatConfig {
  color: string
  fontSize: string
  popScale: number
  duration: number
  italic: boolean
}

const FLOAT_CONFIGS: Record<FloatType, FloatConfig> = {
  dmg:     { color: '#e74c3c', fontSize: '1rem',   popScale: 1.2,  duration: 1.0, italic: false },
  crit:    { color: '#ff4444', fontSize: '1.4rem',  popScale: 1.5,  duration: 1.4, italic: false },
  heal:    { color: '#27ae60', fontSize: '0.95rem', popScale: 1.1,  duration: 1.2, italic: false },
  poison:  { color: '#2ecc71', fontSize: '0.85rem', popScale: 1.0,  duration: 1.0, italic: true },
  burn:    { color: '#e67e22', fontSize: '0.85rem', popScale: 1.0,  duration: 1.0, italic: true },
  dodge:   { color: '#1abc9c', fontSize: '0.9rem',  popScale: 1.1,  duration: 1.1, italic: true },
  block:   { color: '#5a7080', fontSize: '0.85rem', popScale: 1.0,  duration: 0.9, italic: false },
  special: { color: '#c83232', fontSize: '1.3rem',  popScale: 1.4,  duration: 1.3, italic: false },
}

const POOL_SIZE = 20

export function usePitFloatingNumbers(containerRef: Ref<HTMLElement | null>) {
  const pool: HTMLElement[] = []
  let poolIndex = 0
  let isSetup = false

  function setup() {
    if (isSetup || !containerRef.value) return
    isSetup = true

    // Create pool of reusable elements
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div')
      el.className = 'pit-float-number'
      el.style.cssText = `
        position: absolute;
        pointer-events: none;
        font-family: 'Cinzel', serif;
        font-weight: 700;
        white-space: nowrap;
        opacity: 0;
        z-index: 20;
        text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);
      `
      containerRef.value.appendChild(el)
      pool.push(el)
    }
  }

  /**
   * Spawn a floating number at a position within the container.
   * @param text - The text to display (e.g., "-23", "+5", "Esquive!")
   * @param type - The type of float (determines color, size, behavior)
   * @param x - Horizontal position as percentage (0-100) within container
   * @param y - Vertical position as percentage (0-100) within container
   */
  function spawn(text: string, type: FloatType, x: number = 50, y: number = 50) {
    if (!isSetup) setup()
    if (pool.length === 0) return

    const el = pool[poolIndex % POOL_SIZE]
    poolIndex++

    const config = FLOAT_CONFIGS[type]

    // Kill any existing animation on this element
    gsap.killTweensOf(el)

    // Set initial state
    el.textContent = text
    el.style.color = config.color
    el.style.fontSize = config.fontSize
    el.style.fontStyle = config.italic ? 'italic' : 'normal'

    // Random variations
    const randomX = gsap.utils.random(-45, 45)
    const randomY = gsap.utils.random(-55, -85)
    const randomRotation = gsap.utils.random(-12, 12)

    // Set starting position
    gsap.set(el, {
      left: `${x}%`,
      top: `${y}%`,
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: 0.3,
      rotation: 0,
      x: 0,
      y: 0,
    })

    // 3-phase timeline
    const tl = gsap.timeline()

    // Phase 1: POP (instant burst)
    tl.to(el, {
      opacity: 1,
      scale: config.popScale,
      rotation: randomRotation * 0.3,
      duration: 0.12,
      ease: 'back.out(4)',
    })

    // Phase 2: FLOAT (drift with deceleration)
    tl.to(el, {
      x: randomX,
      y: randomY,
      scale: 1.0,
      rotation: randomRotation,
      duration: config.duration * 0.5,
      ease: 'power2.out',
    })

    // Phase 3: SINK + FADE (gravity pull + disappear)
    tl.to(el, {
      y: `+=${20}`,
      opacity: 0,
      scale: 0.7,
      duration: config.duration * 0.4,
      ease: 'power1.in',
    })
  }

  function destroy() {
    for (const el of pool) {
      gsap.killTweensOf(el)
      el.remove()
    }
    pool.length = 0
    isSetup = false
  }

  return { spawn, destroy, setup }
}
