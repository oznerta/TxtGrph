-- Migration: 20260728_version_history.sql
-- Description: Create diagram_versions table for tracking version history, author attribution, and rollback snapshots.

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

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_id ON public.diagram_versions(diagram_id, version_number DESC);

-- Enable RLS
ALTER TABLE public.diagram_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view version history of own or collaborative diagrams"
    ON public.diagram_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_versions.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email()
                )
            )
        )
    );

CREATE POLICY "Users can insert version history snapshots for accessible diagrams"
    ON public.diagram_versions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_versions.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email() AND c.role = 'editor'
                )
            )
        )
    );
