import gsap from 'gsap'

/**
 * The Pit — Modular Attack VFX System
 *
 * Creates brief visual overlays on the TARGET of an attack.
 * Each attack style (slash, thrust, smash, bolt) has a distinct visual.
 * Random variation per instance prevents identical simultaneous attacks.
 *
 * To add a new style: add a case in playVFX() and define the GSAP timeline.
 * To link a style to a weapon: update PROFILE_ATTACK_STYLE map.
 */

export type AttackStyle = 'slash' | 'thrust' | 'smash' | 'bolt' | 'generic'

// ============================================================================
// PROFILE → STYLE MAPPING
// ============================================================================

export const PROFILE_ATTACK_STYLE: Record<string, AttackStyle> = {
  assault_balanced: 'slash',
  tempo_duelist: 'thrust',
  assault_rend: 'slash',
  heavy_execution: 'smash',
  control_crusher: 'smash',
  venom_leech: 'slash',
  venom_burst: 'thrust',
  occult_venom: 'thrust',
  hunter_ranged: 'thrust',
  ember_caster: 'bolt',
  ember_battlemage: 'bolt',
  channel_guard: 'smash',
  channel_control: 'smash',
}

// ============================================================================
// RANDOM GENERATORS (created once, reused)
// ============================================================================

const rAngle = gsap.utils.random(-15, 15, 1, true) as () => number
const rOffset = gsap.utils.random(-10, 10, 1, true) as () => number
const rScale = gsap.utils.random(0.85, 1.15, 0.01, true) as () => number
const rDuration = gsap.utils.random(0.85, 1.15, 0.01, true) as () => number

// ============================================================================
// CONCURRENT VFX LIMITER
// ============================================================================

let activeVFXCount = 0
const MAX_CONCURRENT = 5

// ============================================================================
// MAIN API
// ============================================================================

export function usePitAttackVFX() {

  /**
   * Play a VFX on a target element.
   * @param style - The attack style
   * @param targetEl - The DOM element to overlay the VFX on
   * @param options - Optional overrides (color for bolts, etc.)
   */
  function play(style: AttackStyle, targetEl: HTMLElement, options?: { color?: string; intensity?: number }) {
    if (activeVFXCount >= MAX_CONCURRENT) return
    if (!targetEl) return

    // Ensure target is positioned for absolute children
    const pos = getComputedStyle(targetEl).position
    if (pos === 'static') targetEl.style.position = 'relative'

    const intensity = options?.intensity ?? 1

    switch (style) {
      case 'slash': playSlash(targetEl, intensity); break
      case 'thrust': playThrust(targetEl, intensity); break
      case 'smash': playSmash(targetEl, intensity); break
      case 'bolt': playBolt(targetEl, options?.color ?? '#ff8844', intensity); break
      case 'generic': playGeneric(targetEl); break
    }
  }

  // ==========================================
  // SLASH — Diagonal arc sweep
  // ==========================================

  function playSlash(target: HTMLElement, intensity: number) {
    const el = document.createElement('div')
    const angle = 30 + rAngle()
    const ox = rOffset()
    const oy = rOffset()
    const scale = rScale() * intensity
    const dur = 0.28 * rDuration()

    el.style.cssText = `
      position: absolute; inset: -10px; z-index: 20; pointer-events: none;
      background: linear-gradient(${angle}deg, transparent 40%, rgba(255,255,255,0.1) 48%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.1) 52%, transparent 60%);
      transform: scaleX(0) translateX(${ox}px) translateY(${oy}px); transform-origin: left center;
      opacity: 0; border-radius: inherit;
    `
    target.appendChild(el)
    activeVFXCount++

    gsap.timeline({ onComplete: () => { el.remove(); activeVFXCount-- } })
      .to(el, { opacity: 0.9, scaleX: scale, duration: dur * 0.4, ease: 'power2.out' })
      .to(el, { opacity: 0, scaleX: scale * 0.7, duration: dur * 0.6, ease: 'power1.in' })
  }

  // ==========================================
  // THRUST — Horizontal line extend
  // ==========================================

  function playThrust(target: HTMLElement, intensity: number) {
    const el = document.createElement('div')
    const oy = 45 + rOffset() * 0.5
    const scale = rScale() * intensity
    const dur = 0.25 * rDuration()

    el.style.cssText = `
      position: absolute; top: ${oy}%; left: 0; right: 30%; height: 2px; z-index: 20; pointer-events: none;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 80%, transparent 100%);
      transform: scaleX(0); transform-origin: left center; opacity: 0;
    `
    target.appendChild(el)
    activeVFXCount++

    gsap.timeline({ onComplete: () => { el.remove(); activeVFXCount-- } })
      .to(el, { opacity: 1, scaleX: scale, duration: dur * 0.35, ease: 'power3.out' })
      .to(el, { opacity: 0, scaleX: scale * 1.2, duration: dur * 0.65, ease: 'power1.in' })
  }

  // ==========================================
  // SMASH — Radial shockwave ring
  // ==========================================

  function playSmash(target: HTMLElement, intensity: number) {
    const el = document.createElement('div')
    const ox = rOffset()
    const oy = rOffset()
    const dur = 0.32 * rDuration()
    const maxSize = 60 + (intensity - 1) * 20

    el.style.cssText = `
      position: absolute; top: calc(50% + ${oy}px); left: calc(50% + ${ox}px); z-index: 20; pointer-events: none;
      width: 0; height: 0; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.6);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 6px rgba(255,255,255,0.3);
    `
    target.appendChild(el)
    activeVFXCount++

    gsap.timeline({ onComplete: () => { el.remove(); activeVFXCount-- } })
      .to(el, {
        width: maxSize, height: maxSize, borderWidth: 1,
        opacity: 0.8, duration: dur * 0.4, ease: 'power2.out',
      })
      .to(el, {
        width: maxSize * 1.5, height: maxSize * 1.5, borderWidth: 0.5,
        opacity: 0, duration: dur * 0.6, ease: 'power1.in',
      })

    // Micro-shake on the target
    const layer = target.querySelector('.pit-anim-layer') as HTMLElement
    if (layer) {
      gsap.to(layer, {
        x: rOffset() * 0.3, y: rOffset() * 0.3,
        duration: 0.05, ease: 'none',
        onComplete: () => gsap.to(layer, { x: 0, y: 0, duration: 0.15, ease: 'power2.out' }),
      })
    }
  }

  // ==========================================
  // BOLT — Glowing orb pulse + burst
  // ==========================================

  function playBolt(target: HTMLElement, color: string, intensity: number) {
    const el = document.createElement('div')
    const ox = rOffset()
    const oy = rOffset()
    const dur = 0.3 * rDuration()

    el.style.cssText = `
      position: absolute; top: calc(50% + ${oy}px); left: calc(50% + ${ox}px); z-index: 20; pointer-events: none;
      width: 6px; height: 6px; border-radius: 50%;
      background: ${color}; box-shadow: 0 0 10px ${color}, 0 0 20px ${color}60;
      transform: translate(-50%, -50%) scale(0); opacity: 0;
    `
    target.appendChild(el)
    activeVFXCount++

    gsap.timeline({ onComplete: () => { el.remove(); activeVFXCount-- } })
      .to(el, {
        scale: 1.5 * rScale() * intensity, opacity: 1,
        duration: dur * 0.3, ease: 'back.out(3)',
      })
      .to(el, {
        scale: 3 * intensity, opacity: 0,
        width: 20, height: 20,
        boxShadow: `0 0 25px ${color}, 0 0 40px ${color}40`,
        duration: dur * 0.7, ease: 'power2.out',
      })
  }

  // ==========================================
  // GENERIC — Simple white flash (fallback)
  // ==========================================

  function playGeneric(target: HTMLElement) {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute; inset: 0; z-index: 15; pointer-events: none;
      border-radius: inherit; opacity: 0;
      background: rgba(255, 255, 255, 0.12);
    `
    target.appendChild(el)
    activeVFXCount++

    gsap.timeline({ onComplete: () => { el.remove(); activeVFXCount-- } })
      .to(el, { opacity: 1, duration: 0.06, ease: 'power2.out' })
      .to(el, { opacity: 0, duration: 0.18, ease: 'power2.out' })
  }

  return { play, PROFILE_ATTACK_STYLE }
}
