import gsap from 'gsap'
import { usePitAttackVFX, type AttackStyle } from './usePitAttackVFX'

/**
 * The Pit — Directional Attack Animations with Style-Specific Lunge Choreography
 *
 * Each attack style (slash, thrust, smash, bolt) produces a DIFFERENT movement
 * pattern on the attacker's panel, not just a different VFX overlay.
 *
 * - slash: curved arc (x + y arc + rotation)
 * - thrust: fast straight line, slight overshoot
 * - smash: lift up then slam down-forward
 * - bolt: brief pullback then snap forward (recoil cast)
 * - generic: simple straight lunge (default)
 */

export interface AttackAnimRefs {
  playerPanel: Ref<HTMLElement | null>
  enemyPanels: Ref<Map<string, HTMLElement>>
  divider: Ref<HTMLElement | null>
}

function getCenter(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function lungeVector(source: HTMLElement, target: HTMLElement, magnitude: number) {
  const s = getCenter(source), t = getCenter(target)
  const dx = t.x - s.x, dy = t.y - s.y
  const xSign = dx >= 0 ? 1 : -1
  const x = xSign * Math.abs(magnitude)
  const yRatio = dy / (Math.abs(dx) || 1)
  const y = Math.max(-Math.abs(magnitude), Math.min(Math.abs(magnitude), yRatio * Math.abs(magnitude) * 0.8))
  return { x, y }
}

function getAnimLayer(el: HTMLElement): HTMLElement {
  let layer = el.querySelector(':scope > .pit-anim-layer') as HTMLElement | null
  if (!layer) {
    layer = document.createElement('div')
    layer.className = 'pit-anim-layer'
    while (el.firstChild) layer.appendChild(el.firstChild)
    el.appendChild(layer)
  }
  return layer
}

// Random variation per attack
const rv = () => gsap.utils.random(0.85, 1.15) as number
const ra = () => gsap.utils.random(-8, 8) as number

export function usePitAttackAnimations(refs: AttackAnimRefs) {
  const vfx = usePitAttackVFX()

  // ==========================================
  // STYLE-SPECIFIC LUNGE TIMELINES
  // ==========================================

  /**
   * Build a GSAP timeline that moves `layer` toward (lx, ly) with
   * style-specific choreography, then returns to (0, 0).
   */
  function buildLungeTimeline(layer: HTMLElement, lx: number, ly: number, style: AttackStyle, isBig: boolean): gsap.core.Timeline {
    const tl = gsap.timeline()
    const mag = Math.sqrt(lx * lx + ly * ly)
    const dir = mag > 0 ? { x: lx / mag, y: ly / mag } : { x: 1, y: 0 }

    switch (style) {

      case 'slash': {
        // Curved arc: swing up-forward, then sweep down through the target, return
        const arcHeight = (isBig ? 18 : 12) * rv()
        const perpX = -dir.y * arcHeight  // perpendicular vector
        const perpY = dir.x * arcHeight
        const rot = (dir.y > 0.2 ? -8 : dir.y < -0.2 ? 8 : 5) * rv()

        tl.to(layer, {
          x: lx * 0.4 + perpX, y: ly * 0.4 + perpY, rotation: rot,
          duration: 0.1 * rv(), ease: 'power2.out',
        })
        .to(layer, {
          x: lx * rv(), y: ly * rv(), rotation: -rot * 0.5,
          duration: 0.08 * rv(), ease: 'power3.in',
        })
        .to(layer, {
          x: 0, y: 0, rotation: 0,
          duration: 0.25 * rv(), ease: 'back.out(2)',
        })
        break
      }

      case 'thrust': {
        // Fast straight stab with overshoot, then snap back
        const overshoot = isBig ? 1.15 : 1.08

        tl.to(layer, {
          x: lx * overshoot * rv(), y: ly * overshoot * rv(),
          duration: 0.09 * rv(), ease: 'power3.out',
        })
        .to(layer, {
          x: lx * 0.85, y: ly * 0.85,
          duration: 0.04, ease: 'power1.in', // slight pullback after stab
        })
        .to(layer, {
          x: 0, y: 0,
          duration: 0.22 * rv(), ease: 'back.out(3)',
        })
        break
      }

      case 'smash': {
        // Lift up, then slam down-forward with weight
        const liftY = -(isBig ? 22 : 15) * rv()

        tl.to(layer, {
          x: lx * 0.15, y: liftY,
          duration: 0.12 * rv(), ease: 'power2.out',
        })
        .to(layer, {
          x: lx * rv(), y: ly + Math.abs(liftY) * 0.3,
          duration: 0.08 * rv(), ease: 'power4.in', // heavy slam
        })
        .to(layer, {
          x: lx * 0.7, y: ly * 0.3,
          duration: 0.06, ease: 'none', // brief hold at impact
        })
        .to(layer, {
          x: 0, y: 0,
          duration: 0.3 * rv(), ease: 'back.out(1.5)',
        })
        break
      }

      case 'bolt': {
        // Pullback (charge), then snap forward fast, return
        const pullback = (isBig ? 10 : 6) * rv()

        tl.to(layer, {
          x: -dir.x * pullback, y: -dir.y * pullback,
          duration: 0.1 * rv(), ease: 'power2.out',
        })
        .to(layer, {
          x: lx * 0.6 * rv(), y: ly * 0.6 * rv(),
          duration: 0.07 * rv(), ease: 'power4.out',
        })
        .to(layer, {
          x: 0, y: 0,
          duration: 0.28 * rv(), ease: 'power2.out',
        })
        break
      }

      default: {
        // Generic: simple straight lunge
        const returnEase = isBig ? 'elastic.out(1, 0.4)' : 'back.out(2.5)'
        tl.to(layer, { x: lx * rv(), y: ly * rv(), duration: 0.14 * rv(), ease: 'power2.out' })
          .to(layer, { x: 0, y: 0, duration: (isBig ? 0.4 : 0.28) * rv(), ease: returnEase })
        break
      }
    }

    return tl
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  function playerAttacks(enemyId: string, isBig: boolean = false, attackStyle: AttackStyle = 'generic') {
    const playerEl = refs.playerPanel.value
    const enemyEl = refs.enemyPanels.value.get(enemyId)
    if (!playerEl) return

    const layer = getAnimLayer(playerEl)
    const magnitude = isBig ? 50 : 35

    let lx = magnitude, ly = 0
    if (enemyEl) {
      const v = lungeVector(playerEl, enemyEl, magnitude)
      lx = v.x; ly = v.y
    }

    gsap.killTweensOf(layer)
    buildLungeTimeline(layer, lx, ly, attackStyle, isBig)

    // Enemy recoil + VFX
    if (enemyEl) {
      const enemyLayer = getAnimLayer(enemyEl)
      const recoilMag = isBig ? 14 : 8
      const rv2 = lungeVector(enemyEl, playerEl, -recoilMag)

      gsap.killTweensOf(enemyLayer)
      gsap.timeline()
        .to(enemyLayer, { x: rv2.x + ra(), y: rv2.y + ra(), duration: 0.08, ease: 'power2.out' })
        .to(enemyLayer, { x: 0, y: 0, duration: 0.2, ease: 'power2.out' })

      flashHit(enemyEl, isBig)
      vfx.play(attackStyle, enemyEl, { intensity: isBig ? 1.3 : 1 })
    }

    pulseDivider('#af6025')
  }

  function enemyAttacks(enemyId: string, isBig: boolean = false, attackStyle: AttackStyle = 'generic') {
    const playerEl = refs.playerPanel.value
    const enemyEl = refs.enemyPanels.value.get(enemyId)

    const magnitude = isBig ? 50 : 35

    // Enemy lunge with style-specific choreography
    if (enemyEl) {
      const layer = getAnimLayer(enemyEl)
      let lx = -magnitude, ly = 0
      if (playerEl) {
        const v = lungeVector(enemyEl, playerEl, magnitude)
        lx = v.x; ly = v.y
      }
      gsap.killTweensOf(layer)
      buildLungeTimeline(layer, lx, ly, attackStyle, isBig)
    }

    // Player hit flash + VFX
    if (playerEl) {
      flashHit(playerEl, isBig)
      vfx.play(attackStyle, playerEl, { intensity: isBig ? 1.3 : 1 })
    }

    pulseDivider('#c83232')
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  function flashHit(el: HTMLElement, isBig: boolean) {
    const flash = document.createElement('div')
    flash.style.cssText = `
      position: absolute; inset: 0; z-index: 15; pointer-events: none;
      border-radius: inherit; opacity: 0;
      background: ${isBig ? 'rgba(200, 50, 50, 0.2)' : 'rgba(255, 255, 255, 0.12)'};
    `
    el.style.position = 'relative'
    el.appendChild(flash)
    gsap.timeline({ onComplete: () => flash.remove() })
      .to(flash, { opacity: 1, duration: 0.06, ease: 'power2.out' })
      .to(flash, { opacity: 0, duration: 0.18, ease: 'power2.out' })
  }

  function pulseDivider(color: string) {
    const div = refs.divider.value
    if (!div) return
    gsap.killTweensOf(div)
    gsap.timeline()
      .to(div, {
        background: `linear-gradient(to bottom, transparent 5%, ${color} 50%, transparent 95%)`,
        boxShadow: `0 0 14px ${color}50`,
        width: 3, duration: 0.12, ease: 'power2.out',
      })
      .to(div, {
        background: 'linear-gradient(to bottom, transparent 5%, rgba(175, 96, 37, 0.12) 50%, transparent 95%)',
        boxShadow: 'none',
        width: 1, duration: 0.4, ease: 'power2.out',
      })
  }

  function bossSpecialTelegraph(enemyId: string) {
    const enemyEl = refs.enemyPanels.value.get(enemyId)
    if (!enemyEl) return
    gsap.to(enemyEl, {
      boxShadow: '0 0 25px rgba(200, 50, 50, 0.35), inset 0 0 18px rgba(200, 50, 50, 0.12)',
      duration: 0.5, ease: 'power2.inOut', yoyo: true, repeat: 3,
      onComplete: () => { gsap.set(enemyEl, { boxShadow: '' }) },
    })
  }

  return { playerAttacks, enemyAttacks, bossSpecialTelegraph }
}
