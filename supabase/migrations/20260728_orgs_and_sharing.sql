-- Supabase Migration: Organizations, Team Spaces, and Diagram Collaborator Sharing RLS
-- Migration Date: 2026-07-28

-- ============================================================================
-- 1. Organizations & Team Spaces Tables
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

-- ============================================================================
-- 2. Diagram Collaborators Table (Granular Direct Sharing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diagram_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (char_length(trim(email)) > 0),
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT diagram_collaborator_unique UNIQUE (diagram_id, email)
);

-- ============================================================================
-- 3. Add organization_id column to folders and diagrams
-- ============================================================================

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_folders_org ON public.folders(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diagrams_org ON public.diagrams(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diagram_collaborators_diagram ON public.diagram_collaborators(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_collaborators_email ON public.diagram_collaborators(email);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagram_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- Organizations: members can read, owners/admins can update
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

-- Organization Members: members can view colleagues
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

-- Diagram Collaborators: collaborators can view their entries
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
