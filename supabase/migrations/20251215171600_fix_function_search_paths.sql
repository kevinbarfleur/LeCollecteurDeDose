-- Migration: Fix search_path for all functions
-- This prevents potential search_path injection attacks
-- Sets search_path to 'public' for all custom functions

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.generate_short_id()
SET search_path = public;

ALTER FUNCTION public.generate_room_code()
SET search_path = public;

ALTER FUNCTION public.update_updated_at_column()
SET search_path = public;

ALTER FUNCTION public.update_dev_test_data_updated_at()
SET search_path = public;

-- ============================================================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.get_or_create_user(text, text, text, text)
SET search_path = public;

-- ============================================================================
-- COLLECTION FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.add_card_to_collection(uuid, integer, boolean)
SET search_path = public;

ALTER FUNCTION public.set_card_collection_counts(uuid, integer, integer, integer)
SET search_path = public;

ALTER FUNCTION public.check_user_has_cards(uuid)
SET search_path = public;

ALTER FUNCTION public.check_user_has_normal_cards(uuid)
SET search_path = public;

ALTER FUNCTION public.check_user_has_foil_cards(uuid)
SET search_path = public;

ALTER FUNCTION public.check_user_has_vaal_orbs(uuid, integer)
SET search_path = public;

-- ============================================================================
-- VAAL ORB FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.update_vaal_orbs(uuid, integer)
SET search_path = public;

ALTER FUNCTION public.set_vaal_orbs(uuid, integer)
SET search_path = public;

ALTER FUNCTION public.use_vaal_orb(uuid)
SET search_path = public;

ALTER FUNCTION public.steal_vaal_orb(uuid)
SET search_path = public;

-- ============================================================================
-- CARD MANIPULATION FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.give_random_card_to_user(uuid, boolean)
SET search_path = public;

ALTER FUNCTION public.destroy_random_card(uuid)
SET search_path = public;

ALTER FUNCTION public.duplicate_random_card(uuid)
SET search_path = public;

ALTER FUNCTION public.convert_card_to_foil(uuid)
SET search_path = public;

ALTER FUNCTION public.remove_foil_from_card(uuid)
SET search_path = public;

ALTER FUNCTION public.reroll_card(uuid)
SET search_path = public;

ALTER FUNCTION public.transfer_card(uuid, uuid)
SET search_path = public;

-- ============================================================================
-- BOOSTER FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.create_booster_for_user(uuid)
SET search_path = public;

-- ============================================================================
-- BUFF FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.add_temporary_buff(uuid, text, integer, jsonb)
SET search_path = public;

ALTER FUNCTION public.get_user_buffs(uuid)
SET search_path = public;

-- ============================================================================
-- BOT CONFIG FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.get_bot_config(text)
SET search_path = public;

ALTER FUNCTION public.set_bot_config(text, text, text)
SET search_path = public;

ALTER FUNCTION public.get_all_bot_config()
SET search_path = public;

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.update_app_setting(text, jsonb, text, text)
SET search_path = public;

ALTER FUNCTION public.mark_error_resolved(uuid, text)
SET search_path = public;

-- ============================================================================
-- PERFORMANCE VIEW REFRESH FUNCTIONS
-- ============================================================================

ALTER FUNCTION public.refresh_user_collection_summary()
SET search_path = public;

ALTER FUNCTION public.refresh_recent_boosters_summary()
SET search_path = public;

-- ============================================================================
-- ARENA FUNCTIONS (if exists)
-- ============================================================================

-- This function may not exist yet, so we use DO block with exception handling
DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_random_saved_deck(integer, integer) SET search_path = public';
EXCEPTION
  WHEN undefined_function THEN
    -- Function doesn't exist, skip
    NULL;
END $$;
