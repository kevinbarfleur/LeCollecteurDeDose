-- Migration: Create collections tables for user cards and boosters
-- This migration creates the normalized database structure to replace JSON files

-- 1. Create unique_cards table (catalogue of all available cards)
CREATE TABLE IF NOT EXISTS unique_cards (
  uid INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  item_class TEXT NOT NULL,
  rarity TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('T0', 'T1', 'T2', 'T3')),
  flavour_text TEXT,
  wiki_url TEXT,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  relevance_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for unique_cards
CREATE INDEX IF NOT EXISTS idx_unique_cards_tier ON unique_cards(tier);
CREATE INDEX IF NOT EXISTS idx_unique_cards_item_class ON unique_cards(item_class);
CREATE INDEX IF NOT EXISTS idx_unique_cards_relevance_score ON unique_cards(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_unique_cards_id ON unique_cards(id);

-- 2. Create users table (Twitch users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitch_username TEXT NOT NULL UNIQUE,
  twitch_user_id TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  vaal_orbs INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_twitch_username ON users(LOWER(twitch_username));
CREATE INDEX IF NOT EXISTS idx_users_twitch_user_id ON users(twitch_user_id);

-- 3. Create user_collections table (many-to-many relationship between users and cards)
CREATE TABLE IF NOT EXISTS user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uid INTEGER NOT NULL REFERENCES unique_cards(uid) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  normal_count INTEGER DEFAULT 0 NOT NULL CHECK (normal_count >= 0),
  foil_count INTEGER DEFAULT 0 NOT NULL CHECK (foil_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_uid)
);

-- Indexes for user_collections
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_card_uid ON user_collections(card_uid);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_card ON user_collections(user_id, card_uid);

-- 4. Create user_boosters table (booster opening history)
CREATE TABLE IF NOT EXISTS user_boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  booster_type TEXT DEFAULT 'normal' CHECK (booster_type IN ('normal', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_boosters
CREATE INDEX IF NOT EXISTS idx_user_boosters_user_id ON user_boosters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosters_opened_at ON user_boosters(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_boosters_user_opened ON user_boosters(user_id, opened_at DESC);

-- 5. Create booster_cards table (cards within each booster)
CREATE TABLE IF NOT EXISTS booster_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booster_id UUID NOT NULL REFERENCES user_boosters(id) ON DELETE CASCADE,
  card_uid INTEGER NOT NULL REFERENCES unique_cards(uid) ON DELETE CASCADE,
  is_foil BOOLEAN DEFAULT false NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for booster_cards
CREATE INDEX IF NOT EXISTS idx_booster_cards_booster_id ON booster_cards(booster_id);
CREATE INDEX IF NOT EXISTS idx_booster_cards_card_uid ON booster_cards(card_uid);
