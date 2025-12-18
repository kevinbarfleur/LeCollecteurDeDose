# Module 1: Le Fourneau - Spécification Technique

> **Document**: `modules/M1_FOURNEAU.md`
> **Version**: 1.0
> **Statut**: Module Central (toujours visible après awakening)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

Le Fourneau est le **cœur visuel et mécanique** de la Forge:
- Centre de l'écran, toujours visible
- Animation de flammes CSS
- Zone de drop (Creuset) pour fondre les cartes
- Jauge de chaleur avec bonus visuels

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant | Visible mais éteint, bouton "Allumer" |
| Awakening | Animation d'allumage |
| Apprentice+ | Actif et fonctionnel |

---

## 2. Composants Frontend

### 2.1 Architecture des Composants

```
components/forge/
├── ForgeVisualization.vue      # Container principal avec flammes
├── ForgeCrucible.vue           # Zone de drop
├── ForgeHeatMeter.vue          # Jauge de chaleur
└── ForgeIgniteButton.vue       # Bouton d'allumage (phase dormant)
```

### 2.2 ForgeVisualization.vue

```vue
<script setup lang="ts">
/**
 * ForgeVisualization - Hub Central avec Flammes Animées
 *
 * Affiche le fourneau avec:
 * - Flammes CSS animées (intensité basée sur heat)
 * - Slot pour le Creuset
 * - Effets visuels de chaleur
 */

interface Props {
  heat: number           // 0-100
  isActive: boolean      // Forge allumée ou non
  isAwakening?: boolean  // Animation d'allumage en cours
}

const props = withDefaults(defineProps<Props>(), {
  heat: 0,
  isActive: false,
  isAwakening: false
})

const emit = defineEmits<{
  (e: 'ignite'): void
}>()

// Calcul de l'intensité des flammes
const flameIntensity = computed(() => {
  if (!props.isActive) return 0
  return Math.min(100, Math.max(20, props.heat))
})

// Catégorie de chaleur pour les styles
const heatCategory = computed(() => {
  if (props.heat < 20) return 'cold'
  if (props.heat < 40) return 'warm'
  if (props.heat < 60) return 'hot'
  if (props.heat < 80) return 'burning'
  return 'incandescent'
})
</script>

<template>
  <div
    class="forge-visualization"
    :class="[
      `heat-${heatCategory}`,
      { active: isActive, awakening: isAwakening }
    ]"
  >
    <!-- Flammes (5 éléments animés) -->
    <div class="flames-container" v-if="isActive">
      <div
        v-for="i in 5"
        :key="i"
        class="flame"
        :class="`flame-${i}`"
        :style="{ '--intensity': flameIntensity / 100 }"
      />
    </div>

    <!-- Structure du fourneau -->
    <div class="furnace-body">
      <div class="furnace-top">
        <div class="chimney left" />
        <div class="chimney right" />
      </div>

      <div class="furnace-main">
        <!-- Slot pour le Creuset -->
        <div class="crucible-container">
          <slot name="crucible">
            <ForgeCrucible />
          </slot>
        </div>
      </div>

      <div class="furnace-base">
        <!-- Slot pour la jauge de chaleur -->
        <slot name="heat-meter" />
      </div>
    </div>

    <!-- Particules d'étincelles -->
    <div class="ember-particles" v-if="isActive && heat > 50">
      <span v-for="i in 8" :key="i" class="ember" />
    </div>

    <!-- Bouton d'allumage (phase dormant) -->
    <div v-if="!isActive && !isAwakening" class="ignite-overlay">
      <button class="ignite-button" @click="emit('ignite')">
        Éveiller la Forge
      </button>
    </div>

    <!-- Animation d'allumage -->
    <div v-if="isAwakening" class="awakening-overlay">
      <div class="awakening-text">Les flammes renaissent...</div>
    </div>
  </div>
</template>

<style scoped>
.forge-visualization {
  position: relative;
  width: 100%;
  max-width: 400px;
  aspect-ratio: 4/3;
}

/* Flammes CSS */
.flames-container {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 40%;
  pointer-events: none;
}

.flame {
  position: absolute;
  bottom: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(
    to top,
    rgba(255, 100, 0, calc(0.8 * var(--intensity))) 0%,
    rgba(255, 200, 0, calc(0.6 * var(--intensity))) 40%,
    rgba(255, 255, 100, calc(0.3 * var(--intensity))) 70%,
    transparent 100%
  );
  border-radius: 50% 50% 20% 20%;
  animation: flicker 0.5s ease-in-out infinite alternate;
  filter: blur(2px);
}

.flame-1 { left: 10%; animation-delay: 0s; }
.flame-2 { left: 25%; animation-delay: 0.1s; height: 120%; }
.flame-3 { left: 40%; animation-delay: 0.2s; height: 90%; }
.flame-4 { left: 55%; animation-delay: 0.15s; height: 110%; }
.flame-5 { left: 70%; animation-delay: 0.05s; }

@keyframes flicker {
  0% { transform: scaleY(1) scaleX(1); }
  100% { transform: scaleY(1.1) scaleX(0.95); }
}

/* Catégories de chaleur */
.heat-cold .flames-container { opacity: 0.3; }
.heat-warm .flames-container { opacity: 0.5; }
.heat-hot .flames-container { opacity: 0.7; }
.heat-burning .flames-container { opacity: 0.85; }
.heat-incandescent .flames-container {
  opacity: 1;
  filter: drop-shadow(0 0 20px rgba(255, 150, 0, 0.5));
}

/* Particules d'étincelles */
.ember-particles {
  position: absolute;
  top: 10%;
  left: 50%;
  width: 60%;
  transform: translateX(-50%);
  pointer-events: none;
}

.ember {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #ff6600;
  border-radius: 50%;
  animation: float-up 2s ease-out infinite;
}

.ember:nth-child(odd) { animation-delay: -1s; }

@keyframes float-up {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(0);
    opacity: 0;
  }
}
</style>
```

### 2.3 ForgeCrucible.vue

```vue
<script setup lang="ts">
/**
 * ForgeCrucible - Zone de Drop pour les Cartes
 *
 * Détecte quand une carte est glissée au-dessus et
 * émet un événement lors du drop.
 */

interface Props {
  active?: boolean
  isDropTarget?: boolean
  hintText?: string
  dropText?: string
}

const props = withDefaults(defineProps<Props>(), {
  active: true,
  isDropTarget: false,
  hintText: 'Glisse une carte ici',
  dropText: 'Fondre!'
})

const emit = defineEmits<{
  (e: 'drop', cardId: string): void
}>()

const crucibleRef = ref<HTMLElement | null>(null)

// Expose pour détection de collision
defineExpose({
  getBounds: () => crucibleRef.value?.getBoundingClientRect(),
  element: crucibleRef
})
</script>

<template>
  <div
    ref="crucibleRef"
    class="forge-crucible"
    :class="{
      active,
      'drop-target': isDropTarget,
      disabled: !active
    }"
  >
    <div class="crucible-inner">
      <span v-if="isDropTarget && active" class="hint-drop">
        {{ dropText }}
      </span>
      <span v-else-if="active" class="hint-idle">
        {{ hintText }}
      </span>
      <span v-else class="hint-disabled">
        Non disponible
      </span>
    </div>

    <!-- Effet de lueur -->
    <div class="crucible-glow" />
  </div>
</template>
```

---

## 3. Mécanique de Fonte

### 3.1 Flux de Données

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Inventaire    │────▶│    Creuset      │────▶│    Backend      │
│   (drag start)  │     │   (drop zone)   │     │  /api/forge/    │
│                 │     │                 │     │    smelt        │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│    Feedback     │◀────│   Mise à jour   │◀─────────────┘
│   Animation     │     │     State       │
└─────────────────┘     └─────────────────┘
```

### 3.2 Composable useForgeSmelting

```typescript
// composables/useForgeSmelting.ts

export function useForgeSmelting() {
  const { forgeState, updateResources } = useForgeState()
  const { playSound, showParticles } = useForgeEffects()

  const isSmelting = ref(false)
  const lastSmeltResult = ref<SmeltResult | null>(null)

  async function smeltCard(cardUid: number, quantity: number = 1) {
    if (isSmelting.value) return

    isSmelting.value = true

    try {
      // Appel API
      const { data, error } = await useFetch('/api/forge/smelt', {
        method: 'POST',
        body: { card_uid: cardUid, quantity }
      })

      if (error.value) {
        throw new Error(error.value.message)
      }

      const result = data.value as SmeltResult

      // Feedback
      playSound('smelt')
      showParticles('shards', result.total_shards)

      // Mise à jour locale
      lastSmeltResult.value = result

      // Augmenter la chaleur
      increaseHeat(10)

      return result
    } catch (e) {
      console.error('Smelt failed:', e)
      throw e
    } finally {
      isSmelting.value = false
    }
  }

  return {
    isSmelting,
    lastSmeltResult,
    smeltCard
  }
}
```

### 3.3 Endpoint Backend

```typescript
// server/api/forge/smelt.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)

  const { card_uid, quantity = 1 } = body

  // Validation
  if (!card_uid || quantity < 1) {
    throw createError({
      statusCode: 400,
      message: 'Invalid card_uid or quantity'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Appeler la fonction SQL
  const { data, error } = await supabase.rpc('forge_smelt_card', {
    p_user_login: session.user.login,
    p_card_uid: card_uid,
    p_quantity: quantity
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

### 3.4 Fonction SQL

```sql
-- Fonction existante dans 20251218231000_create_forge_functions.sql

CREATE OR REPLACE FUNCTION forge_smelt_card(
  p_user_login TEXT,
  p_card_uid INTEGER,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id UUID;
  v_user_id UUID;
  v_card_tier TEXT;
  v_card_quality TEXT;
  v_current_quantity INTEGER;
  v_yield JSONB;
  v_xp_earned INTEGER;
  v_heat_bonus NUMERIC;
BEGIN
  -- Récupérer le joueur
  SELECT fp.id, fp.user_id INTO v_player_id, v_user_id
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier la carte
  SELECT fc.quantity, fc.quality, uc.tier
  INTO v_current_quantity, v_card_quality, v_card_tier
  FROM forge_cards fc
  JOIN unique_cards uc ON uc.uid = fc.card_uid
  WHERE fc.player_id = v_player_id AND fc.card_uid = p_card_uid;

  IF v_current_quantity IS NULL OR v_current_quantity < p_quantity THEN
    RETURN jsonb_build_object('error', 'Not enough cards');
  END IF;

  -- Vérifier les actions
  IF NOT forge_has_actions(v_player_id, 1) THEN
    RETURN jsonb_build_object('error', 'No actions remaining');
  END IF;

  -- Calculer le rendement
  v_yield := forge_calculate_smelt_yield(v_card_tier, v_card_quality, p_quantity);

  -- Mettre à jour les ressources
  UPDATE forge_players SET
    transmute_shards = transmute_shards + (v_yield->>'transmute')::INTEGER,
    alteration_shards = alteration_shards + (v_yield->>'alteration')::INTEGER,
    augment_shards = augment_shards + (v_yield->>'augment')::INTEGER,
    exalted_shards = exalted_shards + (v_yield->>'exalted')::INTEGER,
    cards_smelted = cards_smelted + p_quantity,
    actions_today = actions_today + 1
  WHERE id = v_player_id;

  -- Réduire la quantité de cartes
  UPDATE forge_cards SET
    quantity = quantity - p_quantity
  WHERE player_id = v_player_id AND card_uid = p_card_uid;

  -- Supprimer si quantité = 0
  DELETE FROM forge_cards
  WHERE player_id = v_player_id AND card_uid = p_card_uid AND quantity <= 0;

  -- Calculer XP
  v_xp_earned := forge_calculate_smelt_xp(v_card_tier, v_card_quality, p_quantity);

  -- Ajouter XP
  PERFORM forge_add_xp(v_player_id, v_xp_earned, 'smelt');

  -- Logger
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data,
    transmute_delta, alteration_delta, augment_delta, exalted_delta,
    xp_earned
  ) VALUES (
    v_player_id, 'smelt',
    jsonb_build_object(
      'card_uid', p_card_uid,
      'tier', v_card_tier,
      'quality', v_card_quality,
      'quantity', p_quantity
    ),
    (v_yield->>'transmute')::INTEGER,
    (v_yield->>'alteration')::INTEGER,
    (v_yield->>'augment')::INTEGER,
    (v_yield->>'exalted')::INTEGER,
    v_xp_earned
  );

  RETURN jsonb_build_object(
    'success', true,
    'yield', v_yield,
    'xp_earned', v_xp_earned,
    'card_tier', v_card_tier,
    'card_quality', v_card_quality,
    'quantity_smelted', p_quantity
  );
END;
$$;
```

---

## 4. Système de Chaleur

### 4.1 Règles

| Règle | Valeur |
|-------|--------|
| Chaleur initiale | 0% |
| Gain par fonte | +10% |
| Gain par collecte | +5% |
| Décroissance | -5% / 10 minutes d'inactivité |
| Maximum | 100% |
| Minimum | 0% |

### 4.2 Bonus de Chaleur

| Niveau | Nom | Range | Bonus Shards |
|--------|-----|-------|--------------|
| 0 | Froid | 0-20% | -10% |
| 1 | Tiède | 21-40% | ±0% |
| 2 | Chaud | 41-60% | +5% |
| 3 | Ardent | 61-80% | +15% |
| 4 | Incandescent | 81-100% | +25% |

### 4.3 Composable useForgeHeat

```typescript
// composables/useForgeHeat.ts

export function useForgeHeat() {
  const heat = ref(0)
  const lastUpdate = ref(Date.now())

  const heatCategory = computed(() => {
    if (heat.value < 20) return 'cold'
    if (heat.value < 40) return 'warm'
    if (heat.value < 60) return 'hot'
    if (heat.value < 80) return 'burning'
    return 'incandescent'
  })

  const heatBonus = computed(() => {
    const bonuses = { cold: -0.10, warm: 0, hot: 0.05, burning: 0.15, incandescent: 0.25 }
    return bonuses[heatCategory.value]
  })

  function increaseHeat(amount: number) {
    heat.value = Math.min(100, heat.value + amount)
    lastUpdate.value = Date.now()
  }

  function decreaseHeat() {
    const now = Date.now()
    const minutesElapsed = (now - lastUpdate.value) / (1000 * 60)
    const decrease = Math.floor(minutesElapsed / 10) * 5

    if (decrease > 0) {
      heat.value = Math.max(0, heat.value - decrease)
      lastUpdate.value = now
    }
  }

  // Décroissance automatique
  onMounted(() => {
    const interval = setInterval(decreaseHeat, 60000) // Toutes les minutes
    onUnmounted(() => clearInterval(interval))
  })

  return {
    heat,
    heatCategory,
    heatBonus,
    increaseHeat,
    decreaseHeat
  }
}
```

---

## 5. Animation d'Allumage

### 5.1 Séquence

```
1. [0s]      Écran sombre, fourneau éteint
2. [0s]      Click sur "Éveiller la Forge"
3. [0-1s]    Bouton disparaît, fondu
4. [1-2s]    Première étincelle au centre
5. [2-3s]    Étincelles se propagent
6. [3-4s]    Flammes commencent à apparaître
7. [4-5s]    Flammes à pleine intensité
8. [5s]      Texte "La Forge est éveillée!"
9. [6s]      Transition vers le mode actif
```

### 5.2 CSS Animation

```css
@keyframes forge-ignite {
  0% {
    filter: brightness(0.2);
    transform: scale(0.98);
  }
  30% {
    filter: brightness(0.5);
  }
  60% {
    filter: brightness(0.8) drop-shadow(0 0 20px orange);
  }
  100% {
    filter: brightness(1) drop-shadow(0 0 30px rgba(255, 150, 0, 0.5));
    transform: scale(1);
  }
}

.awakening .furnace-body {
  animation: forge-ignite 4s ease-out forwards;
}

.awakening .flames-container {
  animation: flames-birth 3s ease-out 1s forwards;
}

@keyframes flames-birth {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.5);
  }
  50% {
    opacity: 0.5;
    transform: translateY(10px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## 6. Tests

### 6.1 Tests Unitaires

```typescript
// tests/forge/furnace.test.ts

describe('ForgeFurnace', () => {
  describe('Heat System', () => {
    it('increases heat on smelt', () => {
      const { heat, increaseHeat } = useForgeHeat()
      expect(heat.value).toBe(0)

      increaseHeat(10)
      expect(heat.value).toBe(10)
    })

    it('caps heat at 100', () => {
      const { heat, increaseHeat } = useForgeHeat()
      increaseHeat(150)
      expect(heat.value).toBe(100)
    })

    it('returns correct heat category', () => {
      const { heat, heatCategory } = useForgeHeat()

      heat.value = 15
      expect(heatCategory.value).toBe('cold')

      heat.value = 50
      expect(heatCategory.value).toBe('hot')

      heat.value = 90
      expect(heatCategory.value).toBe('incandescent')
    })
  })

  describe('Smelt Yield', () => {
    it('calculates T3 normal yield correctly', () => {
      const yield = calculateSmeltYield('T3', 'normal', 50, false)
      expect(yield.transmute).toBe(3)
    })

    it('applies heat bonus', () => {
      const yieldCold = calculateSmeltYield('T3', 'normal', 10, false)
      const yieldHot = calculateSmeltYield('T3', 'normal', 90, false)

      expect(yieldHot.transmute).toBeGreaterThan(yieldCold.transmute)
    })
  })
})
```

---

## 7. Références

- **Composants Existants**:
  - `components/forge/ForgeVisualization.vue`
  - `components/forge/ForgeCrucible.vue`
  - `components/forge/ForgeHeatMeter.vue`
- **API Endpoint**: `server/api/forge/smelt.post.ts`
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §4.2
- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md)
