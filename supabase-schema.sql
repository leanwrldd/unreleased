-- unreleased — Supabase schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste → Run

-- ── song_supplements ──────────────────────────────────────────────────────────
-- Supplemental/editorial data per JuiceWRLD API song ID.
-- Indexed on jw_song_id for fast single-song lookups.

CREATE TABLE IF NOT EXISTS song_supplements (
  id                        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  jw_song_id                integer     NOT NULL UNIQUE,  -- API song ID (from /songs/)
  created_at                timestamptz DEFAULT now()     NOT NULL,
  updated_at                timestamptz DEFAULT now()     NOT NULL,

  -- Narrative / context
  context                   text,                  -- Historical background / story
  trivia                    text[],                -- Array of trivia bullet points
  sample_info               text,                  -- Sample sources / clearance info

  -- External links
  youtube_url               text,
  soundcloud_url            text,
  external_links            jsonb,                 -- { "Label": "https://..." }

  -- Editorial corrections (override API data when wrong)
  verified_producers        text,
  verified_engineers        text,
  verified_release_date     text,
  verified_recording_date   text,
  verified_recording_location text,

  -- Quality & editorial
  quality_rating            smallint    CHECK (quality_rating BETWEEN 1 AND 10),
  editor_notes              text,
  updated_by                text        -- Editor display name (anon)
);

-- Index for batch fetches (list views)
CREATE INDEX IF NOT EXISTS song_supplements_jw_song_id_idx ON song_supplements (jw_song_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER song_supplements_updated_at
  BEFORE UPDATE ON song_supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Public read, anon write (editors submit without login)

ALTER TABLE song_supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supplements"
  ON song_supplements FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert supplements"
  ON song_supplements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update supplements"
  ON song_supplements FOR UPDATE
  USING (true)
  WITH CHECK (true);
