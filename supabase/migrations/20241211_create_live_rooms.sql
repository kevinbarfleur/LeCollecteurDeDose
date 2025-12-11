-- =====================================================
-- Live Rooms - Real-time streaming feature
-- =====================================================

-- Function to generate a short room code (6 characters)
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Live rooms table
CREATE TABLE IF NOT EXISTS public.live_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id text NOT NULL, -- Twitch user ID
  host_name text NOT NULL,
  host_avatar text,
  room_code text UNIQUE DEFAULT generate_room_code(),
  is_active boolean DEFAULT true,
  spectator_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_live_rooms_room_code ON public.live_rooms(room_code) WHERE is_active = true;

-- Index for finding active rooms by host
CREATE INDEX IF NOT EXISTS idx_live_rooms_host_active ON public.live_rooms(host_id) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_rooms
-- Anyone can read active rooms
CREATE POLICY "Anyone can view active rooms"
  ON public.live_rooms
  FOR SELECT
  USING (is_active = true);

-- Authenticated users can create rooms (in production, you'd check auth)
CREATE POLICY "Allow room creation"
  ON public.live_rooms
  FOR INSERT
  WITH CHECK (true);

-- Only host can update their room
CREATE POLICY "Host can update own room"
  ON public.live_rooms
  FOR UPDATE
  USING (true) -- In production: host_id = auth.uid()::text
  WITH CHECK (true);

-- =====================================================
-- Realtime Authorization (for Broadcast & Presence)
-- =====================================================

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rooms;

-- Note: For Supabase Realtime Broadcast/Presence authorization,
-- you may need to configure RLS on realtime.messages table
-- See: https://supabase.com/docs/guides/realtime/authorization
