-- Migration: Recently Opened Diagrams & User Favorites
-- Target: Supabase Postgres

CREATE TABLE IF NOT EXISTS public.recently_opened_diagrams (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, diagram_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_opened_user_opened ON public.recently_opened_diagrams(user_id, opened_at DESC);

ALTER TABLE public.recently_opened_diagrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recents" ON public.recently_opened_diagrams;
CREATE POLICY "Users manage own recents"
  ON public.recently_opened_diagrams
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, diagram_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created ON public.user_favorites(user_id, created_at DESC);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.user_favorites;
CREATE POLICY "Users manage own favorites"
  ON public.user_favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC to record recently opened diagram
CREATE OR REPLACE FUNCTION public.touch_recently_opened_diagram(p_diagram_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recently_opened_diagrams (user_id, diagram_id, opened_at)
  VALUES (auth.uid(), p_diagram_id, now())
  ON CONFLICT (user_id, diagram_id)
  DO UPDATE SET opened_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
