# Module 4: Le Sanctuaire du Chaos - Spécification Technique

> **Document**: `modules/M4_CHAOS.md`
> **Version**: 1.0
> **Statut**: Module Intermédiaire (Niveau 10+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

Le Sanctuaire du Chaos introduit le **risque calculé** dans le gameplay:
- Utilisation des Chaos Orbs pour des effets aléatoires
- Reroll de cartes (transformer en autre du même tier)
- Gamble (50/50 upgrade ou destruction)
- Discovery (révéler indices de recettes)
- Premier contact avec la mécanique de risque/récompense

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant - Artisan | Caché |
| Artisan (Niv 8-9) | Teaser lumineux |
| Chaotic (Niv 10+) | Actif |

### 1.3 Philosophie de Design

```
"Le Chaos n'est pas ton ennemi. C'est un outil imprévisible
 mais puissant. Ceux qui le maîtrisent progressent plus vite...
 au prix de quelques pertes."
```

---

## 2. Actions du Sanctuaire

### 2.1 Types d'Actions

```typescript
type ChaosAction =
  | 'reroll'      // Transformer une carte (même tier)
  | 'gamble'      // 50/50 upgrade ou destruction
  | 'discovery'   // Révéler un indice de recette
  | 'amplify'     // Doubler le prochain bonus (risqué)

interface ChaosActionResult {
  action: ChaosAction
  success: boolean
  outcome: string
  details: {
    original_card?: ForgeCard
    new_card?: ForgeCard
    card_destroyed?: boolean
    hint_revealed?: string
    amplify_active?: boolean
  }
}
```

### 2.2 Chaos Reroll

```typescript
const CHAOS_REROLL = {
  cost: {
    chaos_orbs: 1,
    actions: 2
  },

  mechanics: {
    // La carte est transformée en une autre du même tier
    same_tier: true,
    same_item_class: false,  // Peut changer de type
    same_rarity: false,      // Peut changer de rareté
    same_quality: true,      // Garde la qualité

    // La nouvelle carte est aléatoire parmi les disponibles
    card_pool: 'all_cards_same_tier'
  },

  // Animation
  animation: {
    duration: 2000,
    effect: 'chaos_swirl',
    sound: 'chaos_transform'
  }
}
```

### 2.3 Chaos Gamble

```typescript
const CHAOS_GAMBLE = {
  cost: {
    chaos_orbs: 3,
    actions: 2
  },

  outcomes: {
    success: {
      probability: 0.50,  // 50%
      effect: 'upgrade_tier',  // T3→T2, T2→T1, T1→T0
      message: 'La carte s\'élève!'
    },
    failure: {
      probability: 0.50,  // 50%
      effect: 'destroy_card',
      message: 'La carte est consumée par le Chaos...'
    }
  },

  restrictions: {
    // Pas de gamble sur T0 (déjà au max)
    excluded_tiers: ['T0'],
    // Ni sur les cartes uniques/spéciales
    excluded_types: ['unique', 'event']
  }
}
```

### 2.4 Chaos Discovery

```typescript
const CHAOS_DISCOVERY = {
  cost: {
    chaos_orbs: 2,
    actions: 1
  },

  mechanics: {
    // Révèle l'indice d'une recette non découverte
    reveals: 'recipe_hint',
    // Sélection aléatoire parmi les non-découvertes au niveau actuel
    selection: 'random_undiscovered',
    // Si toutes découvertes, remboursement partiel
    all_discovered_refund: 1  // Rend 1 Chaos
  }
}
```

### 2.5 Chaos Amplify (Avancé - Niveau 15)

```typescript
const CHAOS_AMPLIFY = {
  cost: {
    chaos_orbs: 5,
    actions: 2
  },

  unlock_level: 15,

  mechanics: {
    // Active un buff "Amplification"
    buff_name: 'chaos_amplification',
    buff_duration: 3600,  // 1 heure

    // Pendant ce buff:
    effects: {
      production_bonus: 1.5,       // +50% production
      smelt_bonus: 1.25,           // +25% shards à la fonte
      next_gamble_success: 0.65    // 65% au lieu de 50%
    },

    // RISQUE: 20% chance d'effet négatif
    risk: {
      probability: 0.20,
      effect: 'chaos_backlash',
      backlash_effects: [
        { weight: 50, effect: 'lose_10_percent_shards' },
        { weight: 30, effect: 'no_production_1h' },
        { weight: 20, effect: 'random_card_destroyed' }
      ]
    }
  }
}
```

---

## 3. Tableau des Coûts et Probabilités

| Action | Coût Chaos | Coût Actions | Succès | Échec |
|--------|------------|--------------|--------|-------|
| Reroll | 1 | 2 | 100% (changement) | - |
| Gamble | 3 | 2 | 50% (upgrade) | 50% (destruction) |
| Discovery | 2 | 1 | 100% (indice) | - |
| Amplify | 5 | 2 | 80% (buff) | 20% (backlash) |

---

## 4. Composant Frontend

### 4.1 ForgeChaos.vue

```vue
<script setup lang="ts">
/**
 * ForgeChaos - Sanctuaire du Chaos
 *
 * Interface pour les actions risquées utilisant les Chaos Orbs.
 * Feedback visuel dramatique pour renforcer le sentiment de risque.
 */

const { forgeState } = useForgeState()
const {
  chaosReroll,
  chaosGamble,
  chaosDiscovery,
  chaosAmplify,
  isProcessing
} = useForgeChaos()

const selectedCard = ref<ForgeCard | null>(null)
const selectedAction = ref<ChaosAction | null>(null)
const showConfirmModal = ref(false)
const lastResult = ref<ChaosActionResult | null>(null)

// Cartes éligibles au reroll/gamble
const eligibleCards = computed(() => {
  return forgeState.value.cards.filter(card => {
    if (selectedAction.value === 'gamble') {
      return card.tier !== 'T0'  // Pas de gamble sur T0
    }
    return true
  })
})

// Vérifier si on peut faire une action
function canDoAction(action: ChaosAction): boolean {
  const costs = ACTION_COSTS[action]
  return forgeState.value.chaos_orbs >= costs.chaos_orbs
    && forgeState.value.actions_remaining >= costs.actions
}

// Demander confirmation avant action risquée
function requestAction(action: ChaosAction) {
  selectedAction.value = action
  if (action === 'gamble' || action === 'amplify') {
    showConfirmModal.value = true
  } else {
    executeAction()
  }
}

// Exécuter l'action
async function executeAction() {
  if (!selectedAction.value) return
  showConfirmModal.value = false

  let result: ChaosActionResult | null = null

  switch (selectedAction.value) {
    case 'reroll':
      if (!selectedCard.value) return
      result = await chaosReroll(selectedCard.value.id)
      break
    case 'gamble':
      if (!selectedCard.value) return
      result = await chaosGamble(selectedCard.value.id)
      break
    case 'discovery':
      result = await chaosDiscovery()
      break
    case 'amplify':
      result = await chaosAmplify()
      break
  }

  lastResult.value = result
  selectedCard.value = null
  selectedAction.value = null
}

// Obtenir la classe CSS selon le résultat
function getResultClass(result: ChaosActionResult): string {
  if (result.success) return 'result-success'
  if (result.details.card_destroyed) return 'result-failure'
  return 'result-neutral'
}
</script>

<template>
  <div class="forge-chaos">
    <div class="chaos-header">
      <h3>Sanctuaire du Chaos</h3>
      <ForgeTooltip
        title="Sanctuaire du Chaos"
        what="Un lieu où les Chaos Orbs permettent des transformations imprévisibles."
        why="Le risque est élevé mais les récompenses peuvent accélérer ta progression."
        how="Utilise tes Chaos Orbs pour reroller des cartes, tenter le gamble, ou découvrir des recettes."
      />
    </div>

    <!-- Ressources disponibles -->
    <div class="chaos-resources">
      <div class="resource chaos-orbs">
        <span class="icon">🌀</span>
        <span class="value">{{ forgeState.chaos_orbs }}</span>
        <span class="label">Chaos Orbs</span>
      </div>
      <div class="resource actions">
        <span class="icon">⚡</span>
        <span class="value">{{ forgeState.actions_remaining }}</span>
        <span class="label">Actions</span>
      </div>
    </div>

    <!-- Buffs actifs -->
    <div v-if="forgeState.active_effects?.chaos_amplification" class="active-buff">
      <span class="buff-icon">✨</span>
      <span class="buff-name">Amplification du Chaos</span>
      <span class="buff-timer">{{ formatTimeRemaining(forgeState.active_effects.chaos_amplification) }}</span>
    </div>

    <!-- Actions du Chaos -->
    <div class="chaos-actions">

      <!-- REROLL -->
      <div class="action-card" :class="{ disabled: !canDoAction('reroll') }">
        <div class="action-header">
          <h4>Chaos Reroll</h4>
          <span class="cost">1 Chaos + 2 Actions</span>
        </div>
        <p class="action-desc">
          Transforme une carte en une autre du même tier.
          Le type et la rareté peuvent changer.
        </p>
        <div class="action-odds">
          <span class="tag success">100% transformation</span>
        </div>
        <button
          class="action-button"
          :disabled="!canDoAction('reroll') || !selectedCard"
          @click="requestAction('reroll')"
        >
          Reroll
        </button>
      </div>

      <!-- GAMBLE -->
      <div class="action-card risky" :class="{ disabled: !canDoAction('gamble') }">
        <div class="action-header">
          <h4>Chaos Gamble</h4>
          <span class="cost">3 Chaos + 2 Actions</span>
        </div>
        <p class="action-desc">
          Risque tout ou rien! La carte monte d'un tier...
          ou est détruite à jamais.
        </p>
        <div class="action-odds">
          <span class="tag success">50% upgrade</span>
          <span class="tag danger">50% destruction</span>
        </div>
        <button
          class="action-button danger"
          :disabled="!canDoAction('gamble') || !selectedCard"
          @click="requestAction('gamble')"
        >
          GAMBLE
        </button>
      </div>

      <!-- DISCOVERY -->
      <div class="action-card" :class="{ disabled: !canDoAction('discovery') }">
        <div class="action-header">
          <h4>Chaos Discovery</h4>
          <span class="cost">2 Chaos + 1 Action</span>
        </div>
        <p class="action-desc">
          Révèle l'indice d'une recette cachée.
          L'indice t'aidera à deviner les ingrédients.
        </p>
        <div class="action-odds">
          <span class="tag info">Révèle 1 indice</span>
        </div>
        <button
          class="action-button"
          :disabled="!canDoAction('discovery')"
          @click="requestAction('discovery')"
        >
          Découvrir
        </button>
      </div>

      <!-- AMPLIFY (Niveau 15+) -->
      <div
        v-if="forgeState.atelier_level >= 15"
        class="action-card risky"
        :class="{ disabled: !canDoAction('amplify') }"
      >
        <div class="action-header">
          <h4>Chaos Amplify</h4>
          <span class="cost">5 Chaos + 2 Actions</span>
        </div>
        <p class="action-desc">
          Active un buff puissant pendant 1h: +50% production,
          +25% shards, meilleur gamble.
        </p>
        <div class="action-odds">
          <span class="tag success">80% buff</span>
          <span class="tag danger">20% backlash</span>
        </div>
        <button
          class="action-button"
          :disabled="!canDoAction('amplify')"
          @click="requestAction('amplify')"
        >
          Amplifier
        </button>
      </div>

      <!-- LOCKED AMPLIFY (avant niveau 15) -->
      <div v-else class="action-card locked">
        <div class="action-header">
          <h4>Chaos Amplify</h4>
          <span class="unlock-info">Niveau 15</span>
        </div>
        <p class="action-desc locked-text">
          Une technique avancée... Tu n'es pas encore prêt.
        </p>
        <div class="lock-icon">🔒</div>
      </div>

    </div>

    <!-- Sélection de carte pour Reroll/Gamble -->
    <div v-if="selectedAction === 'reroll' || selectedAction === 'gamble'" class="card-selection">
      <h5>Sélectionne une carte:</h5>
      <div class="cards-grid">
        <div
          v-for="card in eligibleCards"
          :key="card.id"
          class="selectable-card"
          :class="{
            selected: selectedCard?.id === card.id,
            tier: card.tier.toLowerCase()
          }"
          @click="selectedCard = card"
        >
          <span class="card-tier">{{ card.tier }}</span>
          <span class="card-name">{{ card.name }}</span>
          <span class="card-quality">{{ card.quality }}</span>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="confirm-modal-overlay" @click="showConfirmModal = false">
        <div class="confirm-modal" @click.stop>
          <h4>Confirmer l'action?</h4>

          <div v-if="selectedAction === 'gamble'" class="warning-box">
            <span class="warning-icon">⚠️</span>
            <p>
              Tu as <strong>50% de chance</strong> de perdre cette carte
              définitivement!
            </p>
            <p class="card-info" v-if="selectedCard">
              Carte: <strong>{{ selectedCard.name }}</strong> ({{ selectedCard.tier }})
            </p>
          </div>

          <div v-if="selectedAction === 'amplify'" class="warning-box">
            <span class="warning-icon">⚠️</span>
            <p>
              <strong>20% de risque</strong> de subir un backlash:
              perte de shards, arrêt de production, ou destruction de carte.
            </p>
          </div>

          <div class="modal-actions">
            <button class="cancel" @click="showConfirmModal = false">
              Annuler
            </button>
            <button class="confirm danger" @click="executeAction">
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Affichage du dernier résultat -->
    <Transition name="fade">
      <div v-if="lastResult" class="result-display" :class="getResultClass(lastResult)">
        <div class="result-icon">
          <span v-if="lastResult.success && !lastResult.details.card_destroyed">✨</span>
          <span v-else-if="lastResult.details.card_destroyed">💀</span>
          <span v-else>🌀</span>
        </div>
        <div class="result-message">{{ lastResult.outcome }}</div>
        <button class="dismiss" @click="lastResult = null">OK</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.forge-chaos {
  padding: 1rem;
  background: linear-gradient(135deg, var(--color-surface), #1a1a2e);
  border-radius: 8px;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

.chaos-header h3 {
  color: var(--color-chaos);
  text-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
}

.chaos-resources {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.resource {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
}

.resource .value {
  font-size: 1.25rem;
  font-weight: bold;
}

.active-buff {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: linear-gradient(90deg, rgba(147, 51, 234, 0.3), transparent);
  border-left: 3px solid var(--color-chaos);
  margin-bottom: 1rem;
  animation: pulse 2s infinite;
}

.chaos-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-card {
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s;
}

.action-card:hover:not(.disabled):not(.locked) {
  border-color: var(--color-chaos);
  transform: translateY(-2px);
}

.action-card.risky {
  border-color: rgba(239, 68, 68, 0.3);
}

.action-card.risky:hover:not(.disabled) {
  border-color: var(--color-error);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}

.action-card.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-card.locked {
  opacity: 0.4;
  position: relative;
}

.lock-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.action-header h4 {
  margin: 0;
  color: var(--color-text);
}

.cost {
  font-size: 0.75rem;
  color: var(--color-chaos);
}

.action-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.action-odds {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.tag.success {
  background: rgba(34, 197, 94, 0.2);
  color: var(--color-success);
}

.tag.danger {
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
}

.tag.info {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-info);
}

.action-button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  background: var(--color-chaos);
  color: white;
  transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.action-button.danger {
  background: linear-gradient(135deg, var(--color-error), var(--color-chaos));
  animation: pulse-danger 2s infinite;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Card Selection */
.card-selection {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.selectable-card {
  padding: 0.5rem;
  background: rgba(0,0,0,0.3);
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.selectable-card:hover {
  border-color: var(--color-chaos);
}

.selectable-card.selected {
  border-color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.2);
}

.selectable-card.tier.t0 { border-left: 3px solid gold; }
.selectable-card.tier.t1 { border-left: 3px solid #a855f7; }
.selectable-card.tier.t2 { border-left: 3px solid #3b82f6; }
.selectable-card.tier.t3 { border-left: 3px solid #6b7280; }

/* Confirm Modal */
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.warning-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.warning-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.modal-actions .cancel {
  background: rgba(255,255,255,0.1);
  color: var(--color-text);
}

.modal-actions .confirm.danger {
  background: var(--color-error);
  color: white;
}

/* Result Display */
.result-display {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2rem;
  background: var(--color-surface);
  border-radius: 12px;
  text-align: center;
  z-index: 1001;
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
}

.result-display.result-success {
  border: 2px solid var(--color-success);
}

.result-display.result-failure {
  border: 2px solid var(--color-error);
}

.result-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.2); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```

---

## 5. Backend

### 5.1 Endpoint Principal

```typescript
// server/api/forge/chaos.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { action, card_id } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required'
    })
  }

  const validActions = ['reroll', 'gamble', 'discovery', 'amplify']
  if (!validActions.includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid action type'
    })
  }

  // Reroll et Gamble nécessitent une carte
  if ((action === 'reroll' || action === 'gamble') && !card_id) {
    throw createError({
      statusCode: 400,
      message: 'card_id is required for this action'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_chaos_action', {
    p_user_login: session.user.login,
    p_action: action,
    p_card_id: card_id || null
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

## 6. Fonction SQL Principale

```sql
CREATE OR REPLACE FUNCTION forge_chaos_action(
  p_user_login TEXT,
  p_action TEXT,
  p_card_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_card forge_cards%ROWTYPE;
  v_cost_chaos INTEGER;
  v_cost_actions INTEGER;
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

  -- Vérifier le niveau minimum (10)
  IF v_player.atelier_level < 10 THEN
    RETURN jsonb_build_object('error', 'Sanctuaire requires level 10');
  END IF;

  -- Déterminer les coûts
  CASE p_action
    WHEN 'reroll' THEN
      v_cost_chaos := 1;
      v_cost_actions := 2;
    WHEN 'gamble' THEN
      v_cost_chaos := 3;
      v_cost_actions := 2;
    WHEN 'discovery' THEN
      v_cost_chaos := 2;
      v_cost_actions := 1;
    WHEN 'amplify' THEN
      v_cost_chaos := 5;
      v_cost_actions := 2;
      -- Amplify nécessite niveau 15
      IF v_player.atelier_level < 15 THEN
        RETURN jsonb_build_object('error', 'Amplify requires level 15');
      END IF;
    ELSE
      RETURN jsonb_build_object('error', 'Invalid action');
  END CASE;

  -- Vérifier les ressources
  IF v_player.chaos_orbs < v_cost_chaos THEN
    RETURN jsonb_build_object('error', 'Not enough Chaos Orbs');
  END IF;

  IF v_player.actions_remaining < v_cost_actions THEN
    RETURN jsonb_build_object('error', 'Not enough actions');
  END IF;

  -- Si action sur carte, vérifier la carte
  IF p_card_id IS NOT NULL THEN
    SELECT * INTO v_card
    FROM forge_cards
    WHERE id = p_card_id AND player_id = v_player.id;

    IF v_card IS NULL THEN
      RETURN jsonb_build_object('error', 'Card not found');
    END IF;
  END IF;

  -- Consommer les ressources
  UPDATE forge_players SET
    chaos_orbs = chaos_orbs - v_cost_chaos,
    actions_remaining = actions_remaining - v_cost_actions
  WHERE id = v_player.id;

  -- Exécuter l'action
  CASE p_action
    WHEN 'reroll' THEN
      v_result := chaos_reroll_card(v_player.id, v_card);
    WHEN 'gamble' THEN
      v_result := chaos_gamble_card(v_player.id, v_card);
    WHEN 'discovery' THEN
      v_result := forge_chaos_discovery(p_user_login);
    WHEN 'amplify' THEN
      v_result := chaos_amplify_forge(v_player.id);
  END CASE;

  -- Logger l'action
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data
  ) VALUES (
    v_player.id, 'chaos_' || p_action,
    jsonb_build_object(
      'card_id', p_card_id,
      'result', v_result
    )
  );

  RETURN v_result;
END;
$$;
```

### 6.1 Chaos Reroll

```sql
CREATE OR REPLACE FUNCTION chaos_reroll_card(
  p_player_id UUID,
  p_card forge_cards
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_card_uid TEXT;
  v_new_card unique_cards%ROWTYPE;
BEGIN
  -- Sélectionner une nouvelle carte du même tier (lecture seule sur unique_cards)
  SELECT * INTO v_new_card
  FROM unique_cards
  WHERE tier = p_card.card_tier
    AND uid != p_card.card_uid
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_new_card IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No alternative card found'
    );
  END IF;

  -- Mettre à jour la carte dans forge_cards
  UPDATE forge_cards SET
    card_uid = v_new_card.uid,
    card_name = v_new_card.name,
    updated_at = NOW()
  WHERE id = p_card.id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'reroll',
    'outcome', 'La carte se transforme!',
    'details', jsonb_build_object(
      'original_card', jsonb_build_object(
        'name', p_card.card_name,
        'tier', p_card.card_tier
      ),
      'new_card', jsonb_build_object(
        'uid', v_new_card.uid,
        'name', v_new_card.name,
        'tier', v_new_card.tier
      )
    )
  );
END;
$$;
```

### 6.2 Chaos Gamble

```sql
CREATE OR REPLACE FUNCTION chaos_gamble_card(
  p_player_id UUID,
  p_card forge_cards
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll NUMERIC;
  v_success_threshold NUMERIC := 0.50;
  v_new_tier TEXT;
  v_new_card unique_cards%ROWTYPE;
  v_player forge_players%ROWTYPE;
BEGIN
  -- Vérifier que ce n'est pas une T0
  IF p_card.card_tier = 'T0' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot gamble T0 cards'
    );
  END IF;

  -- Récupérer le joueur pour vérifier les buffs
  SELECT * INTO v_player FROM forge_players WHERE id = p_player_id;

  -- Vérifier si Amplify est actif (améliore les chances)
  IF v_player.active_effects ? 'chaos_amplification' THEN
    v_success_threshold := 0.65;  -- 65% au lieu de 50%
  END IF;

  -- Lancer le dé
  v_roll := RANDOM();

  IF v_roll < v_success_threshold THEN
    -- SUCCÈS: Upgrade le tier
    v_new_tier := CASE p_card.card_tier
      WHEN 'T3' THEN 'T2'
      WHEN 'T2' THEN 'T1'
      WHEN 'T1' THEN 'T0'
    END;

    -- Trouver une carte du nouveau tier (lecture seule sur unique_cards)
    SELECT * INTO v_new_card
    FROM unique_cards
    WHERE tier = v_new_tier
    ORDER BY RANDOM()
    LIMIT 1;

    -- Mettre à jour la carte
    UPDATE forge_cards SET
      card_uid = v_new_card.uid,
      card_name = v_new_card.name,
      card_tier = v_new_tier,
      updated_at = NOW()
    WHERE id = p_card.id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'gamble',
      'outcome', 'SUCCÈS! La carte s''élève au tier ' || v_new_tier || '!',
      'details', jsonb_build_object(
        'original_card', jsonb_build_object(
          'name', p_card.card_name,
          'tier', p_card.card_tier
        ),
        'new_card', jsonb_build_object(
          'uid', v_new_card.uid,
          'name', v_new_card.name,
          'tier', v_new_tier
        ),
        'card_destroyed', false
      )
    );

  ELSE
    -- ÉCHEC: Destruction de la carte
    DELETE FROM forge_cards WHERE id = p_card.id;

    RETURN jsonb_build_object(
      'success', false,
      'action', 'gamble',
      'outcome', 'La carte est consumée par le Chaos...',
      'details', jsonb_build_object(
        'original_card', jsonb_build_object(
          'name', p_card.card_name,
          'tier', p_card.card_tier
        ),
        'card_destroyed', true
      )
    );
  END IF;
END;
$$;
```

### 6.3 Chaos Amplify

```sql
CREATE OR REPLACE FUNCTION chaos_amplify_forge(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll NUMERIC;
  v_backlash_type TEXT;
  v_player forge_players%ROWTYPE;
  v_buff_expires_at TIMESTAMPTZ;
BEGIN
  v_roll := RANDOM();

  IF v_roll < 0.80 THEN
    -- 80% SUCCÈS: Activer le buff
    v_buff_expires_at := NOW() + INTERVAL '1 hour';

    UPDATE forge_players SET
      active_effects = COALESCE(active_effects, '{}'::jsonb) ||
        jsonb_build_object('chaos_amplification', v_buff_expires_at)
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'amplify',
      'outcome', 'Le Chaos amplifie ta forge! +50% production, +25% shards pendant 1h',
      'details', jsonb_build_object(
        'buff_active', true,
        'expires_at', v_buff_expires_at
      )
    );

  ELSE
    -- 20% ÉCHEC: Backlash
    SELECT * INTO v_player FROM forge_players WHERE id = p_player_id;

    -- Déterminer le type de backlash
    v_roll := RANDOM();
    IF v_roll < 0.50 THEN
      -- 50% des backlash: Perte de 10% des shards
      UPDATE forge_players SET
        transmute_shards = FLOOR(transmute_shards * 0.9),
        alteration_shards = FLOOR(alteration_shards * 0.9),
        augment_shards = FLOOR(augment_shards * 0.9)
      WHERE id = p_player_id;

      v_backlash_type := 'shard_loss';

      RETURN jsonb_build_object(
        'success', false,
        'action', 'amplify',
        'outcome', 'BACKLASH! Le Chaos dévore 10% de tes shards!',
        'details', jsonb_build_object(
          'backlash_type', v_backlash_type
        )
      );

    ELSIF v_roll < 0.80 THEN
      -- 30% des backlash: Arrêt production 1h
      UPDATE forge_players SET
        active_effects = COALESCE(active_effects, '{}'::jsonb) ||
          jsonb_build_object('production_halt', NOW() + INTERVAL '1 hour')
      WHERE id = p_player_id;

      v_backlash_type := 'production_halt';

      RETURN jsonb_build_object(
        'success', false,
        'action', 'amplify',
        'outcome', 'BACKLASH! La forge est paralysée pendant 1h!',
        'details', jsonb_build_object(
          'backlash_type', v_backlash_type,
          'ends_at', NOW() + INTERVAL '1 hour'
        )
      );

    ELSE
      -- 20% des backlash: Carte aléatoire détruite
      DELETE FROM forge_cards
      WHERE id = (
        SELECT id FROM forge_cards
        WHERE player_id = p_player_id
        ORDER BY RANDOM()
        LIMIT 1
      );

      v_backlash_type := 'card_destroyed';

      RETURN jsonb_build_object(
        'success', false,
        'action', 'amplify',
        'outcome', 'BACKLASH! Une carte aléatoire est détruite!',
        'details', jsonb_build_object(
          'backlash_type', v_backlash_type
        )
      );
    END IF;
  END IF;
END;
$$;
```

---

## 7. Composable

```typescript
// composables/useForgeChaos.ts

export function useForgeChaos() {
  const { forgeState, refreshState } = useForgeState()
  const isProcessing = ref(false)

  async function executeAction(action: ChaosAction, cardId?: string) {
    if (isProcessing.value) return null
    isProcessing.value = true

    try {
      const { data } = await useFetch('/api/forge/chaos', {
        method: 'POST',
        body: {
          action,
          card_id: cardId
        }
      })

      if (data.value) {
        // Effet visuel selon le résultat
        if (data.value.success) {
          useForgeEffects().showChaosSuccess(data.value)
        } else if (data.value.details?.card_destroyed) {
          useForgeEffects().showChaosDestruction(data.value)
        } else if (data.value.details?.backlash_type) {
          useForgeEffects().showChaosBacklash(data.value)
        }

        // Augmenter la chaleur (le chaos génère de la chaleur!)
        useForgeHeat().increaseHeat(15)

        await refreshState()
      }

      return data.value
    } finally {
      isProcessing.value = false
    }
  }

  const chaosReroll = (cardId: string) => executeAction('reroll', cardId)
  const chaosGamble = (cardId: string) => executeAction('gamble', cardId)
  const chaosDiscovery = () => executeAction('discovery')
  const chaosAmplify = () => executeAction('amplify')

  // Vérifier si une action est disponible
  function canDoAction(action: ChaosAction): boolean {
    const costs: Record<ChaosAction, { chaos: number; actions: number }> = {
      reroll: { chaos: 1, actions: 2 },
      gamble: { chaos: 3, actions: 2 },
      discovery: { chaos: 2, actions: 1 },
      amplify: { chaos: 5, actions: 2 }
    }

    const cost = costs[action]
    return forgeState.value.chaos_orbs >= cost.chaos
      && forgeState.value.actions_remaining >= cost.actions
  }

  return {
    isProcessing,
    chaosReroll,
    chaosGamble,
    chaosDiscovery,
    chaosAmplify,
    canDoAction
  }
}
```

---

## 8. Références

- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §4
- **Progression**: [02_PROGRESSION_SYSTEM.md](../specs/02_PROGRESSION_SYSTEM.md) §2.4
- **Module Précédent**: [M3_CRAFTING.md](./M3_CRAFTING.md)
- **Module Suivant**: [M5_CORRUPTION.md](./M5_CORRUPTION.md)
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §5.3
