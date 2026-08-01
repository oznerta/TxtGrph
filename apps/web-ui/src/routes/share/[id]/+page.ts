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
  const { data: sessionData } = await supabase.auth.getSession();
  const userEmail = sessionData?.session?.user?.email || null;
  const userId = sessionData?.session?.user?.id || null;

  // 1. Try resolving diagram by share_token
  const { data: diagramData } = await supabase
    .from('diagrams')
    .select('id, user_id, share_token, title, code, config, updated_at, is_shared, is_deleted')
    .eq('share_token', token)
    .eq('is_shared', true)
    .eq('is_deleted', false)
    .maybeSingle();

  if (diagramData) {
    let userRole: 'editor' | 'viewer' = 'viewer';

    if (userId && diagramData.user_id === userId) {
      userRole = 'editor';
    } else if (userEmail) {
      const { data: collab } = await supabase
        .from('diagram_collaborators')
        .select('role')
        .eq('diagram_id', diagramData.id)
        .eq('user_email', userEmail)
        .maybeSingle();

      if (collab?.role === 'editor') {
        userRole = 'editor';
      }
    }

    const sharedDiagram: SharedDiagramPayload = {
      id: diagramData.id,
      shareToken: diagramData.share_token,
      title: diagramData.title,
      code: diagramData.code,
      config: diagramData.config || {},
      updatedAt: diagramData.updated_at
    };

    const config = (diagramData.config || {}) as any;
    const allowComments = config.allowComments !== false;
    const allowTimeline = config.allowTimeline === true;
    const allowForking = config.allowForking !== false;

    return {
      type: 'diagram' as const,
      diagram: sharedDiagram,
      userRole,
      userEmail,
      isLoggedIn: !!userId,
      allowComments,
      allowTimeline,
      allowForking
    };
  }

  // 2. Try resolving folder by share_token
  const { data: folderData } = await supabase
    .from('folders')
    .select('id, user_id, name, is_shared, share_token, updated_at')
    .eq('share_token', token)
    .eq('is_shared', true)
    .eq('is_deleted', false)
    .maybeSingle();

  if (folderData) {
    const { data: folderDiagrams } = await supabase
      .from('diagrams')
      .select('id, share_token, title, code, config, updated_at')
      .eq('folder_id', folderData.id)
      .eq('is_deleted', false);

    return {
      type: 'folder' as const,
      folder: {
        id: folderData.id,
        name: folderData.name,
        shareToken: folderData.share_token,
        updatedAt: folderData.updated_at
      },
      diagrams: (folderDiagrams || []).map((d: any) => ({
        id: d.id,
        shareToken: d.share_token,
        title: d.title,
        code: d.code,
        config: d.config || {},
        updatedAt: d.updated_at
      })),
      isLoggedIn: !!userId
    };
  }

  throw error(404, 'This share link is invalid, revoked, or has been deleted.');
};
