-- Migration: Add batch event action messages to bot_messages
-- These are the per-user messages shown during batch events

-- First, add is_enabled column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bot_messages' AND column_name = 'is_enabled'
  ) THEN
    ALTER TABLE bot_messages ADD COLUMN is_enabled BOOLEAN DEFAULT TRUE NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- BUFF BOW (bowcucks) - Conversion en foil
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_buffBow_success', 'event', 'buffBow', 'success',
  ARRAY[
    '🏹 @{username} reçoit le cadeau habituel pour les bowcucks ! {card} devient ✨ FOIL !',
    '🎯 GGG buff encore les arcs ! @{username} voit {card} devenir FOIL ✨',
    '"Cadeau habituel" - @{username} : {card} → FOIL ✨',
    '🏹 @{username} profite du buff arc ! {card} est maintenant ✨ FOIL !',
    '"We felt bows were underperforming" - {card} de @{username} brille maintenant ✨'
  ],
  'Buff Bow - Message de succès quand une carte devient foil',
  ARRAY['{username}', '{card}']
),
('event_buffBow_noCards', 'event', 'buffBow', 'noCards',
  ARRAY[
    '🙏 @{username} Ce joueur est encore sauvable, il ne joue pas arc !',
    '✨ @{username} n''a pas succombé aux arcs... respect.',
    '🛡️ @{username} résiste à la tentation bowcuck !',
    '💪 @{username} : Pas d''arc = Pas de honte. GG !',
    '🎭 @{username} joue avec honneur, pas d''arcs dans sa collection !'
  ],
  'Buff Bow - Message quand le joueur n''a pas de carte arc',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUFF CASTER - Conversion en foil
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_buffCaster_success', 'event', 'buffCaster', 'success',
  ARRAY[
    '🔮 @{username} voit {card} briller d''une lueur arcane ! ✨ FOIL !',
    '🔮 Les arcanes bénissent @{username} ! {card} → FOIL ✨',
    '"Casters are fine" - {card} de @{username} devient FOIL ✨',
    '🔮 @{username} canalise les arcanes ! {card} resplendit ✨',
    '✨ Le pouvoir des casters s''éveille chez @{username} ! {card} FOIL !'
  ],
  'Buff Caster - Message de succès',
  ARRAY['{username}', '{card}']
),
('event_buffCaster_noCards', 'event', 'buffCaster', 'noCards',
  ARRAY[
    '🔮 @{username} ne possède pas de wand... un vrai melee enjoyer ?',
    '🔮 @{username} n''a pas sucombé au caster meta !',
    '⚔️ @{username} préfère le combat rapproché, respect !',
    '🛡️ @{username} : Pas de wand, pas de problème !'
  ],
  'Buff Caster - Message quand pas de carte caster',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUFF ALL (Divine Blessing) - Conversion en foil
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_buffAll_success', 'event', 'buffAll', 'success',
  ARRAY[
    '✨ Les dieux bénissent @{username} ! {card} → FOIL !',
    '✨ @{username} reçoit la grâce divine ! {card} brille maintenant ✨',
    '🌟 Bénédiction divine pour @{username} ! {card} devient FOIL !',
    '✨ La lumière touche @{username} : {card} → FOIL ✨',
    '🙏 @{username} est béni ! {card} resplendit de mille feux ✨'
  ],
  'Buff All - Message de succès',
  ARRAY['{username}', '{card}']
),
('event_buffAll_noCards', 'event', 'buffAll', 'noCards',
  ARRAY[
    '✨ @{username} n''a pas de carte normale à bénir...',
    '🙏 @{username} a déjà tout en foil... ou rien du tout !',
    '✨ La bénédiction passe sur @{username}... mais il n''y a rien à améliorer.'
  ],
  'Buff All - Message quand pas de carte',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NERF MELEE - Destruction de cartes
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_nerfMelee_success', 'event', 'nerfMelee', 'success',
  ARRAY[
    '⚔️ NERF MELEE ! @{username} perd {card} - "Melee is fine" - GGG',
    '💀 @{username} subit le nerf melee habituel : {card} détruite',
    '"We felt melee was overperforming" - {card} de @{username} est supprimée',
    '🗡️ Nerf melee classique ! @{username} dit adieu à {card}',
    '⚔️ @{username} : {card} disparaît - "Working as intended"',
    '💀 Le nerf melee frappe @{username} ! {card} n''existe plus.'
  ],
  'Nerf Melee - Message de destruction',
  ARRAY['{username}', '{card}']
),
('event_nerfMelee_noCards', 'event', 'nerfMelee', 'noCards',
  ARRAY[
    '🛡️ @{username} échappe au nerf melee (pas d''armes de corps à corps)',
    '✅ @{username} ne joue pas melee, épargné par GGG',
    '🎭 @{username} a évité le piège melee, bien joué !',
    '🏃 @{username} esquive le nerf melee - pas d''armes CaC trouvées',
    '😌 @{username} respire : aucune arme melee à sacrifier'
  ],
  'Nerf Melee - Message quand pas de carte melee',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NERF CASTER - Destruction de cartes
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_nerfCaster_success', 'event', 'nerfCaster', 'success',
  ARRAY[
    '🔮 NERF CASTER ! @{username} perd {card} - Les arcanes se dissipent...',
    '💀 @{username} subit le nerf caster : {card} détruite',
    '"Casters had too much damage" - {card} de @{username} disparaît',
    '🔮 Le nerf frappe les casters ! @{username} perd {card}'
  ],
  'Nerf Caster - Message de destruction',
  ARRAY['{username}', '{card}']
),
('event_nerfCaster_noCards', 'event', 'nerfCaster', 'noCards',
  ARRAY[
    '🔮 @{username} n''a pas de wand à détruire...',
    '✅ @{username} ne joue pas caster, épargné !',
    '🛡️ @{username} esquive le nerf caster - pas d''items magiques'
  ],
  'Nerf Caster - Message quand pas de carte',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NERF JEWELRY - Destruction de cartes
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_nerfJewelry_success', 'event', 'nerfJewelry', 'success',
  ARRAY[
    '💍 @{username} perd {card} ! Les bijoux sont ciblés !',
    '🔊 Nerf aura ! @{username} dit adieu à {card}',
    '💎 {card} de @{username} a été jugée trop puissante... supprimée !'
  ],
  'Nerf Jewelry - Message de destruction',
  ARRAY['{username}', '{card}']
),
('event_nerfJewelry_noCards', 'event', 'nerfJewelry', 'noCards',
  ARRAY[
    '💍 @{username} n''a pas de bijoux à détruire...',
    '✅ @{username} ne porte pas de bijoux, épargné !'
  ],
  'Nerf Jewelry - Message quand pas de bijoux',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HARVEST NERF - Remove foil
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_harvestNerf_success', 'event', 'harvestNerf', 'success',
  ARRAY[
    '🌿 Le foil de {card} de @{username} a été jugé trop déterministe...',
    '🌿 @{username} perd le foil de {card}. "Harvest was too powerful."',
    '🌿 "Too deterministic" - {card} de @{username} n''est plus foil',
    '🌿 Le nerf Harvest frappe @{username} ! {card} perd son éclat ✨→📄'
  ],
  'Harvest Nerf - Message de retrait foil',
  ARRAY['{username}', '{card}']
),
('event_harvestNerf_noCards', 'event', 'harvestNerf', 'noCards',
  ARRAY[
    '🌿 @{username} n''avait pas de foil à nerf... déjà poor !',
    '🌿 @{username} épargné par le nerf Harvest - pas de foil trouvé'
  ],
  'Harvest Nerf - Message quand pas de foil',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AURA STACKER NERF - Remove foil + destroy
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_auraStackerNerf_success', 'event', 'auraStackerNerf', 'success',
  ARRAY[
    '🔊 NERF AURA ! Le foil de {card} de @{username} est supprimé !',
    '🔊 @{username} perd le foil de {card}. "Auras were problematic."',
    '🔊 Aura stacker détecté ! {card} de @{username} perd son foil'
  ],
  'Aura Stacker Nerf - Message de retrait foil',
  ARRAY['{username}', '{card}']
),
('event_auraStackerNerf_noCards', 'event', 'auraStackerNerf', 'noCards',
  ARRAY[
    '🔊 @{username} n''a pas de bijoux foil... pas un aura stacker !',
    '✅ @{username} ne stack pas les auras, épargné !'
  ],
  'Aura Stacker Nerf - Message quand pas de bijoux foil',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VAAL ROULETTE - 50/50
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_vaalRoulette_brick', 'event', 'vaalRoulette', 'brick',
  ARRAY[
    '🎰 BRICK ! @{username} corrompt {card}... POOF ! Disparue !',
    '🎰 @{username} Vaal {card}... "This item has been corrupted" → DÉTRUIT',
    '🎰 RIP ! La corruption détruit {card} de @{username}',
    '💀 VAAL BRICK ! @{username} perd {card} dans les flammes de la corruption',
    '🎰 "Vaal or no balls" - @{username} a Vaal... et a perdu {card}'
  ],
  'Vaal Roulette - Message de brick (destruction)',
  ARRAY['{username}', '{card}']
),
('event_vaalRoulette_upgrade', 'event', 'vaalRoulette', 'upgrade',
  ARRAY[
    '🎰 JACKPOT ! @{username} corrompt {card} → FOIL ✨',
    '🎰 @{username} gagne à la Vaal roulette ! {card} devient FOIL ✨',
    '🎰 Corruption parfaite ! {card} de @{username} brille maintenant ✨',
    '✨ VAAL SUCCESS ! @{username} transforme {card} en FOIL !',
    '🎰 "Vaal or no balls" - @{username} a Vaal... et a GAGNÉ ! {card} FOIL ✨'
  ],
  'Vaal Roulette - Message d''upgrade (foil)',
  ARRAY['{username}', '{card}']
),
('event_vaalRoulette_noCards', 'event', 'vaalRoulette', 'noCards',
  ARRAY[
    '🎰 @{username} n''a rien à corrompre... collection vide !',
    '🎰 La corruption cherche une cible chez @{username}... mais ne trouve rien'
  ],
  'Vaal Roulette - Message quand pas de carte',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MIRROR EVENT - Duplication
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_mirrorEvent_success', 'event', 'mirrorEvent', 'success',
  ARRAY[
    '💎 MIRROR ! @{username} duplique {card} !',
    '💎 Le Mirror bénit @{username} ! +1 {card}',
    '💎 @{username} trouve un Mirror ! {card} a été dupliquée !',
    '✨ MIRROR OF KALANDRA ! @{username} reçoit une copie de {card}',
    '💎 La légende devient réalité ! @{username} duplique {card}'
  ],
  'Mirror Event - Message de duplication',
  ARRAY['{username}', '{card}']
),
('event_mirrorEvent_noCards', 'event', 'mirrorEvent', 'noCards',
  ARRAY[
    '💎 @{username} n''a rien à mirror... collection vide !',
    '💎 Le Mirror cherche quelque chose chez @{username}... en vain'
  ],
  'Mirror Event - Message quand pas de carte',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HEIST - Vol de cartes
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_heist_success', 'event', 'heist', 'success',
  ARRAY[
    '💰 HEIST ! @{targetUsername} vole {card} à @{username} !',
    '💰 Les Rogues frappent ! {card} passe de @{username} à @{targetUsername}',
    '💰 Vol réussi ! @{targetUsername} dérobe {card} à @{username}',
    '🎭 "Nothing personal, exile" - @{targetUsername} vole {card} à @{username}',
    '💰 Tibbs approuve ! {card} volée de @{username} → @{targetUsername}'
  ],
  'Heist - Message de vol réussi',
  ARRAY['{username}', '{targetUsername}', '{card}']
),
('event_heist_noCards', 'event', 'heist', 'noCards',
  ARRAY[
    '💰 @{username} n''avait rien à voler... broke exile !',
    '💰 Les Rogues fouillent @{username}... poches vides !',
    '💰 Heist raté ! @{username} est trop pauvre pour être volé'
  ],
  'Heist - Message quand pas de carte à voler',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEELMAGE RIP - Destruction high tier
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_steelmageRip_success', 'event', 'steelmageRip', 'success',
  ARRAY[
    '☠️ "NOOOO!" @{username} perd {card} ({tier}) en HC ! RIP',
    '☠️ @{username} fait un Steelmage ! {card} ({tier}) est GONE',
    '☠️ F pour @{username} qui perd {card} ({tier}). "I should have logged out."',
    '💀 RIP HC ! @{username} perd {card} ({tier}) - moment Steelmage',
    '☠️ "At least I went down fighting" - @{username} perd {card} ({tier})'
  ],
  'Steelmage RIP - Message de destruction high tier',
  ARRAY['{username}', '{card}', '{tier}']
),
('event_steelmageRip_noCards', 'event', 'steelmageRip', 'noCards',
  ARRAY[
    '☠️ @{username} n''avait rien à perdre. Déjà mort inside.',
    '☠️ @{username} survit au RIP moment - pas de cartes high tier'
  ],
  'Steelmage RIP - Message quand pas de carte high tier',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LEAGUE START - Cartes gratuites
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_leagueStart_success', 'event', 'leagueStart', 'success',
  ARRAY[
    '🎮 @{username} reçoit {card} ({tier}) pour le league start !',
    '🎮 GGG offre {card} ({tier}) à @{username} ! Welcome to the new league !',
    '🎮 Starter pack ! @{username} obtient {card} ({tier})',
    '🎮 Bienvenue exile ! @{username} reçoit {card} ({tier})'
  ],
  'League Start - Message de cadeau',
  ARRAY['{username}', '{card}', '{tier}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LEAGUE END CHAOS - Random effects
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_leagueEndChaos_buff', 'event', 'leagueEndChaos', 'buff',
  ARRAY[
    '🔥 CHAOS ! @{username} gagne ! {card} → FOIL ✨',
    '🔥 Le chaos sourit à @{username} ! {card} devient FOIL ✨'
  ],
  'League End Chaos - Message de buff',
  ARRAY['{username}', '{card}']
),
('event_leagueEndChaos_nerf', 'event', 'leagueEndChaos', 'nerf',
  ARRAY[
    '🔥 CHAOS ! @{username} perd {card} ! C''est la fin de league !',
    '🔥 Le chaos frappe @{username} ! {card} disparaît !'
  ],
  'League End Chaos - Message de nerf',
  ARRAY['{username}', '{card}']
),
('event_leagueEndChaos_nothing', 'event', 'leagueEndChaos', 'nothing',
  ARRAY[
    '🔥 @{username} survit au chaos de fin de league !',
    '🔥 Le chaos passe devant @{username}... sans le toucher'
  ],
  'League End Chaos - Message neutre',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FLASHBACK - Multiple effects
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_flashbackBuff_success', 'event', 'flashbackBuff', 'success',
  ARRAY[
    '⚡ FLASHBACK ! {card} de @{username} → FOIL ✨',
    '⚡ Le chaos du Flashback bénit @{username} ! {card} FOIL ✨'
  ],
  'Flashback Buff - Message de succès',
  ARRAY['{username}', '{card}']
),
('event_flashbackBuff_noCards', 'event', 'flashbackBuff', 'noCards',
  ARRAY[
    '⚡ @{username} survit au flashback... pour l''instant !'
  ],
  'Flashback Buff - Message quand pas de carte',
  ARRAY['{username}']
),
('event_flashbackGift_success', 'event', 'flashbackGift', 'success',
  ARRAY[
    '⚡ @{username} trouve {card} ({tier}) dans le chaos du Flashback !',
    '⚡ Le Flashback offre {card} ({tier}) à @{username} !'
  ],
  'Flashback Gift - Message de cadeau',
  ARRAY['{username}', '{card}', '{tier}']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PATH OF MATH DRAMA - Vol + nerf
-- ============================================================================

INSERT INTO bot_messages (id, category, item_key, message_type, messages, description, variables) VALUES
('event_pathOfMathDrama_steal', 'event', 'pathOfMathDrama', 'steal',
  ARRAY[
    '🎭 DRAMA ! @{targetUsername} "emprunte" {card} à @{username} !',
    '🎭 @{username} se fait... euh, voler {card} par @{targetUsername}',
    '🎭 "I didn''t do anything wrong!" - {card} passe de @{username} à @{targetUsername}'
  ],
  'Path of Math Drama - Message de vol',
  ARRAY['{username}', '{targetUsername}', '{card}']
),
('event_pathOfMathDrama_nerf', 'event', 'pathOfMathDrama', 'nerf',
  ARRAY[
    '🎭 Le drama continue ! {card} de @{username} perd son foil',
    '🎭 Dommage collatéral ! @{username} perd le foil de {card}'
  ],
  'Path of Math Drama - Message de nerf',
  ARRAY['{username}', '{card}']
),
('event_pathOfMathDrama_noCards', 'event', 'pathOfMathDrama', 'noCards',
  ARRAY[
    '🎭 @{username} est trop pauvre pour le drama...',
    '🎭 Le drama évite @{username} - rien à prendre'
  ],
  'Path of Math Drama - Message quand pas de carte',
  ARRAY['{username}']
)
ON CONFLICT (id) DO NOTHING;
