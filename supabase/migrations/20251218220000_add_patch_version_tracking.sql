-- Table pour stocker la version actuelle du patch
CREATE TABLE IF NOT EXISTS patch_version (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row only
  major INTEGER NOT NULL DEFAULT 3,
  minor INTEGER NOT NULL DEFAULT 26,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default version if not exists
INSERT INTO patch_version (id, major, minor)
VALUES (1, 3, 26)
ON CONFLICT (id) DO NOTHING;

-- Function to get current version string (e.g., "3.26")
CREATE OR REPLACE FUNCTION get_patch_version()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_major INTEGER;
  v_minor INTEGER;
BEGIN
  SELECT major, minor INTO v_major, v_minor FROM patch_version WHERE id = 1;
  RETURN v_major || '.' || v_minor;
END;
$$;

-- Function to increment patch version and return the new version string
CREATE OR REPLACE FUNCTION increment_patch_version()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_major INTEGER;
  v_minor INTEGER;
BEGIN
  UPDATE patch_version
  SET minor = minor + 1,
      updated_at = NOW()
  WHERE id = 1
  RETURNING major, minor INTO v_major, v_minor;

  RETURN v_major || '.' || v_minor;
END;
$$;
