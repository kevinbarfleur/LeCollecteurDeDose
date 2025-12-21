-- Migration: Create bot_messages table for customizable bot messages
-- This moves all hardcoded trigger/command/event messages to the database

-- ============================================================================
-- TABLE: bot_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_messages (
  id TEXT PRIMARY KEY,                -- Format: '{category}_{item}_{type}' (e.g., 'trigger_blessing_success')
  category TEXT NOT NULL,             -- 'trigger', 'command', 'event'
  item_key TEXT NOT NULL,             -- Trigger/command/event ID (e.g., 'blessingRNGesus', 'booster', 'bow_meta')
  message_type TEXT NOT NULL,         -- 'success', 'failure', 'failureNoTarget', 'failureNoCards', 'response', 'announcement', 'completion'
  messages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],  -- Array of message variants (random pick at runtime)
  description TEXT,                   -- Human-readable description for admin
  variables TEXT[],                   -- Available placeholders (e.g., ARRAY['{username}', '{card}'])
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE bot_messages IS 'Customizable messages for bot triggers, commands, and events. Supports multiple variants per message type.';
COMMENT ON COLUMN bot_messages.id IS 'Unique identifier: {category}_{item}_{type}';
COMMENT ON COLUMN bot_messages.messages IS 'Array of message variants - one is picked randomly at runtime';
COMMENT ON COLUMN bot_messages.variables IS 'Available placeholders that can be used in messages';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_messages_category ON bot_messages(category);
CREATE INDEX IF NOT EXISTS idx_bot_messages_item_key ON bot_messages(item_key);
CREATE INDEX IF NOT EXISTS idx_bot_messages_lookup ON bot_messages(category, item_key, message_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get a random message from the array
CREATE OR REPLACE FUNCTION get_bot_message(p_category TEXT, p_item_key TEXT, p_message_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages TEXT[];
  v_idx INTEGER;
BEGIN
  SELECT messages INTO v_messages
  FROM bot_messages
  WHERE category = p_category
    AND item_key = p_item_key
    AND message_type = p_message_type;

  IF v_messages IS NULL OR array_length(v_messages, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  -- Pick random message from array
  v_idx := floor(random() * array_length(v_messages, 1)) + 1;
  RETURN v_messages[v_idx];
END;
$$;

-- Get all messages for a specific item (e.g., all messages for 'blessingRNGesus')
CREATE OR REPLACE FUNCTION get_bot_messages_for_item(p_category TEXT, p_item_key TEXT)
RETURNS TABLE(message_type TEXT, messages TEXT[], description TEXT, variables TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT bm.message_type, bm.messages, bm.description, bm.variables
  FROM bot_messages bm
  WHERE bm.category = p_category AND bm.item_key = p_item_key
  ORDER BY bm.message_type;
END;
$$;

-- Upsert a message
CREATE OR REPLACE FUNCTION upsert_bot_message(
  p_id TEXT,
  p_category TEXT,
  p_item_key TEXT,
  p_message_type TEXT,
  p_messages TEXT[],
  p_description TEXT DEFAULT NULL,
  p_variables TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables, updated_at)
  VALUES (p_id, p_category, p_item_key, p_message_type, p_messages, p_description, p_variables, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    messages = EXCLUDED.messages,
    description = COALESCE(EXCLUDED.description, bot_messages.description),
    variables = COALESCE(EXCLUDED.variables, bot_messages.variables),
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Get all messages as JSONB grouped by category and item
CREATE OR REPLACE FUNCTION get_all_bot_messages()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, category, item_key, message_type, messages, description, variables
    FROM bot_messages
    ORDER BY category, item_key, message_type
  LOOP
    v_result := v_result || jsonb_build_object(
      v_row.id,
      jsonb_build_object(
        'category', v_row.category,
        'item_key', v_row.item_key,
        'message_type', v_row.message_type,
        'messages', v_row.messages,
        'description', v_row.description,
        'variables', v_row.variables
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- DEFAULT DATA: TRIGGER MESSAGES
-- ============================================================================

-- Blessing of RNGesus (always success)
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_blessingRNGesus_success', 'trigger', 'blessingRNGesus', 'success',
  ARRAY[
    '✨ @{username} reçoit la bénédiction de RNGesus ! +1 Vaal Orb',
    '✨ RNGesus sourit à @{username} ! +1 Vaal Orb',
    '✨ Les dieux du RNG favorisent @{username} ! +1 Vaal Orb',
    '✨ @{username} a prié au bon autel ! +1 Vaal Orb',
    '✨ La chance sourit à @{username} ! +1 Vaal Orb béni'
  ],
  'Blessing of RNGesus - Donne +1 Vaal Orb (toujours succès)',
  ARRAY['{username}']
);

-- Cartographer's Gift
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_cartographersGift_success', 'trigger', 'cartographersGift', 'success',
  ARRAY[
    '🗺️ Le Cartographe offre {card} à @{username} !',
    '🗺️ @{username} trouve {card} sur une map oubliée !',
    '🗺️ Une map révèle {card} pour @{username} !',
    '🗺️ Le Cartographe récompense @{username} avec {card} !',
    '🗺️ @{username} découvre {card} dans l''Atlas !'
  ],
  'Cartographer''s Gift - Donne une carte random non-foil',
  ARRAY['{username}', '{card}']
);

-- Mirror-tier Moment
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_mirrorTier_success', 'trigger', 'mirrorTier', 'success',
  ARRAY[
    '💎 MIRROR-TIER ! @{username} duplique {card} !',
    '💎 @{username} trouve un Mirror ! {card} est dupliquée !',
    '💎 LÉGENDAIRE ! @{username} mirror {card} !',
    '💎 Le Mirror of Kalandra bénit @{username} ! +1 {card}',
    '💎 @{username} réalise l''impossible : mirror sur {card} !'
  ],
  'Mirror-tier Moment - Duplique une carte (succès)',
  ARRAY['{username}', '{card}']
),
('trigger_mirrorTier_failure', 'trigger', 'mirrorTier', 'failure',
  ARRAY[
    '💎 @{username} cherche un Mirror of Kalandra... mais sa collection est vide.',
    '💎 @{username} rêve d''un Mirror... mais n''a rien à dupliquer.',
    '💎 Le Mirror de @{username} ne reflète que le vide...',
    '💎 @{username} trouve un Mirror ! Mais... rien à copier.',
    '💎 "No items to mirror" - Le Mirror ignore @{username}'
  ],
  'Mirror-tier Moment - Échec (pas de cartes)',
  ARRAY['{username}']
);

-- Einhar Approved
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_einharApproved_success', 'trigger', 'einharApproved', 'success',
  ARRAY[
    '🦎 "A worthy capture!" Einhar transforme {card} de @{username} en FOIL ✨',
    '🦎 Einhar capture {card} de @{username} ! C''est maintenant FOIL ✨',
    '🦎 "Ha ha! You are captured!" - {card} devient FOIL ✨ pour @{username}',
    '🦎 La bête rouge bénit @{username} ! {card} est maintenant FOIL ✨',
    '🦎 Einhar approuve @{username} ! {card} brille maintenant ✨'
  ],
  'Einhar Approved - Transforme une carte en foil (succès)',
  ARRAY['{username}', '{card}']
),
('trigger_einharApproved_failure', 'trigger', 'einharApproved', 'failure',
  ARRAY[
    '🦎 Einhar regarde @{username}... "You have nothing worth capturing, exile!"',
    '🦎 "Hm, no beasts here..." Einhar ignore @{username}',
    '🦎 Einhar cherche une proie chez @{username}... mais ne trouve que du vide.',
    '🦎 "Still sane, exile?" Einhar s''en va sans rien capturer de @{username}',
    '🦎 La collection de @{username} n''intéresse pas Einhar...'
  ],
  'Einhar Approved - Échec (pas de cartes normales)',
  ARRAY['{username}']
);

-- Heist Tax
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_heistTax_success', 'trigger', 'heistTax', 'success',
  ARRAY[
    '💰 @{username} a été taxé par Heist ! -1 Vaal Orb',
    '💰 Les Rogues volent 1 Vaal Orb à @{username} !',
    '💰 @{username} se fait pickpocket ! -1 Vaal Orb',
    '💰 "Nothing personal, exile." Les voleurs prennent 1 Vaal à @{username}',
    '💰 Heist réussi ! @{username} perd 1 Vaal Orb'
  ],
  'Heist Tax - Vole 1 Vaal Orb (succès)',
  ARRAY['{username}']
),
('trigger_heistTax_failure', 'trigger', 'heistTax', 'failure',
  ARRAY[
    '💰 @{username} n''a rien à voler... Heist repart bredouille.',
    '💰 Les Rogues fouillent @{username}... poches vides !',
    '💰 Heist annulé : @{username} n''a pas de Vaal Orbs',
    '💰 "This one''s broke!" Les voleurs ignorent @{username}',
    '💰 @{username} est trop pauvre pour être volé...'
  ],
  'Heist Tax - Échec (pas de Vaal Orbs)',
  ARRAY['{username}']
);

-- Sirus Voice Line
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_sirusVoice_success', 'trigger', 'sirusVoice', 'success',
  ARRAY[
    '💀 "Die." - Sirus détruit {card} de @{username}',
    '💀 "Feel the thrill of the void!" Sirus élimine {card} de @{username}',
    '💀 La météorite de Sirus frappe {card} de @{username} !',
    '💀 "Everlasting darkness..." @{username} perd {card}',
    '💀 Sirus DIE beam sur @{username} ! {card} est détruite'
  ],
  'Sirus Voice Line - Détruit une carte (succès)',
  ARRAY['{username}', '{card}']
),
('trigger_sirusVoice_failure', 'trigger', 'sirusVoice', 'failure',
  ARRAY[
    '💀 Sirus regarde @{username}... "Tu n''as rien à perdre."',
    '💀 "Interesting..." Sirus épargne @{username} qui n''a rien',
    '💀 Le meteor de Sirus rate @{username}... collection vide !',
    '💀 @{username} esquive Sirus ! (en fait, il n''avait rien)',
    '💀 Sirus cherche une cible... @{username} n''a rien d''intéressant.'
  ],
  'Sirus Voice Line - Échec (pas de cartes)',
  ARRAY['{username}']
);

-- Alch & Go Misclick
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_alchMisclick_success', 'trigger', 'alchMisclick', 'success',
  ARRAY[
    '⚗️ MISCLICK ! @{username} reroll {oldCard} → {newCard}',
    '⚗️ Oups ! @{username} alch accidentellement {oldCard} en {newCard}',
    '⚗️ @{username} rate son clic ! {oldCard} devient {newCard}',
    '⚗️ "C''était pas la bonne!" @{username} transforme {oldCard} → {newCard}',
    '⚗️ Fat fingers ! @{username} reroll {oldCard} en {newCard}'
  ],
  'Alch & Go Misclick - Reroll une carte (succès)',
  ARRAY['{username}', '{oldCard}', '{newCard}']
),
('trigger_alchMisclick_failure', 'trigger', 'alchMisclick', 'failure',
  ARRAY[
    '⚗️ @{username} tente un Alch & Go... mais n''a rien à alch !',
    '⚗️ @{username} cherche quelque chose à alch... rien trouvé !',
    '⚗️ L''Orb of Alchemy de @{username} ne trouve pas de cible...',
    '⚗️ Misclick évité ! @{username} n''a rien à transformer',
    '⚗️ @{username} spam le clic... mais sa collection est vide !'
  ],
  'Alch & Go Misclick - Échec (pas de cartes)',
  ARRAY['{username}']
);

-- Trade Scam
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_tradeScam_success', 'trigger', 'tradeScam', 'success',
  ARRAY[
    '🤝 SCAM ! @{targetUsername} vole {card} à @{username} !',
    '🤝 Trade window scam ! @{targetUsername} repart avec {card} de @{username}',
    '🤝 @{targetUsername} arnaque @{username} ! {card} change de main',
    '🤝 "Merci pour le trade!" @{targetUsername} vole {card} à @{username}',
    '🤝 @{username} se fait scam ! {card} va chez @{targetUsername}'
  ],
  'Trade Scam - Vole une carte à un autre joueur (succès)',
  ARRAY['{username}', '{targetUsername}', '{card}']
),
('trigger_tradeScam_failureNoTarget', 'trigger', 'tradeScam', 'failureNoTarget',
  ARRAY[
    '🤝 @{username} cherche une victime... mais personne n''est là !',
    '🤝 @{username} veut scam... mais le chat est vide !',
    '🤝 Tentative de scam ratée : @{username} est seul...',
    '🤝 @{username} ouvre un trade... avec personne.',
    '🤝 Pas de pigeon pour @{username} aujourd''hui !'
  ],
  'Trade Scam - Échec (pas de cible)',
  ARRAY['{username}']
),
('trigger_tradeScam_failureNoCards', 'trigger', 'tradeScam', 'failureNoCards',
  ARRAY[
    '🤝 @{username} n''a rien à échanger... le scam échoue.',
    '🤝 @{username} tente un scam... mais n''a rien à offrir !',
    '🤝 Trade annulé : @{username} a une collection vide',
    '🤝 "Montre ta collection" - @{username} n''a rien...',
    '🤝 Le scam de @{username} échoue : rien à voler !'
  ],
  'Trade Scam - Échec (pas de cartes)',
  ARRAY['{username}']
);

-- Chris Wilson's Vision
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_chrisVision_success', 'trigger', 'chrisVision', 'success',
  ARRAY[
    '👓 NERF ! Chris Wilson retire le foil de {card} de @{username}',
    '👓 "This is a buff." Chris nerf le foil de {card} de @{username}',
    '👓 Patch notes: {card} de @{username} n''est plus foil',
    '👓 Chris Wilson balance @{username} ! {card} perd son foil',
    '👓 "Working as intended." Le foil de {card} disparaît pour @{username}'
  ],
  'Chris Wilson''s Vision - Retire le foil d''une carte (succès)',
  ARRAY['{username}', '{card}']
),
('trigger_chrisVision_failure', 'trigger', 'chrisVision', 'failure',
  ARRAY[
    '👓 Chris Wilson regarde @{username}... "No foils to nerf here."',
    '👓 Chris cherche des foils chez @{username}... aucun trouvé !',
    '👓 Patch annulé : @{username} n''a pas de foils',
    '👓 "Interesting build" - Chris épargne @{username} (pas de foils)',
    '👓 Le nerf hammer ignore @{username}... pas de foils !'
  ],
  'Chris Wilson''s Vision - Échec (pas de foils)',
  ARRAY['{username}']
);

-- Atlas Influence
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('trigger_atlasInfluence_success', 'trigger', 'atlasInfluence', 'success',
  ARRAY[
    '🗺️ @{username} reçoit l''influence de l''Atlas ! +{boostPercent}% chance de foil au prochain autel',
    '🗺️ L''Atlas favorise @{username} ! +{boostPercent}% foil au prochain autel',
    '🗺️ Influence détectée ! @{username} gagne +{boostPercent}% de chance foil',
    '🗺️ Les Elderslayers bénissent @{username} ! +{boostPercent}% foil',
    '🗺️ @{username} conquiert l''Atlas ! Bonus foil +{boostPercent}% activé'
  ],
  'Atlas Influence - Buff temporaire +% chance foil',
  ARRAY['{username}', '{boostPercent}']
);

-- ============================================================================
-- DEFAULT DATA: COMMAND MESSAGES
-- ============================================================================

-- !ping command
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('command_ping_response', 'command', 'ping', 'response',
  ARRAY['Pong! 🏓 Le bot est en ligne.'],
  'Réponse à la commande !ping',
  NULL
);

-- !ladder / !classement command
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('command_ladder_response', 'command', 'ladder', 'response',
  ARRAY['📊 Classement disponible sur: https://collecteur.dose.gg/ladder'],
  'Réponse à la commande !ladder ou !classement',
  NULL
);

-- !vaalorb command
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('command_vaalorb_success', 'command', 'vaalorb', 'success',
  ARRAY['🔮 @{username} a corrompu {card} ! Résultat: {result}'],
  'Réponse !vaalorb - Corruption réussie',
  ARRAY['{username}', '{card}', '{result}']
),
('command_vaalorb_noOrbs', 'command', 'vaalorb', 'noOrbs',
  ARRAY['❌ @{username}, tu n''as pas de Vaal Orb !'],
  'Réponse !vaalorb - Pas de Vaal Orbs',
  ARRAY['{username}']
),
('command_vaalorb_noCards', 'command', 'vaalorb', 'noCards',
  ARRAY['❌ @{username}, tu n''as pas de carte à corrompre !'],
  'Réponse !vaalorb - Pas de cartes',
  ARRAY['{username}']
);

-- !booster command
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('command_booster_success', 'command', 'booster', 'success',
  ARRAY['📦 @{username} a ouvert {count} booster(s) !'],
  'Réponse !booster - Succès',
  ARRAY['{username}', '{count}']
),
('command_booster_limitReached', 'command', 'booster', 'limitReached',
  ARRAY['⏰ @{username}, tu as atteint ta limite quotidienne de {limit} boosters ! Reset à 21h.'],
  'Réponse !booster - Limite atteinte',
  ARRAY['{username}', '{limit}']
),
('command_booster_partial', 'command', 'booster', 'partial',
  ARRAY['📦 @{username} a ouvert {opened} booster(s) (limite: {remaining} restants aujourd''hui)'],
  'Réponse !booster - Limite partielle',
  ARRAY['{username}', '{opened}', '{remaining}']
);

-- !vaals command
INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('command_vaals_success', 'command', 'vaals', 'success',
  ARRAY['🔮 @{username} a reçu {count} Vaal Orb(s) !'],
  'Réponse !vaals - Succès',
  ARRAY['{username}', '{count}']
),
('command_vaals_limitReached', 'command', 'vaals', 'limitReached',
  ARRAY['⏰ @{username}, tu as atteint ta limite quotidienne de {limit} commandes !vaals ! Reset à 21h.'],
  'Réponse !vaals - Limite atteinte',
  ARRAY['{username}', '{limit}']
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on bot_messages"
  ON bot_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "Authenticated users can read bot_messages"
  ON bot_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TRIGGER for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bot_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bot_messages_updated_at
  BEFORE UPDATE ON bot_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_messages_updated_at();
