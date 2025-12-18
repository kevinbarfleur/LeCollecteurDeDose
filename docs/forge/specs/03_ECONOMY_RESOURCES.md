# Économie et Ressources - Spécification Technique

> **Document**: `specs/03_ECONOMY_RESOURCES.md`
> **Version**: 1.0
> **Dépendances**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md)

---

## 1. Vue d'Ensemble

L'économie de la Forge est organisée en **4 tiers de ressources**:

```
TIER 1: Passif       → Fragments (temps)
TIER 2: Fonte        → Shards (cartes)
TIER 3: Craft        → Orbes (shards)
TIER 4: Prestige     → Mirror (reset)
```

---

## 2. Ressources

### 2.1 Table des Ressources

| Ressource | Tier | Source Principale | Utilisation | Stockage Max |
|-----------|------|-------------------|-------------|--------------|
| Fragments | 1 | Production passive | Conversion en shards | 24h de prod |
| Transmute Shards | 2 | Fonte T3 | Craft Chaos | Illimité |
| Alteration Shards | 2 | Fonte T2 | Craft Chaos/Vaal | Illimité |
| Augment Shards | 2 | Fonte T1 | Craft Exalted | Illimité |
| Exalted Shards | 3 | Fonte T0 / Recettes | Amélioration qualité | Illimité |
| Chaos Orbs | 3 | Craft | Actions Chaos | Illimité |
| Divine Shards | 3 | Recettes rares | Upgrade tier | Illimité |
| Vaal Orbs | 3 | Craft | Corruption | Illimité |
| Mirror Shards | 4 | Prestige uniquement | Duplication | Illimité |

### 2.2 Définition TypeScript

```typescript
// types/forge-resources.ts

export interface ForgeResources {
  // Tier 1: Passif
  fragments: number

  // Tier 2: Shards de fonte
  transmute_shards: number
  alteration_shards: number
  augment_shards: number

  // Tier 3: Orbes et shards rares
  chaos_orbs: number
  exalted_shards: number
  divine_shards: number
  vaal_orbs: number

  // Tier 4: Prestige
  mirror_shards: number
}

export const RESOURCE_METADATA: Record<keyof ForgeResources, ResourceMeta> = {
  fragments: {
    id: 'fragments',
    name: 'Fragments',
    tier: 1,
    icon: 'fragment',
    color: '#8b7355',
    description: 'Essence brute collectée passivement'
  },
  transmute_shards: {
    id: 'transmute_shards',
    name: 'Transmute Shards',
    tier: 2,
    icon: 'transmute',
    color: '#c0c0c0',
    description: 'Shards basiques, issus des cartes T3'
  },
  alteration_shards: {
    id: 'alteration_shards',
    name: 'Alteration Shards',
    tier: 2,
    icon: 'alteration',
    color: '#4169e1',
    description: 'Shards modifiants, issus des cartes T2'
  },
  augment_shards: {
    id: 'augment_shards',
    name: 'Augment Shards',
    tier: 2,
    icon: 'augment',
    color: '#9932cc',
    description: 'Shards d\'amélioration, issus des cartes T1'
  },
  exalted_shards: {
    id: 'exalted_shards',
    name: 'Exalted Shards',
    tier: 3,
    icon: 'exalted',
    color: '#ffd700',
    description: 'Shards précieux, issus des cartes T0'
  },
  chaos_orbs: {
    id: 'chaos_orbs',
    name: 'Chaos Orbs',
    tier: 3,
    icon: 'chaos',
    color: '#ff4500',
    description: 'Orbes du chaos pour actions aléatoires'
  },
  divine_shards: {
    id: 'divine_shards',
    name: 'Divine Shards',
    tier: 3,
    icon: 'divine',
    color: '#fff8dc',
    description: 'Shards divins pour améliorer les tiers'
  },
  vaal_orbs: {
    id: 'vaal_orbs',
    name: 'Vaal Orbs',
    tier: 3,
    icon: 'vaal',
    color: '#dc143c',
    description: 'Orbes de corruption au pouvoir dangereux'
  },
  mirror_shards: {
    id: 'mirror_shards',
    name: 'Mirror Shards',
    tier: 4,
    icon: 'mirror',
    color: '#e6e6fa',
    description: 'Fragments du Miroir de Kalandra'
  }
}
```

---

## 3. Production Passive (Fragments)

### 3.1 Formule de Production

```typescript
// Formule: fragments_per_hour = base × (1 + level_bonus) × (1 + prestige_bonus) × buff_multiplier

export const PRODUCTION_CONSTANTS = {
  BASE_FRAGMENTS_PER_HOUR: 10,
  FRAGMENTS_PER_LEVEL: 2,          // +2/h par niveau
  PRESTIGE_BONUS_PER_LEVEL: 0.25,  // +25% par prestige
  MAX_STORAGE_HOURS: 24,
}

export function calculateFragmentsPerHour(state: ForgePlayerState): number {
  const { BASE_FRAGMENTS_PER_HOUR, FRAGMENTS_PER_LEVEL, PRESTIGE_BONUS_PER_LEVEL } = PRODUCTION_CONSTANTS

  const base = BASE_FRAGMENTS_PER_HOUR
  const levelBonus = state.atelier_level * FRAGMENTS_PER_LEVEL
  const prestigeMultiplier = 1 + (state.prestige_level * PRESTIGE_BONUS_PER_LEVEL)
  const buffMultiplier = getActiveBuffMultiplier(state.active_effects)

  return Math.floor((base + levelBonus) * prestigeMultiplier * buffMultiplier)
}

export function calculateMaxStorage(state: ForgePlayerState): number {
  const perHour = calculateFragmentsPerHour(state)
  return perHour * PRODUCTION_CONSTANTS.MAX_STORAGE_HOURS
}
```

### 3.2 Collecte

```typescript
// server/api/forge/collect.post.ts

export async function collectFragments(playerId: string): Promise<CollectResult> {
  const player = await getForgePlayer(playerId)
  const now = new Date()
  const lastCollect = new Date(player.last_collection_at)

  // Calcul du temps écoulé (max 24h)
  const hoursElapsed = Math.min(24, (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60))

  // Calcul des fragments
  const perHour = calculateFragmentsPerHour(player)
  const fragmentsEarned = Math.floor(perHour * hoursElapsed)

  if (fragmentsEarned === 0) {
    return { collected: 0, newTotal: player.fragments }
  }

  // Mise à jour
  const newTotal = player.fragments + fragmentsEarned

  await updateForgePlayer(playerId, {
    fragments: newTotal,
    last_collection_at: now.toISOString(),
    total_fragments_earned: player.total_fragments_earned + fragmentsEarned
  })

  // Log
  await logForgeActivity(playerId, 'collect', {
    hours_elapsed: hoursElapsed,
    per_hour: perHour,
    collected: fragmentsEarned
  }, { fragments_delta: fragmentsEarned })

  return { collected: fragmentsEarned, newTotal, hoursElapsed }
}
```

---

## 4. Fonte de Cartes (Shards)

### 4.1 Table de Rendement

| Tier Carte | Qualité | Transmute | Alteration | Augment | Exalted |
|------------|---------|-----------|------------|---------|---------|
| T3 | Normal | 3 | 0 | 0 | 0 |
| T3 | Superior | 4 | 0 | 0 | 0 |
| T3 | Masterwork | 6 | 0 | 0 | 0 |
| T2 | Normal | 1 | 2 | 0 | 0 |
| T2 | Superior | 1 | 3 | 0 | 0 |
| T2 | Masterwork | 2 | 4 | 0 | 0 |
| T1 | Normal | 0 | 1 | 2 | 0 |
| T1 | Superior | 0 | 1 | 3 | 0 |
| T1 | Masterwork | 0 | 2 | 4 | 0 |
| T0 | Normal | 0 | 0 | 1 | 1 |
| T0 | Superior | 0 | 0 | 1 | 2 |
| T0 | Masterwork | 0 | 0 | 2 | 2 |

### 4.2 Implémentation

```typescript
// constants/forge-smelt.ts

export const SMELT_YIELDS: Record<CardTier, Record<CardQuality, SmeltYield>> = {
  T3: {
    normal: { transmute: 3, alteration: 0, augment: 0, exalted: 0 },
    superior: { transmute: 4, alteration: 0, augment: 0, exalted: 0 },
    masterwork: { transmute: 6, alteration: 0, augment: 0, exalted: 0 },
  },
  T2: {
    normal: { transmute: 1, alteration: 2, augment: 0, exalted: 0 },
    superior: { transmute: 1, alteration: 3, augment: 0, exalted: 0 },
    masterwork: { transmute: 2, alteration: 4, augment: 0, exalted: 0 },
  },
  T1: {
    normal: { transmute: 0, alteration: 1, augment: 2, exalted: 0 },
    superior: { transmute: 0, alteration: 1, augment: 3, exalted: 0 },
    masterwork: { transmute: 0, alteration: 2, augment: 4, exalted: 0 },
  },
  T0: {
    normal: { transmute: 0, alteration: 0, augment: 1, exalted: 1 },
    superior: { transmute: 0, alteration: 0, augment: 1, exalted: 2 },
    masterwork: { transmute: 0, alteration: 0, augment: 2, exalted: 2 },
  },
}

// Bonus de chaleur
export const HEAT_BONUS: Record<string, number> = {
  cold: -0.10,     // 0-20%
  warm: 0,         // 21-40%
  hot: 0.05,       // 41-60%
  burning: 0.15,   // 61-80%
  incandescent: 0.25, // 81-100%
}

export function calculateSmeltYield(
  tier: CardTier,
  quality: CardQuality,
  heatLevel: number,
  chaosAmplifyActive: boolean = false
): SmeltYield {
  const baseYield = { ...SMELT_YIELDS[tier][quality] }

  // Bonus chaleur
  const heatCategory = getHeatCategory(heatLevel)
  const heatMultiplier = 1 + HEAT_BONUS[heatCategory]

  // Chaos Amplify (×2)
  const amplifyMultiplier = chaosAmplifyActive ? 2 : 1

  // Appliquer les multiplicateurs
  return {
    transmute: Math.floor(baseYield.transmute * heatMultiplier * amplifyMultiplier),
    alteration: Math.floor(baseYield.alteration * heatMultiplier * amplifyMultiplier),
    augment: Math.floor(baseYield.augment * heatMultiplier * amplifyMultiplier),
    exalted: Math.floor(baseYield.exalted * heatMultiplier * amplifyMultiplier),
  }
}
```

---

## 5. Crafting (Orbes)

### 5.1 Recettes de Base

```typescript
export const BASE_RECIPES: CraftRecipe[] = [
  {
    id: 'chaos_basic',
    name: 'Chaos Basique',
    inputs: { transmute_shards: 20 },
    outputs: { chaos_orbs: 1 },
    unlockLevel: 1,
    isBase: true
  },
  {
    id: 'chaos_alt',
    name: 'Chaos Alternatif',
    inputs: { alteration_shards: 10 },
    outputs: { chaos_orbs: 1 },
    unlockLevel: 5,
    isBase: true
  },
  {
    id: 'fragment_convert',
    name: 'Conversion de Fragments',
    inputs: { fragments: 100 },
    outputs: { transmute_shards: 10 },
    unlockLevel: 1,
    isBase: true,
    freeAction: true // Ne coûte pas d'action
  },
]
```

### 5.2 Validation de Craft

```typescript
// server/utils/forge-craft.ts

export function canCraft(
  recipe: CraftRecipe,
  resources: ForgeResources,
  cards?: ForgeCard[]
): { canCraft: boolean; missing: Partial<ForgeResources> } {
  const missing: Partial<ForgeResources> = {}

  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    if (resource.startsWith('card_')) {
      // Validation de cartes (recettes spéciales)
      continue
    }

    const available = resources[resource as keyof ForgeResources] || 0
    if (available < amount) {
      missing[resource as keyof ForgeResources] = amount - available
    }
  }

  return {
    canCraft: Object.keys(missing).length === 0,
    missing
  }
}

export function applyCraft(
  recipe: CraftRecipe,
  resources: ForgeResources
): ForgeResources {
  const updated = { ...resources }

  // Soustraire les inputs
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    const key = resource as keyof ForgeResources
    updated[key] = Math.max(0, (updated[key] || 0) - amount)
  }

  // Ajouter les outputs
  for (const [resource, amount] of Object.entries(recipe.outputs)) {
    const key = resource as keyof ForgeResources
    updated[key] = (updated[key] || 0) + amount
  }

  return updated
}
```

---

## 6. Conversion et Équivalences

### 6.1 Table de Valeur

```typescript
// Valeur en "Fragments équivalents" pour équilibrage

export const RESOURCE_VALUES = {
  fragments: 1,
  transmute_shards: 10,      // 100 frag = 10 trans
  alteration_shards: 25,     // ~2.5× transmute
  augment_shards: 60,        // ~2.4× alteration
  exalted_shards: 150,       // ~2.5× augment
  chaos_orbs: 200,           // 20 trans = 200 frag
  divine_shards: 600,        // 3× chaos
  vaal_orbs: 500,            // 20 trans + 20 alt
  mirror_shards: 10000,      // Prestige only
}

export function calculateResourceValue(resources: ForgeResources): number {
  let total = 0

  for (const [resource, amount] of Object.entries(resources)) {
    const value = RESOURCE_VALUES[resource as keyof typeof RESOURCE_VALUES] || 0
    total += value * amount
  }

  return total
}
```

### 6.2 Temps pour Obtenir

```typescript
// Temps estimé pour obtenir 1 unité (niveau 1, sans bonus)

export const TIME_TO_OBTAIN = {
  fragments: 6,              // 6 minutes (10/h)
  transmute_shards: 60,      // 1 heure (via fonte T3)
  alteration_shards: 150,    // 2.5 heures
  augment_shards: 360,       // 6 heures
  exalted_shards: 900,       // 15 heures
  chaos_orbs: 1200,          // 20 heures
  divine_shards: 3600,       // 60 heures (2.5 jours)
  vaal_orbs: 3000,           // 50 heures (2 jours)
  mirror_shards: Infinity,   // Prestige only
}
```

---

## 7. Buffs et Effets

### 7.1 Structure des Effets

```typescript
export interface ForgeEffect {
  type: 'boost' | 'curse' | 'amplify'
  multiplier: number
  expires_at: string   // ISO date
  source: string       // 'corruption', 'chaos', 'recipe'
}

export interface ActiveEffects {
  boost?: ForgeEffect
  curse?: ForgeEffect
  amplify?: {
    remaining_smelts: number
    multiplier: number
  }
}
```

### 7.2 Application des Effets

```typescript
export function getActiveBuffMultiplier(effects: ActiveEffects): number {
  const now = new Date()
  let multiplier = 1.0

  // Boost (corruption)
  if (effects.boost && new Date(effects.boost.expires_at) > now) {
    multiplier *= effects.boost.multiplier
  }

  // Curse (corruption)
  if (effects.curse && new Date(effects.curse.expires_at) > now) {
    multiplier *= effects.curse.multiplier
  }

  return multiplier
}

export function getSmeltMultiplier(effects: ActiveEffects): number {
  let multiplier = 1.0

  // Chaos Amplify
  if (effects.amplify && effects.amplify.remaining_smelts > 0) {
    multiplier *= effects.amplify.multiplier
  }

  return multiplier
}
```

---

## 8. Actions Quotidiennes

### 8.1 Système d'Actions

```typescript
export const ACTION_CONSTANTS = {
  BASE_ACTIONS_PER_DAY: 10,
  RESET_HOUR_UTC: 21,  // 22h Paris (21h UTC en hiver)
  MAX_ACTIONS_WITH_BONUS: 15,
}

export function getActionsRemaining(state: ForgePlayerState): number {
  const resetDate = getLastResetDate()

  // Si le dernier reset stocké est avant le dernier reset calculé, on reset
  if (new Date(state.last_action_reset) < resetDate) {
    return state.max_actions_per_day
  }

  return state.max_actions_per_day - state.actions_today
}

export function getLastResetDate(): Date {
  const now = new Date()
  const reset = new Date(now)

  reset.setUTCHours(ACTION_CONSTANTS.RESET_HOUR_UTC, 0, 0, 0)

  // Si on n'a pas encore passé l'heure de reset aujourd'hui, c'était hier
  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }

  return reset
}
```

### 8.2 Coût en Actions

| Action | Coût |
|--------|------|
| Fonte de carte | 1 |
| Craft de base | 0 (gratuit) |
| Craft avancé | 1 |
| Chaos Reroll | 1 |
| Chaos Gamble | 2 |
| Chaos Discovery | 1 |
| Corruption Vaal | 1 |
| Divine Blessing | 2 |
| Divine Exaltation | 2 |

---

## 9. Persistance en Base

### 9.1 Colonnes de la Table `forge_players`

```sql
-- Ressources
fragments BIGINT DEFAULT 0 NOT NULL CHECK (fragments >= 0),
transmute_shards BIGINT DEFAULT 0 NOT NULL CHECK (transmute_shards >= 0),
alteration_shards BIGINT DEFAULT 0 NOT NULL CHECK (alteration_shards >= 0),
augment_shards BIGINT DEFAULT 0 NOT NULL CHECK (augment_shards >= 0),
chaos_orbs BIGINT DEFAULT 0 NOT NULL CHECK (chaos_orbs >= 0),
exalted_shards BIGINT DEFAULT 0 NOT NULL CHECK (exalted_shards >= 0),
divine_shards BIGINT DEFAULT 0 NOT NULL CHECK (divine_shards >= 0),
vaal_orbs BIGINT DEFAULT 0 NOT NULL CHECK (vaal_orbs >= 0),
mirror_shards BIGINT DEFAULT 0 NOT NULL CHECK (mirror_shards >= 0),

-- Production
fragments_per_hour NUMERIC(10,2) DEFAULT 10.0 NOT NULL,
last_collection_at TIMESTAMPTZ DEFAULT NOW(),

-- Actions
actions_today INTEGER DEFAULT 0 NOT NULL,
max_actions_per_day INTEGER DEFAULT 10 NOT NULL,
last_action_reset DATE DEFAULT CURRENT_DATE,

-- Effets actifs
active_effects JSONB DEFAULT '{}'::jsonb,

-- Stats
total_fragments_earned BIGINT DEFAULT 0 NOT NULL,
total_chaos_earned BIGINT DEFAULT 0 NOT NULL,
```

---

## 10. Références

- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §3
- **Database Schema**: [04_DATABASE_SCHEMA.md](./04_DATABASE_SCHEMA.md)
- **Module Crafting**: [M3_CRAFTING.md](../modules/M3_CRAFTING.md)
