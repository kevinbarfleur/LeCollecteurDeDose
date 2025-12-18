# Module 2: L'Atelier de Collecte - Spécification Technique

> **Document**: `modules/M2_COLLECTE.md`
> **Version**: 1.0
> **Statut**: Module Fondamental (Niveau 1+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

L'Atelier de Collecte gère la **production passive** de Fragments:
- Génération automatique de Fragments (24/7)
- Bouton de collecte manuelle
- Affichage du taux de production
- Conversion rapide Fragments → Transmute

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant | Caché |
| Awakening | Caché |
| Apprentice+ | Actif |

---

## 2. Formules de Production

### 2.1 Taux de Production

```typescript
// Formule: fragments_per_hour = (BASE + level_bonus) × prestige_multiplier × buff_multiplier

const PRODUCTION = {
  BASE_PER_HOUR: 10,
  PER_LEVEL: 2,               // +2/h par niveau
  PRESTIGE_BONUS: 0.25,       // +25% par niveau de prestige
  MAX_STORAGE_HOURS: 24,      // Cap de stockage
}

function calculateProductionRate(state: ForgePlayerState): number {
  const base = PRODUCTION.BASE_PER_HOUR
  const levelBonus = state.atelier_level * PRODUCTION.PER_LEVEL
  const prestigeMultiplier = 1 + (state.prestige_level * PRODUCTION.PRESTIGE_BONUS)
  const buffMultiplier = getBuffMultiplier(state.active_effects)

  return Math.floor((base + levelBonus) * prestigeMultiplier * buffMultiplier)
}
```

### 2.2 Table de Production par Niveau

| Niveau | Base | Bonus | Total/h | Max Stockage |
|--------|------|-------|---------|--------------|
| 1 | 10 | +2 | 12 | 288 |
| 5 | 10 | +10 | 20 | 480 |
| 10 | 10 | +20 | 30 | 720 |
| 15 | 10 | +30 | 40 | 960 |
| 20 | 10 | +40 | 50 | 1,200 |
| 25 | 10 | +50 | 60 | 1,440 |
| 30 | 10 | +60 | 70 | 1,680 |

### 2.3 Avec Bonus de Prestige

| Prestige | Multiplicateur | Niveau 15 | Niveau 30 |
|----------|----------------|-----------|-----------|
| 0 | ×1.00 | 40/h | 70/h |
| 1 | ×1.25 | 50/h | 87/h |
| 2 | ×1.50 | 60/h | 105/h |
| 3 | ×1.75 | 70/h | 122/h |
| 4 | ×2.00 | 80/h | 140/h |
| 5 | ×2.25 | 90/h | 157/h |

---

## 3. Composant Frontend

### 3.1 ForgeCollection.vue

```vue
<script setup lang="ts">
/**
 * ForgeCollection - Module de Production Passive
 *
 * Affiche:
 * - Taux de production actuel avec breakdown
 * - Fragments accumulés depuis dernière collecte
 * - Bouton de collecte
 * - Option de conversion rapide
 */

const { forgeState } = useForgeState()
const { collectFragments, isCollecting } = useForgeCollection()

// Calculs réactifs
const productionPerHour = computed(() =>
  calculateProductionRate(forgeState.value)
)

const maxStorage = computed(() =>
  productionPerHour.value * 24
)

const timeSinceLastCollect = computed(() => {
  const last = new Date(forgeState.value.last_collection_at)
  const now = new Date()
  return (now.getTime() - last.getTime()) / (1000 * 60 * 60) // Heures
})

const fragmentsAccumulated = computed(() => {
  const hours = Math.min(24, timeSinceLastCollect.value)
  return Math.floor(productionPerHour.value * hours)
})

const storagePercentage = computed(() =>
  Math.min(100, (fragmentsAccumulated.value / maxStorage.value) * 100)
)

const isStorageFull = computed(() => storagePercentage.value >= 100)
</script>

<template>
  <div class="forge-collection">
    <div class="collection-header">
      <h3>Atelier de Collecte</h3>
      <ForgeTooltip
        title="Production Passive"
        what="Les fragments s'accumulent automatiquement avec le temps."
        why="C'est ta source principale de ressources de base."
        how="Reviens régulièrement pour collecter (max 24h de stockage)."
      />
    </div>

    <!-- Taux de production -->
    <div class="production-rate">
      <div class="rate-label">Production actuelle</div>
      <div class="rate-value">
        <span class="rate-number">{{ productionPerHour }}</span>
        <span class="rate-unit">Fragments/heure</span>
      </div>

      <!-- Breakdown -->
      <div class="rate-breakdown">
        <div class="breakdown-item">
          <span>Base</span>
          <span>10/h</span>
        </div>
        <div class="breakdown-item">
          <span>Niveau {{ forgeState.atelier_level }}</span>
          <span>+{{ forgeState.atelier_level * 2 }}/h</span>
        </div>
        <div v-if="forgeState.prestige_level > 0" class="breakdown-item prestige">
          <span>Prestige ×{{ forgeState.prestige_level }}</span>
          <span>×{{ (1 + forgeState.prestige_level * 0.25).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Stockage -->
    <div class="storage-info">
      <div class="storage-bar">
        <div
          class="storage-fill"
          :style="{ width: `${storagePercentage}%` }"
          :class="{ full: isStorageFull }"
        />
      </div>
      <div class="storage-text">
        <span>{{ fragmentsAccumulated }} / {{ maxStorage }}</span>
        <span v-if="isStorageFull" class="storage-warning">
          (Stockage plein!)
        </span>
      </div>
      <div class="time-info">
        Temps écoulé: {{ formatDuration(timeSinceLastCollect) }}
      </div>
    </div>

    <!-- Bouton de collecte -->
    <button
      class="collect-button"
      :class="{ full: isStorageFull, empty: fragmentsAccumulated === 0 }"
      :disabled="isCollecting || fragmentsAccumulated === 0"
      @click="collectFragments"
    >
      <span v-if="isCollecting">Collecte...</span>
      <span v-else-if="fragmentsAccumulated === 0">Rien à collecter</span>
      <span v-else>
        Collecter +{{ fragmentsAccumulated }} Fragments
      </span>
    </button>

    <!-- Conversion rapide -->
    <div class="quick-convert" v-if="forgeState.fragments >= 100">
      <span class="convert-label">Conversion rapide:</span>
      <button
        class="convert-button"
        @click="convertFragments(100)"
        :disabled="forgeState.fragments < 100"
      >
        100 Frag → 10 Trans
      </button>
    </div>
  </div>
</template>

<style scoped>
.forge-collection {
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 8px;
}

.production-rate {
  margin: 1rem 0;
}

.rate-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.rate-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-accent);
}

.rate-breakdown {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
}

.breakdown-item.prestige {
  color: var(--color-prestige);
}

.storage-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.storage-fill.full {
  background: var(--color-warning);
  animation: pulse 1s ease-in-out infinite;
}

.collect-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 1.125rem;
  font-weight: bold;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.collect-button.full {
  background: var(--color-warning);
  animation: pulse 2s ease-in-out infinite;
}

.collect-button.empty {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-convert {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
```

---

## 4. Backend

### 4.1 Endpoint de Collecte

```typescript
// server/api/forge/collect.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_collect_fragments', {
    p_user_login: session.user.login
  })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data
})
```

### 4.2 Fonction SQL

```sql
-- Fonction existante

CREATE OR REPLACE FUNCTION forge_collect_fragments(p_user_login TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_hours_elapsed NUMERIC;
  v_fragments_earned BIGINT;
  v_max_hours INTEGER := 24;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Calculer le temps écoulé (max 24h)
  v_hours_elapsed := LEAST(
    v_max_hours,
    EXTRACT(EPOCH FROM (NOW() - v_player.last_collection_at)) / 3600
  );

  -- Calculer les fragments gagnés
  v_fragments_earned := FLOOR(v_player.fragments_per_hour * v_hours_elapsed);

  IF v_fragments_earned = 0 THEN
    RETURN jsonb_build_object(
      'collected', 0,
      'new_total', v_player.fragments,
      'hours_elapsed', v_hours_elapsed
    );
  END IF;

  -- Mettre à jour
  UPDATE forge_players SET
    fragments = fragments + v_fragments_earned,
    total_fragments_earned = total_fragments_earned + v_fragments_earned,
    last_collection_at = NOW()
  WHERE id = v_player.id;

  -- Logger
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data, fragments_delta
  ) VALUES (
    v_player.id, 'collect',
    jsonb_build_object(
      'hours_elapsed', v_hours_elapsed,
      'rate_per_hour', v_player.fragments_per_hour
    ),
    v_fragments_earned
  );

  RETURN jsonb_build_object(
    'collected', v_fragments_earned,
    'new_total', v_player.fragments + v_fragments_earned,
    'hours_elapsed', v_hours_elapsed,
    'rate_per_hour', v_player.fragments_per_hour
  );
END;
$$;
```

---

## 5. Conversion Fragments → Transmute

### 5.1 Règle

```
100 Fragments = 10 Transmute Shards
Coût en actions: 0 (gratuit)
Déblocage: Niveau 3
```

### 5.2 Endpoint

```typescript
// server/api/forge/convert.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { amount = 100 } = body

  // Doit être un multiple de 100
  if (amount % 100 !== 0 || amount < 100) {
    throw createError({
      statusCode: 400,
      message: 'Amount must be a multiple of 100'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_convert_fragments', {
    p_user_login: session.user.login,
    p_amount: amount
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
```

---

## 6. Composable

```typescript
// composables/useForgeCollection.ts

export function useForgeCollection() {
  const { forgeState, refreshState } = useForgeState()
  const isCollecting = ref(false)
  const isConverting = ref(false)

  async function collectFragments() {
    if (isCollecting.value) return

    isCollecting.value = true

    try {
      const { data } = await useFetch('/api/forge/collect', {
        method: 'POST'
      })

      if (data.value?.collected > 0) {
        // Feedback visuel
        useForgeEffects().showNotification(
          `+${data.value.collected} Fragments collectés!`,
          'success'
        )

        // Augmenter la chaleur
        useForgeHeat().increaseHeat(5)

        // Rafraîchir l'état
        await refreshState()
      }

      return data.value
    } finally {
      isCollecting.value = false
    }
  }

  async function convertFragments(amount: number = 100) {
    if (isConverting.value) return
    if (forgeState.value.fragments < amount) return

    isConverting.value = true

    try {
      const { data } = await useFetch('/api/forge/convert', {
        method: 'POST',
        body: { amount }
      })

      if (data.value?.success) {
        const transGained = amount / 10

        useForgeEffects().showNotification(
          `${amount} Fragments → ${transGained} Transmute Shards`,
          'success'
        )

        await refreshState()
      }

      return data.value
    } finally {
      isConverting.value = false
    }
  }

  // Calculs
  const productionRate = computed(() =>
    calculateProductionRate(forgeState.value)
  )

  const accumulatedFragments = computed(() => {
    const last = new Date(forgeState.value.last_collection_at)
    const hours = Math.min(24, (Date.now() - last.getTime()) / (1000 * 60 * 60))
    return Math.floor(productionRate.value * hours)
  })

  return {
    isCollecting,
    isConverting,
    collectFragments,
    convertFragments,
    productionRate,
    accumulatedFragments
  }
}
```

---

## 7. Références

- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §3
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §4.3
- **Composant**: `components/forge/ForgeCollection.vue` (à créer)
