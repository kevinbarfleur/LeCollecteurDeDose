/**
 * Vaal Orbs Physics Composable
 *
 * Uses Matter.js to create realistic physics for Vaal Orbs
 * in a container box with gravity, collisions, and bouncing.
 */

// Matter.js types
type MatterEngine = any
type MatterRunner = any
type MatterBody = any

// Lazy-loaded Matter.js (client-side only)
let Matter: any = null
let Engine: any = null
let World: any = null
let Bodies: any = null
let Body: any = null
let Runner: any = null

// Load Matter.js dynamically (client-side only)
async function loadMatter() {
  if (Matter) return true
  if (typeof window === 'undefined') return false

  try {
    const module = await import('matter-js')
    Matter = module.default
    Engine = Matter.Engine
    World = Matter.World
    Bodies = Matter.Bodies
    Body = Matter.Body
    Runner = Matter.Runner
    return true
  } catch (e) {
    console.error('[VaalOrbsPhysics] Failed to load Matter.js:', e)
    return false
  }
}

export interface OrbPosition {
  id: number
  x: number
  y: number
  angle: number
  isBeingDragged: boolean
}

export interface UseVaalOrbsPhysicsOptions {
  containerRef: Ref<HTMLElement | null>
  orbCount: Ref<number>
  orbSize?: number
  maxVisibleOrbs?: number  // Maximum orbs to display (rest goes to overflow)
  onPositionUpdate?: (positions: OrbPosition[]) => void
}

export function useVaalOrbsPhysics(options: UseVaalOrbsPhysicsOptions) {
  const {
    containerRef,
    orbCount,
    orbSize = 44,
    maxVisibleOrbs = 15,
    onPositionUpdate
  } = options

  // Matter.js engine and world
  let engine: MatterEngine | null = null
  let runner: MatterRunner | null = null
  let walls: MatterBody[] = []
  let orbs: MatterBody[] = []
  let animationFrameId: number | null = null
  let isInitialized = false
  let isMatterLoaded = false

  // Track which orb is being dragged
  const draggedOrbIndex = ref<number | null>(null)

  // Reactive positions for Vue rendering
  const positions = ref<OrbPosition[]>([])

  // Track visible orb count for overflow calculation
  const visibleOrbCount = ref(0)

  // Computed overflow count (orbs in reserve)
  const overflowCount = computed(() => Math.max(0, orbCount.value - visibleOrbCount.value))

  // Physics parameters
  const WALL_THICKNESS = 50
  const ORB_RADIUS = orbSize / 2
  const RESTITUTION = 0.5 // Bounce factor
  const FRICTION = 0.05
  const FRICTION_AIR = 0.02
  const GRAVITY_SCALE = 0.8

  /**
   * Initialize the physics engine
   */
  async function initPhysics() {
    if (isInitialized) return

    // Load Matter.js if not already loaded
    if (!isMatterLoaded) {
      const loaded = await loadMatter()
      if (!loaded) {
        console.error('[VaalOrbsPhysics] Failed to load Matter.js')
        return
      }
      isMatterLoaded = true
    }

    if (!containerRef.value) return

    const container = containerRef.value
    const bounds = container.getBoundingClientRect()
    const width = bounds.width
    const height = bounds.height

    // Ensure container has actual dimensions
    if (width <= 0 || height <= 0) return

    // Create engine with gravity
    engine = Engine.create({
      gravity: { x: 0, y: GRAVITY_SCALE }
    })

    // Create walls (left, right, bottom) - no top wall so orbs can spawn from above
    walls = [
      // Bottom wall
      Bodies.rectangle(
        width / 2,
        height + WALL_THICKNESS / 2,
        width + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        { isStatic: true, label: 'wall-bottom', friction: FRICTION }
      ),
      // Left wall
      Bodies.rectangle(
        -WALL_THICKNESS / 2,
        height / 2,
        WALL_THICKNESS,
        height * 2,
        { isStatic: true, label: 'wall-left', friction: FRICTION }
      ),
      // Right wall
      Bodies.rectangle(
        width + WALL_THICKNESS / 2,
        height / 2,
        WALL_THICKNESS,
        height * 2,
        { isStatic: true, label: 'wall-right', friction: FRICTION }
      )
    ]

    World.add(engine.world, walls)

    // Create initial orbs (limited to maxVisibleOrbs)
    const initialOrbCount = Math.min(orbCount.value, maxVisibleOrbs)
    createOrbs(initialOrbCount, width, height)

    // Create runner for fixed timestep updates
    runner = Runner.create({
      delta: 1000 / 60
    })
    Runner.run(runner, engine)

    // Mark as initialized BEFORE starting render loop
    isInitialized = true

    // Start render loop
    startRenderLoop()
  }

  /**
   * Create orbs at random positions near the top
   */
  function createOrbs(count: number, containerWidth: number, containerHeight: number) {
    if (!engine) return

    // Remove existing orbs
    if (orbs.length > 0) {
      World.remove(engine.world, orbs)
      orbs = []
    }

    // Create new orbs
    for (let i = 0; i < count; i++) {
      const x = ORB_RADIUS + Math.random() * (containerWidth - ORB_RADIUS * 2)
      const y = -ORB_RADIUS - (i * ORB_RADIUS * 0.5) // Stagger from top

      const orb = Bodies.circle(x, y, ORB_RADIUS, {
        restitution: RESTITUTION,
        friction: FRICTION,
        frictionAir: FRICTION_AIR,
        label: `orb-${i}`,
        // Add slight random velocity for more natural drop
        velocity: { x: (Math.random() - 0.5) * 2, y: Math.random() * 2 }
      })

      orbs.push(orb)
    }

    World.add(engine.world, orbs)
  }

  /**
   * Render loop - syncs Matter.js positions to Vue state
   */
  function startRenderLoop() {
    function update() {
      if (!engine || !isInitialized) return

      // Update positions array
      const newPositions: OrbPosition[] = orbs.map((orb, index) => ({
        id: orb.id,
        x: orb.position.x - ORB_RADIUS,
        y: orb.position.y - ORB_RADIUS,
        angle: orb.angle,
        isBeingDragged: draggedOrbIndex.value === index
      }))

      positions.value = newPositions
      visibleOrbCount.value = orbs.length
      onPositionUpdate?.(newPositions)

      animationFrameId = requestAnimationFrame(update)
    }

    update()
  }

  /**
   * Start dragging an orb - makes it static and controlled by mouse
   */
  function startDrag(index: number) {
    if (!engine || index < 0 || index >= orbs.length) return

    const orb = orbs[index]
    draggedOrbIndex.value = index

    // Make orb static so physics doesn't affect it during drag
    Body.setStatic(orb, true)
  }

  /**
   * Update dragged orb position (call during mouse/touch move)
   */
  function updateDragPosition(index: number, x: number, y: number) {
    if (!engine || index < 0 || index >= orbs.length) return
    if (draggedOrbIndex.value !== index) return

    const orb = orbs[index]
    // Position is center of orb, so adjust for input which is top-left
    Body.setPosition(orb, { x: x + ORB_RADIUS, y: y + ORB_RADIUS })
  }

  /**
   * Drop orb at specific position within the box
   */
  function dropOrbAt(index: number, x: number, y: number) {
    if (!engine || index < 0 || index >= orbs.length) return

    const orb = orbs[index]
    draggedOrbIndex.value = null

    // Set position
    Body.setPosition(orb, { x: x + ORB_RADIUS, y: y + ORB_RADIUS })

    // Reset velocity
    Body.setVelocity(orb, { x: 0, y: 0 })
    Body.setAngularVelocity(orb, 0)

    // Make dynamic again
    Body.setStatic(orb, false)
  }

  /**
   * Respawn orb from top of the box (when dropped outside)
   */
  function respawnFromTop(index: number) {
    if (!engine || !containerRef.value || index < 0 || index >= orbs.length) return

    const container = containerRef.value
    const bounds = container.getBoundingClientRect()
    const orb = orbs[index]

    draggedOrbIndex.value = null

    // Position at random x near top
    const x = ORB_RADIUS + Math.random() * (bounds.width - ORB_RADIUS * 2)
    const y = -ORB_RADIUS * 2

    Body.setPosition(orb, { x, y })
    Body.setVelocity(orb, { x: (Math.random() - 0.5) * 2, y: 0 })
    Body.setAngularVelocity(orb, (Math.random() - 0.5) * 0.2)
    Body.setStatic(orb, false)
  }

  /**
   * Remove an orb from the physics world without spawning from reserve
   * Used internally for sync operations
   */
  function removeOrbWithoutRespawn(index: number) {
    if (!engine || index < 0 || index >= orbs.length) return

    const orb = orbs[index]
    World.remove(engine.world, orb)
    orbs.splice(index, 1)

    if (draggedOrbIndex.value === index) {
      draggedOrbIndex.value = null
    } else if (draggedOrbIndex.value !== null && draggedOrbIndex.value > index) {
      // Adjust dragged index if it was after removed orb
      draggedOrbIndex.value--
    }
  }

  /**
   * Remove an orb from the physics world (when consumed by Vaal outcome)
   * Will spawn a new orb from reserve if available
   */
  function removeOrb(index: number) {
    if (!engine || index < 0 || index >= orbs.length) return

    removeOrbWithoutRespawn(index)

    // If we have orbs in reserve (overflow), spawn one to replace
    // Check if total count > current visible count
    if (orbCount.value > orbs.length) {
      // Small delay for visual effect
      setTimeout(() => {
        if (engine && orbs.length < maxVisibleOrbs && orbCount.value > orbs.length) {
          addOrb()
        }
      }, 300)
    }
  }

  /**
   * Add a new orb (spawns from top)
   */
  function addOrb() {
    if (!engine || !containerRef.value) return

    const container = containerRef.value
    const bounds = container.getBoundingClientRect()

    const x = ORB_RADIUS + Math.random() * (bounds.width - ORB_RADIUS * 2)
    const y = -ORB_RADIUS * 2

    const orb = Bodies.circle(x, y, ORB_RADIUS, {
      restitution: RESTITUTION,
      friction: FRICTION,
      frictionAir: FRICTION_AIR,
      label: `orb-${orbs.length}`,
      velocity: { x: (Math.random() - 0.5) * 2, y: 0 }
    })

    orbs.push(orb)
    World.add(engine.world, orb)
  }

  /**
   * Sync orb count with physics world (respects maxVisibleOrbs)
   */
  function syncOrbCount(newCount: number) {
    if (!engine || !containerRef.value) return

    // Target visible count is limited by maxVisibleOrbs
    const targetVisible = Math.min(newCount, maxVisibleOrbs)
    const currentVisible = orbs.length

    if (targetVisible > currentVisible) {
      // Add orbs (spawn from top)
      for (let i = 0; i < targetVisible - currentVisible; i++) {
        addOrb()
      }
    } else if (targetVisible < currentVisible) {
      // Remove orbs from the end (no auto-spawn needed since we're reducing)
      for (let i = 0; i < currentVisible - targetVisible; i++) {
        removeOrbWithoutRespawn(orbs.length - 1)
      }
    }
  }

  /**
   * Apply an impulse to all orbs (for shake/jiggle effects)
   */
  function shakeOrbs(intensity: number = 0.02) {
    if (!engine) return

    orbs.forEach(orb => {
      if (!orb.isStatic) {
        Body.applyForce(orb, orb.position, {
          x: (Math.random() - 0.5) * intensity,
          y: (Math.random() - 0.5) * intensity
        })
      }
    })
  }

  /**
   * Push orbs away from a point (for hover/brush effect)
   * @param x - X position relative to container
   * @param y - Y position relative to container
   * @param radius - Radius of effect
   * @param force - Force intensity
   */
  function pushOrbsFrom(x: number, y: number, radius: number = 30, force: number = 0.003) {
    if (!engine) return

    const mousePos = { x, y }

    orbs.forEach(orb => {
      if (orb.isStatic) return

      // Calculate distance from mouse to orb center
      const dx = orb.position.x - mousePos.x
      const dy = orb.position.y - mousePos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Only affect orbs within radius
      if (distance < radius && distance > 0) {
        // Normalize direction and apply force (stronger when closer)
        const strength = force * (1 - distance / radius)
        const forceX = (dx / distance) * strength
        const forceY = (dy / distance) * strength

        Body.applyForce(orb, orb.position, { x: forceX, y: forceY })
      }
    })
  }

  /**
   * Cleanup physics engine
   */
  function destroyPhysics() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (runner) {
      Runner.stop(runner)
      runner = null
    }

    if (engine) {
      World.clear(engine.world, false)
      Engine.clear(engine)
      engine = null
    }

    walls = []
    orbs = []
    positions.value = []
    isInitialized = false
  }

  /**
   * Update container size (call on resize)
   */
  function updateContainerSize() {
    if (!engine || !containerRef.value) return

    const container = containerRef.value
    const bounds = container.getBoundingClientRect()
    const width = bounds.width
    const height = bounds.height

    // Update wall positions
    if (walls.length >= 3) {
      // Bottom wall
      Body.setPosition(walls[0], { x: width / 2, y: height + WALL_THICKNESS / 2 })
      // Left wall
      Body.setPosition(walls[1], { x: -WALL_THICKNESS / 2, y: height / 2 })
      // Right wall
      Body.setPosition(walls[2], { x: width + WALL_THICKNESS / 2, y: height / 2 })
    }
  }

  /**
   * Check if a point is inside the container
   */
  function isPointInContainer(x: number, y: number): boolean {
    if (!containerRef.value) return false

    const bounds = containerRef.value.getBoundingClientRect()
    return x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height
  }

  /**
   * Get container bounds
   */
  function getContainerBounds() {
    if (!containerRef.value) return null
    return containerRef.value.getBoundingClientRect()
  }

  // Watch for orb count changes
  watch(orbCount, (newCount) => {
    if (isInitialized) {
      syncOrbCount(newCount)
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    destroyPhysics()
  })

  return {
    // State
    positions: readonly(positions),
    draggedOrbIndex: readonly(draggedOrbIndex),
    overflowCount: readonly(overflowCount),
    visibleOrbCount: readonly(visibleOrbCount),

    // Lifecycle
    initPhysics,
    destroyPhysics,
    updateContainerSize,

    // Drag & Drop
    startDrag,
    updateDragPosition,
    dropOrbAt,
    respawnFromTop,

    // Orb management
    removeOrb,
    addOrb,
    syncOrbCount,

    // Effects
    shakeOrbs,
    pushOrbsFrom,

    // Utilities
    isPointInContainer,
    getContainerBounds
  }
}
