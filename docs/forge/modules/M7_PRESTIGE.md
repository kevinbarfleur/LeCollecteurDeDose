# Module 7: Le Panthéon de Prestige - Spécification Technique

> **Document**: `modules/M7_PRESTIGE.md`
> **Version**: 1.0
> **Statut**: Module Endgame (Niveau 30+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

Le Panthéon de Prestige est le **système d'ascension** permettant de recommencer avec des bonus permanents:
- Reset de la progression avec bonus cumulatifs
- Mirror Shards obtenus uniquement via prestige
- Déblocage de fonctionnalités exclusives
- Leaderboard compétitif basé sur le score de prestige

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant - Ascendant | Caché |
| Ascendant (Niv 28-29) | Teaser mystique |
| Transcendent (Niv 30+) | Actif |

### 1.3 Conditions de Prestige

```typescript
const PRESTIGE_REQUIREMENTS = {
  minimum_level: 30,
  minimum_recipes_discovered: 10,
  minimum_t0_cards: 1,

  // Vérification avant prestige
  check: (player: ForgePlayer) => ({
    level_ok: player.atelier_level >= 30,
    recipes_ok: player.discovered_recipes.length >= 10,
    t0_ok: player.cards.some(c => c.tier === 'T0'),
    can_prestige: /* all conditions met */
  })
}
```

---

## 2. Mécanique de Prestige

### 2.1 Ce qui est RESET

```typescript
const PRESTIGE_RESET = {
  // Remis à zéro
  reset: [
    'atelier_level',      // → 1
    'experience',         // → 0
    'fragments',          // → 0
    'transmute_shards',   // → 0
    'alteration_shards',  // → 0
    'augment_shards',     // → 0
    'exalted_shards',     // → 0
    'divine_shards',      // → 0
    'chaos_orbs',         // → 0
    'vaal_orbs',          // → 0
    'cards',              // → cartes de départ + bonus
    'active_effects',     // → effacés
  ],

  // Valeurs initiales après reset
  initial_values: {
    atelier_level: 1,
    experience: 0,
    fragments: 0,
    actions_remaining: 10,
    fragments_per_hour: 10  // Sera modifié par bonus prestige
  }
}
```

### 2.2 Ce qui est CONSERVÉ

```typescript
const PRESTIGE_PRESERVED = {
  // Permanent
  preserved: [
    'prestige_level',            // Incrémenté
    'discovered_recipes',        // Conservées!
    'total_corruptions',         // Stats historiques
    'total_cards_smelted',
    'total_crafts',
    'best_outcome',
    'corruption_stats'
  ],

  // Visible dans le profil
  lifetime_stats: [
    'total_prestiges',
    'highest_level_reached',
    'total_miracles',
    'total_cataclysms'
  ]
}
```

### 2.3 Bonus de Prestige par Niveau

```typescript
const PRESTIGE_BONUSES: Record<number, PrestigeBonus> = {
  1: {
    production_multiplier: 1.25,  // +25%
    starting_cards: { T3: 12 },   // +2 T3
    starting_resources: { chaos_orbs: 1 },
    special: null
  },
  2: {
    production_multiplier: 1.50,  // +50%
    starting_cards: { T3: 12, T2: 1 },
    starting_resources: { chaos_orbs: 2 },
    special: null
  },
  3: {
    production_multiplier: 1.75,  // +75%
    starting_cards: { T3: 12, T2: 1, T1: 1 },
    starting_resources: { chaos_orbs: 3 },
    special: 'accelerated_unlocks'  // Déblocage stations plus rapide
  },
  4: {
    production_multiplier: 2.00,  // +100%
    starting_cards: { T3: 12, T2: 2, T1: 1 },
    starting_resources: { chaos_orbs: 5, vaal_orbs: 1 },
    special: 'extra_actions'  // +2 actions/jour
  },
  5: {
    production_multiplier: 2.25,  // +125%
    starting_cards: { T3: 12, T2: 2, T1: 2 },
    starting_resources: { chaos_orbs: 5, vaal_orbs: 2, mirror_shards: 1 },
    special: 'unlock_mirror_recipe'  // Accès recette #15
  }
  // 6+: +25% production par niveau, bonus aléatoires
}
```

---

## 3. Mirror Shards

### 3.1 Obtention

```typescript
const MIRROR_SHARD_SOURCES = {
  // Source principale: Prestige
  prestige: {
    level_5_plus: 1,  // 1 Mirror par prestige niveau 5+
  },

  // Source secondaire: Recette #9
  recipe_9: {
    requirements: '5× cartes Masterwork',
    result: '1 Mirror Shard'
  },

  // Source rare: Événements spéciaux
  events: 'Récompenses événementielles rares'
}
```

### 3.2 Utilisation (Recette #15)

```typescript
const MIRROR_RECIPE = {
  id: 'mirror_kalandra',
  name: 'Miroir de Kalandra',
  unlock: 'Prestige 5 ou MIRACLE',

  requirements: {
    mirror_shards: 1,
    card: '1× carte T0'
  },

  result: {
    duplicates: true,  // Duplique la carte T0
    original_preserved: true
  },

  // La carte dupliquée est identique
  duplicate_properties: [
    'uid', 'name', 'tier', 'quality', 'item_class'
  ]
}
```

---

## 4. Score de Prestige et Leaderboard

### 4.1 Calcul du Score

```typescript
function calculatePrestigeScore(player: ForgePlayer): number {
  const score =
    (player.atelier_level * 100) +
    (player.prestige_level * 5000) +
    (player.discovered_recipes.length * 500) +
    (player.cards.filter(c => c.tier === 'T0').length * 200) +
    (player.cards.filter(c => c.tier === 'T1').length * 50) +
    (player.total_chaos_earned * 2) +
    (player.total_corruptions * 100) +
    (player.mirror_shards_earned * 10000) +
    (player.miracles_achieved * 2500)

  return Math.floor(score)
}
```

### 4.2 Catégories du Leaderboard

```typescript
const LEADERBOARD_CATEGORIES = [
  {
    id: 'global',
    name: 'Score Global',
    sort: 'prestige_score DESC'
  },
  {
    id: 'master_forger',
    name: 'Maître Forgeron',
    sort: 'highest_level_reached DESC'
  },
  {
    id: 'discoverer',
    name: 'Découvreur',
    sort: 'recipes_discovered DESC'
  },
  {
    id: 'corruptor',
    name: 'Corrupteur',
    sort: 'total_corruptions DESC'
  },
  {
    id: 'collector',
    name: 'Collectionneur',
    sort: 't0_cards_owned DESC'
  },
  {
    id: 'transcendent',
    name: 'Transcendant',
    sort: 'prestige_level DESC'
  }
]
```

---

## 5. Composant Frontend

### 5.1 ForgePrestige.vue

```vue
<script setup lang="ts">
/**
 * ForgePrestige - Panthéon de Prestige
 *
 * Interface pour le système de prestige et le leaderboard.
 * Moment solennel et significatif - beaucoup de confirmations.
 */

const { forgeState } = useForgeState()
const {
  canPrestige,
  prestigeRequirements,
  currentPrestigeLevel,
  nextPrestigeBonus,
  executePrestige,
  isPrestiging,
  prestigeScore,
  leaderboard
} = useForgePrestige()

const showConfirm = ref(false)
const showDetails = ref(false)
const selectedCategory = ref('global')

// Vérification des conditions
const requirements = computed(() => prestigeRequirements.value)

// Bonus actuels et suivants
const currentBonus = computed(() =>
  PRESTIGE_BONUSES[currentPrestigeLevel.value] || null
)

const nextBonus = computed(() =>
  PRESTIGE_BONUSES[currentPrestigeLevel.value + 1] || null
)

// Demander confirmation
function requestPrestige() {
  if (!canPrestige.value) return
  showConfirm.value = true
}

// Exécuter le prestige
async function confirmPrestige() {
  showConfirm.value = false
  await executePrestige()
}
</script>

<template>
  <div class="forge-prestige">
    <div class="prestige-header">
      <h3>Panthéon de Prestige</h3>
      <ForgeTooltip
        title="Prestige"
        what="Recommence ta progression avec des bonus permanents."
        why="Chaque prestige te rend plus fort. Les recettes découvertes sont conservées."
        how="Atteins niveau 30, découvre 10 recettes, possède 1 carte T0, puis active le prestige."
      />
    </div>

    <!-- Niveau de prestige actuel -->
    <div class="prestige-level">
      <div class="level-display">
        <span class="level-icon">⭐</span>
        <span class="level-number">{{ currentPrestigeLevel }}</span>
      </div>
      <div class="level-label">Niveau de Prestige</div>
    </div>

    <!-- Score actuel -->
    <div class="prestige-score">
      <span class="score-label">Score Global</span>
      <span class="score-value">{{ formatNumber(prestigeScore) }}</span>
    </div>

    <!-- Conditions de prestige -->
    <div class="prestige-requirements">
      <h5>Conditions pour le prochain prestige:</h5>
      <ul>
        <li :class="{ met: requirements.level_ok }">
          <span class="check">{{ requirements.level_ok ? '✓' : '✗' }}</span>
          Niveau 30+ (actuel: {{ forgeState.atelier_level }})
        </li>
        <li :class="{ met: requirements.recipes_ok }">
          <span class="check">{{ requirements.recipes_ok ? '✓' : '✗' }}</span>
          10+ recettes découvertes (actuel: {{ forgeState.discovered_recipes.length }})
        </li>
        <li :class="{ met: requirements.t0_ok }">
          <span class="check">{{ requirements.t0_ok ? '✓' : '✗' }}</span>
          Au moins 1 carte T0
        </li>
      </ul>
    </div>

    <!-- Aperçu du prochain bonus -->
    <div v-if="nextBonus" class="next-bonus-preview">
      <h5>Bonus du Prestige {{ currentPrestigeLevel + 1 }}:</h5>
      <div class="bonus-list">
        <div class="bonus-item">
          <span class="bonus-icon">📈</span>
          <span>+{{ ((nextBonus.production_multiplier - 1) * 100).toFixed(0) }}% production</span>
        </div>
        <div class="bonus-item">
          <span class="bonus-icon">🃏</span>
          <span>{{ formatStartingCards(nextBonus.starting_cards) }}</span>
        </div>
        <div class="bonus-item">
          <span class="bonus-icon">💰</span>
          <span>{{ formatStartingResources(nextBonus.starting_resources) }}</span>
        </div>
        <div v-if="nextBonus.special" class="bonus-item special">
          <span class="bonus-icon">✨</span>
          <span>{{ formatSpecialBonus(nextBonus.special) }}</span>
        </div>
      </div>
    </div>

    <!-- Bouton de prestige -->
    <button
      class="prestige-button"
      :class="{ available: canPrestige, unavailable: !canPrestige }"
      :disabled="!canPrestige || isPrestiging"
      @click="requestPrestige"
    >
      <span v-if="isPrestiging">Transcendance en cours...</span>
      <span v-else-if="!canPrestige">Conditions non remplies</span>
      <span v-else>⭐ TRANSCENDER ⭐</span>
    </button>

    <!-- Ce qui sera reset -->
    <div class="reset-warning" v-if="canPrestige">
      <h6>Sera remis à zéro:</h6>
      <ul>
        <li>Niveau d'atelier</li>
        <li>Toutes les ressources (shards, orbs)</li>
        <li>Toutes les cartes (remplacées par bonus)</li>
        <li>Buffs et malédictions actifs</li>
      </ul>
      <h6>Sera conservé:</h6>
      <ul>
        <li>✓ Recettes découvertes</li>
        <li>✓ Statistiques historiques</li>
        <li>✓ Achievements</li>
      </ul>
    </div>

    <!-- Leaderboard -->
    <div class="leaderboard-section">
      <h4>Leaderboard</h4>

      <div class="leaderboard-tabs">
        <button
          v-for="cat in LEADERBOARD_CATEGORIES"
          :key="cat.id"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <div class="leaderboard-list">
        <div
          v-for="(entry, index) in leaderboard[selectedCategory]"
          :key="entry.user_id"
          class="leaderboard-entry"
          :class="{ 'is-me': entry.is_current_user, 'top-3': index < 3 }"
        >
          <span class="rank">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span v-else>#{{ index + 1 }}</span>
          </span>
          <span class="username">{{ entry.display_name }}</span>
          <span class="prestige-stars">
            <span v-for="n in Math.min(5, entry.prestige_level)" :key="n">⭐</span>
          </span>
          <span class="score">{{ formatNumber(entry.score) }}</span>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation -->
    <Teleport to="body">
      <div v-if="showConfirm" class="confirm-overlay" @click="showConfirm = false">
        <div class="confirm-modal prestige-modal" @click.stop>
          <div class="modal-header">
            <span class="star">⭐</span>
            <h4>Confirmer le Prestige?</h4>
            <span class="star">⭐</span>
          </div>

          <div class="modal-content">
            <p class="prestige-level-up">
              Tu vas passer au <strong>Prestige {{ currentPrestigeLevel + 1 }}</strong>
            </p>

            <div class="prestige-summary">
              <div class="summary-section lost">
                <h6>Tu perdras:</h6>
                <ul>
                  <li>Niveau {{ forgeState.atelier_level }} → 1</li>
                  <li>{{ forgeState.fragments }} Fragments</li>
                  <li>{{ totalShards }} Shards</li>
                  <li>{{ forgeState.chaos_orbs }} Chaos Orbs</li>
                  <li>{{ forgeState.cards.length }} Cartes</li>
                </ul>
              </div>

              <div class="summary-section gained">
                <h6>Tu gagneras:</h6>
                <ul>
                  <li>+{{ ((nextBonus.production_multiplier - 1) * 100).toFixed(0) }}% production permanente</li>
                  <li>{{ formatStartingCards(nextBonus.starting_cards) }}</li>
                  <li>{{ formatStartingResources(nextBonus.starting_resources) }}</li>
                  <li v-if="currentPrestigeLevel >= 4">+1 Mirror Shard</li>
                </ul>
              </div>
            </div>

            <p class="final-confirmation">
              Cette action est <strong>irréversible</strong>.
            </p>
          </div>

          <div class="modal-actions">
            <button class="cancel" @click="showConfirm = false">
              Annuler
            </button>
            <button class="confirm prestige" @click="confirmPrestige">
              TRANSCENDER
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.forge-prestige {
  padding: 1.5rem;
  background: linear-gradient(180deg,
    rgba(168, 85, 247, 0.1) 0%,
    var(--color-surface) 100%
  );
  border-radius: 8px;
  border: 2px solid rgba(168, 85, 247, 0.3);
}

.prestige-header h3 {
  color: #a855f7;
  text-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
}

.prestige-level {
  text-align: center;
  margin: 2rem 0;
}

.level-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.level-icon {
  font-size: 2rem;
}

.level-number {
  font-size: 4rem;
  font-weight: bold;
  color: #a855f7;
  text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
}

.level-label {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

.prestige-score {
  text-align: center;
  margin-bottom: 2rem;
}

.score-label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.score-value {
  font-size: 2rem;
  font-weight: bold;
  color: #eab308;
}

.prestige-requirements {
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.prestige-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}

.prestige-requirements li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: var(--color-text-muted);
}

.prestige-requirements li.met {
  color: var(--color-success);
}

.prestige-requirements li .check {
  width: 20px;
  font-weight: bold;
}

.next-bonus-preview {
  padding: 1rem;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bonus-item.special {
  color: #eab308;
}

.prestige-button {
  width: 100%;
  padding: 1.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.prestige-button.available {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
  animation: prestige-pulse 2s infinite;
}

.prestige-button.unavailable {
  background: rgba(107, 114, 128, 0.3);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.prestige-button:hover:not(:disabled) {
  transform: scale(1.02);
}

.reset-warning {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  font-size: 0.875rem;
}

.reset-warning h6 {
  margin: 0 0 0.5rem;
  color: var(--color-text-muted);
}

.reset-warning ul {
  margin: 0 0 1rem;
  padding-left: 1.5rem;
}

/* Leaderboard */
.leaderboard-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.leaderboard-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.leaderboard-tabs button {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  background: rgba(0,0,0,0.3);
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
}

.leaderboard-tabs button.active {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #a855f7;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0,0,0,0.2);
  border-radius: 6px;
}

.leaderboard-entry.is-me {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.5);
}

.leaderboard-entry.top-3 {
  background: rgba(234, 179, 8, 0.1);
}

.leaderboard-entry .rank {
  width: 40px;
  text-align: center;
  font-weight: bold;
}

.leaderboard-entry .username {
  flex: 1;
}

.leaderboard-entry .prestige-stars {
  font-size: 0.75rem;
}

.leaderboard-entry .score {
  font-weight: bold;
  color: #eab308;
}

/* Confirm Modal */
.prestige-modal {
  background: linear-gradient(135deg, #1a1a2e, #2d1f3d);
  border: 2px solid #a855f7;
}

.modal-header .star {
  font-size: 1.5rem;
}

.prestige-level-up {
  text-align: center;
  font-size: 1.25rem;
}

.prestige-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
}

.summary-section {
  padding: 1rem;
  border-radius: 8px;
}

.summary-section.lost {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.summary-section.gained {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.summary-section h6 {
  margin: 0 0 0.5rem;
}

.summary-section ul {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.875rem;
}

.final-confirmation {
  text-align: center;
  color: var(--color-warning);
}

.modal-actions .confirm.prestige {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
}

@keyframes prestige-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(168, 85, 247, 0.8);
  }
}
</style>
```

---

## 6. Backend

### 6.1 Endpoint de Prestige

```typescript
// server/api/forge/prestige.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_prestige', {
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

### 6.2 Endpoint du Leaderboard

```typescript
// server/api/forge/leaderboard.get.ts

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = (query.category as string) || 'global'
  const limit = Math.min(100, parseInt(query.limit as string) || 50)

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_get_leaderboard', {
    p_category: category,
    p_limit: limit
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

## 7. Fonctions SQL

### 7.1 Exécution du Prestige

```sql
CREATE OR REPLACE FUNCTION forge_prestige(p_user_login TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_user users%ROWTYPE;
  v_new_prestige_level INT;
  v_bonus JSONB;
  v_starting_cards JSONB;
  v_starting_resources JSONB;
  v_production_multiplier NUMERIC;
  v_t0_count INT;
  v_recipes_count INT;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier les conditions
  IF v_player.atelier_level < 30 THEN
    RETURN jsonb_build_object('error', 'Requires level 30');
  END IF;

  -- Compter les recettes découvertes
  SELECT COUNT(*) INTO v_recipes_count
  FROM forge_recipes
  WHERE player_id = v_player.id AND discovered = true;

  IF v_recipes_count < 10 THEN
    RETURN jsonb_build_object('error', 'Requires 10 discovered recipes');
  END IF;

  -- Compter les cartes T0
  SELECT COUNT(*) INTO v_t0_count
  FROM forge_cards
  WHERE player_id = v_player.id AND card_tier = 'T0';

  IF v_t0_count < 1 THEN
    RETURN jsonb_build_object('error', 'Requires at least 1 T0 card');
  END IF;

  -- Calculer le nouveau niveau de prestige
  v_new_prestige_level := v_player.prestige_level + 1;

  -- Obtenir les bonus
  v_bonus := get_prestige_bonus(v_new_prestige_level);
  v_production_multiplier := (v_bonus->>'production_multiplier')::NUMERIC;
  v_starting_cards := v_bonus->'starting_cards';
  v_starting_resources := v_bonus->'starting_resources';

  -- Archiver les stats avant reset
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data
  ) VALUES (
    v_player.id, 'prestige',
    jsonb_build_object(
      'from_level', v_player.atelier_level,
      'from_prestige', v_player.prestige_level,
      'to_prestige', v_new_prestige_level,
      'resources_lost', jsonb_build_object(
        'fragments', v_player.fragments,
        'transmute', v_player.transmute_shards,
        'alteration', v_player.alteration_shards,
        'augment', v_player.augment_shards,
        'chaos', v_player.chaos_orbs,
        'vaal', v_player.vaal_orbs
      ),
      'cards_lost', (SELECT COUNT(*) FROM forge_cards WHERE player_id = v_player.id)
    )
  );

  -- Supprimer toutes les cartes actuelles
  DELETE FROM forge_cards WHERE player_id = v_player.id;

  -- Reset le joueur
  UPDATE forge_players SET
    atelier_level = 1,
    experience = 0,
    fragments = 0,
    transmute_shards = 0,
    alteration_shards = 0,
    augment_shards = 0,
    exalted_shards = 0,
    divine_shards = 0,
    chaos_orbs = COALESCE((v_starting_resources->>'chaos_orbs')::INT, 0),
    vaal_orbs = COALESCE((v_starting_resources->>'vaal_orbs')::INT, 0),
    mirror_shards = mirror_shards + CASE WHEN v_new_prestige_level >= 5 THEN 1 ELSE 0 END,
    prestige_level = v_new_prestige_level,
    fragments_per_hour = FLOOR(10 * v_production_multiplier),
    actions_remaining = 10 + CASE WHEN v_new_prestige_level >= 4 THEN 2 ELSE 0 END,
    active_effects = '{}'::jsonb,
    last_collection_at = NOW(),
    total_prestiges = total_prestiges + 1,
    highest_level_reached = GREATEST(highest_level_reached, v_player.atelier_level)
  WHERE id = v_player.id;

  -- Créer les cartes de départ selon bonus
  PERFORM create_starting_cards(v_player.id, v_starting_cards);

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'new_prestige_level', v_new_prestige_level,
    'bonus_applied', v_bonus,
    'production_rate', FLOOR(10 * v_production_multiplier),
    'mirror_shard_gained', v_new_prestige_level >= 5
  );
END;
$$;

-- Fonction helper pour les bonus de prestige
CREATE OR REPLACE FUNCTION get_prestige_bonus(p_level INT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE p_level
    WHEN 1 THEN '{"production_multiplier":1.25,"starting_cards":{"T3":12},"starting_resources":{"chaos_orbs":1}}'
    WHEN 2 THEN '{"production_multiplier":1.50,"starting_cards":{"T3":12,"T2":1},"starting_resources":{"chaos_orbs":2}}'
    WHEN 3 THEN '{"production_multiplier":1.75,"starting_cards":{"T3":12,"T2":1,"T1":1},"starting_resources":{"chaos_orbs":3}}'
    WHEN 4 THEN '{"production_multiplier":2.00,"starting_cards":{"T3":12,"T2":2,"T1":1},"starting_resources":{"chaos_orbs":5,"vaal_orbs":1}}'
    WHEN 5 THEN '{"production_multiplier":2.25,"starting_cards":{"T3":12,"T2":2,"T1":2},"starting_resources":{"chaos_orbs":5,"vaal_orbs":2}}'
    ELSE jsonb_build_object(
      'production_multiplier', 2.25 + (p_level - 5) * 0.25,
      'starting_cards', '{"T3":12,"T2":3,"T1":2}'::jsonb,
      'starting_resources', '{"chaos_orbs":10,"vaal_orbs":3}'::jsonb
    )
  END::jsonb;
END;
$$;

-- Fonction helper pour créer les cartes de départ
CREATE OR REPLACE FUNCTION create_starting_cards(
  p_player_id UUID,
  p_cards JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_count INT;
  v_card unique_cards%ROWTYPE;
  i INT;
BEGIN
  FOR v_tier, v_count IN SELECT * FROM jsonb_each_text(p_cards)
  LOOP
    FOR i IN 1..v_count::INT LOOP
      -- Sélectionner une carte aléatoire du tier (READ ONLY sur unique_cards)
      SELECT * INTO v_card
      FROM unique_cards
      WHERE tier = v_tier
      ORDER BY RANDOM()
      LIMIT 1;

      IF v_card IS NOT NULL THEN
        INSERT INTO forge_cards (
          player_id, card_uid, card_name, card_tier, card_quality
        ) VALUES (
          p_player_id, v_card.uid, v_card.name, v_tier, 'normal'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
```

### 7.2 Leaderboard

```sql
CREATE OR REPLACE FUNCTION forge_get_leaderboard(
  p_category TEXT DEFAULT 'global',
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_order_by TEXT;
BEGIN
  -- Déterminer le tri
  v_order_by := CASE p_category
    WHEN 'global' THEN 'prestige_score DESC'
    WHEN 'master_forger' THEN 'highest_level_reached DESC'
    WHEN 'discoverer' THEN 'recipes_discovered DESC'
    WHEN 'corruptor' THEN 'total_corruptions DESC'
    WHEN 'collector' THEN 't0_cards DESC'
    WHEN 'transcendent' THEN 'prestige_level DESC'
    ELSE 'prestige_score DESC'
  END;

  -- Requête principale
  EXECUTE format('
    SELECT jsonb_agg(entry ORDER BY %s)
    FROM (
      SELECT
        fp.id,
        u.twitch_username,
        u.display_name,
        u.avatar_url,
        fp.prestige_level,
        fp.atelier_level,
        fp.highest_level_reached,
        fp.total_corruptions,
        (SELECT COUNT(*) FROM forge_recipes fr WHERE fr.player_id = fp.id AND fr.discovered = true) as recipes_discovered,
        (SELECT COUNT(*) FROM forge_cards fc WHERE fc.player_id = fp.id AND fc.card_tier = ''T0'') as t0_cards,
        calculate_prestige_score(fp.*) as prestige_score
      FROM forge_players fp
      JOIN users u ON u.id = fp.user_id
      ORDER BY %s
      LIMIT %s
    ) entry
  ', v_order_by, v_order_by, p_limit)
  INTO v_result;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Fonction de calcul du score
CREATE OR REPLACE FUNCTION calculate_prestige_score(p_player forge_players)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_score BIGINT;
  v_recipes_count INT;
  v_t0_count INT;
  v_t1_count INT;
BEGIN
  -- Compter les recettes et cartes
  SELECT COUNT(*) INTO v_recipes_count
  FROM forge_recipes WHERE player_id = p_player.id AND discovered = true;

  SELECT COUNT(*) INTO v_t0_count
  FROM forge_cards WHERE player_id = p_player.id AND card_tier = 'T0';

  SELECT COUNT(*) INTO v_t1_count
  FROM forge_cards WHERE player_id = p_player.id AND card_tier = 'T1';

  v_score :=
    (p_player.atelier_level * 100) +
    (p_player.prestige_level * 5000) +
    (v_recipes_count * 500) +
    (v_t0_count * 200) +
    (v_t1_count * 50) +
    (COALESCE(p_player.total_chaos_earned, 0) * 2) +
    (COALESCE(p_player.total_corruptions, 0) * 100) +
    (COALESCE(p_player.mirror_shards, 0) * 10000);

  RETURN v_score;
END;
$$;
```

---

## 8. Composable

```typescript
// composables/useForgePrestige.ts

export function useForgePrestige() {
  const { forgeState, refreshState } = useForgeState()
  const isPrestiging = ref(false)

  const currentPrestigeLevel = computed(() =>
    forgeState.value.prestige_level || 0
  )

  const prestigeRequirements = computed(() => ({
    level_ok: forgeState.value.atelier_level >= 30,
    recipes_ok: forgeState.value.discovered_recipes.length >= 10,
    t0_ok: forgeState.value.cards.some(c => c.tier === 'T0')
  }))

  const canPrestige = computed(() =>
    prestigeRequirements.value.level_ok &&
    prestigeRequirements.value.recipes_ok &&
    prestigeRequirements.value.t0_ok
  )

  const prestigeScore = computed(() =>
    calculatePrestigeScore(forgeState.value)
  )

  const nextPrestigeBonus = computed(() =>
    PRESTIGE_BONUSES[currentPrestigeLevel.value + 1] || null
  )

  async function executePrestige(): Promise<PrestigeResult | null> {
    if (isPrestiging.value || !canPrestige.value) return null
    isPrestiging.value = true

    try {
      const { data } = await useFetch('/api/forge/prestige', {
        method: 'POST'
      })

      if (data.value?.success) {
        // Animation de transcendance
        useForgeEffects().showPrestigeAnimation(data.value)

        // Rafraîchir l'état complet
        await refreshState()
      }

      return data.value
    } finally {
      isPrestiging.value = false
    }
  }

  // Leaderboard
  const leaderboard = ref<Record<string, LeaderboardEntry[]>>({})

  async function fetchLeaderboard(category: string = 'global') {
    const { data } = await useFetch('/api/forge/leaderboard', {
      query: { category, limit: 50 }
    })

    if (data.value) {
      leaderboard.value[category] = data.value
    }
  }

  // Helpers
  function formatStartingCards(cards: Record<string, number>): string {
    return Object.entries(cards)
      .map(([tier, count]) => `${count}× ${tier}`)
      .join(', ')
  }

  function formatStartingResources(resources: Record<string, number>): string {
    return Object.entries(resources)
      .map(([type, count]) => `${count} ${type.replace('_', ' ')}`)
      .join(', ')
  }

  return {
    currentPrestigeLevel,
    prestigeRequirements,
    canPrestige,
    prestigeScore,
    nextPrestigeBonus,
    isPrestiging,
    executePrestige,
    leaderboard,
    fetchLeaderboard,
    formatStartingCards,
    formatStartingResources
  }
}
```

---

## 9. Références

- **Progression**: [02_PROGRESSION_SYSTEM.md](../specs/02_PROGRESSION_SYSTEM.md) §4
- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §2.4
- **Module Précédent**: [M6_DIVINE.md](./M6_DIVINE.md)
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §6
