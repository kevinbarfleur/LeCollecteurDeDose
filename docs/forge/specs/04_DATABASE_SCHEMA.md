# Schéma de Base de Données - Spécification Technique

> **Document**: `specs/04_DATABASE_SCHEMA.md`
> **Version**: 1.0
> **Status**: Tables déjà créées (migration existante)

---

## 1. Principe d'Isolation

### 1.1 Règle Fondamentale

```
┌─────────────────────────────────────────────────────────────────────┐
│  LA FORGE NE MODIFIE JAMAIS LES TABLES EXISTANTES                   │
│                                                                     │
│  ✓ LECTURE autorisée: users, unique_cards                          │
│  ✓ CRÉATION autorisée: forge_* (nouvelles tables)                  │
│  ✗ MODIFICATION interdite: users, unique_cards, user_collections   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Tables Référencées (Lecture Seule)

```sql
-- TABLE: users (NE PAS MODIFIER)
-- Colonnes utilisées par la Forge:
SELECT id, twitch_username, display_name, avatar_url
FROM users
WHERE id = :user_id;

-- TABLE: unique_cards (NE PAS MODIFIER)
-- Colonnes utilisées par la Forge:
SELECT uid, id, name, item_class, rarity, tier, game_data
FROM unique_cards
WHERE uid = :card_uid;
```

---

## 2. Tables de la Forge

### 2.1 `forge_players` - État Principal

```sql
-- Migration: 20251218230000_create_forge_tables.sql (EXISTANTE)

CREATE TABLE IF NOT EXISTS forge_players (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Niveau et XP
  atelier_level INTEGER DEFAULT 1 NOT NULL
    CHECK (atelier_level >= 1 AND atelier_level <= 100),
  atelier_xp BIGINT DEFAULT 0 NOT NULL
    CHECK (atelier_xp >= 0),

  -- Ressources de base (Tier 2)
  fragments BIGINT DEFAULT 0 NOT NULL CHECK (fragments >= 0),
  transmute_shards BIGINT DEFAULT 0 NOT NULL CHECK (transmute_shards >= 0),
  alteration_shards BIGINT DEFAULT 0 NOT NULL CHECK (alteration_shards >= 0),
  augment_shards BIGINT DEFAULT 0 NOT NULL CHECK (augment_shards >= 0),

  -- Orbes (Tier 3)
  chaos_orbs BIGINT DEFAULT 0 NOT NULL CHECK (chaos_orbs >= 0),
  exalted_shards BIGINT DEFAULT 0 NOT NULL CHECK (exalted_shards >= 0),
  divine_shards BIGINT DEFAULT 0 NOT NULL CHECK (divine_shards >= 0),
  vaal_orbs BIGINT DEFAULT 0 NOT NULL CHECK (vaal_orbs >= 0),
  mirror_shards BIGINT DEFAULT 0 NOT NULL CHECK (mirror_shards >= 0),

  -- Production passive
  fragments_per_hour NUMERIC(10,2) DEFAULT 10.0 NOT NULL,
  last_collection_at TIMESTAMPTZ DEFAULT NOW(),
  max_storage_hours INTEGER DEFAULT 24 NOT NULL,

  -- Actions quotidiennes
  actions_today INTEGER DEFAULT 0 NOT NULL,
  max_actions_per_day INTEGER DEFAULT 10 NOT NULL,
  last_action_reset DATE DEFAULT CURRENT_DATE,

  -- Prestige
  prestige_level INTEGER DEFAULT 0 NOT NULL,
  total_fragments_earned BIGINT DEFAULT 0 NOT NULL,
  total_chaos_earned BIGINT DEFAULT 0 NOT NULL,

  -- Effets actifs (JSONB)
  active_effects JSONB DEFAULT '{}'::jsonb,
  -- Format: {
  --   "boost": { "expires_at": "ISO_DATE", "multiplier": 1.5, "source": "corruption" },
  --   "curse": { "expires_at": "ISO_DATE", "multiplier": 0.75, "source": "corruption" },
  --   "amplify": { "remaining_smelts": 5, "multiplier": 2.0 }
  -- }

  -- Statistiques de corruption
  cards_smelted INTEGER DEFAULT 0 NOT NULL,
  corruptions_total INTEGER DEFAULT 0 NOT NULL,
  corruptions_nothing INTEGER DEFAULT 0 NOT NULL,
  corruptions_boost INTEGER DEFAULT 0 NOT NULL,
  corruptions_jackpot INTEGER DEFAULT 0 NOT NULL,
  corruptions_curse INTEGER DEFAULT 0 NOT NULL,
  corruptions_cataclysm INTEGER DEFAULT 0 NOT NULL,
  corruptions_miracle INTEGER DEFAULT 0 NOT NULL,
  consecutive_nothing INTEGER DEFAULT 0 NOT NULL,  -- Pity counter
  consecutive_bad INTEGER DEFAULT 0 NOT NULL,       -- Anti-frustration

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  UNIQUE(user_id)
);

-- Index
CREATE INDEX idx_forge_players_user_id ON forge_players(user_id);
CREATE INDEX idx_forge_players_level ON forge_players(atelier_level DESC);
CREATE INDEX idx_forge_players_prestige ON forge_players(prestige_level DESC, atelier_level DESC);
```

### 2.2 `forge_cards` - Cartes du Joueur

```sql
-- Les cartes de la Forge sont SÉPARÉES de user_collections
-- Elles référencent unique_cards pour les métadonnées

CREATE TABLE IF NOT EXISTS forge_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES forge_players(id) ON DELETE CASCADE,

  -- Référence à la carte (LECTURE SEULE sur unique_cards)
  card_uid INTEGER NOT NULL REFERENCES unique_cards(uid),

  -- Propriétés de la carte dans la Forge
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity >= 0),
  quality TEXT DEFAULT 'normal'
    CHECK (quality IN ('normal', 'superior', 'masterwork')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Une seule entrée par combinaison joueur/carte/qualité
  UNIQUE(player_id, card_uid, quality)
);

CREATE INDEX idx_forge_cards_player ON forge_cards(player_id);
CREATE INDEX idx_forge_cards_card_uid ON forge_cards(card_uid);
```

### 2.3 `forge_unlocks` - Cartes Débloquées

```sql
-- Suivi des cartes que le joueur peut obtenir dans la Forge

CREATE TABLE IF NOT EXISTS forge_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES forge_players(id) ON DELETE CASCADE,

  -- Carte débloquée
  card_uid INTEGER NOT NULL REFERENCES unique_cards(uid),

  -- Méthode de déblocage
  unlock_method TEXT NOT NULL
    CHECK (unlock_method IN (
      'starter',       -- Kit de départ
      'level_up',      -- Déblocage par niveau
      'discovery',     -- Découverte aléatoire
      'chaos_reroll',  -- Obtenue via Chaos Reroll
      'prestige_reward', -- Récompense de prestige
      'recipe'         -- Créée via recette
    )),

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, card_uid)
);

CREATE INDEX idx_forge_unlocks_player ON forge_unlocks(player_id);
```

### 2.4 `forge_recipes` - Recettes Découvertes

```sql
-- Progression des recettes par joueur

CREATE TABLE IF NOT EXISTS forge_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES forge_players(id) ON DELETE CASCADE,

  recipe_id INTEGER NOT NULL CHECK (recipe_id >= 0 AND recipe_id <= 20),

  -- État de découverte
  hint_revealed BOOLEAN DEFAULT FALSE,
  discovered BOOLEAN DEFAULT FALSE,

  -- Timestamps
  discovered_at TIMESTAMPTZ,
  hint_revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, recipe_id)
);

CREATE INDEX idx_forge_recipes_player ON forge_recipes(player_id);
```

### 2.5 `forge_recipe_definitions` - Définitions Statiques

```sql
-- Table de référence pour les recettes (données statiques)

CREATE TABLE IF NOT EXISTS forge_recipe_definitions (
  recipe_id INTEGER PRIMARY KEY,

  name TEXT NOT NULL,
  hint TEXT NOT NULL,          -- Indice cryptique
  description TEXT NOT NULL,   -- Description complète

  -- Ingrédients (JSONB)
  ingredients JSONB NOT NULL,
  -- Exemples:
  -- { "type": "shards", "transmute": 20 }
  -- { "type": "cards_same_class", "tier": "T3", "count": 3 }
  -- { "type": "mixed", "chaos": 3, "alteration": 10 }

  -- Résultat (JSONB)
  result JSONB NOT NULL,
  -- Exemples:
  -- { "type": "orb", "chaos": 1 }
  -- { "type": "card_upgrade", "to_tier": "T2" }
  -- { "type": "shards", "divine": 1 }

  unlock_level INTEGER DEFAULT 1 NOT NULL,
  is_base_recipe BOOLEAN DEFAULT FALSE
);

-- Données: voir migration 20251218230000_create_forge_tables.sql
```

### 2.6 `forge_activity_logs` - Historique

```sql
-- Log des actions pour analytics et débogage

CREATE TABLE IF NOT EXISTS forge_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES forge_players(id) ON DELETE CASCADE,

  -- Type d'action
  action_type TEXT NOT NULL,
  -- Types: 'smelt', 'craft', 'discover', 'corrupt', 'prestige',
  --        'collect', 'experiment', 'chaos_reroll', 'chaos_gamble',
  --        'divine_bless', 'divine_exalt', 'xp_gain', 'level_up'

  -- Données spécifiques à l'action (JSONB)
  action_data JSONB DEFAULT '{}'::jsonb,

  -- Deltas de ressources
  fragments_delta BIGINT DEFAULT 0,
  transmute_delta BIGINT DEFAULT 0,
  alteration_delta BIGINT DEFAULT 0,
  augment_delta BIGINT DEFAULT 0,
  chaos_delta BIGINT DEFAULT 0,
  exalted_delta BIGINT DEFAULT 0,
  divine_delta BIGINT DEFAULT 0,
  vaal_delta BIGINT DEFAULT 0,

  xp_earned INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forge_activity_player ON forge_activity_logs(player_id);
CREATE INDEX idx_forge_activity_created ON forge_activity_logs(created_at DESC);
CREATE INDEX idx_forge_activity_type ON forge_activity_logs(action_type);
```

---

## 3. Colonnes à Ajouter (Nouvelles Migrations)

### 3.1 Champs de Progression (À créer)

```sql
-- Migration: 20251219_add_forge_progression_fields.sql

ALTER TABLE forge_players ADD COLUMN IF NOT EXISTS
  has_ignited_forge BOOLEAN DEFAULT FALSE;

ALTER TABLE forge_players ADD COLUMN IF NOT EXISTS
  completed_tutorials TEXT[] DEFAULT '{}';
-- Format: ['furnace_intro', 'first_smelt', 'crafting_intro', ...]

ALTER TABLE forge_players ADD COLUMN IF NOT EXISTS
  current_phase TEXT DEFAULT 'dormant';

ALTER TABLE forge_players ADD COLUMN IF NOT EXISTS
  heat_level INTEGER DEFAULT 0 CHECK (heat_level >= 0 AND heat_level <= 100);

ALTER TABLE forge_players ADD COLUMN IF NOT EXISTS
  last_heat_update TIMESTAMPTZ DEFAULT NOW();
```

### 3.2 Champs de Challenges (À créer)

```sql
-- Migration: 20251219_add_forge_challenges.sql

CREATE TABLE IF NOT EXISTS forge_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  objectives JSONB NOT NULL,
  -- Format: [
  --   { "id": "use_chaos", "description": "Utiliser 20 Chaos", "target": 20 },
  --   { "id": "gamble_success", "description": "Réussir 10 gambles", "target": 10 }
  -- ]
  rewards JSONB NOT NULL,
  -- Format: [
  --   { "tier": 1, "resource": "chaos_orbs", "amount": 5 },
  --   { "tier": 2, "resource": "vaal_orbs", "amount": 1 }
  -- ]
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS forge_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES forge_players(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES forge_challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  -- Format: { "use_chaos": 15, "gamble_success": 7 }
  claimed_rewards INTEGER[] DEFAULT '{}',
  -- Format: [1, 2] = tier 1 et 2 réclamés
  completed_at TIMESTAMPTZ,

  UNIQUE(player_id, challenge_id)
);
```

---

## 4. RLS Policies

### 4.1 Policies Existantes

```sql
-- Toutes les tables forge_* utilisent le service_role pour l'accès

-- Service role a accès complet
CREATE POLICY "Service role full access forge_players"
  ON forge_players FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access forge_cards"
  ON forge_cards FOR ALL USING (auth.role() = 'service_role');

-- ... idem pour les autres tables

-- Lecture publique des définitions de recettes
CREATE POLICY "Public read forge_recipe_definitions"
  ON forge_recipe_definitions FOR SELECT USING (true);
```

---

## 5. Fonctions SQL

### 5.1 Fonctions Existantes

Les fonctions suivantes existent dans:
- `20251218231000_create_forge_functions.sql`
- `20251218232000_create_forge_additional_functions.sql`

```sql
-- Initialisation
forge_init_player(p_user_id UUID, p_login TEXT) → forge_players

-- Fonte
forge_smelt_card(p_player_id UUID, p_card_uid INTEGER, p_quantity INTEGER) → JSONB

-- Collecte
forge_collect_fragments(p_player_id UUID) → JSONB

-- Crafting
forge_craft_recipe(p_player_id UUID, p_recipe_id INTEGER) → JSONB

-- Chaos
forge_chaos_reroll(p_player_id UUID, p_card_uid INTEGER) → JSONB
forge_chaos_gamble(p_player_id UUID, p_card_uid INTEGER) → JSONB
forge_chaos_discovery(p_player_id UUID) → JSONB

-- Corruption
forge_corrupt(p_player_id UUID) → JSONB

-- Divine
forge_divine_bless(p_player_id UUID, p_card_uid INTEGER) → JSONB
forge_divine_exalt(p_player_id UUID, p_card_uid INTEGER) → JSONB

-- Prestige
forge_prestige(p_player_id UUID) → JSONB

-- Leaderboard
forge_get_leaderboard(p_limit INTEGER) → TABLE(...)
```

### 5.2 Fonctions à Ajouter

```sql
-- Migration: 20251219_add_forge_helper_functions.sql

-- Calcul de l'XP requis pour un niveau
CREATE OR REPLACE FUNCTION forge_xp_required(p_level INTEGER)
RETURNS BIGINT AS $$
BEGIN
  RETURN FLOOR(100 * POWER(p_level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Vérification si le joueur peut prestige
CREATE OR REPLACE FUNCTION forge_can_prestige(p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_player forge_players%ROWTYPE;
  v_recipe_count INTEGER;
  v_t0_count INTEGER;
BEGIN
  SELECT * INTO v_player FROM forge_players WHERE id = p_player_id;

  IF v_player.atelier_level < 26 THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_recipe_count
  FROM forge_recipes
  WHERE player_id = p_player_id AND discovered = TRUE;

  IF v_recipe_count < 15 THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(SUM(fc.quantity), 0) INTO v_t0_count
  FROM forge_cards fc
  JOIN unique_cards uc ON uc.uid = fc.card_uid
  WHERE fc.player_id = p_player_id AND uc.tier = 'T0';

  RETURN v_t0_count >= 1;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Requêtes Fréquentes

### 6.1 Lecture État Complet

```sql
-- Récupérer l'état complet d'un joueur pour le frontend

SELECT
  fp.*,
  u.twitch_username,
  u.display_name,
  u.avatar_url,
  (
    SELECT COALESCE(json_agg(json_build_object(
      'card_uid', fc.card_uid,
      'quantity', fc.quantity,
      'quality', fc.quality,
      'card', json_build_object(
        'name', uc.name,
        'tier', uc.tier,
        'item_class', uc.item_class,
        'rarity', uc.rarity,
        'game_data', uc.game_data
      )
    )), '[]'::json)
    FROM forge_cards fc
    JOIN unique_cards uc ON uc.uid = fc.card_uid
    WHERE fc.player_id = fp.id AND fc.quantity > 0
  ) AS cards,
  (
    SELECT COALESCE(json_agg(json_build_object(
      'recipe_id', fr.recipe_id,
      'discovered', fr.discovered,
      'hint_revealed', fr.hint_revealed
    )), '[]'::json)
    FROM forge_recipes fr
    WHERE fr.player_id = fp.id
  ) AS recipes
FROM forge_players fp
JOIN users u ON u.id = fp.user_id
WHERE fp.user_id = :user_id;
```

### 6.2 Leaderboard

```sql
-- Top joueurs par score

SELECT
  fp.id,
  u.twitch_username,
  u.display_name,
  u.avatar_url,
  fp.atelier_level,
  fp.prestige_level,
  fp.cards_smelted,
  fp.corruptions_miracle,
  (
    fp.atelier_level * 100 +
    fp.prestige_level * 5000 +
    fp.cards_smelted * 2 +
    fp.corruptions_miracle * 1000
  ) AS score
FROM forge_players fp
JOIN users u ON u.id = fp.user_id
ORDER BY score DESC
LIMIT 50;
```

---

## 7. Diagramme ERD

```
┌─────────────────┐     ┌─────────────────┐
│     users       │     │  unique_cards   │
│ (LECTURE SEULE) │     │ (LECTURE SEULE) │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ uid (PK)        │
│ twitch_username │     │ id              │
│ display_name    │     │ name            │
│ avatar_url      │     │ tier            │
└────────┬────────┘     │ item_class      │
         │              │ rarity          │
         │              │ game_data       │
         │              └────────┬────────┘
         │                       │
         │ user_id               │ card_uid
         ▼                       │
┌─────────────────┐              │
│  forge_players  │◄─────────────┤
├─────────────────┤              │
│ id (PK)         │              │
│ user_id (FK)    │──────────────│
│ atelier_level   │              │
│ atelier_xp      │              │
│ fragments       │              │
│ transmute_shards│              │
│ ...             │              │
│ prestige_level  │              │
│ active_effects  │              │
└────────┬────────┘              │
         │                       │
         │ player_id             │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  forge_cards    │     │ forge_unlocks   │
├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │
│ player_id (FK)  │     │ player_id (FK)  │
│ card_uid (FK)───┼─────│ card_uid (FK)   │
│ quantity        │     │ unlock_method   │
│ quality         │     │ unlocked_at     │
└─────────────────┘     └─────────────────┘
         │
         │ player_id
         ▼
┌─────────────────┐     ┌─────────────────────┐
│ forge_recipes   │     │forge_recipe_definitions│
├─────────────────┤     ├─────────────────────┤
│ id (PK)         │     │ recipe_id (PK)      │
│ player_id (FK)  │     │ name                │
│ recipe_id ──────┼────▶│ hint                │
│ discovered      │     │ description         │
│ hint_revealed   │     │ ingredients (JSONB) │
└─────────────────┘     │ result (JSONB)      │
         │              │ unlock_level        │
         │              │ is_base_recipe      │
         │              └─────────────────────┘
         │ player_id
         ▼
┌─────────────────────┐
│ forge_activity_logs │
├─────────────────────┤
│ id (PK)             │
│ player_id (FK)      │
│ action_type         │
│ action_data (JSONB) │
│ *_delta             │
│ xp_earned           │
│ created_at          │
└─────────────────────┘
```

---

## 8. Références

- **Migrations Existantes**:
  - `20251218230000_create_forge_tables.sql`
  - `20251218231000_create_forge_functions.sql`
  - `20251218232000_create_forge_additional_functions.sql`
- **Document Parent**: [01_MASTER_DESIGN_DOCUMENT.md](../01_MASTER_DESIGN_DOCUMENT.md)
