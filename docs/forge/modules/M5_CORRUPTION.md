# Module 5: L'Autel de Corruption - Spécification Technique

> **Document**: `modules/M5_CORRUPTION.md`
> **Version**: 1.0
> **Statut**: Module Avancé (Niveau 15+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

L'Autel de Corruption est le **système de risque ultime**:
- Utilisation des Vaal Orbs pour des effets puissants mais imprévisibles
- 6 outcomes possibles avec probabilités variables
- Buffs et malédictions temporaires
- Source de gains massifs... ou de pertes catastrophiques
- Pity system anti-frustration

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant - Chaotic | Caché |
| Chaotic (Niv 13-14) | Teaser omineux (lueur violette) |
| Corrupted (Niv 15+) | Actif |

### 1.3 Avertissement au Joueur

```
⚠️ L'AUTEL DE CORRUPTION ⚠️

Le Vaal Orb est une force primordiale et imprévisible.
Son utilisation peut apporter gloire... ou ruine.

Une fois activée, la corruption ne peut être annulée.
Réfléchis bien avant de sacrifier un Vaal Orb.
```

---

## 2. Outcomes de Corruption

### 2.1 Table des Outcomes

```typescript
interface CorruptionOutcome {
  id: string
  name: string
  weight: number          // Poids pour probabilité
  effect: CorruptionEffect
  category: 'positive' | 'negative' | 'neutral'
  visual_class: string
  message: string
}

const CORRUPTION_OUTCOMES: CorruptionOutcome[] = [
  {
    id: 'nothing',
    name: 'RIEN',
    weight: 30,
    effect: { type: 'none' },
    category: 'neutral',
    visual_class: 'outcome-nothing',
    message: 'Le Vaal Orb se dissipe sans effet...'
  },
  {
    id: 'boost',
    name: 'BOOST',
    weight: 25,
    effect: {
      type: 'buff',
      buff_id: 'corruption_boost',
      production_multiplier: 1.5,
      duration_hours: 24
    },
    category: 'positive',
    visual_class: 'outcome-boost',
    message: '+50% de production pendant 24h!'
  },
  {
    id: 'jackpot',
    name: 'JACKPOT',
    weight: 15,
    effect: {
      type: 'instant_reward',
      chaos_orbs: 10
    },
    category: 'positive',
    visual_class: 'outcome-jackpot',
    message: 'JACKPOT! +10 Chaos Orbs!'
  },
  {
    id: 'curse',
    name: 'MALÉDICTION',
    weight: 15,
    effect: {
      type: 'debuff',
      debuff_id: 'corruption_curse',
      production_multiplier: 0.75,
      duration_hours: 24
    },
    category: 'negative',
    visual_class: 'outcome-curse',
    message: 'MAUDIT! -25% de production pendant 24h...'
  },
  {
    id: 'cataclysm',
    name: 'CATACLYSME',
    weight: 10,
    effect: {
      type: 'instant_loss',
      shard_loss_percentage: 0.5
    },
    category: 'negative',
    visual_class: 'outcome-cataclysm',
    message: 'CATACLYSME! Tu perds 50% de tous tes shards!'
  },
  {
    id: 'miracle',
    name: 'MIRACLE',
    weight: 5,
    effect: {
      type: 'miracle',
      vaal_orbs: 1,
      reveals_recipe: true
    },
    category: 'positive',
    visual_class: 'outcome-miracle',
    message: 'MIRACLE! +1 Vaal Orb ET une recette rare révélée!'
  }
]
```

### 2.2 Probabilités

| Outcome | Poids | Probabilité | Catégorie |
|---------|-------|-------------|-----------|
| RIEN | 30 | 30% | Neutre |
| BOOST | 25 | 25% | Positif |
| JACKPOT | 15 | 15% | Positif |
| MALÉDICTION | 15 | 15% | Négatif |
| CATACLYSME | 10 | 10% | Négatif |
| MIRACLE | 5 | 5% | Positif |

**Résumé:**
- Positif (BOOST + JACKPOT + MIRACLE): 45%
- Neutre (RIEN): 30%
- Négatif (MALÉDICTION + CATACLYSME): 25%

---

## 3. Pity System

### 3.1 Anti-Frustration

```typescript
const PITY_SYSTEM = {
  // Après N RIEN consécutifs, garantir ≠ RIEN
  nothing_streak_limit: 5,

  // Après N négatifs consécutifs, augmenter les chances positives
  negative_streak_limit: 3,
  negative_streak_bonus: 0.10,  // +10% chance BOOST/MIRACLE

  // Tracking dans forge_players.corruption_stats
  tracked_stats: [
    'total_corruptions',
    'nothing_streak',
    'negative_streak',
    'last_outcome'
  ]
}
```

### 3.2 Logique de Pity

```typescript
function calculateAdjustedProbabilities(
  player: ForgePlayer
): CorruptionOutcome[] {
  const outcomes = [...CORRUPTION_OUTCOMES]
  const stats = player.corruption_stats

  // Pity: streak de RIEN
  if (stats.nothing_streak >= 5) {
    const nothingOutcome = outcomes.find(o => o.id === 'nothing')
    if (nothingOutcome) {
      nothingOutcome.weight = 0  // Impossible
    }
    // Redistribuer aux autres
    redistributeWeight(outcomes)
  }

  // Pity: streak négatif
  if (stats.negative_streak >= 3) {
    const positives = outcomes.filter(o => o.category === 'positive')
    positives.forEach(o => {
      o.weight *= 1.10  // +10%
    })
  }

  return normalizeWeights(outcomes)
}
```

---

## 4. Buffs et Malédictions

### 4.1 Structure des Effets Temporaires

```typescript
interface TemporaryEffect {
  id: string
  type: 'buff' | 'debuff'
  name: string
  description: string
  effects: {
    production_multiplier?: number
    smelt_multiplier?: number
    gamble_success_bonus?: number
  }
  started_at: Date
  expires_at: Date
  source: 'corruption' | 'recipe' | 'event'
}
```

### 4.2 Corruption Boost

```typescript
const CORRUPTION_BOOST: TemporaryEffect = {
  id: 'corruption_boost',
  type: 'buff',
  name: 'Bénédiction Corrompue',
  description: '+50% de production de Fragments',
  effects: {
    production_multiplier: 1.5
  },
  duration_hours: 24,
  source: 'corruption'
}
```

### 4.3 Corruption Curse

```typescript
const CORRUPTION_CURSE: TemporaryEffect = {
  id: 'corruption_curse',
  type: 'debuff',
  name: 'Malédiction du Vaal',
  description: '-25% de production de Fragments',
  effects: {
    production_multiplier: 0.75
  },
  duration_hours: 24,
  source: 'corruption'
}
```

### 4.4 Interactions Buff/Debuff

```typescript
const EFFECT_RULES = {
  // Les buffs et debuffs du même type s'annulent
  cancellation: {
    'corruption_boost': 'corruption_curse',
    'corruption_curse': 'corruption_boost'
  },

  // Les mêmes effets ne stackent pas (refresh la durée)
  stacking: 'refresh_duration',

  // Un nouveau buff/debuff annule l'opposé
  on_new_effect: 'cancel_opposite_first'
}
```

---

## 5. Composant Frontend

### 5.1 ForgeCorruption.vue

```vue
<script setup lang="ts">
/**
 * ForgeCorruption - Autel de Corruption
 *
 * Interface dramatique pour la corruption Vaal.
 * Animations lourdes, confirmation obligatoire, feedback intense.
 */

const { forgeState } = useForgeState()
const {
  corruptForge,
  isCorrupting,
  corruptionStats,
  canCorrupt
} = useForgeCorruption()

const showConfirm = ref(false)
const lastResult = ref<CorruptionResult | null>(null)
const isAnimating = ref(false)

// Effets actifs liés à la corruption
const activeBuff = computed(() => {
  return forgeState.value.active_effects?.corruption_boost
})

const activeCurse = computed(() => {
  return forgeState.value.active_effects?.corruption_curse
})

// Stats de corruption
const totalCorruptions = computed(() =>
  corruptionStats.value?.total_corruptions || 0
)

const bestOutcome = computed(() =>
  corruptionStats.value?.best_outcome || 'none'
)

// Demander confirmation
function requestCorruption() {
  if (!canCorrupt.value) return
  showConfirm.value = true
}

// Exécuter la corruption
async function executeCorruption() {
  showConfirm.value = false
  isAnimating.value = true

  // Animation de build-up (3 secondes)
  await new Promise(r => setTimeout(r, 3000))

  const result = await corruptForge()
  lastResult.value = result
  isAnimating.value = false
}

// Fermer le résultat
function dismissResult() {
  lastResult.value = null
}
</script>

<template>
  <div class="forge-corruption" :class="{ animating: isAnimating }">
    <div class="corruption-header">
      <h3>Autel de Corruption</h3>
      <ForgeTooltip
        title="Autel de Corruption"
        what="Un autel ancien permettant d'utiliser les Vaal Orbs."
        why="Risque maximum, récompense maximum. Peut transformer ta progression... dans un sens ou l'autre."
        how="Sacrifie un Vaal Orb pour un effet aléatoire. 45% positif, 30% neutre, 25% négatif."
      />
    </div>

    <!-- Vaal Orbs disponibles -->
    <div class="vaal-display">
      <div class="vaal-orb-icon">
        <span v-for="n in Math.min(5, forgeState.vaal_orbs)" :key="n">🔴</span>
        <span v-if="forgeState.vaal_orbs > 5">+{{ forgeState.vaal_orbs - 5 }}</span>
      </div>
      <div class="vaal-count">
        {{ forgeState.vaal_orbs }} Vaal Orb{{ forgeState.vaal_orbs !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Effets actifs -->
    <div v-if="activeBuff || activeCurse" class="active-effects">
      <div v-if="activeBuff" class="effect buff">
        <span class="effect-icon">✨</span>
        <span class="effect-name">Bénédiction Corrompue</span>
        <span class="effect-desc">+50% production</span>
        <span class="effect-timer">{{ formatTimeRemaining(activeBuff) }}</span>
      </div>
      <div v-if="activeCurse" class="effect curse">
        <span class="effect-icon">💀</span>
        <span class="effect-name">Malédiction du Vaal</span>
        <span class="effect-desc">-25% production</span>
        <span class="effect-timer">{{ formatTimeRemaining(activeCurse) }}</span>
      </div>
    </div>

    <!-- Tableau des probabilités -->
    <div class="probabilities">
      <h5>Outcomes possibles:</h5>
      <div class="probability-grid">
        <div class="prob-item positive">
          <span class="prob-icon">🚀</span>
          <span class="prob-name">BOOST</span>
          <span class="prob-chance">25%</span>
        </div>
        <div class="prob-item positive">
          <span class="prob-icon">💎</span>
          <span class="prob-name">JACKPOT</span>
          <span class="prob-chance">15%</span>
        </div>
        <div class="prob-item positive rare">
          <span class="prob-icon">⭐</span>
          <span class="prob-name">MIRACLE</span>
          <span class="prob-chance">5%</span>
        </div>
        <div class="prob-item neutral">
          <span class="prob-icon">😐</span>
          <span class="prob-name">RIEN</span>
          <span class="prob-chance">30%</span>
        </div>
        <div class="prob-item negative">
          <span class="prob-icon">🔥</span>
          <span class="prob-name">MALÉDICTION</span>
          <span class="prob-chance">15%</span>
        </div>
        <div class="prob-item negative dangerous">
          <span class="prob-icon">💀</span>
          <span class="prob-name">CATACLYSME</span>
          <span class="prob-chance">10%</span>
        </div>
      </div>
    </div>

    <!-- Stats du joueur -->
    <div class="corruption-stats">
      <div class="stat">
        <span class="stat-label">Corruptions totales</span>
        <span class="stat-value">{{ totalCorruptions }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Meilleur outcome</span>
        <span class="stat-value" :class="bestOutcome">{{ formatOutcome(bestOutcome) }}</span>
      </div>
    </div>

    <!-- Bouton de corruption -->
    <button
      class="corrupt-button"
      :class="{ disabled: !canCorrupt, pulsing: canCorrupt }"
      :disabled="!canCorrupt || isCorrupting"
      @click="requestCorruption"
    >
      <span v-if="isCorrupting">Corruption en cours...</span>
      <span v-else-if="!canCorrupt && forgeState.vaal_orbs < 1">Pas de Vaal Orb</span>
      <span v-else-if="!canCorrupt">Actions insuffisantes</span>
      <span v-else>💀 CORROMPRE L'ATELIER 💀</span>
    </button>

    <div class="corruption-cost">
      Coût: 1 Vaal Orb + 1 Action
    </div>

    <!-- Animation de corruption -->
    <Teleport to="body">
      <div v-if="isAnimating" class="corruption-animation-overlay">
        <div class="corruption-animation">
          <div class="vaal-sacrifice">
            <div class="vaal-orb-3d"></div>
            <div class="corruption-waves"></div>
          </div>
          <div class="corruption-text">
            Le Vaal consume la réalité...
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de confirmation -->
    <Teleport to="body">
      <div v-if="showConfirm" class="confirm-overlay" @click="showConfirm = false">
        <div class="confirm-modal corruption-modal" @click.stop>
          <div class="modal-header">
            <span class="skull">💀</span>
            <h4>Confirmer la Corruption?</h4>
            <span class="skull">💀</span>
          </div>

          <div class="warning-content">
            <p>Tu es sur le point de sacrifier un <strong>Vaal Orb</strong>.</p>
            <p>Cette action est <strong>irréversible</strong>.</p>

            <div class="risk-reminder">
              <div class="risk positive">45% chance d'effet positif</div>
              <div class="risk neutral">30% chance d'effet neutre</div>
              <div class="risk negative">25% chance d'effet négatif</div>
            </div>

            <p class="final-warning">
              Le CATACLYSME (10%) te fera perdre <strong>50% de tous tes shards</strong>.
            </p>
          </div>

          <div class="modal-actions">
            <button class="cancel" @click="showConfirm = false">
              Annuler
            </button>
            <button class="confirm danger" @click="executeCorruption">
              CORROMPRE
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Affichage du résultat -->
    <Teleport to="body">
      <Transition name="result">
        <div
          v-if="lastResult"
          class="result-overlay"
          :class="lastResult.outcome.visual_class"
          @click="dismissResult"
        >
          <div class="result-content" @click.stop>
            <div class="result-icon">
              {{ getOutcomeIcon(lastResult.outcome.id) }}
            </div>
            <div class="result-name">
              {{ lastResult.outcome.name }}
            </div>
            <div class="result-message">
              {{ lastResult.outcome.message }}
            </div>
            <button class="dismiss" @click="dismissResult">
              Continuer
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.forge-corruption {
  padding: 1.5rem;
  background: linear-gradient(180deg,
    rgba(127, 29, 29, 0.2) 0%,
    var(--color-surface) 100%
  );
  border-radius: 8px;
  border: 2px solid rgba(185, 28, 28, 0.5);
  position: relative;
  overflow: hidden;
}

.forge-corruption::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/images/vaal-pattern.png') repeat;
  opacity: 0.05;
  pointer-events: none;
}

.forge-corruption.animating {
  animation: corruption-shake 0.5s infinite;
}

.corruption-header h3 {
  color: #dc2626;
  text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
}

.vaal-display {
  text-align: center;
  margin: 1.5rem 0;
}

.vaal-orb-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.vaal-count {
  font-size: 1.25rem;
  color: #dc2626;
  font-weight: bold;
}

.active-effects {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.effect {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.effect.buff {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.effect.curse {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.probabilities {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
}

.probability-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.prob-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.prob-item.positive {
  background: rgba(34, 197, 94, 0.1);
}

.prob-item.positive.rare {
  background: linear-gradient(135deg,
    rgba(234, 179, 8, 0.2),
    rgba(34, 197, 94, 0.2)
  );
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.prob-item.neutral {
  background: rgba(107, 114, 128, 0.2);
}

.prob-item.negative {
  background: rgba(239, 68, 68, 0.1);
}

.prob-item.negative.dangerous {
  background: rgba(127, 29, 29, 0.3);
  border: 1px solid rgba(185, 28, 28, 0.5);
}

.prob-icon {
  font-size: 1.5rem;
}

.prob-name {
  font-weight: bold;
  margin: 0.25rem 0;
}

.prob-chance {
  color: var(--color-text-muted);
}

.corruption-stats {
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
  padding: 0.75rem;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
}

.stat {
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: block;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
}

.stat-value.miracle { color: gold; }
.stat-value.jackpot { color: #22c55e; }
.stat-value.boost { color: #3b82f6; }
.stat-value.cataclysm { color: #dc2626; }

.corrupt-button {
  width: 100%;
  padding: 1.25rem;
  font-size: 1.25rem;
  font-weight: bold;
  background: linear-gradient(135deg, #7f1d1d, #991b1b);
  border: 2px solid #dc2626;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
}

.corrupt-button.pulsing {
  animation: corrupt-pulse 2s infinite;
}

.corrupt-button:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
}

.corrupt-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.corruption-cost {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Animation Overlay */
.corruption-animation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.corruption-animation {
  text-align: center;
}

.vaal-orb-3d {
  width: 100px;
  height: 100px;
  background: radial-gradient(circle at 30% 30%,
    #ef4444,
    #7f1d1d,
    #450a0a
  );
  border-radius: 50%;
  margin: 0 auto 2rem;
  animation: vaal-pulse 1s infinite, vaal-rotate 3s linear infinite;
  box-shadow:
    0 0 50px rgba(239, 68, 68, 0.8),
    0 0 100px rgba(185, 28, 28, 0.5);
}

.corruption-waves {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 2px solid rgba(239, 68, 68, 0.5);
  border-radius: 50%;
  animation: wave-expand 1.5s infinite;
}

.corruption-text {
  font-size: 1.5rem;
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
  animation: text-flicker 0.5s infinite;
}

/* Confirm Modal */
.corruption-modal {
  background: linear-gradient(135deg, #1a1a1a, #2d1f1f);
  border: 2px solid #dc2626;
}

.modal-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.skull {
  font-size: 1.5rem;
}

.warning-content {
  padding: 1rem;
}

.risk-reminder {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
}

.risk.positive { color: #22c55e; }
.risk.neutral { color: #9ca3af; }
.risk.negative { color: #ef4444; }

.final-warning {
  color: #ef4444;
  font-weight: bold;
  text-align: center;
}

.modal-actions .confirm.danger {
  background: linear-gradient(135deg, #7f1d1d, #991b1b);
  border: 1px solid #dc2626;
}

/* Result Overlay */
.result-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2001;
}

.result-overlay.outcome-nothing {
  background: rgba(107, 114, 128, 0.9);
}

.result-overlay.outcome-boost {
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.9),
    rgba(34, 197, 94, 0.9)
  );
}

.result-overlay.outcome-jackpot {
  background: linear-gradient(135deg,
    rgba(234, 179, 8, 0.9),
    rgba(34, 197, 94, 0.9)
  );
}

.result-overlay.outcome-curse {
  background: linear-gradient(135deg,
    rgba(127, 29, 29, 0.9),
    rgba(185, 28, 28, 0.9)
  );
}

.result-overlay.outcome-cataclysm {
  background: linear-gradient(135deg,
    rgba(0, 0, 0, 0.95),
    rgba(127, 29, 29, 0.95)
  );
}

.result-overlay.outcome-miracle {
  background: linear-gradient(135deg,
    rgba(234, 179, 8, 0.9),
    rgba(168, 85, 247, 0.9)
  );
}

.result-content {
  text-align: center;
  padding: 3rem;
}

.result-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: result-bounce 0.5s ease-out;
}

.result-name {
  font-size: 3rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 20px rgba(0,0,0,0.5);
  margin-bottom: 1rem;
}

.result-message {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.9);
  margin-bottom: 2rem;
}

.dismiss {
  padding: 1rem 3rem;
  font-size: 1.25rem;
  background: rgba(255,255,255,0.2);
  border: 2px solid white;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

/* Animations */
@keyframes corruption-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.5deg); }
  75% { transform: translateX(2px) rotate(0.5deg); }
}

@keyframes corrupt-pulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
  }
  50% {
    box-shadow: 0 0 30px rgba(220, 38, 38, 0.8);
  }
}

@keyframes vaal-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes vaal-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes wave-expand {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes text-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes result-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.result-enter-active {
  animation: result-appear 0.5s ease-out;
}

.result-leave-active {
  animation: result-appear 0.3s ease-in reverse;
}

@keyframes result-appear {
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

## 6. Backend

### 6.1 Endpoint de Corruption

```typescript
// server/api/forge/corrupt.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_corrupt', {
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

---

## 7. Fonction SQL

```sql
CREATE OR REPLACE FUNCTION forge_corrupt(p_user_login TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_outcome RECORD;
  v_roll NUMERIC;
  v_cumulative NUMERIC := 0;
  v_weights JSONB;
  v_result JSONB;
  v_stats JSONB;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier le niveau minimum (15)
  IF v_player.atelier_level < 15 THEN
    RETURN jsonb_build_object('error', 'Corruption requires level 15');
  END IF;

  -- Vérifier les Vaal Orbs
  IF v_player.vaal_orbs < 1 THEN
    RETURN jsonb_build_object('error', 'No Vaal Orbs');
  END IF;

  -- Vérifier les actions
  IF v_player.actions_remaining < 1 THEN
    RETURN jsonb_build_object('error', 'No actions remaining');
  END IF;

  -- Consommer les ressources
  UPDATE forge_players SET
    vaal_orbs = vaal_orbs - 1,
    actions_remaining = actions_remaining - 1
  WHERE id = v_player.id;

  -- Calculer les probabilités ajustées (pity system)
  v_weights := calculate_corruption_weights(v_player);

  -- Lancer le dé (0-100)
  v_roll := RANDOM() * 100;

  -- Déterminer l'outcome
  FOR v_outcome IN
    SELECT * FROM jsonb_to_recordset(v_weights) AS x(
      id TEXT, name TEXT, weight NUMERIC, effect JSONB,
      category TEXT, visual_class TEXT, message TEXT
    )
  LOOP
    v_cumulative := v_cumulative + v_outcome.weight;
    IF v_roll <= v_cumulative THEN
      -- Outcome trouvé!

      -- Appliquer l'effet
      v_result := apply_corruption_effect(v_player.id, v_outcome);

      -- Mettre à jour les stats de corruption
      v_stats := COALESCE(v_player.corruption_stats, '{}'::jsonb);
      v_stats := v_stats || jsonb_build_object(
        'total_corruptions', COALESCE((v_stats->>'total_corruptions')::INT, 0) + 1,
        'last_outcome', v_outcome.id
      );

      -- Gérer les streaks pour pity system
      IF v_outcome.id = 'nothing' THEN
        v_stats := v_stats || jsonb_build_object(
          'nothing_streak', COALESCE((v_stats->>'nothing_streak')::INT, 0) + 1
        );
      ELSE
        v_stats := v_stats || jsonb_build_object('nothing_streak', 0);
      END IF;

      IF v_outcome.category = 'negative' THEN
        v_stats := v_stats || jsonb_build_object(
          'negative_streak', COALESCE((v_stats->>'negative_streak')::INT, 0) + 1
        );
      ELSE
        v_stats := v_stats || jsonb_build_object('negative_streak', 0);
      END IF;

      -- Tracker le meilleur outcome
      IF v_outcome.id = 'miracle' OR
         (v_outcome.id = 'jackpot' AND v_stats->>'best_outcome' != 'miracle') THEN
        v_stats := v_stats || jsonb_build_object('best_outcome', v_outcome.id);
      END IF;

      UPDATE forge_players SET
        corruption_stats = v_stats,
        total_corruptions = total_corruptions + 1
      WHERE id = v_player.id;

      -- Logger
      INSERT INTO forge_activity_logs (
        player_id, action_type, action_data
      ) VALUES (
        v_player.id, 'corruption',
        jsonb_build_object(
          'outcome_id', v_outcome.id,
          'outcome_name', v_outcome.name,
          'roll', v_roll,
          'effect_applied', v_result
        )
      );

      RETURN jsonb_build_object(
        'success', true,
        'outcome', jsonb_build_object(
          'id', v_outcome.id,
          'name', v_outcome.name,
          'category', v_outcome.category,
          'visual_class', v_outcome.visual_class,
          'message', v_outcome.message
        ),
        'effect_result', v_result
      );
    END IF;
  END LOOP;

  -- Fallback (ne devrait jamais arriver)
  RETURN jsonb_build_object('error', 'Corruption failed unexpectedly');
END;
$$;

-- Fonction helper pour calculer les poids ajustés
CREATE OR REPLACE FUNCTION calculate_corruption_weights(p_player forge_players)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_weights JSONB;
  v_nothing_streak INT;
  v_negative_streak INT;
BEGIN
  -- Poids de base
  v_weights := '[
    {"id":"nothing","name":"RIEN","weight":30,"category":"neutral","visual_class":"outcome-nothing","message":"Le Vaal Orb se dissipe sans effet...","effect":{"type":"none"}},
    {"id":"boost","name":"BOOST","weight":25,"category":"positive","visual_class":"outcome-boost","message":"+50% de production pendant 24h!","effect":{"type":"buff","buff_id":"corruption_boost","duration_hours":24}},
    {"id":"jackpot","name":"JACKPOT","weight":15,"category":"positive","visual_class":"outcome-jackpot","message":"JACKPOT! +10 Chaos Orbs!","effect":{"type":"instant_reward","chaos_orbs":10}},
    {"id":"curse","name":"MALÉDICTION","weight":15,"category":"negative","visual_class":"outcome-curse","message":"MAUDIT! -25% de production pendant 24h...","effect":{"type":"debuff","debuff_id":"corruption_curse","duration_hours":24}},
    {"id":"cataclysm","name":"CATACLYSME","weight":10,"category":"negative","visual_class":"outcome-cataclysm","message":"CATACLYSME! Tu perds 50% de tous tes shards!","effect":{"type":"instant_loss","shard_loss_percentage":0.5}},
    {"id":"miracle","name":"MIRACLE","weight":5,"category":"positive","visual_class":"outcome-miracle","message":"MIRACLE! +1 Vaal Orb ET une recette rare révélée!","effect":{"type":"miracle","vaal_orbs":1,"reveals_recipe":true}}
  ]'::jsonb;

  -- Appliquer pity system
  v_nothing_streak := COALESCE((p_player.corruption_stats->>'nothing_streak')::INT, 0);
  v_negative_streak := COALESCE((p_player.corruption_stats->>'negative_streak')::INT, 0);

  -- Après 5 RIEN: impossible d'avoir RIEN
  IF v_nothing_streak >= 5 THEN
    v_weights := (
      SELECT jsonb_agg(
        CASE WHEN elem->>'id' = 'nothing'
          THEN jsonb_set(elem, '{weight}', '0')
          ELSE elem
        END
      )
      FROM jsonb_array_elements(v_weights) elem
    );
  END IF;

  -- Après 3 négatifs: boost des positifs de 10%
  IF v_negative_streak >= 3 THEN
    v_weights := (
      SELECT jsonb_agg(
        CASE WHEN elem->>'category' = 'positive'
          THEN jsonb_set(elem, '{weight}', to_jsonb((elem->>'weight')::NUMERIC * 1.10))
          ELSE elem
        END
      )
      FROM jsonb_array_elements(v_weights) elem
    );
  END IF;

  RETURN v_weights;
END;
$$;

-- Fonction helper pour appliquer l'effet
CREATE OR REPLACE FUNCTION apply_corruption_effect(
  p_player_id UUID,
  p_outcome RECORD
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_effect JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_effect := p_outcome.effect;

  CASE v_effect->>'type'
    WHEN 'none' THEN
      RETURN jsonb_build_object('applied', 'nothing');

    WHEN 'buff' THEN
      v_expires_at := NOW() + ((v_effect->>'duration_hours')::INT || ' hours')::INTERVAL;

      -- Annuler le debuff opposé s'il existe
      UPDATE forge_players SET
        active_effects = active_effects - 'corruption_curse'
      WHERE id = p_player_id;

      -- Appliquer le buff
      UPDATE forge_players SET
        active_effects = COALESCE(active_effects, '{}'::jsonb) ||
          jsonb_build_object('corruption_boost', v_expires_at)
      WHERE id = p_player_id;

      RETURN jsonb_build_object('applied', 'buff', 'expires_at', v_expires_at);

    WHEN 'debuff' THEN
      v_expires_at := NOW() + ((v_effect->>'duration_hours')::INT || ' hours')::INTERVAL;

      -- Annuler le buff opposé s'il existe
      UPDATE forge_players SET
        active_effects = active_effects - 'corruption_boost'
      WHERE id = p_player_id;

      -- Appliquer le debuff
      UPDATE forge_players SET
        active_effects = COALESCE(active_effects, '{}'::jsonb) ||
          jsonb_build_object('corruption_curse', v_expires_at)
      WHERE id = p_player_id;

      RETURN jsonb_build_object('applied', 'debuff', 'expires_at', v_expires_at);

    WHEN 'instant_reward' THEN
      UPDATE forge_players SET
        chaos_orbs = chaos_orbs + (v_effect->>'chaos_orbs')::INT
      WHERE id = p_player_id;

      RETURN jsonb_build_object('applied', 'reward', 'chaos_gained', (v_effect->>'chaos_orbs')::INT);

    WHEN 'instant_loss' THEN
      UPDATE forge_players SET
        transmute_shards = FLOOR(transmute_shards * (1 - (v_effect->>'shard_loss_percentage')::NUMERIC)),
        alteration_shards = FLOOR(alteration_shards * (1 - (v_effect->>'shard_loss_percentage')::NUMERIC)),
        augment_shards = FLOOR(augment_shards * (1 - (v_effect->>'shard_loss_percentage')::NUMERIC)),
        exalted_shards = FLOOR(exalted_shards * (1 - (v_effect->>'shard_loss_percentage')::NUMERIC))
      WHERE id = p_player_id;

      RETURN jsonb_build_object('applied', 'loss', 'percentage_lost', (v_effect->>'shard_loss_percentage')::NUMERIC);

    WHEN 'miracle' THEN
      -- +1 Vaal Orb
      UPDATE forge_players SET
        vaal_orbs = vaal_orbs + 1
      WHERE id = p_player_id;

      -- Révéler une recette rare
      INSERT INTO forge_recipes (player_id, recipe_id, discovered, discovered_at)
      SELECT p_player_id, id, true, NOW()
      FROM forge_recipe_definitions
      WHERE is_discoverable = true
        AND category = 'special'
        AND id NOT IN (
          SELECT recipe_id FROM forge_recipes
          WHERE player_id = p_player_id AND discovered = true
        )
      ORDER BY RANDOM()
      LIMIT 1
      ON CONFLICT (player_id, recipe_id) DO UPDATE SET
        discovered = true,
        discovered_at = NOW();

      RETURN jsonb_build_object('applied', 'miracle', 'vaal_gained', 1, 'recipe_revealed', true);

    ELSE
      RETURN jsonb_build_object('applied', 'unknown');
  END CASE;
END;
$$;
```

---

## 8. Composable

```typescript
// composables/useForgeCorruption.ts

export function useForgeCorruption() {
  const { forgeState, refreshState } = useForgeState()
  const isCorrupting = ref(false)

  const corruptionStats = computed(() =>
    forgeState.value.corruption_stats
  )

  const canCorrupt = computed(() =>
    forgeState.value.vaal_orbs >= 1
    && forgeState.value.actions_remaining >= 1
    && forgeState.value.atelier_level >= 15
  )

  async function corruptForge(): Promise<CorruptionResult | null> {
    if (isCorrupting.value || !canCorrupt.value) return null
    isCorrupting.value = true

    try {
      const { data } = await useFetch('/api/forge/corrupt', {
        method: 'POST'
      })

      if (data.value?.success) {
        // Effets visuels selon l'outcome
        const outcome = data.value.outcome

        switch (outcome.id) {
          case 'miracle':
            useForgeEffects().showMiracle()
            break
          case 'jackpot':
            useForgeEffects().showJackpot()
            break
          case 'cataclysm':
            useForgeEffects().showCataclysm()
            break
          case 'curse':
            useForgeEffects().showCurse()
            break
          case 'boost':
            useForgeEffects().showBoost()
            break
        }

        // La corruption génère beaucoup de chaleur!
        useForgeHeat().increaseHeat(30)

        await refreshState()
      }

      return data.value
    } finally {
      isCorrupting.value = false
    }
  }

  // Recette de purification (#14)
  async function purifyCorruption(): Promise<boolean> {
    if (forgeState.value.vaal_orbs < 3) return false

    const { data } = await useFetch('/api/forge/craft', {
      method: 'POST',
      body: { recipe_id: 'purification' }
    })

    if (data.value?.success) {
      useForgeEffects().showNotification(
        'Malédiction purifiée! +5 Chaos Orbs',
        'success'
      )
      await refreshState()
      return true
    }

    return false
  }

  return {
    isCorrupting,
    corruptionStats,
    canCorrupt,
    corruptForge,
    purifyCorruption
  }
}
```

---

## 9. Références

- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §4, §6
- **Progression**: [02_PROGRESSION_SYSTEM.md](../specs/02_PROGRESSION_SYSTEM.md) §2.5
- **Module Précédent**: [M4_CHAOS.md](./M4_CHAOS.md)
- **Module Suivant**: [M6_DIVINE.md](./M6_DIVINE.md)
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §5.5
