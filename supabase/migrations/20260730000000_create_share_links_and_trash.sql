-- Migration: Create Share Links and Soft Delete (Trash Bin) columns, indexes, and RLS policies
-- Date: 2026-07-30

-- 1. Extend Diagrams table with Share & Trash fields
ALTER TABLE public.diagrams 
  ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- 2. Extend Folders table with Soft Delete fields
ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- 3. Optimized Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_diagrams_share_token 
  ON public.diagrams(share_token) 
  WHERE is_shared = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_diagrams_trash 
  ON public.diagrams(user_id, is_deleted) 
  WHERE is_deleted = true;

CREATE INDEX IF NOT EXISTS idx_folders_trash 
  ON public.folders(user_id, is_deleted) 
  WHERE is_deleted = true;

-- 4. Public RLS Policy for Shared Diagrams (Anonymous / Shared Read Access)
DROP POLICY IF EXISTS "Public can view shared active diagrams" ON public.diagrams;
CREATE POLICY "Public can view shared active diagrams"
  ON public.diagrams
  FOR SELECT
  USING (
    is_deleted = false 
    AND is_shared = true 
    AND share_token IS NOT NULL
  );
