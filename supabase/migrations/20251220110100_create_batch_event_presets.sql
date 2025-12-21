-- Migration: Create batch_event_presets table for customizable batch events
-- This moves all hardcoded batch event presets to the database

-- ============================================================================
-- TABLE: batch_event_presets
-- ============================================================================

CREATE TABLE IF NOT EXISTS batch_event_presets (
  id TEXT PRIMARY KEY,                    -- Unique preset ID (e.g., 'bow_meta')
  category TEXT NOT NULL,                 -- 'buff', 'nerf', 'special', 'league', 'meme'
  display_name TEXT NOT NULL,             -- Human-readable name
  emoji TEXT NOT NULL DEFAULT '',         -- Emoji for UI display
  description TEXT,                       -- Admin description
  announcement TEXT NOT NULL,             -- Message at start of event (supports {version})
  completion_message TEXT NOT NULL,       -- Message at end (supports {count}, {version})
  delay_between_events_ms INTEGER NOT NULL DEFAULT 2500,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of action objects
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE batch_event_presets IS 'Customizable batch event presets (patch notes style events)';
COMMENT ON COLUMN batch_event_presets.actions IS 'JSON array of action objects: [{type, itemClasses, targetTiers, messages}]';
COMMENT ON COLUMN batch_event_presets.category IS 'Event category: buff, nerf, special, league, meme';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batch_event_presets_category ON batch_event_presets(category);
CREATE INDEX IF NOT EXISTS idx_batch_event_presets_enabled ON batch_event_presets(is_enabled);
CREATE INDEX IF NOT EXISTS idx_batch_event_presets_sort ON batch_event_presets(category, sort_order);

-- ============================================================================
-- TABLE: batch_event_categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS batch_event_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Insert default categories
INSERT INTO batch_event_categories (id, label, emoji, sort_order) VALUES
  ('buff', 'Buffs GGG', '✨', 1),
  ('nerf', 'Nerfs Classiques', '💀', 2),
  ('special', 'Events Spéciaux', '🎲', 3),
  ('league', 'League Events', '🎮', 4),
  ('meme', 'Memes POE', '🎭', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get a preset by ID
CREATE OR REPLACE FUNCTION get_batch_event_preset(p_id TEXT)
RETURNS TABLE(
  id TEXT,
  category TEXT,
  display_name TEXT,
  emoji TEXT,
  description TEXT,
  announcement TEXT,
  completion_message TEXT,
  delay_between_events_ms INTEGER,
  actions JSONB,
  is_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bep.id,
    bep.category,
    bep.display_name,
    bep.emoji,
    bep.description,
    bep.announcement,
    bep.completion_message,
    bep.delay_between_events_ms,
    bep.actions,
    bep.is_enabled
  FROM batch_event_presets bep
  WHERE bep.id = p_id;
END;
$$;

-- Get all presets grouped by category
CREATE OR REPLACE FUNCTION get_all_batch_event_presets()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bep.id,
      'category', bep.category,
      'display_name', bep.display_name,
      'emoji', bep.emoji,
      'description', bep.description,
      'announcement', bep.announcement,
      'completion_message', bep.completion_message,
      'delay_between_events_ms', bep.delay_between_events_ms,
      'actions', bep.actions,
      'is_enabled', bep.is_enabled,
      'sort_order', bep.sort_order
    ) ORDER BY bep.category, bep.sort_order
  ) INTO v_result
  FROM batch_event_presets bep;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Upsert a preset
CREATE OR REPLACE FUNCTION upsert_batch_event_preset(
  p_id TEXT,
  p_category TEXT,
  p_display_name TEXT,
  p_emoji TEXT,
  p_description TEXT,
  p_announcement TEXT,
  p_completion_message TEXT,
  p_delay_between_events_ms INTEGER,
  p_actions JSONB,
  p_is_enabled BOOLEAN DEFAULT true,
  p_sort_order INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO batch_event_presets (
    id, category, display_name, emoji, description,
    announcement, completion_message, delay_between_events_ms,
    actions, is_enabled, sort_order, updated_at
  )
  VALUES (
    p_id, p_category, p_display_name, p_emoji, p_description,
    p_announcement, p_completion_message, p_delay_between_events_ms,
    p_actions, p_is_enabled, p_sort_order, NOW()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    category = EXCLUDED.category,
    display_name = EXCLUDED.display_name,
    emoji = EXCLUDED.emoji,
    description = EXCLUDED.description,
    announcement = EXCLUDED.announcement,
    completion_message = EXCLUDED.completion_message,
    delay_between_events_ms = EXCLUDED.delay_between_events_ms,
    actions = EXCLUDED.actions,
    is_enabled = EXCLUDED.is_enabled,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Delete a preset
CREATE OR REPLACE FUNCTION delete_batch_event_preset(p_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM batch_event_presets WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- ============================================================================
-- DEFAULT DATA: BATCH EVENT PRESETS
-- ============================================================================

-- BUFFS Category
INSERT INTO batch_event_presets (id, category, display_name, emoji, description, announcement, completion_message, delay_between_events_ms, actions, sort_order) VALUES
(
  'bow_meta',
  'buff',
  'Bow Meta',
  '🏹',
  'Cadeau habituel pour les bowcucks - arc meta encore cette league',
  '🏹 BREAKING NEWS: GGG confirme que les arcs sont ''underperforming''... Buff incoming pour les bowcucks !',
  '🏹 Bow Meta activé ! {count} joueurs ont reçu le cadeau habituel. "This is a buff."',
  2500,
  '[{"type": "buff_bow", "itemClasses": ["Bow", "Quiver"], "messages": {"success": ["🏹 @{username} reçoit le cadeau habituel pour les bowcucks ! {card} devient ✨ FOIL !", "🎯 GGG buff encore les arcs ! @{username} voit {card} devenir FOIL ✨"], "noCards": ["🙏 @{username} Ce joueur est encore sauvable, il ne joue pas arc !"]}}]'::jsonb,
  1
),
(
  'caster_supremacy',
  'buff',
  'Caster Supremacy',
  '🔮',
  'Les casters dominent le meta - wands et sceptres buffés',
  '🔮 Les arcanes s''éveillent ! GGG buff les builds caster... "We felt casters were underperforming."',
  '🔮 Caster Supremacy confirmée ! {count} joueurs ont vu leurs wands briller. Nerf incoming dans 3... 2...',
  2500,
  '[{"type": "buff_caster", "itemClasses": ["Wand", "Sceptre", "Staff"], "messages": {"success": ["🔮 @{username} voit {card} briller d''une lueur arcane ! ✨ FOIL !"], "noCards": ["🔮 @{username} ne possède pas de wand... un vrai melee enjoyer ?"]}}]'::jsonb,
  2
),
(
  'divine_blessing',
  'buff',
  'Divine Blessing',
  '✨',
  'Les dieux de Wraeclast bénissent tous les exilés - buff all',
  '✨ Les dieux de Wraeclast sourient aux exilés ! Une bénédiction divine descend sur le royaume...',
  '✨ Bénédiction Divine accordée à {count} exilés ! Que la lumière guide vos builds.',
  3000,
  '[{"type": "buff_all", "itemClasses": [], "messages": {"success": ["✨ Les dieux bénissent @{username} ! {card} → FOIL !"], "noCards": ["✨ @{username} n''a pas de carte normale à bénir..."]}}]'::jsonb,
  3
);

-- NERFS Category
INSERT INTO batch_event_presets (id, category, display_name, emoji, description, announcement, completion_message, delay_between_events_ms, actions, sort_order) VALUES
(
  'melee_funeral',
  'nerf',
  'Melee Funeral',
  '⚔️',
  'Le nerf melee traditionnel - RIP Strike skills',
  '⚔️ "Melee is in a good place" - Chris Wilson, avant de nerf melee pour la 47ème fois...',
  '⚔️ Melee Funeral terminé. {count} joueurs ont perdu leurs armes. F in chat. "This is a buff."',
  2500,
  '[{"type": "nerf_melee", "itemClasses": ["Sword", "Axe", "Mace", "Claw", "Dagger"], "targetTiers": ["T2", "T3"], "messages": {"success": ["⚔️ NERF MELEE ! @{username} perd {card} - \"Melee is fine\" - GGG"], "noCards": ["🛡️ @{username} échappe au nerf melee (pas d''armes de corps à corps)"]}}]'::jsonb,
  1
),
(
  'harvest_nerf',
  'nerf',
  'Harvest Nerf',
  '🌿',
  '"We felt Harvest was too deterministic" - remove foils',
  '🌿 "Harvest was too deterministic and made other content feel bad." - Les foils perdent leur éclat...',
  '🌿 Harvest nerfé. {count} items ont perdu leur foil. "We''re monitoring the situation."',
  2500,
  '[{"type": "remove_foil", "itemClasses": ["Ring", "Amulet", "Belt", "Body Armour", "Helmet", "Gloves", "Boots"], "messages": {"success": ["🌿 Le foil de {card} de @{username} a été jugé trop déterministe..."], "noCards": ["🌿 @{username} n''avait pas de foil à nerf... déjà poor !"]}}]'::jsonb,
  2
),
(
  'aura_stacker_rip',
  'nerf',
  'Aura Stacker RIP',
  '🔊',
  'Nerf aura stacker - remove foil des bijoux',
  '🔊 ALERTE NERF: Les Aura Stackers ont été détectés... GGG active le protocole d''extermination !',
  '🔊 Aura Stacker purge terminée. {count} joueurs ont été rééquilibrés. "Auras were too powerful."',
  2000,
  '[{"type": "remove_foil", "itemClasses": ["Ring", "Amulet", "Belt"], "messages": {"success": ["🔊 NERF AURA ! Le foil de {card} de @{username} est supprimé !"], "noCards": ["🔊 @{username} n''a pas de bijoux foil... pas un aura stacker !"]}}, {"type": "nerf_jewelry", "itemClasses": ["Ring", "Amulet", "Belt"], "targetTiers": ["T3"], "messages": {"success": ["💍 @{username} perd {card} ! Les bijoux sont ciblés !"], "noCards": ["💍 @{username} n''a pas de bijoux à détruire..."]}}]'::jsonb,
  3
);

-- SPECIAL Category
INSERT INTO batch_event_presets (id, category, display_name, emoji, description, announcement, completion_message, delay_between_events_ms, actions, sort_order) VALUES
(
  'vaal_roulette',
  'special',
  'Vaal Roulette',
  '🎰',
  'Corruption Vaal - 50% brick, 50% upgrade en foil',
  '🎰 Atziri ouvre les portes du Temple ! Corruption obligatoire pour tous les exilés... Vaal or no balls !',
  '🎰 Vaal Roulette terminée ! {count} exilés ont tenté leur chance. Certains pleurent, d''autres brillent ✨',
  3000,
  '[{"type": "vaal_roulette", "itemClasses": [], "messages": {"brick": ["🎰 BRICK ! @{username} corrompt {card}... POOF ! Disparue !"], "upgrade": ["🎰 JACKPOT ! @{username} corrompt {card} → FOIL ✨"], "noCards": ["🎰 @{username} n''a rien à corrompre... collection vide !"]}}]'::jsonb,
  1
),
(
  'mirror_event',
  'special',
  'Mirror of Kalandra',
  '💎',
  'Event ultra rare - duplication de cartes pour tous',
  '💎 ALERTE MIRROR ! Un Mirror of Kalandra a été trouvé dans Wraeclast... Tout le monde en profite !',
  '💎 Mirror Event terminé ! {count} exilés ont dupliqué leurs cartes. "Still sane, exile?"',
  3000,
  '[{"type": "duplicate_card", "itemClasses": [], "messages": {"success": ["💎 MIRROR ! @{username} duplique {card} !"], "noCards": ["💎 @{username} n''a rien à mirror... collection vide !"]}}]'::jsonb,
  2
),
(
  'heist_gone_wrong',
  'special',
  'Heist Gone Wrong',
  '💰',
  'Le Heist a mal tourné - vol de cartes entre joueurs',
  '💰 ALERTE HEIST ! Les Rogues de Tibbs ont infiltré le chat... Vos cartes ne sont plus en sécurité !',
  '💰 Heist terminé ! {count} transferts de cartes effectués. "Nothing personal, exile."',
  3500,
  '[{"type": "steal_card", "itemClasses": [], "messages": {"success": ["💰 HEIST ! @{targetUsername} vole {card} à @{username} !"], "noCards": ["💰 @{username} n''avait rien à voler... broke exile !"]}}]'::jsonb,
  3
),
(
  'steelmage_rip',
  'special',
  'Steelmage RIP',
  '☠️',
  'Hommage à Steelmage - destruction aléatoire de cartes HC style',
  '☠️ "NOOOOO!" - Un Steelmage RIP moment se produit. Vos meilleurs items sont en danger !',
  '☠️ RIP. {count} exilés ont perdu leur meilleur loot. "At least I went down fighting." - Steelmage',
  3000,
  '[{"type": "destroy_random", "itemClasses": [], "targetTiers": ["T0", "T1", "T2"], "messages": {"success": ["☠️ \"NOOOO!\" @{username} perd {card} ({tier}) en HC ! RIP"], "noCards": ["☠️ @{username} n''avait rien à perdre. Déjà mort inside."]}}]'::jsonb,
  4
);

-- LEAGUE Category
INSERT INTO batch_event_presets (id, category, display_name, emoji, description, announcement, completion_message, delay_between_events_ms, actions, sort_order) VALUES
(
  'league_start',
  'league',
  'League Start',
  '🎮',
  'Début de league - tout le monde reçoit des cartes gratuites',
  '🎮 NOUVELLE LEAGUE ! Les serveurs sont stables (pour une fois). GGG distribue des cadeaux de bienvenue !',
  '🎮 League Start réussi ! {count} exilés ont reçu leur starter pack. Queue time: 0 minutes (menteur).',
  3000,
  '[{"type": "give_random_card", "itemClasses": [], "messages": {"success": ["🎮 @{username} reçoit {card} ({tier}) pour le league start !"]}}, {"type": "give_random_card", "itemClasses": [], "messages": {"success": ["🎮 Bienvenue exile ! @{username} reçoit {card} ({tier})"]}}]'::jsonb,
  1
),
(
  'league_end_fire_sale',
  'league',
  'Fire Sale',
  '🔥',
  'Fin de league - chaos total, nerfs et buffs aléatoires',
  '🔥 FIN DE LEAGUE ! Plus rien n''a d''importance. GGG active le mode chaos total !',
  '🔥 Fire Sale terminée ! {count} joueurs ont vécu le chaos. See you next league!',
  2500,
  '[{"type": "random_chaos", "itemClasses": [], "messages": {"buff": ["🔥 CHAOS ! @{username} gagne ! {card} → FOIL ✨"], "nerf": ["🔥 CHAOS ! @{username} perd {card} ! C''est la fin de league !"], "nothing": ["🔥 @{username} survit au chaos de fin de league !"]}}]'::jsonb,
  2
),
(
  'flashback_event',
  'league',
  'Flashback Event',
  '⚡',
  'Flashback - tous les mods de league en même temps',
  '⚡ FLASHBACK EVENT ! Tous les mods de league sont actifs. C''est le chaos, mais le bon chaos !',
  '⚡ Flashback terminé ! {count} exilés ont survécu au chaos. RIP les serveurs.',
  3000,
  '[{"type": "buff_all", "itemClasses": [], "messages": {"success": ["⚡ FLASHBACK ! {card} de @{username} → FOIL ✨"], "noCards": ["⚡ @{username} survit au flashback... pour l''instant !"]}}, {"type": "give_random_card", "itemClasses": [], "messages": {"success": ["⚡ @{username} trouve {card} ({tier}) dans le chaos du Flashback !"]}}]'::jsonb,
  3
);

-- MEME Category
INSERT INTO batch_event_presets (id, category, display_name, emoji, description, announcement, completion_message, delay_between_events_ms, actions, sort_order) VALUES
(
  'path_of_math_drama',
  'meme',
  'Path of Math Drama',
  '🎭',
  'Drama communautaire - redistribution chaotique des richesses',
  '🎭 DRAMA ALERT ! Un influenceur a été banni... Les répercussions se font sentir dans tout Wraeclast !',
  '🎭 Drama terminé. {count} joueurs ont été affectés. "I didn''t do anything wrong!" - Personne jamais',
  3000,
  '[{"type": "steal_card", "itemClasses": [], "messages": {"steal": ["🎭 DRAMA ! @{targetUsername} \"emprunte\" {card} à @{username} !"], "noCards": ["🎭 @{username} est trop pauvre pour le drama..."]}}, {"type": "remove_foil", "itemClasses": ["Ring", "Amulet", "Belt"], "messages": {"success": ["🎭 Le drama continue ! {card} de @{username} perd son foil"], "noCards": ["🎭 Le drama évite @{username} - rien à prendre"]}}]'::jsonb,
  1
),
(
  'patch_notes',
  'meme',
  'Patch Notes',
  '📜',
  'Le classique GGG - Buff bows, nerf melee',
  '📜 Les devs se sont réveillés, ils ont trouvé que certains builds étaient trop forts... Patch Notes {version} incoming !',
  '✅ Patch Notes {version} appliqué à {count} joueurs ! Melee is fine.',
  2500,
  '[{"type": "buff_bow", "itemClasses": ["Bow", "Quiver"], "messages": {"success": ["🏹 Patch Notes: {card} de @{username} → FOIL ✨"], "noCards": ["🏹 @{username} ne joue pas arc, épargné par le buff"]}}, {"type": "nerf_melee", "itemClasses": ["Sword", "Axe", "Mace", "Claw", "Dagger"], "targetTiers": ["T2", "T3"], "messages": {"success": ["⚔️ Patch Notes: @{username} perd {card} - \"This is a buff\""], "noCards": ["⚔️ @{username} ne joue pas melee, épargné par le nerf"]}}]'::jsonb,
  2
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE batch_event_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_event_categories ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on batch_event_presets"
  ON batch_event_presets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on batch_event_categories"
  ON batch_event_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "Authenticated users can read batch_event_presets"
  ON batch_event_presets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read batch_event_categories"
  ON batch_event_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TRIGGER for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_batch_event_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_event_presets_updated_at
  BEFORE UPDATE ON batch_event_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_event_presets_updated_at();
