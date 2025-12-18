# Module 6: La Chambre Divine - Spécification Technique

> **Document**: `modules/M6_DIVINE.md`
> **Version**: 1.0
> **Statut**: Module Avancé (Niveau 20+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

La Chambre Divine permet d'**améliorer définitivement** les cartes:
- Bénédiction: Upgrade de tier (T3→T2→T1→T0)
- Exaltation: Upgrade de qualité (Normal→Superior→Masterwork)
- Transmutation: Fusionner 3 cartes basses en 1 carte supérieure
- Préparation vers le Prestige

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant - Corrupted | Caché |
| Corrupted (Niv 18-19) | Teaser doré |
| Ascendant (Niv 20+) | Actif |

### 1.3 Philosophie de Design

```
"La Chambre Divine est le sanctuaire de l'amélioration permanente.
 Ici, les ressources rares transforment tes cartes en artefacts légendaires.
 Chaque upgrade est un investissement vers l'éternité."
```

---

## 2. Actions de la Chambre Divine

### 2.1 Types d'Actions

```typescript
type DivineAction =
  | 'blessing'       // Divine Shard → Upgrade tier
  | 'exaltation'     // Exalted Shard → Upgrade qualité
  | 'transmutation'  // 3× cartes → 1× carte tier supérieur

interface DivineActionResult {
  action: DivineAction
  success: boolean
  original_card: ForgeCard
  result_card?: ForgeCard
  consumed_cards?: ForgeCard[]
  resources_consumed: ResourceCost
}
```

### 2.2 Bénédiction Divine (Tier Upgrade)

```typescript
const DIVINE_BLESSING = {
  cost: {
    divine_shards: 1,
    actions: 2
  },

  mechanics: {
    // Upgrade le tier de la carte
    tier_progression: {
      'T3': 'T2',
      'T2': 'T1',
      'T1': 'T0',
      'T0': null  // Impossible
    },

    // La carte garde son item_class et sa qualité
    preserves: ['item_class', 'quality'],

    // La nouvelle carte est aléatoire dans le nouveau tier/item_class
    new_card_selection: 'random_same_class_higher_tier'
  },

  restrictions: {
    excluded_tiers: ['T0'],  // Déjà au max
    min_level: 20
  }
}
```

### 2.3 Exaltation (Qualité Upgrade)

```typescript
const EXALTATION = {
  cost: {
    exalted_shards: 1,
    actions: 2
  },

  mechanics: {
    quality_progression: {
      'normal': 'superior',
      'superior': 'masterwork',
      'masterwork': null  // Déjà au max
    },

    // La carte reste exactement la même, seule la qualité change
    preserves: ['uid', 'tier', 'item_class', 'name']
  },

  restrictions: {
    excluded_qualities: ['masterwork'],
    min_level: 20
  }
}
```

### 2.4 Transmutation (Fusion de Cartes)

```typescript
const TRANSMUTATION = {
  cost: {
    augment_shards: 5,
    actions: 2
  },

  mechanics: {
    // Nécessite 3 cartes du même tier
    required_cards: 3,
    same_tier: true,

    // Produit 1 carte du tier supérieur
    result_tier: 'input_tier - 1',  // T3 → T2, T2 → T1, T1 → T0

    // La carte résultante est aléatoire
    result_selection: 'random_higher_tier'
  },

  restrictions: {
    excluded_input_tiers: ['T0'],  // Pas de fusion de T0
    min_level: 20
  }
}
```

---

## 3. Tableau des Coûts

| Action | Coût Principal | Actions | Restriction |
|--------|---------------|---------|-------------|
| Bénédiction | 1 Divine Shard | 2 | Carte non-T0 |
| Exaltation | 1 Exalted Shard | 2 | Carte non-Masterwork |
| Transmutation | 5 Augment Shards | 2 | 3 cartes même tier, non-T0 |

---

## 4. Composant Frontend

### 4.1 ForgeDivine.vue

```vue
<script setup lang="ts">
/**
 * ForgeDivine - Chambre Divine
 *
 * Interface pour les upgrades permanents de cartes.
 * Visuel lumineux et "sacré" pour contraster avec la corruption.
 */

const { forgeState } = useForgeState()
const {
  divineBlessing,
  exaltation,
  transmutation,
  isProcessing
} = useForgeDivine()

const selectedAction = ref<DivineAction | null>(null)
const selectedCard = ref<ForgeCard | null>(null)
const selectedCards = ref<ForgeCard[]>([])  // Pour transmutation
const lastResult = ref<DivineActionResult | null>(null)

// Cartes éligibles selon l'action
const eligibleCards = computed(() => {
  if (!selectedAction.value) return []

  return forgeState.value.cards.filter(card => {
    switch (selectedAction.value) {
      case 'blessing':
        return card.tier !== 'T0'
      case 'exaltation':
        return card.quality !== 'masterwork'
      case 'transmutation':
        return card.tier !== 'T0'
      default:
        return false
    }
  })
})

// Cartes groupées par tier (pour transmutation)
const cardsByTier = computed(() => {
  const groups: Record<string, ForgeCard[]> = { T3: [], T2: [], T1: [] }

  forgeState.value.cards.forEach(card => {
    if (card.tier !== 'T0' && groups[card.tier]) {
      groups[card.tier].push(card)
    }
  })

  return groups
})

// Peut-on faire l'action?
function canDoAction(action: DivineAction): boolean {
  const state = forgeState.value

  switch (action) {
    case 'blessing':
      return state.divine_shards >= 1
        && state.actions_remaining >= 2
        && eligibleCards.value.length > 0
    case 'exaltation':
      return state.exalted_shards >= 1
        && state.actions_remaining >= 2
        && eligibleCards.value.length > 0
    case 'transmutation':
      return state.augment_shards >= 5
        && state.actions_remaining >= 2
        && Object.values(cardsByTier.value).some(cards => cards.length >= 3)
    default:
      return false
  }
}

// Sélectionner une carte pour blessing/exaltation
function selectCard(card: ForgeCard) {
  if (selectedAction.value === 'transmutation') {
    // Toggle la sélection pour transmutation
    const idx = selectedCards.value.findIndex(c => c.id === card.id)
    if (idx >= 0) {
      selectedCards.value.splice(idx, 1)
    } else if (selectedCards.value.length < 3) {
      // Vérifier que c'est le même tier
      if (selectedCards.value.length === 0 ||
          selectedCards.value[0].tier === card.tier) {
        selectedCards.value.push(card)
      }
    }
  } else {
    selectedCard.value = card
  }
}

// Exécuter l'action
async function executeAction() {
  if (!selectedAction.value) return

  let result: DivineActionResult | null = null

  switch (selectedAction.value) {
    case 'blessing':
      if (!selectedCard.value) return
      result = await divineBlessing(selectedCard.value.id)
      break
    case 'exaltation':
      if (!selectedCard.value) return
      result = await exaltation(selectedCard.value.id)
      break
    case 'transmutation':
      if (selectedCards.value.length !== 3) return
      result = await transmutation(selectedCards.value.map(c => c.id))
      break
  }

  lastResult.value = result
  resetSelection()
}

function resetSelection() {
  selectedCard.value = null
  selectedCards.value = []
}

function selectActionType(action: DivineAction) {
  selectedAction.value = action
  resetSelection()
}
</script>

<template>
  <div class="forge-divine">
    <div class="divine-header">
      <h3>Chambre Divine</h3>
      <ForgeTooltip
        title="Chambre Divine"
        what="Un sanctuaire sacré où les cartes sont élevées vers la perfection."
        why="Les upgrades de tier et qualité sont permanents et augmentent la valeur de tes cartes."
        how="Utilise des Divine Shards pour le tier, Exalted pour la qualité, ou fusionne 3 cartes identiques."
      />
    </div>

    <!-- Ressources disponibles -->
    <div class="divine-resources">
      <div class="resource divine">
        <span class="icon">✨</span>
        <span class="label">Divine</span>
        <span class="value">{{ forgeState.divine_shards }}</span>
      </div>
      <div class="resource exalted">
        <span class="icon">💎</span>
        <span class="label">Exalted</span>
        <span class="value">{{ forgeState.exalted_shards }}</span>
      </div>
      <div class="resource augment">
        <span class="icon">🔷</span>
        <span class="label">Augment</span>
        <span class="value">{{ forgeState.augment_shards }}</span>
      </div>
    </div>

    <!-- Actions disponibles -->
    <div class="divine-actions">

      <!-- BÉNÉDICTION -->
      <div
        class="action-panel"
        :class="{ active: selectedAction === 'blessing', disabled: !canDoAction('blessing') }"
        @click="selectActionType('blessing')"
      >
        <div class="action-icon">🌟</div>
        <h4>Bénédiction Divine</h4>
        <p class="action-cost">1 Divine + 2 Actions</p>
        <p class="action-desc">
          Élève une carte vers le tier supérieur
        </p>
        <div class="action-preview">
          T3 → T2 → T1 → T0
        </div>
      </div>

      <!-- EXALTATION -->
      <div
        class="action-panel"
        :class="{ active: selectedAction === 'exaltation', disabled: !canDoAction('exaltation') }"
        @click="selectActionType('exaltation')"
      >
        <div class="action-icon">💫</div>
        <h4>Exaltation</h4>
        <p class="action-cost">1 Exalted + 2 Actions</p>
        <p class="action-desc">
          Améliore la qualité d'une carte
        </p>
        <div class="action-preview">
          Normal → Superior → Masterwork
        </div>
      </div>

      <!-- TRANSMUTATION -->
      <div
        class="action-panel"
        :class="{ active: selectedAction === 'transmutation', disabled: !canDoAction('transmutation') }"
        @click="selectActionType('transmutation')"
      >
        <div class="action-icon">🔮</div>
        <h4>Transmutation</h4>
        <p class="action-cost">5 Augment + 2 Actions</p>
        <p class="action-desc">
          Fusionne 3 cartes en 1 de tier supérieur
        </p>
        <div class="action-preview">
          3× T3 → 1× T2
        </div>
      </div>

    </div>

    <!-- Sélection de carte(s) -->
    <div v-if="selectedAction" class="card-selection">
      <h5>
        <span v-if="selectedAction === 'transmutation'">
          Sélectionne 3 cartes du même tier ({{ selectedCards.length }}/3)
        </span>
        <span v-else>
          Sélectionne une carte à améliorer
        </span>
      </h5>

      <div class="cards-grid">
        <div
          v-for="card in eligibleCards"
          :key="card.id"
          class="selectable-card"
          :class="{
            selected: selectedCard?.id === card.id ||
                     selectedCards.some(c => c.id === card.id),
            'tier-t0': card.tier === 'T0',
            'tier-t1': card.tier === 'T1',
            'tier-t2': card.tier === 'T2',
            'tier-t3': card.tier === 'T3',
            'quality-superior': card.quality === 'superior',
            'quality-masterwork': card.quality === 'masterwork'
          }"
          @click="selectCard(card)"
        >
          <div class="card-tier">{{ card.tier }}</div>
          <div class="card-name">{{ card.name }}</div>
          <div class="card-quality">{{ card.quality }}</div>
        </div>
      </div>

      <!-- Preview du résultat -->
      <div v-if="selectedCard || selectedCards.length === 3" class="result-preview">
        <div class="preview-arrow">
          <span class="from">
            <template v-if="selectedAction === 'transmutation'">
              3× {{ selectedCards[0]?.tier }}
            </template>
            <template v-else>
              {{ selectedCard?.tier }} {{ selectedCard?.quality }}
            </template>
          </span>
          <span class="arrow">→</span>
          <span class="to">
            <template v-if="selectedAction === 'blessing'">
              {{ getNextTier(selectedCard?.tier) }} {{ selectedCard?.quality }}
            </template>
            <template v-else-if="selectedAction === 'exaltation'">
              {{ selectedCard?.tier }} {{ getNextQuality(selectedCard?.quality) }}
            </template>
            <template v-else-if="selectedAction === 'transmutation'">
              1× {{ getNextTier(selectedCards[0]?.tier) }}
            </template>
          </span>
        </div>
      </div>

      <!-- Bouton d'exécution -->
      <button
        class="execute-button"
        :disabled="isProcessing ||
                  (selectedAction !== 'transmutation' && !selectedCard) ||
                  (selectedAction === 'transmutation' && selectedCards.length !== 3)"
        @click="executeAction"
      >
        <span v-if="isProcessing">Transformation en cours...</span>
        <span v-else>
          <template v-if="selectedAction === 'blessing'">Bénir la carte</template>
          <template v-else-if="selectedAction === 'exaltation'">Exalter la carte</template>
          <template v-else>Transmuter les cartes</template>
        </span>
      </button>
    </div>

    <!-- Résultat -->
    <Teleport to="body">
      <Transition name="divine-result">
        <div v-if="lastResult" class="result-overlay divine-overlay" @click="lastResult = null">
          <div class="result-content" @click.stop>
            <div class="divine-rays"></div>

            <div v-if="lastResult.success" class="success-result">
              <div class="result-icon">✨</div>
              <h4>Transformation Réussie!</h4>

              <div class="transformation-display">
                <div class="from-card">
                  <span class="tier">{{ lastResult.original_card.tier }}</span>
                  <span class="name">{{ lastResult.original_card.name }}</span>
                  <span class="quality">{{ lastResult.original_card.quality }}</span>
                </div>
                <div class="arrow">→</div>
                <div class="to-card highlighted">
                  <span class="tier">{{ lastResult.result_card?.tier }}</span>
                  <span class="name">{{ lastResult.result_card?.name }}</span>
                  <span class="quality">{{ lastResult.result_card?.quality }}</span>
                </div>
              </div>
            </div>

            <button class="dismiss" @click="lastResult = null">
              Continuer
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.forge-divine {
  padding: 1.5rem;
  background: linear-gradient(180deg,
    rgba(234, 179, 8, 0.1) 0%,
    var(--color-surface) 100%
  );
  border-radius: 8px;
  border: 2px solid rgba(234, 179, 8, 0.3);
  position: relative;
}

.divine-header h3 {
  color: #eab308;
  text-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
}

.divine-resources {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 1.5rem 0;
}

.resource {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
}

.resource .icon {
  font-size: 1.5rem;
}

.resource .label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.resource .value {
  font-size: 1.5rem;
  font-weight: bold;
}

.resource.divine .value { color: #eab308; }
.resource.exalted .value { color: #a855f7; }
.resource.augment .value { color: #3b82f6; }

.divine-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.action-panel {
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-panel:hover:not(.disabled) {
  border-color: rgba(234, 179, 8, 0.5);
  transform: translateY(-2px);
}

.action-panel.active {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.1);
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.2);
}

.action-panel.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.action-panel h4 {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.action-cost {
  font-size: 0.75rem;
  color: #eab308;
}

.action-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0.5rem 0;
}

.action-preview {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
  display: inline-block;
}

.card-selection {
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0;
}

.selectable-card {
  padding: 0.75rem;
  background: rgba(0,0,0,0.3);
  border: 2px solid transparent;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.selectable-card:hover {
  border-color: rgba(234, 179, 8, 0.5);
}

.selectable-card.selected {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.2);
}

.selectable-card.tier-t0 { border-left: 4px solid gold; }
.selectable-card.tier-t1 { border-left: 4px solid #a855f7; }
.selectable-card.tier-t2 { border-left: 4px solid #3b82f6; }
.selectable-card.tier-t3 { border-left: 4px solid #6b7280; }

.selectable-card.quality-superior {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent);
}

.selectable-card.quality-masterwork {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), transparent);
  box-shadow: inset 0 0 10px rgba(234, 179, 8, 0.2);
}

.card-tier {
  font-weight: bold;
  font-size: 0.875rem;
}

.card-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-quality {
  font-size: 0.625rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.result-preview {
  padding: 1rem;
  background: rgba(234, 179, 8, 0.1);
  border-radius: 8px;
  margin: 1rem 0;
}

.preview-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.25rem;
}

.preview-arrow .from {
  color: var(--color-text-muted);
}

.preview-arrow .arrow {
  color: #eab308;
}

.preview-arrow .to {
  color: #eab308;
  font-weight: bold;
}

.execute-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: bold;
  background: linear-gradient(135deg, #ca8a04, #eab308);
  border: none;
  border-radius: 8px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.execute-button:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
}

.execute-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Result Overlay */
.divine-overlay {
  background: rgba(0,0,0,0.9);
}

.result-content {
  position: relative;
  padding: 3rem;
  text-align: center;
}

.divine-rays {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle,
    rgba(234, 179, 8, 0.3) 0%,
    transparent 70%
  );
  animation: divine-pulse 2s infinite;
}

.success-result {
  position: relative;
  z-index: 1;
}

.result-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: divine-bounce 0.5s ease-out;
}

.transformation-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
}

.from-card, .to-card {
  padding: 1rem;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
  min-width: 120px;
}

.to-card.highlighted {
  background: rgba(234, 179, 8, 0.2);
  border: 2px solid #eab308;
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
}

.transformation-display .arrow {
  font-size: 2rem;
  color: #eab308;
}

.dismiss {
  padding: 1rem 3rem;
  font-size: 1.25rem;
  background: rgba(234, 179, 8, 0.2);
  border: 2px solid #eab308;
  border-radius: 8px;
  color: #eab308;
  cursor: pointer;
}

@keyframes divine-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes divine-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.divine-result-enter-active {
  animation: divine-appear 0.5s ease-out;
}

.divine-result-leave-active {
  animation: divine-appear 0.3s ease-in reverse;
}

@keyframes divine-appear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
```

---

## 5. Backend

### 5.1 Endpoint Principal

```typescript
// server/api/forge/divine.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { action, card_id, card_ids } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required'
    })
  }

  const validActions = ['blessing', 'exaltation', 'transmutation']
  if (!validActions.includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action type'
    })
  }

  // Blessing et Exaltation nécessitent une carte
  if ((action === 'blessing' || action === 'exaltation') && !card_id) {
    throw createError({
      statusCode: 400,
      message: 'card_id is required for this action'
    })
  }

  // Transmutation nécessite 3 cartes
  if (action === 'transmutation') {
    if (!card_ids || !Array.isArray(card_ids) || card_ids.length !== 3) {
      throw createError({
        statusCode: 400,
        message: 'transmutation requires exactly 3 card_ids'
      })
    }
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_divine_action', {
    p_user_login: session.user.login,
    p_action: action,
    p_card_id: card_id || null,
    p_card_ids: card_ids || null
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

---

## 6. Fonction SQL

```sql
CREATE OR REPLACE FUNCTION forge_divine_action(
  p_user_login TEXT,
  p_action TEXT,
  p_card_id UUID DEFAULT NULL,
  p_card_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_card forge_cards%ROWTYPE;
  v_cards forge_cards[];
  v_result JSONB;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier le niveau minimum (20)
  IF v_player.atelier_level < 20 THEN
    RETURN jsonb_build_object('error', 'Divine Chamber requires level 20');
  END IF;

  -- Vérifier les actions
  IF v_player.actions_remaining < 2 THEN
    RETURN jsonb_build_object('error', 'Not enough actions (need 2)');
  END IF;

  -- Exécuter selon l'action
  CASE p_action
    WHEN 'blessing' THEN
      v_result := divine_blessing(v_player, p_card_id);
    WHEN 'exaltation' THEN
      v_result := divine_exaltation(v_player, p_card_id);
    WHEN 'transmutation' THEN
      v_result := divine_transmutation(v_player, p_card_ids);
    ELSE
      RETURN jsonb_build_object('error', 'Invalid action');
  END CASE;

  -- Si succès, déduire les actions
  IF (v_result->>'success')::BOOLEAN THEN
    UPDATE forge_players SET
      actions_remaining = actions_remaining - 2
    WHERE id = v_player.id;

    -- Logger
    INSERT INTO forge_activity_logs (
      player_id, action_type, action_data
    ) VALUES (
      v_player.id, 'divine_' || p_action,
      v_result
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Bénédiction Divine (Tier Upgrade)
CREATE OR REPLACE FUNCTION divine_blessing(
  p_player forge_players,
  p_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card forge_cards%ROWTYPE;
  v_new_tier TEXT;
  v_new_card unique_cards%ROWTYPE;
  v_original JSONB;
BEGIN
  -- Vérifier les ressources
  IF p_player.divine_shards < 1 THEN
    RETURN jsonb_build_object('error', 'Not enough Divine Shards');
  END IF;

  -- Récupérer la carte
  SELECT * INTO v_card
  FROM forge_cards
  WHERE id = p_card_id AND player_id = p_player.id;

  IF v_card IS NULL THEN
    RETURN jsonb_build_object('error', 'Card not found');
  END IF;

  -- Vérifier que ce n'est pas T0
  IF v_card.card_tier = 'T0' THEN
    RETURN jsonb_build_object('error', 'Cannot bless T0 cards');
  END IF;

  -- Stocker l'original
  v_original := jsonb_build_object(
    'id', v_card.id,
    'name', v_card.card_name,
    'tier', v_card.card_tier,
    'quality', v_card.card_quality
  );

  -- Déterminer le nouveau tier
  v_new_tier := CASE v_card.card_tier
    WHEN 'T3' THEN 'T2'
    WHEN 'T2' THEN 'T1'
    WHEN 'T1' THEN 'T0'
  END;

  -- Trouver une carte du même item_class au nouveau tier (READ ONLY sur unique_cards)
  SELECT * INTO v_new_card
  FROM unique_cards
  WHERE tier = v_new_tier
    AND item_class = (
      SELECT uc.item_class FROM unique_cards uc WHERE uc.uid = v_card.card_uid
    )
  ORDER BY RANDOM()
  LIMIT 1;

  -- Si pas trouvé dans le même item_class, prendre n'importe quelle carte du tier
  IF v_new_card IS NULL THEN
    SELECT * INTO v_new_card
    FROM unique_cards
    WHERE tier = v_new_tier
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Consommer les ressources
  UPDATE forge_players SET
    divine_shards = divine_shards - 1
  WHERE id = p_player.id;

  -- Mettre à jour la carte
  UPDATE forge_cards SET
    card_uid = v_new_card.uid,
    card_name = v_new_card.name,
    card_tier = v_new_tier,
    updated_at = NOW()
  WHERE id = v_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'blessing',
    'original_card', v_original,
    'result_card', jsonb_build_object(
      'id', v_card.id,
      'uid', v_new_card.uid,
      'name', v_new_card.name,
      'tier', v_new_tier,
      'quality', v_card.card_quality
    ),
    'resources_consumed', jsonb_build_object('divine_shards', 1)
  );
END;
$$;

-- Exaltation (Qualité Upgrade)
CREATE OR REPLACE FUNCTION divine_exaltation(
  p_player forge_players,
  p_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card forge_cards%ROWTYPE;
  v_new_quality TEXT;
  v_original JSONB;
BEGIN
  -- Vérifier les ressources
  IF p_player.exalted_shards < 1 THEN
    RETURN jsonb_build_object('error', 'Not enough Exalted Shards');
  END IF;

  -- Récupérer la carte
  SELECT * INTO v_card
  FROM forge_cards
  WHERE id = p_card_id AND player_id = p_player.id;

  IF v_card IS NULL THEN
    RETURN jsonb_build_object('error', 'Card not found');
  END IF;

  -- Vérifier que ce n'est pas masterwork
  IF v_card.card_quality = 'masterwork' THEN
    RETURN jsonb_build_object('error', 'Card is already Masterwork');
  END IF;

  -- Stocker l'original
  v_original := jsonb_build_object(
    'id', v_card.id,
    'name', v_card.card_name,
    'tier', v_card.card_tier,
    'quality', v_card.card_quality
  );

  -- Déterminer la nouvelle qualité
  v_new_quality := CASE v_card.card_quality
    WHEN 'normal' THEN 'superior'
    WHEN 'superior' THEN 'masterwork'
  END;

  -- Consommer les ressources
  UPDATE forge_players SET
    exalted_shards = exalted_shards - 1
  WHERE id = p_player.id;

  -- Mettre à jour la carte
  UPDATE forge_cards SET
    card_quality = v_new_quality,
    updated_at = NOW()
  WHERE id = v_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'exaltation',
    'original_card', v_original,
    'result_card', jsonb_build_object(
      'id', v_card.id,
      'uid', v_card.card_uid,
      'name', v_card.card_name,
      'tier', v_card.card_tier,
      'quality', v_new_quality
    ),
    'resources_consumed', jsonb_build_object('exalted_shards', 1)
  );
END;
$$;

-- Transmutation (Fusion de Cartes)
CREATE OR REPLACE FUNCTION divine_transmutation(
  p_player forge_players,
  p_card_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cards forge_cards[];
  v_card forge_cards%ROWTYPE;
  v_common_tier TEXT;
  v_new_tier TEXT;
  v_new_card unique_cards%ROWTYPE;
  v_consumed JSONB := '[]'::jsonb;
BEGIN
  -- Vérifier qu'il y a exactement 3 cartes
  IF array_length(p_card_ids, 1) != 3 THEN
    RETURN jsonb_build_object('error', 'Transmutation requires exactly 3 cards');
  END IF;

  -- Vérifier les ressources
  IF p_player.augment_shards < 5 THEN
    RETURN jsonb_build_object('error', 'Not enough Augment Shards (need 5)');
  END IF;

  -- Récupérer les cartes et vérifier qu'elles appartiennent au joueur
  FOR i IN 1..3 LOOP
    SELECT * INTO v_card
    FROM forge_cards
    WHERE id = p_card_ids[i] AND player_id = p_player.id;

    IF v_card IS NULL THEN
      RETURN jsonb_build_object('error', 'Card not found: ' || p_card_ids[i]);
    END IF;

    IF v_card.card_tier = 'T0' THEN
      RETURN jsonb_build_object('error', 'Cannot transmute T0 cards');
    END IF;

    -- Vérifier que toutes les cartes sont du même tier
    IF v_common_tier IS NULL THEN
      v_common_tier := v_card.card_tier;
    ELSIF v_common_tier != v_card.card_tier THEN
      RETURN jsonb_build_object('error', 'All cards must be the same tier');
    END IF;

    -- Ajouter à la liste des consommées
    v_consumed := v_consumed || jsonb_build_object(
      'id', v_card.id,
      'name', v_card.card_name,
      'tier', v_card.card_tier
    );
  END LOOP;

  -- Déterminer le nouveau tier
  v_new_tier := CASE v_common_tier
    WHEN 'T3' THEN 'T2'
    WHEN 'T2' THEN 'T1'
    WHEN 'T1' THEN 'T0'
  END;

  -- Trouver une carte aléatoire du nouveau tier (READ ONLY sur unique_cards)
  SELECT * INTO v_new_card
  FROM unique_cards
  WHERE tier = v_new_tier
  ORDER BY RANDOM()
  LIMIT 1;

  -- Consommer les ressources
  UPDATE forge_players SET
    augment_shards = augment_shards - 5
  WHERE id = p_player.id;

  -- Supprimer les 3 cartes
  DELETE FROM forge_cards WHERE id = ANY(p_card_ids);

  -- Créer la nouvelle carte
  INSERT INTO forge_cards (
    player_id, card_uid, card_name, card_tier, card_quality
  ) VALUES (
    p_player.id, v_new_card.uid, v_new_card.name, v_new_tier, 'normal'
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'transmutation',
    'consumed_cards', v_consumed,
    'result_card', jsonb_build_object(
      'uid', v_new_card.uid,
      'name', v_new_card.name,
      'tier', v_new_tier,
      'quality', 'normal'
    ),
    'resources_consumed', jsonb_build_object('augment_shards', 5)
  );
END;
$$;
```

---

## 7. Composable

```typescript
// composables/useForgeDivine.ts

export function useForgeDivine() {
  const { forgeState, refreshState } = useForgeState()
  const isProcessing = ref(false)

  // Peut-on faire une action divine?
  function canDoAction(action: DivineAction): boolean {
    const state = forgeState.value

    if (state.atelier_level < 20) return false
    if (state.actions_remaining < 2) return false

    switch (action) {
      case 'blessing':
        return state.divine_shards >= 1
      case 'exaltation':
        return state.exalted_shards >= 1
      case 'transmutation':
        return state.augment_shards >= 5
      default:
        return false
    }
  }

  async function divineBlessing(cardId: string): Promise<DivineActionResult | null> {
    if (isProcessing.value) return null
    isProcessing.value = true

    try {
      const { data } = await useFetch('/api/forge/divine', {
        method: 'POST',
        body: {
          action: 'blessing',
          card_id: cardId
        }
      })

      if (data.value?.success) {
        useForgeEffects().showDivineSuccess('blessing', data.value)
        await refreshState()
      }

      return data.value
    } finally {
      isProcessing.value = false
    }
  }

  async function exaltation(cardId: string): Promise<DivineActionResult | null> {
    if (isProcessing.value) return null
    isProcessing.value = true

    try {
      const { data } = await useFetch('/api/forge/divine', {
        method: 'POST',
        body: {
          action: 'exaltation',
          card_id: cardId
        }
      })

      if (data.value?.success) {
        useForgeEffects().showDivineSuccess('exaltation', data.value)
        await refreshState()
      }

      return data.value
    } finally {
      isProcessing.value = false
    }
  }

  async function transmutation(cardIds: string[]): Promise<DivineActionResult | null> {
    if (isProcessing.value) return null
    if (cardIds.length !== 3) return null
    isProcessing.value = true

    try {
      const { data } = await useFetch('/api/forge/divine', {
        method: 'POST',
        body: {
          action: 'transmutation',
          card_ids: cardIds
        }
      })

      if (data.value?.success) {
        useForgeEffects().showDivineSuccess('transmutation', data.value)
        await refreshState()
      }

      return data.value
    } finally {
      isProcessing.value = false
    }
  }

  // Helpers
  function getNextTier(tier?: string): string {
    const map: Record<string, string> = {
      'T3': 'T2',
      'T2': 'T1',
      'T1': 'T0'
    }
    return tier ? map[tier] || tier : ''
  }

  function getNextQuality(quality?: string): string {
    const map: Record<string, string> = {
      'normal': 'superior',
      'superior': 'masterwork'
    }
    return quality ? map[quality] || quality : ''
  }

  return {
    isProcessing,
    canDoAction,
    divineBlessing,
    exaltation,
    transmutation,
    getNextTier,
    getNextQuality
  }
}
```

---

## 8. Références

- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §2.3
- **Progression**: [02_PROGRESSION_SYSTEM.md](../specs/02_PROGRESSION_SYSTEM.md) §2.6
- **Module Précédent**: [M5_CORRUPTION.md](./M5_CORRUPTION.md)
- **Module Suivant**: [M7_PRESTIGE.md](./M7_PRESTIGE.md)
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §5.4
