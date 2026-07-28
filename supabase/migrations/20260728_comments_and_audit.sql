-- Migration: 20260728_comments_and_audit.sql
-- Description: Add diagram comments and security activity audit logs for enterprise readiness.

-- 1. Diagram Comments Table
CREATE TABLE IF NOT EXISTS public.diagram_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
    author_email TEXT NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for diagram comments
CREATE INDEX IF NOT EXISTS idx_diagram_comments_diagram_id ON public.diagram_comments(diagram_id, created_at DESC);

-- Enable RLS for comments
ALTER TABLE public.diagram_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible diagrams"
    ON public.diagram_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email()
                )
            )
        )
    );

CREATE POLICY "Users can insert comments on accessible diagrams"
    ON public.diagram_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email()
                )
            )
        )
    );

CREATE POLICY "Users can update or resolve comments on accessible diagrams"
    ON public.diagram_comments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_comments.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email()
                )
            )
        )
    );

-- 2. Diagram Security & Activity Audit Log Table
CREATE TABLE IF NOT EXISTS public.diagram_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    action_type TEXT NOT NULL, -- e.g. 'DIAGRAM_EDITED', 'VERSION_RESTORED', 'COLLABORATOR_ADDED', 'EXPORTED_SVG'
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_diagram_activity_logs_diagram_id ON public.diagram_activity_logs(diagram_id, created_at DESC);

ALTER TABLE public.diagram_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs on accessible diagrams"
    ON public.diagram_activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diagrams d
            WHERE d.id = diagram_activity_logs.diagram_id
            AND (
                d.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.diagram_collaborators c
                    WHERE c.diagram_id = d.id AND c.user_email = auth.email()
                )
            )
        )
    );

CREATE POLICY "Users can record activity logs"
    ON public.diagram_activity_logs
    FOR INSERT
    WITH CHECK (true);
