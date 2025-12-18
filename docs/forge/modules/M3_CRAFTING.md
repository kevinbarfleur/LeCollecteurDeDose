# Module 3: L'Établi de Crafting - Spécification Technique

> **Document**: `modules/M3_CRAFTING.md`
> **Version**: 1.0
> **Statut**: Module Intermédiaire (Niveau 5+)

---

## 1. Vue d'Ensemble

### 1.1 Rôle

L'Établi de Crafting permet de **combiner des ressources** pour créer des Orbes et découvrir des recettes:
- Craft de recettes connues (Chaos Orbs, etc.)
- Système de découverte de recettes cachées
- Expérimentation avec risque de perte
- Progression vers les modules avancés

### 1.2 Déblocage

| Phase | État |
|-------|------|
| Dormant | Caché |
| Awakening | Caché |
| Apprentice (1-4) | Teaser (icône verrouillée) |
| Artisan (5+) | Actif |

---

## 2. Système de Recettes

### 2.1 Types de Recettes

```typescript
interface ForgeRecipe {
  id: string
  name: string
  description: string
  category: RecipeCategory
  unlock_level: number
  is_discoverable: boolean  // false = connue dès le départ
  discovery_hint?: string   // Indice pour découverte
  ingredients: RecipeIngredient[]
  result: RecipeResult
  action_cost: number
}

type RecipeCategory =
  | 'basic'      // Recettes de base (connues)
  | 'crafting'   // Orbes et shards
  | 'fusion'     // Combinaison de cartes
  | 'upgrade'    // Amélioration de qualité
  | 'special'    // Recettes rares

interface RecipeIngredient {
  type: 'shard' | 'orb' | 'card' | 'fragment'
  resource?: ShardType | OrbType
  card_tier?: CardTier
  card_quality?: CardQuality
  same_item_class?: boolean  // Toutes les cartes doivent être du même type
  quantity: number
}

interface RecipeResult {
  type: 'shard' | 'orb' | 'card' | 'effect' | 'unlock'
  resource?: ShardType | OrbType
  quantity: number
  card_tier?: CardTier
  card_quality?: CardQuality
  effect_type?: string
  effect_duration?: number
}
```

### 2.2 Recettes de Base (Connues au Niveau 5)

| ID | Nom | Ingrédients | Résultat | Coût |
|----|-----|-------------|----------|------|
| `basic_chaos_1` | Chaos Transmute | 20 Transmute | 1 Chaos Orb | 1 action |
| `basic_chaos_2` | Chaos Alteration | 10 Alteration | 1 Chaos Orb | 1 action |
| `basic_exalt` | Exalted Craft | 5 Augment + 5 Alteration | 1 Exalted | 1 action |

### 2.3 Recettes Découvrables (15 total)

| # | Nom | Ingrédients | Résultat | Indice | Niveau |
|---|-----|-------------|----------|--------|--------|
| 1 | Fusion T3 | 3× T3 même item_class | 1× T2 aléatoire | "Les triplés s'unissent" | 5 |
| 2 | Fusion Rareté | 5× T3 même rarity | 1× T2 de cette rarity | "La rareté appelle" | 7 |
| 3 | Arc-en-ciel | 1× T0 + 1× T1 + 1× T2 + 1× T3 | 1 Divine Shard | "L'arc-en-ciel des tiers" | 10 |
| 4 | Chaos Purifié | 3 Chaos + 10 Alteration | 1 Exalted Shard | "Le chaos purifié" | 8 |
| 5 | Perfection | 1× T0 + 5 Exalted | 1× T0 Masterwork | "La perfection absolue" | 20 |
| 6 | Équilibre Corrompu | 20 Trans + 20 Alt | 1 Vaal Orb | "L'équilibre corrompu" | 15 |
| 7 | Ascension Armes | 3× T2 même item_class | 1× T1 aléatoire | "L'ascension continue" | 12 |
| 8 | Chaos & Corruption | 10 Chaos + 1 Vaal | 3 Divine Shards | "Chaos et corruption" | 18 |
| 9 | Collection Parfaite | 5× cartes Masterwork | 1 Mirror Shard | "La collection parfaite" | 25 |
| 10 | Défaire le Brillant | 1× carte foil + 10 Augment | 2× normales même tier | "Défaire le brillant" | 14 |
| 11 | L'Efficacité | 50 Fragments + 1 Chaos | +2 actions/jour (24h) | "L'efficacité" | 10 |
| 12 | Amélioration Permanente | 100 Alt + 50 Aug | +5% production (permanent) | "L'amélioration" | 22 |
| 13 | Sacrifice Ultime | 1× T0 + 1× T1 + 1× T2 | 1× T0 aléatoire garantie | "Le sacrifice ultime" | 20 |
| 14 | Purification | 3 Vaal Orbs | Reset malédiction + 5 Chaos | "La purification" | 15 |
| 15 | Miroir de Kalandra | 1 Mirror + 1× T0 | Duplique la T0 | "Le miroir légendaire" | 30 |

---

## 3. Mécanique de Découverte

### 3.1 Méthodes de Découverte

```typescript
type DiscoveryMethod =
  | 'experimentation'  // Combiner et espérer
  | 'chaos_discovery'  // Payer 2 Chaos pour un indice
  | 'miracle'          // Outcome Vaal rare
  | 'level_unlock'     // Certaines recettes à certains niveaux

interface DiscoveryResult {
  success: boolean
  recipe_id?: string
  hint_revealed?: string
  resources_lost: RecipeIngredient[]
}
```

### 3.2 Expérimentation

```typescript
// Règles d'expérimentation
const EXPERIMENTATION_RULES = {
  // Si recette valide découverte
  ON_DISCOVERY: {
    consume_ingredients: true,
    give_result: true,
    unlock_recipe: true
  },

  // Si recette invalide
  ON_FAILURE: {
    // Perte partielle des ingrédients
    LOSS_PERCENTAGE: 0.5,  // 50% des ingrédients perdus
    XP_CONSOLATION: 10     // +10 XP pour l'effort
  }
}
```

### 3.3 Chaos Discovery

```typescript
// Payer 2 Chaos Orbs pour révéler un indice
async function chaosDiscovery(playerId: string): Promise<DiscoveryResult> {
  const cost = 2 // Chaos Orbs

  // Trouver une recette non découverte
  const undiscoveredRecipes = await getUndiscoveredRecipes(playerId)

  if (undiscoveredRecipes.length === 0) {
    return { success: false, error: 'Toutes les recettes sont découvertes!' }
  }

  // Sélectionner une recette aléatoire
  const recipe = randomSelect(undiscoveredRecipes)

  return {
    success: true,
    hint_revealed: recipe.discovery_hint,
    recipe_id: recipe.id // Pour tracking interne
  }
}
```

---

## 4. Composant Frontend

### 4.1 ForgeCrafting.vue

```vue
<script setup lang="ts">
/**
 * ForgeCrafting - Établi de Crafting
 *
 * Fonctionnalités:
 * - Liste des recettes connues
 * - Mode expérimentation
 * - Chaos Discovery
 * - Feedback visuel des crafts
 */

const { forgeState } = useForgeState()
const {
  knownRecipes,
  craftRecipe,
  experimentRecipe,
  chaosDiscovery,
  isCrafting
} = useForgeCrafting()

const selectedRecipe = ref<ForgeRecipe | null>(null)
const experimentSlots = ref<RecipeIngredient[]>([])
const isExperimentMode = ref(false)

// Filtrage des recettes
const recipeFilter = ref<RecipeCategory | 'all'>('all')
const filteredRecipes = computed(() => {
  if (recipeFilter.value === 'all') return knownRecipes.value
  return knownRecipes.value.filter(r => r.category === recipeFilter.value)
})

// Vérifier si on peut crafter une recette
function canCraft(recipe: ForgeRecipe): boolean {
  return recipe.ingredients.every(ing => {
    if (ing.type === 'shard') {
      return forgeState.value.shards[ing.resource!] >= ing.quantity
    }
    if (ing.type === 'orb') {
      return forgeState.value.orbs[ing.resource!] >= ing.quantity
    }
    if (ing.type === 'card') {
      return countMatchingCards(ing) >= ing.quantity
    }
    return false
  })
}

// Comptage des cartes correspondantes
function countMatchingCards(ingredient: RecipeIngredient): number {
  return forgeState.value.cards.filter(card => {
    if (ingredient.card_tier && card.tier !== ingredient.card_tier) return false
    if (ingredient.card_quality && card.quality !== ingredient.card_quality) return false
    return true
  }).length
}

// Exécuter un craft
async function handleCraft() {
  if (!selectedRecipe.value || !canCraft(selectedRecipe.value)) return

  const result = await craftRecipe(selectedRecipe.value.id)

  if (result.success) {
    useForgeEffects().showCraftSuccess(result)
    useForgeHeat().increaseHeat(10)
  }
}

// Mode expérimentation
async function handleExperiment() {
  if (experimentSlots.value.length < 2) return

  const result = await experimentRecipe(experimentSlots.value)

  if (result.success && result.recipe_id) {
    useForgeEffects().showDiscovery(result.recipe_id)
    useForgeHeat().increaseHeat(25)
  } else {
    useForgeEffects().showExperimentFail(result.resources_lost)
  }

  experimentSlots.value = []
}
</script>

<template>
  <div class="forge-crafting">
    <div class="crafting-header">
      <h3>Établi de Crafting</h3>
      <ForgeTooltip
        title="Crafting"
        what="Combine des shards et orbes pour créer des items puissants."
        why="Les Chaos Orbs permettent des actions au Sanctuaire. Les recettes avancées donnent des bonus permanents."
        how="Sélectionne une recette et clique sur Crafter. Ou expérimente pour découvrir des recettes cachées!"
      />
    </div>

    <!-- Tabs: Recettes / Expérimentation -->
    <div class="crafting-tabs">
      <button
        :class="{ active: !isExperimentMode }"
        @click="isExperimentMode = false"
      >
        Recettes ({{ knownRecipes.length }}/18)
      </button>
      <button
        :class="{ active: isExperimentMode }"
        @click="isExperimentMode = true"
      >
        Expérimentation
      </button>
    </div>

    <!-- Mode Recettes -->
    <div v-if="!isExperimentMode" class="recipes-mode">
      <!-- Filtres -->
      <div class="recipe-filters">
        <button
          v-for="cat in ['all', 'basic', 'crafting', 'fusion', 'upgrade', 'special']"
          :key="cat"
          :class="{ active: recipeFilter === cat }"
          @click="recipeFilter = cat"
        >
          {{ cat === 'all' ? 'Tous' : cat }}
        </button>
      </div>

      <!-- Liste des recettes -->
      <div class="recipe-list">
        <div
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          class="recipe-card"
          :class="{
            selected: selectedRecipe?.id === recipe.id,
            craftable: canCraft(recipe),
            locked: !canCraft(recipe)
          }"
          @click="selectedRecipe = recipe"
        >
          <div class="recipe-name">{{ recipe.name }}</div>
          <div class="recipe-preview">
            <span class="ingredients">
              {{ formatIngredients(recipe.ingredients) }}
            </span>
            <span class="arrow">→</span>
            <span class="result">
              {{ formatResult(recipe.result) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Détail recette sélectionnée -->
      <div v-if="selectedRecipe" class="recipe-detail">
        <h4>{{ selectedRecipe.name }}</h4>
        <p class="description">{{ selectedRecipe.description }}</p>

        <div class="ingredients-detail">
          <h5>Ingrédients requis:</h5>
          <ul>
            <li
              v-for="(ing, idx) in selectedRecipe.ingredients"
              :key="idx"
              :class="{ available: hasIngredient(ing), missing: !hasIngredient(ing) }"
            >
              {{ ing.quantity }}× {{ formatIngredientName(ing) }}
              <span class="stock">({{ getStock(ing) }} dispo)</span>
            </li>
          </ul>
        </div>

        <div class="result-detail">
          <h5>Résultat:</h5>
          <div class="result-preview">
            {{ selectedRecipe.result.quantity }}× {{ formatResultName(selectedRecipe.result) }}
          </div>
        </div>

        <button
          class="craft-button"
          :disabled="!canCraft(selectedRecipe) || isCrafting"
          @click="handleCraft"
        >
          <span v-if="isCrafting">Crafting...</span>
          <span v-else-if="!canCraft(selectedRecipe)">Ressources insuffisantes</span>
          <span v-else>Crafter ({{ selectedRecipe.action_cost }} action)</span>
        </button>
      </div>
    </div>

    <!-- Mode Expérimentation -->
    <div v-else class="experiment-mode">
      <div class="experiment-warning">
        <span class="icon">⚠️</span>
        <span>L'expérimentation peut échouer et vous faire perdre 50% des ressources!</span>
      </div>

      <!-- Slots d'expérimentation -->
      <div class="experiment-slots">
        <div
          v-for="i in 5"
          :key="i"
          class="experiment-slot"
          :class="{ filled: experimentSlots[i-1] }"
          @drop="handleDrop($event, i-1)"
          @dragover.prevent
        >
          <template v-if="experimentSlots[i-1]">
            {{ formatIngredientName(experimentSlots[i-1]) }}
            <button class="remove" @click="experimentSlots.splice(i-1, 1)">×</button>
          </template>
          <template v-else>
            Slot {{ i }}
          </template>
        </div>
      </div>

      <!-- Ressources disponibles (drag source) -->
      <div class="available-resources">
        <h5>Ressources disponibles:</h5>
        <div class="resource-grid">
          <div
            v-for="(amount, type) in forgeState.shards"
            :key="type"
            class="draggable-resource"
            draggable="true"
            @dragstart="handleDragStart($event, 'shard', type)"
          >
            {{ type }}: {{ amount }}
          </div>
        </div>
      </div>

      <button
        class="experiment-button"
        :disabled="experimentSlots.length < 2"
        @click="handleExperiment"
      >
        Expérimenter (1 action)
      </button>

      <!-- Chaos Discovery -->
      <div class="chaos-discovery">
        <h5>Chaos Discovery</h5>
        <p>Dépense 2 Chaos Orbs pour révéler l'indice d'une recette cachée.</p>
        <button
          :disabled="forgeState.orbs.chaos < 2"
          @click="chaosDiscovery"
        >
          Révéler un indice (2 Chaos)
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forge-crafting {
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 8px;
}

.crafting-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.crafting-tabs button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: rgba(255,255,255,0.1);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.crafting-tabs button.active {
  background: var(--color-accent);
}

.recipe-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.recipe-filters button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.recipe-filters button.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.recipe-card {
  padding: 0.75rem;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.recipe-card:hover {
  background: rgba(255,255,255,0.1);
}

.recipe-card.selected {
  border: 2px solid var(--color-accent);
}

.recipe-card.locked {
  opacity: 0.5;
}

.recipe-card.craftable {
  border-left: 3px solid var(--color-success);
}

.recipe-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.recipe-detail {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
}

.ingredients-detail li.available {
  color: var(--color-success);
}

.ingredients-detail li.missing {
  color: var(--color-error);
}

.craft-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: bold;
  background: var(--color-accent);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.craft-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.experiment-warning {
  padding: 0.75rem;
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 4px;
  margin-bottom: 1rem;
}

.experiment-slots {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.experiment-slot {
  flex: 1;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 4px;
  position: relative;
}

.experiment-slot.filled {
  border-style: solid;
  border-color: var(--color-accent);
}

.experiment-slot .remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  background: var(--color-error);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.chaos-discovery {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}
</style>
```

---

## 5. Backend

### 5.1 Endpoint de Craft

```typescript
// server/api/forge/craft.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { recipe_id } = body

  if (!recipe_id) {
    throw createError({
      statusCode: 400,
      message: 'recipe_id is required'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_craft_recipe', {
    p_user_login: session.user.login,
    p_recipe_id: recipe_id
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

### 5.2 Endpoint d'Expérimentation

```typescript
// server/api/forge/experiment.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { ingredients } = body

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length < 2) {
    throw createError({
      statusCode: 400,
      message: 'At least 2 ingredients required'
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_experiment', {
    p_user_login: session.user.login,
    p_ingredients: ingredients
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

### 5.3 Endpoint Chaos Discovery

```typescript
// server/api/forge/discover.post.ts

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase.rpc('forge_chaos_discovery', {
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

## 6. Fonctions SQL

### 6.1 Craft de Recette

```sql
CREATE OR REPLACE FUNCTION forge_craft_recipe(
  p_user_login TEXT,
  p_recipe_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_recipe forge_recipe_definitions%ROWTYPE;
  v_user_recipe forge_recipes%ROWTYPE;
  v_ingredient JSONB;
  v_can_craft BOOLEAN := true;
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

  -- Vérifier les actions
  IF v_player.actions_remaining < 1 THEN
    RETURN jsonb_build_object('error', 'No actions remaining');
  END IF;

  -- Récupérer la définition de recette
  SELECT * INTO v_recipe
  FROM forge_recipe_definitions
  WHERE id = p_recipe_id;

  IF v_recipe IS NULL THEN
    RETURN jsonb_build_object('error', 'Recipe not found');
  END IF;

  -- Vérifier que la recette est connue (ou de base)
  IF v_recipe.is_discoverable THEN
    SELECT * INTO v_user_recipe
    FROM forge_recipes
    WHERE player_id = v_player.id AND recipe_id = p_recipe_id;

    IF v_user_recipe IS NULL OR NOT v_user_recipe.discovered THEN
      RETURN jsonb_build_object('error', 'Recipe not discovered');
    END IF;
  END IF;

  -- Vérifier les ingrédients
  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(v_recipe.ingredients)
  LOOP
    -- Logique de vérification selon type d'ingrédient
    IF NOT check_ingredient_available(v_player.id, v_ingredient) THEN
      v_can_craft := false;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_can_craft THEN
    RETURN jsonb_build_object('error', 'Insufficient ingredients');
  END IF;

  -- Consommer les ingrédients
  PERFORM consume_ingredients(v_player.id, v_recipe.ingredients);

  -- Donner le résultat
  v_result := apply_recipe_result(v_player.id, v_recipe.result);

  -- Déduire l'action
  UPDATE forge_players SET
    actions_remaining = actions_remaining - 1,
    total_crafts = total_crafts + 1
  WHERE id = v_player.id;

  -- Logger
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data
  ) VALUES (
    v_player.id, 'craft',
    jsonb_build_object(
      'recipe_id', p_recipe_id,
      'recipe_name', v_recipe.name,
      'result', v_result
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'recipe_name', v_recipe.name,
    'result', v_result
  );
END;
$$;
```

### 6.2 Expérimentation

```sql
CREATE OR REPLACE FUNCTION forge_experiment(
  p_user_login TEXT,
  p_ingredients JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_matching_recipe forge_recipe_definitions%ROWTYPE;
  v_already_discovered BOOLEAN;
  v_lost_ingredients JSONB;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier les actions
  IF v_player.actions_remaining < 1 THEN
    RETURN jsonb_build_object('error', 'No actions remaining');
  END IF;

  -- Chercher une recette correspondante
  SELECT * INTO v_matching_recipe
  FROM forge_recipe_definitions
  WHERE ingredients @> p_ingredients
    AND p_ingredients @> ingredients
    AND is_discoverable = true;

  -- Déduire l'action
  UPDATE forge_players SET
    actions_remaining = actions_remaining - 1
  WHERE id = v_player.id;

  IF v_matching_recipe IS NOT NULL THEN
    -- Recette trouvée!

    -- Vérifier si déjà découverte
    SELECT discovered INTO v_already_discovered
    FROM forge_recipes
    WHERE player_id = v_player.id AND recipe_id = v_matching_recipe.id;

    -- Consommer les ingrédients
    PERFORM consume_ingredients(v_player.id, p_ingredients);

    -- Donner le résultat
    PERFORM apply_recipe_result(v_player.id, v_matching_recipe.result);

    -- Marquer comme découverte si nouvelle
    IF NOT v_already_discovered THEN
      INSERT INTO forge_recipes (player_id, recipe_id, discovered, discovered_at)
      VALUES (v_player.id, v_matching_recipe.id, true, NOW())
      ON CONFLICT (player_id, recipe_id) DO UPDATE SET
        discovered = true,
        discovered_at = NOW();

      -- Ajouter XP bonus pour découverte
      UPDATE forge_players SET
        experience = experience + 100
      WHERE id = v_player.id;
    END IF;

    -- Logger
    INSERT INTO forge_activity_logs (
      player_id, action_type, action_data
    ) VALUES (
      v_player.id, 'experiment_success',
      jsonb_build_object(
        'recipe_id', v_matching_recipe.id,
        'recipe_name', v_matching_recipe.name,
        'was_new_discovery', NOT v_already_discovered
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'discovered', NOT v_already_discovered,
      'recipe_id', v_matching_recipe.id,
      'recipe_name', v_matching_recipe.name
    );

  ELSE
    -- Échec - perdre 50% des ingrédients
    v_lost_ingredients := calculate_lost_ingredients(p_ingredients, 0.5);
    PERFORM consume_ingredients(v_player.id, v_lost_ingredients);

    -- XP de consolation
    UPDATE forge_players SET
      experience = experience + 10
    WHERE id = v_player.id;

    -- Logger
    INSERT INTO forge_activity_logs (
      player_id, action_type, action_data
    ) VALUES (
      v_player.id, 'experiment_fail',
      jsonb_build_object(
        'ingredients_tried', p_ingredients,
        'ingredients_lost', v_lost_ingredients
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'message', 'No matching recipe found',
      'resources_lost', v_lost_ingredients,
      'xp_gained', 10
    );
  END IF;
END;
$$;
```

### 6.3 Chaos Discovery

```sql
CREATE OR REPLACE FUNCTION forge_chaos_discovery(p_user_login TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_undiscovered_recipe forge_recipe_definitions%ROWTYPE;
  v_chaos_cost INTEGER := 2;
BEGIN
  -- Récupérer le joueur
  SELECT fp.* INTO v_player
  FROM forge_players fp
  JOIN users u ON u.id = fp.user_id
  WHERE u.twitch_username = p_user_login;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Vérifier le coût en Chaos
  IF v_player.chaos_orbs < v_chaos_cost THEN
    RETURN jsonb_build_object('error', 'Not enough Chaos Orbs (need 2)');
  END IF;

  -- Trouver une recette non découverte
  SELECT rd.* INTO v_undiscovered_recipe
  FROM forge_recipe_definitions rd
  LEFT JOIN forge_recipes fr ON fr.recipe_id = rd.id AND fr.player_id = v_player.id
  WHERE rd.is_discoverable = true
    AND (fr.discovered IS NULL OR fr.discovered = false)
    AND rd.unlock_level <= v_player.atelier_level
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_undiscovered_recipe IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'All recipes at your level have been discovered!'
    );
  END IF;

  -- Consommer les Chaos Orbs
  UPDATE forge_players SET
    chaos_orbs = chaos_orbs - v_chaos_cost
  WHERE id = v_player.id;

  -- Enregistrer l'indice révélé (mais pas la recette complète)
  INSERT INTO forge_recipes (player_id, recipe_id, hint_revealed, hint_revealed_at)
  VALUES (v_player.id, v_undiscovered_recipe.id, true, NOW())
  ON CONFLICT (player_id, recipe_id) DO UPDATE SET
    hint_revealed = true,
    hint_revealed_at = NOW();

  -- Logger
  INSERT INTO forge_activity_logs (
    player_id, action_type, action_data
  ) VALUES (
    v_player.id, 'chaos_discovery',
    jsonb_build_object(
      'recipe_id', v_undiscovered_recipe.id,
      'hint', v_undiscovered_recipe.discovery_hint
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'hint', v_undiscovered_recipe.discovery_hint,
    'recipe_id', v_undiscovered_recipe.id
  );
END;
$$;
```

---

## 7. Composable

```typescript
// composables/useForgeCrafting.ts

export function useForgeCrafting() {
  const { forgeState, refreshState } = useForgeState()
  const isCrafting = ref(false)
  const isExperimenting = ref(false)

  // Recettes connues
  const knownRecipes = computed(() => {
    const baseRecipes = BASE_RECIPES.filter(r =>
      r.unlock_level <= forgeState.value.atelier_level
    )

    const discoveredRecipes = forgeState.value.discovered_recipes
      .map(id => ALL_RECIPES.find(r => r.id === id))
      .filter(Boolean)

    return [...baseRecipes, ...discoveredRecipes]
  })

  // Indices révélés
  const revealedHints = computed(() => {
    return forgeState.value.revealed_hints || []
  })

  async function craftRecipe(recipeId: string) {
    if (isCrafting.value) return null
    isCrafting.value = true

    try {
      const { data } = await useFetch('/api/forge/craft', {
        method: 'POST',
        body: { recipe_id: recipeId }
      })

      if (data.value?.success) {
        useForgeEffects().showNotification(
          `Crafté: ${data.value.recipe_name}`,
          'success'
        )
        await refreshState()
      }

      return data.value
    } finally {
      isCrafting.value = false
    }
  }

  async function experimentRecipe(ingredients: RecipeIngredient[]) {
    if (isExperimenting.value) return null
    isExperimenting.value = true

    try {
      const { data } = await useFetch('/api/forge/experiment', {
        method: 'POST',
        body: { ingredients }
      })

      if (data.value?.success && data.value?.discovered) {
        useForgeEffects().showNotification(
          `🎉 Nouvelle recette découverte: ${data.value.recipe_name}!`,
          'discovery'
        )
      } else if (!data.value?.success) {
        useForgeEffects().showNotification(
          `Expérimentation échouée. Ressources perdues partiellement.`,
          'warning'
        )
      }

      await refreshState()
      return data.value
    } finally {
      isExperimenting.value = false
    }
  }

  async function chaosDiscovery() {
    const { data } = await useFetch('/api/forge/discover', {
      method: 'POST'
    })

    if (data.value?.success) {
      useForgeEffects().showNotification(
        `💡 Indice révélé: "${data.value.hint}"`,
        'info'
      )
      await refreshState()
    }

    return data.value
  }

  return {
    knownRecipes,
    revealedHints,
    isCrafting,
    isExperimenting,
    craftRecipe,
    experimentRecipe,
    chaosDiscovery
  }
}
```

---

## 8. Références

- **Économie**: [03_ECONOMY_RESOURCES.md](../specs/03_ECONOMY_RESOURCES.md) §2, §5
- **Database**: [04_DATABASE_SCHEMA.md](../specs/04_DATABASE_SCHEMA.md) §4
- **Progression**: [02_PROGRESSION_SYSTEM.md](../specs/02_PROGRESSION_SYSTEM.md) §3
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md) §5.2
- **Module Précédent**: [M2_COLLECTE.md](./M2_COLLECTE.md)
- **Module Suivant**: [M4_CHAOS.md](./M4_CHAOS.md)
