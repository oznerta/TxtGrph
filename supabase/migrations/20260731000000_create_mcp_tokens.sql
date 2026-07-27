-- Migration: Create MCP Tokens Table with RLS Policies & Verification Function
-- Date: 2026-07-31

-- 1. Create mcp_tokens Table
CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["read", "write"]'::jsonb,
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for Token Search & RLS Performance
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON public.mcp_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tokens_token_hash ON public.mcp_tokens(token_hash);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Users manage own tokens
DROP POLICY IF EXISTS "Users manage own mcp_tokens" ON public.mcp_tokens;
CREATE POLICY "Users manage own mcp_tokens"
  ON public.mcp_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Postgres Helper Function to Verify Token Hash & Touch last_used_at
CREATE OR REPLACE FUNCTION public.verify_and_touch_mcp_token(p_token_hash TEXT)
RETURNS TABLE (
  token_id UUID,
  user_id UUID,
  scopes JSONB
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.mcp_tokens
  SET last_used_at = now()
  WHERE token_hash = p_token_hash
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING id AS token_id, public.mcp_tokens.user_id, public.mcp_tokens.scopes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
