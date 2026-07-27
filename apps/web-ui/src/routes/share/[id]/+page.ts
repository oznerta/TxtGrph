import { createSupabaseBrowserClient } from '$lib/supabase/client';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { SharedDiagramPayload } from '@txtgrph/core';

export const load: PageLoad = async ({ params }) => {
  const token = params.id;
  if (!token) {
    throw error(404, 'Invalid or missing share link.');
  }

  const supabase = createSupabaseBrowserClient();

  const { data: diagramData, error: dbError } = await supabase
    .from('diagrams')
    .select('id, share_token, title, code, config, updated_at, is_shared, is_deleted')
    .eq('share_token', token)
    .eq('is_shared', true)
    .eq('is_deleted', false)
    .maybeSingle();

  if (dbError || !diagramData) {
    throw error(404, 'This diagram link is invalid, revoked, or has been deleted.');
  }

  const sharedDiagram: SharedDiagramPayload = {
    id: diagramData.id,
    shareToken: diagramData.share_token,
    title: diagramData.title,
    code: diagramData.code,
    config: diagramData.config || {},
    updatedAt: diagramData.updated_at
  };

  return {
    diagram: sharedDiagram
  };
};
