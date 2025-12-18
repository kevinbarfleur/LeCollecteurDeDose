# Système de Progression - Spécification Technique

> **Document**: `specs/02_PROGRESSION_SYSTEM.md`
> **Version**: 1.0
> **Dépendances**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md)

---

## 1. Vue d'Ensemble

Le système de progression gère:
- Les **phases de jeu** (dormant → transcendant)
- Le **niveau de l'Atelier** (1-30+)
- Les **déblocages de modules**
- Les **tutoriels** et onboarding
- Les **objectifs** affichés au joueur

---

## 2. Phases de Jeu

### 2.1 Définition des Phases

```typescript
// types/forge.ts

export type ForgePhase =
  | 'dormant'      // Fourneau éteint, premier lancement
  | 'awakening'    // Animation d'allumage en cours
  | 'apprentice'   // Niveau 1-4
  | 'artisan'      // Niveau 5-10
  | 'chaotic'      // Niveau 11-15
  | 'corrupted'    // Niveau 16-20
  | 'ascendant'    // Niveau 21-25
  | 'transcendent' // Niveau 26-30
  | 'eternal'      // Niveau 30+ (post-prestige)

export interface PhaseDefinition {
  id: ForgePhase
  name: string
  levelRange: [number, number] | null
  modules: string[]
  teasedModules: string[]
  description: string
}

export const PHASE_DEFINITIONS: Record<ForgePhase, PhaseDefinition> = {
  dormant: {
    id: 'dormant',
    name: 'La Forge Éteinte',
    levelRange: null,
    modules: [],
    teasedModules: ['furnace'],
    description: 'La forge ancestrale attend d\'être éveillée.'
  },
  awakening: {
    id: 'awakening',
    name: 'L\'Éveil',
    levelRange: null,
    modules: ['furnace'],
    teasedModules: [],
    description: 'Les flammes renaissent...'
  },
  apprentice: {
    id: 'apprentice',
    name: 'L\'Apprenti',
    levelRange: [1, 4],
    modules: ['furnace', 'collection', 'inventory'],
    teasedModules: ['crafting'],
    description: 'Apprends les bases de la fonte.'
  },
  artisan: {
    id: 'artisan',
    name: 'L\'Artisan',
    levelRange: [5, 10],
    modules: ['furnace', 'collection', 'inventory', 'crafting'],
    teasedModules: ['chaos'],
    description: 'Maîtrise l\'art du crafting.'
  },
  chaotic: {
    id: 'chaotic',
    name: 'Le Chaotique',
    levelRange: [11, 15],
    modules: ['furnace', 'collection', 'inventory', 'crafting', 'chaos'],
    teasedModules: ['corruption'],
    description: 'Le chaos devient ton allié.'
  },
  corrupted: {
    id: 'corrupted',
    name: 'Le Corrompu',
    levelRange: [16, 20],
    modules: ['furnace', 'collection', 'inventory', 'crafting', 'chaos', 'corruption'],
    teasedModules: ['divine'],
    description: 'La corruption offre un pouvoir dangereux.'
  },
  ascendant: {
    id: 'ascendant',
    name: 'L\'Ascendant',
    levelRange: [21, 25],
    modules: ['furnace', 'collection', 'inventory', 'crafting', 'chaos', 'corruption', 'divine'],
    teasedModules: ['prestige'],
    description: 'Le divin est à ta portée.'
  },
  transcendent: {
    id: 'transcendent',
    name: 'Le Transcendé',
    levelRange: [26, 30],
    modules: ['furnace', 'collection', 'inventory', 'crafting', 'chaos', 'corruption', 'divine', 'prestige'],
    teasedModules: [],
    description: 'Tu approches de la transcendance.'
  },
  eternal: {
    id: 'eternal',
    name: 'L\'Éternel',
    levelRange: [30, 100],
    modules: ['furnace', 'collection', 'inventory', 'crafting', 'chaos', 'corruption', 'divine', 'prestige'],
    teasedModules: [],
    description: 'Tu as transcendé. Le cycle recommence.'
  }
}
```

### 2.2 Calcul de la Phase Actuelle

```typescript
// composables/useForgeProgression.ts

export function calculatePhase(state: ForgePlayerState): ForgePhase {
  // Phase dormant: première connexion
  if (!state.has_ignited_forge) {
    return 'dormant'
  }

  // Phase awakening: animation en cours
  if (state.is_awakening) {
    return 'awakening'
  }

  const level = state.atelier_level

  if (level < 5) return 'apprentice'
  if (level < 11) return 'artisan'
  if (level < 16) return 'chaotic'
  if (level < 21) return 'corrupted'
  if (level < 26) return 'ascendant'
  if (level < 31) return 'transcendent'
  return 'eternal'
}
```

---

## 3. Système de Niveau

### 3.1 Formule d'XP

```typescript
// Formule: XP_requis(niveau) = 100 × niveau^1.5

export function getXPRequired(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export function getTotalXPForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < level; i++) {
    total += getXPRequired(i)
  }
  return total
}

// Table de référence
const XP_TABLE = [
  { level: 1, required: 100, cumulative: 0 },
  { level: 2, required: 283, cumulative: 100 },
  { level: 3, required: 520, cumulative: 383 },
  { level: 4, required: 800, cumulative: 903 },
  { level: 5, required: 1118, cumulative: 1703 },
  { level: 10, required: 3162, cumulative: 10746 },
  { level: 15, required: 5809, cumulative: 26879 },
  { level: 20, required: 8944, cumulative: 52469 },
  { level: 25, required: 12500, cumulative: 89089 },
  { level: 30, required: 16432, cumulative: 138564 },
]
```

### 3.2 Sources d'XP

```typescript
export const XP_SOURCES = {
  // Fonte
  smelt_t3: 5,
  smelt_t2: 15,
  smelt_t1: 50,
  smelt_t0: 200,

  // Qualité bonus
  smelt_superior_bonus: 1.5,  // ×1.5
  smelt_masterwork_bonus: 2.0, // ×2.0

  // Crafting
  craft_chaos: 10,
  craft_vaal: 25,
  craft_divine: 50,

  // Découvertes
  discover_recipe: 100,
  discover_recipe_rare: 250,

  // Corruption
  corruption_success: 50,  // Boost, Jackpot, Miracle
  corruption_miracle: 200, // Bonus Miracle

  // Prestige
  first_prestige: 500,

  // Challenges
  challenge_objective: 25,
  challenge_complete: 100,
}

export function calculateSmeltXP(tier: CardTier, quality: CardQuality): number {
  const baseXP = XP_SOURCES[`smelt_${tier.toLowerCase()}`] || 5
  const multiplier = quality === 'masterwork' ? 2.0 : quality === 'superior' ? 1.5 : 1.0
  return Math.floor(baseXP * multiplier)
}
```

### 3.3 Level Up

```typescript
// Backend: server/api/forge/add-xp.ts

export async function addXP(playerId: string, amount: number, source: string) {
  const player = await getForgePlayer(playerId)

  let newXP = player.atelier_xp + amount
  let newLevel = player.atelier_level
  let leveledUp = false
  const unlocks: string[] = []

  // Check level ups
  while (newXP >= getXPRequired(newLevel)) {
    newXP -= getXPRequired(newLevel)
    newLevel++
    leveledUp = true

    // Check module unlocks
    const newUnlocks = checkModuleUnlocks(newLevel)
    unlocks.push(...newUnlocks)
  }

  // Update database
  await updateForgePlayer(playerId, {
    atelier_xp: newXP,
    atelier_level: newLevel
  })

  // Log activity
  await logForgeActivity(playerId, 'xp_gain', {
    amount,
    source,
    new_level: newLevel,
    leveled_up: leveledUp,
    unlocks
  })

  return { newXP, newLevel, leveledUp, unlocks }
}
```

---

## 4. Déblocages de Modules

### 4.1 Conditions de Déblocage

```typescript
export const MODULE_UNLOCK_CONDITIONS: Record<string, ModuleUnlockCondition> = {
  furnace: {
    module: 'furnace',
    level: 0, // Toujours disponible après awakening
    prerequisite: 'has_ignited_forge'
  },
  collection: {
    module: 'collection',
    level: 1,
    prerequisite: null
  },
  inventory: {
    module: 'inventory',
    level: 1,
    prerequisite: null
  },
  crafting: {
    module: 'crafting',
    level: 5,
    prerequisite: null,
    tutorialRequired: 'first_smelt'
  },
  chaos: {
    module: 'chaos',
    level: 11,
    prerequisite: 'crafting_unlocked',
    tutorialRequired: 'first_craft'
  },
  corruption: {
    module: 'corruption',
    level: 16,
    prerequisite: 'chaos_unlocked',
    tutorialRequired: 'first_chaos_action'
  },
  divine: {
    module: 'divine',
    level: 21,
    prerequisite: 'corruption_unlocked'
  },
  prestige: {
    module: 'prestige',
    level: 26,
    prerequisite: 'divine_unlocked',
    additionalConditions: {
      min_recipes: 15,
      min_t0_cards: 1
    }
  }
}
```

### 4.2 Animation de Déblocage

```typescript
// composables/useForgeUnlocks.ts

export function useForgeUnlocks() {
  const pendingUnlocks = ref<string[]>([])
  const currentUnlockAnimation = ref<string | null>(null)

  async function triggerUnlock(moduleId: string) {
    pendingUnlocks.value.push(moduleId)

    if (!currentUnlockAnimation.value) {
      await processNextUnlock()
    }
  }

  async function processNextUnlock() {
    if (pendingUnlocks.value.length === 0) {
      currentUnlockAnimation.value = null
      return
    }

    const moduleId = pendingUnlocks.value.shift()!
    currentUnlockAnimation.value = moduleId

    // Jouer son
    playSound('module-unlock')

    // Attendre animation (3 secondes)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Marquer comme tutoriel actif
    await markModuleForTutorial(moduleId)

    // Process next
    await processNextUnlock()
  }

  return {
    pendingUnlocks,
    currentUnlockAnimation,
    triggerUnlock
  }
}
```

---

## 5. Système de Tutoriels

### 5.1 Définition des Tutoriels

```typescript
export interface TutorialStep {
  id: string
  module: string
  target: string        // Sélecteur CSS ou ID du composant
  title: string
  content: string
  action?: string       // Action requise pour compléter
  highlight?: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
}

export const TUTORIALS: Record<string, TutorialStep[]> = {
  furnace: [
    {
      id: 'furnace_intro',
      module: 'furnace',
      target: '#forge-visualization',
      title: 'Le Fourneau',
      content: 'C\'est ici que tu transformes les cartes en essence pure.',
      position: 'right'
    },
    {
      id: 'furnace_drag',
      module: 'furnace',
      target: '#forge-inventory',
      title: 'Glisse une carte',
      content: 'Sélectionne une carte et glisse-la vers le creuset.',
      action: 'drag_card_to_crucible',
      highlight: true,
      position: 'top'
    },
    {
      id: 'furnace_smelt',
      module: 'furnace',
      target: '#forge-crucible',
      title: 'Observe la fonte',
      content: 'La carte se transforme en shards!',
      action: 'complete_smelt',
      position: 'left'
    }
  ],
  crafting: [
    {
      id: 'crafting_intro',
      module: 'crafting',
      target: '#forge-crafting',
      title: 'L\'Établi de Crafting',
      content: 'Combine tes shards pour créer des orbes puissants.',
      position: 'left'
    },
    {
      id: 'crafting_recipe',
      module: 'crafting',
      target: '#recipe-chaos-basic',
      title: 'Ta première recette',
      content: '20 Transmute Shards = 1 Chaos Orb. Essaie!',
      action: 'craft_chaos',
      highlight: true,
      position: 'bottom'
    }
  ],
  // ... autres tutoriels
}
```

### 5.2 Gestion des Tutoriels

```typescript
// composables/useForgeTutorials.ts

export function useForgeTutorials() {
  const completedTutorials = ref<Set<string>>(new Set())
  const activeTutorial = ref<TutorialStep | null>(null)
  const tutorialQueue = ref<TutorialStep[]>([])

  function startTutorial(moduleId: string) {
    const steps = TUTORIALS[moduleId]
    if (!steps) return

    tutorialQueue.value = steps.filter(
      step => !completedTutorials.value.has(step.id)
    )

    showNextStep()
  }

  function showNextStep() {
    if (tutorialQueue.value.length === 0) {
      activeTutorial.value = null
      return
    }

    activeTutorial.value = tutorialQueue.value.shift()!
  }

  async function completeStep(stepId: string) {
    if (activeTutorial.value?.id !== stepId) return

    completedTutorials.value.add(stepId)

    // Sauvegarder en DB
    await saveTutorialProgress(stepId)

    // Animation de complétion
    await animateStepComplete()

    // Step suivant
    showNextStep()
  }

  function skipTutorial() {
    if (!activeTutorial.value) return

    // Marquer tous les steps du module comme complétés
    const moduleSteps = TUTORIALS[activeTutorial.value.module]
    moduleSteps.forEach(step => completedTutorials.value.add(step.id))

    activeTutorial.value = null
    tutorialQueue.value = []
  }

  return {
    activeTutorial,
    startTutorial,
    completeStep,
    skipTutorial
  }
}
```

---

## 6. Objectifs Dynamiques

### 6.1 Définition des Objectifs

```typescript
export interface ForgeGoal {
  id: string
  type: 'unlock' | 'collect' | 'discover' | 'craft' | 'prestige' | 'achievement'
  title: string
  description: string
  progress: number
  max: number
  reward?: string
  completed: boolean
}

export function getCurrentGoal(state: ForgePlayerState): ForgeGoal {
  const phase = calculatePhase(state)

  switch (phase) {
    case 'dormant':
      return {
        id: 'ignite',
        type: 'unlock',
        title: 'Éveiller la Forge',
        description: 'Allume le fourneau ancestral',
        progress: 0,
        max: 1,
        completed: false
      }

    case 'apprentice':
      return {
        id: 'reach_level_5',
        type: 'unlock',
        title: 'Atteindre niveau 5',
        description: 'Débloquer l\'Établi de Crafting',
        progress: state.atelier_level,
        max: 5,
        reward: 'Établi de Crafting',
        completed: state.atelier_level >= 5
      }

    case 'artisan':
      return {
        id: 'reach_level_11',
        type: 'unlock',
        title: 'Atteindre niveau 11',
        description: 'Débloquer le Sanctuaire du Chaos',
        progress: state.atelier_level,
        max: 11,
        reward: 'Sanctuaire du Chaos',
        completed: state.atelier_level >= 11
      }

    case 'chaotic':
      return {
        id: 'reach_level_16',
        type: 'unlock',
        title: 'Atteindre niveau 16',
        description: 'Débloquer l\'Autel de Corruption',
        progress: state.atelier_level,
        max: 16,
        reward: 'Autel de Corruption',
        completed: state.atelier_level >= 16
      }

    case 'corrupted':
      return {
        id: 'reach_level_21',
        type: 'unlock',
        title: 'Atteindre niveau 21',
        description: 'Débloquer la Chambre Divine',
        progress: state.atelier_level,
        max: 21,
        reward: 'Chambre Divine',
        completed: state.atelier_level >= 21
      }

    case 'ascendant':
      return {
        id: 'reach_level_26',
        type: 'unlock',
        title: 'Atteindre niveau 26',
        description: 'Débloquer le Prestige',
        progress: state.atelier_level,
        max: 26,
        reward: 'Prestige',
        completed: state.atelier_level >= 26
      }

    case 'transcendent':
      return {
        id: 'prepare_prestige',
        type: 'prestige',
        title: 'Préparer la Transcendance',
        description: `Niveau 30, 15 recettes, 1 carte T0`,
        progress: calculatePrestigeProgress(state),
        max: 100,
        reward: 'Bonus Prestige 1',
        completed: canPrestige(state)
      }

    default:
      return {
        id: 'maximize_score',
        type: 'achievement',
        title: 'Maximiser le Score',
        description: 'Continue ta progression éternelle',
        progress: state.total_score,
        max: state.total_score + 10000,
        completed: false
      }
  }
}
```

---

## 7. États de Module

### 7.1 Définition des États

```typescript
export type ModuleState =
  | 'hidden'      // Invisible, joueur ne sait pas qu'il existe
  | 'teased'      // Visible mais grisé, montre les conditions
  | 'unlocking'   // Animation de déblocage en cours
  | 'tutorial'    // Premier usage, tutoriel actif
  | 'active'      // Fonctionnel normal
  | 'enhanced'    // Amélioré par prestige

export interface ModuleStatus {
  id: string
  state: ModuleState
  unlockProgress?: number // 0-100% pour teased
  unlockLevel?: number
  tutorialCompleted?: boolean
  enhancementLevel?: number // Pour prestige
}

export function getModuleStatus(
  moduleId: string,
  playerState: ForgePlayerState
): ModuleStatus {
  const condition = MODULE_UNLOCK_CONDITIONS[moduleId]
  if (!condition) {
    return { id: moduleId, state: 'hidden' }
  }

  const level = playerState.atelier_level
  const phase = calculatePhase(playerState)
  const phaseModules = PHASE_DEFINITIONS[phase].modules
  const teasedModules = PHASE_DEFINITIONS[phase].teasedModules

  // Module actif dans cette phase
  if (phaseModules.includes(moduleId)) {
    const tutorialCompleted = playerState.completed_tutorials?.includes(moduleId)

    if (!tutorialCompleted && TUTORIALS[moduleId]) {
      return { id: moduleId, state: 'tutorial' }
    }

    return {
      id: moduleId,
      state: playerState.prestige_level > 0 ? 'enhanced' : 'active',
      enhancementLevel: playerState.prestige_level
    }
  }

  // Module teasé dans cette phase
  if (teasedModules.includes(moduleId)) {
    const unlockProgress = Math.min(100, (level / condition.level) * 100)

    return {
      id: moduleId,
      state: 'teased',
      unlockProgress,
      unlockLevel: condition.level
    }
  }

  // Module caché
  return { id: moduleId, state: 'hidden' }
}
```

---

## 8. Persistance

### 8.1 Champs en Base de Données

```sql
-- Table: forge_players (existante)
-- Champs liés à la progression:

atelier_level INTEGER DEFAULT 1
atelier_xp BIGINT DEFAULT 0
prestige_level INTEGER DEFAULT 0

-- JSON pour tutoriels et états
-- À ajouter si nécessaire:
completed_tutorials TEXT[] DEFAULT '{}'
module_states JSONB DEFAULT '{}'
current_goal_id TEXT DEFAULT 'ignite'
```

### 8.2 Sync avec le Frontend

```typescript
// composables/useForgeSync.ts

export function useForgeSync() {
  const forgeState = useState<ForgePlayerState>('forge-state')
  const isLoading = ref(false)
  const lastSync = ref<Date | null>(null)

  async function loadState() {
    isLoading.value = true
    try {
      const { data } = await useFetch('/api/forge/state')
      if (data.value) {
        forgeState.value = data.value
        lastSync.value = new Date()
      }
    } finally {
      isLoading.value = false
    }
  }

  async function saveProgress(updates: Partial<ForgePlayerState>) {
    const { data } = await useFetch('/api/forge/state', {
      method: 'POST',
      body: updates
    })

    if (data.value) {
      forgeState.value = { ...forgeState.value, ...data.value }
    }
  }

  return {
    forgeState,
    isLoading,
    loadState,
    saveProgress
  }
}
```

---

## 9. Tests de Validation

### 9.1 Tests Unitaires

```typescript
// tests/forge/progression.test.ts

describe('ForgeProgression', () => {
  describe('calculatePhase', () => {
    it('returns dormant for new player', () => {
      const state = { has_ignited_forge: false, atelier_level: 0 }
      expect(calculatePhase(state)).toBe('dormant')
    })

    it('returns apprentice for level 1-4', () => {
      const state = { has_ignited_forge: true, atelier_level: 3 }
      expect(calculatePhase(state)).toBe('apprentice')
    })

    it('returns artisan at level 5', () => {
      const state = { has_ignited_forge: true, atelier_level: 5 }
      expect(calculatePhase(state)).toBe('artisan')
    })

    // ... autres tests
  })

  describe('getXPRequired', () => {
    it('returns 100 for level 1', () => {
      expect(getXPRequired(1)).toBe(100)
    })

    it('follows exponential curve', () => {
      expect(getXPRequired(10)).toBeCloseTo(3162, 0)
    })
  })

  describe('getCurrentGoal', () => {
    it('returns ignite goal for dormant phase', () => {
      const state = { has_ignited_forge: false }
      const goal = getCurrentGoal(state)
      expect(goal.id).toBe('ignite')
    })
  })
})
```

---

## 10. Références

- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §5
- **Modules Liés**: Tous les modules (M1-M7)
- **Database Schema**: [04_DATABASE_SCHEMA.md](./04_DATABASE_SCHEMA.md)
