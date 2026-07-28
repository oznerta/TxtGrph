-- Combined Master Supabase Migrations (All Sprints)
-- Target Database: Supabase Postgres
-- Execute this entire file in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query

-- ============================================================================
-- 1. Create Folders and Diagrams Tables with RLS Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  parent_id UUID NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  folder_id UUID NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Diagram' CHECK (char_length(trim(title)) > 0),
  code TEXT NOT NULL DEFAULT 'flowchart TD' || chr(10) || '    A[Start] --> B[End]',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_token UUID DEFAULT gen_random_uuid(),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  share_updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON public.folders(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_user_folder ON public.diagrams(user_id, folder_id) WHERE is_deleted = false;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_folders_updated_at ON public.folders;
CREATE TRIGGER set_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_diagrams_updated_at ON public.diagrams;
CREATE TRIGGER set_diagrams_updated_at
  BEFORE UPDATE ON public.diagrams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own folders" ON public.folders;
CREATE POLICY "Users manage own folders"
  ON public.folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own diagrams" ON public.diagrams;
CREATE POLICY "Users manage own diagrams"
  ON public.diagrams
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view shared active diagrams" ON public.diagrams;
CREATE POLICY "Public can view shared active diagrams"
  ON public.diagrams
  FOR SELECT
  USING (
    is_deleted = false 
    AND is_shared = true 
    AND share_token IS NOT NULL
  );

-- ============================================================================
-- 2. Create User Keys Table (BYOK AI Router Encryption)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini', 'custom')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  base_url TEXT NULL,
  model TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_keys_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_keys_user_id ON public.user_keys(user_id);

DROP TRIGGER IF EXISTS set_user_keys_updated_at ON public.user_keys;
CREATE TRIGGER set_user_keys_updated_at
  BEFORE UPDATE ON public.user_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_keys" ON public.user_keys;
CREATE POLICY "Users manage own user_keys"
  ON public.user_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. Create MCP Tokens Table & Verification Function
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON public.mcp_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tokens_token_hash ON public.mcp_tokens(token_hash);

ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mcp_tokens" ON public.mcp_tokens;
CREATE POLICY "Users manage own mcp_tokens"
  ON public.mcp_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- ============================================================================
-- 4. Organizations, Team Spaces, and Diagram Collaborator Sharing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(trim(slug)) > 0),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_user_unique UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (char_length(trim(email)) > 0),
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_email_invite_unique UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS public.diagram_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (char_length(trim(email)) > 0),
  role TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT diagram_collaborator_unique UNIQUE (diagram_id, email)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.folders ADD COLUMN organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'diagrams' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.diagrams ADD COLUMN organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_folders_org ON public.folders(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diagrams_org ON public.diagrams(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diagram_collaborators_diagram ON public.diagram_collaborators(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_collaborators_email ON public.diagram_collaborators(email);

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagram_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners manage organizations" ON public.organizations;
CREATE POLICY "Owners manage organizations"
  ON public.organizations FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members view org colleagues" ON public.organization_members;
CREATE POLICY "Members view org colleagues"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = organization_id AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage org members" ON public.organization_members;
CREATE POLICY "Admins manage org members"
  ON public.organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = organization_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Collaborators view entries" ON public.diagram_collaborators;
CREATE POLICY "Collaborators view entries"
  ON public.diagram_collaborators FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.diagrams d WHERE d.id = diagram_id AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Diagram owners manage collaborators" ON public.diagram_collaborators;
CREATE POLICY "Diagram owners manage collaborators"
  ON public.diagram_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.diagrams d WHERE d.id = diagram_id AND d.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Diagram Version History & Edit Snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diagram_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    edited_by_email TEXT NOT NULL,
    edited_by_name TEXT,
    change_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_id ON public.diagram_versions(diagram_id, version_number DESC);

ALTER TABLE public.diagram_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view version history of own or collaborative diagrams" ON public.diagram_versions;
CREATE POLICY "Users can view version history of own or collaborative diagrams"
    ON public.diagram_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_versions.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert version history snapshots for accessible diagrams" ON public.diagram_versions;
CREATE POLICY "Users can insert version history snapshots for accessible diagrams"
    ON public.diagram_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_versions.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email() AND c.role = 'editor'
                )
            )
        )
    );

-- ============================================================================
-- 6. Diagram Comments & Audit Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diagram_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
    author_email TEXT NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_diagram_comments_diagram_id ON public.diagram_comments(diagram_id, created_at DESC);

ALTER TABLE public.diagram_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on accessible diagrams" ON public.diagram_comments;
CREATE POLICY "Users can view comments on accessible diagrams"
    ON public.diagram_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert comments on accessible diagrams" ON public.diagram_comments;
CREATE POLICY "Users can insert comments on accessible diagrams"
    ON public.diagram_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update or resolve comments on accessible diagrams" ON public.diagram_comments;
CREATE POLICY "Users can update or resolve comments on accessible diagrams"
    ON public.diagram_comments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email()
                )
            )
        )
    );

CREATE TABLE IF NOT EXISTS public.diagram_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_diagram_activity_logs_diagram_id ON public.diagram_activity_logs(diagram_id, created_at DESC);

ALTER TABLE public.diagram_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity logs on accessible diagrams" ON public.diagram_activity_logs;
CREATE POLICY "Users can view activity logs on accessible diagrams"
    ON public.diagram_activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_activity_logs.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.email = auth.email()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can record activity logs" ON public.diagram_activity_logs;
CREATE POLICY "Users can record activity logs"
    ON public.diagram_activity_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 7. Recently Opened Diagrams & User Favorites
-- ============================================================================

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
  ON public.recently_opened_diagrams FOR ALL
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
  ON public.user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_recently_opened_diagram(p_diagram_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recently_opened_diagrams (user_id, diagram_id, opened_at)
  VALUES (auth.uid(), p_diagram_id, now())
  ON CONFLICT (user_id, diagram_id)
  DO UPDATE SET opened_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. User Profiles & Realtime Setup
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  headline TEXT DEFAULT 'Diagram Architect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
