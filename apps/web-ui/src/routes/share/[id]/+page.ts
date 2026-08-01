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

  // 1. Try resolving diagram by share_token OR by id (if inside a shared folder)
  const { data: diagramData } = await supabase
    .from('diagrams')
    .select('id, user_id, folder_id, share_token, title, code, config, updated_at, is_shared, public_access_role, is_deleted')
    .or(`share_token.eq.${token},id.eq.${token}`)
    .eq('is_deleted', false)
    .maybeSingle();

  if (diagramData) {
    let canAccess = false;
    let effectiveRole: 'editor' | 'commenter' | 'viewer' = (diagramData.public_access_role as any) || 'viewer';

    // Owner access
    if (userId && diagramData.user_id === userId) {
      canAccess = true;
      effectiveRole = 'editor';
    } 
    // Direct share access
    else if (diagramData.is_shared && diagramData.share_token) {
      canAccess = true;
    }
    // Shared folder access check
    else if (diagramData.folder_id) {
      const { data: isParentPublic } = await supabase.rpc('is_folder_in_public_shared_tree', {
        p_folder_id: diagramData.folder_id
      });
      if (isParentPublic) {
        canAccess = true;
      }
    }

    // Explicit collaborator role override if logged in
    if (userEmail && canAccess) {
      const { data: collab } = await supabase
        .from('diagram_collaborators')
        .select('role')
        .eq('diagram_id', diagramData.id)
        .eq('user_email', userEmail)
        .maybeSingle();

      if (collab?.role) {
        effectiveRole = collab.role as any;
      }
    }

    if (canAccess) {
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
        userRole: effectiveRole,
        userEmail,
        isLoggedIn: !!userId,
        allowComments,
        allowTimeline,
        allowForking
      };
    }
  }

  // 2. Try resolving folder by share_token OR id
  const { data: folderData } = await supabase
    .from('folders')
    .select('id, user_id, parent_id, name, is_shared, share_token, public_access_role, updated_at')
    .or(`share_token.eq.${token},id.eq.${token}`)
    .eq('is_deleted', false)
    .maybeSingle();

  if (folderData) {
    let canAccessFolder = false;
    let effectiveFolderRole: 'editor' | 'commenter' | 'viewer' = (folderData.public_access_role as any) || 'viewer';

    if (userId && folderData.user_id === userId) {
      canAccessFolder = true;
      effectiveFolderRole = 'editor';
    } else if (folderData.is_shared) {
      canAccessFolder = true;
    } else if (folderData.parent_id) {
      const { data: isParentPublic } = await supabase.rpc('is_folder_in_public_shared_tree', {
        p_folder_id: folderData.parent_id
      });
      if (isParentPublic) {
        canAccessFolder = true;
      }
    }

    if (canAccessFolder) {
      // Recursively fetch all sub-folders and diagrams inside folderData.id tree
      const allFolderIds: string[] = [folderData.id];
      let currentParentIds: string[] = [folderData.id];

      while (currentParentIds.length > 0) {
        const { data: children } = await supabase
          .from('folders')
          .select('id')
          .in('parent_id', currentParentIds)
          .eq('is_deleted', false);

        if (!children || children.length === 0) break;
        const childIds = children.map((c: any) => c.id);
        allFolderIds.push(...childIds);
        currentParentIds = childIds;
      }

      // Fetch sub-folders (direct children of the current folder)
      const { data: directSubFolders } = await supabase
        .from('folders')
        .select('id, name, share_token, updated_at')
        .eq('parent_id', folderData.id)
        .eq('is_deleted', false);

      // Fetch diagrams across all accessible folder IDs in tree
      const { data: folderDiagrams } = await supabase
        .from('diagrams')
        .select('id, folder_id, share_token, title, code, config, updated_at')
        .in('folder_id', allFolderIds)
        .eq('is_deleted', false);

      return {
        type: 'folder' as const,
        folder: {
          id: folderData.id,
          name: folderData.name,
          shareToken: folderData.share_token,
          updatedAt: folderData.updated_at,
          publicAccessRole: effectiveFolderRole
        },
        subFolders: (directSubFolders || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          shareToken: f.share_token,
          updatedAt: f.updated_at
        })),
        diagrams: (folderDiagrams || []).map((d: any) => ({
          id: d.id,
          folderId: d.folder_id,
          shareToken: d.share_token,
          title: d.title,
          code: d.code,
          config: d.config || {},
          updatedAt: d.updated_at
        })),
        userRole: effectiveFolderRole,
        isLoggedIn: !!userId
      };
    }
  }

  throw error(404, 'This share link is invalid, revoked, or has been deleted.');
};
