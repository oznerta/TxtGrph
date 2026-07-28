import { createSupabaseBrowserClient } from '$lib/supabase/client';
import type { PageLoad } from './$types';
import type { Folder, Diagram } from '@txtgrph/core';

export const load: PageLoad = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return {
      session: null,
      folders: [] as Folder[],
      diagrams: [] as Diagram[]
    };
  }

  // Fetch Folders for User (both active and trashed)
  const { data: foldersData } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  // Fetch Diagrams for User (both active and trashed)
  const { data: diagramsData } = await supabase
    .from('diagrams')
    .select('*')
    .order('updated_at', { ascending: false });

  const folders: Folder[] = (foldersData || []).map((f) => ({
    id: f.id,
    userId: f.user_id,
    parentId: f.parent_id,
    organizationId: f.organization_id || null,
    name: f.name,
    isDeleted: f.is_deleted || false,
    deletedAt: f.deleted_at || null,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  }));

  const diagrams: Diagram[] = (diagramsData || []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    folderId: d.folder_id,
    organizationId: d.organization_id || null,
    title: d.title,
    code: d.code,
    config: d.config || {},
    isShared: d.is_shared || false,
    shareToken: d.share_token || null,
    shareUpdatedAt: d.share_updated_at || null,
    isDeleted: d.is_deleted || false,
    deletedAt: d.deleted_at || null,
    createdAt: d.created_at,
    updatedAt: d.updated_at
  }));

  // Fetch Organizations for User
  const { data: orgsData } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id')
    .order('created_at', { ascending: true });

  const organizations = (orgsData || []).map((o: any) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    ownerId: o.owner_id
  }));

  // Fetch User Profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, headline')
    .eq('id', session.user.id)
    .maybeSingle();

  const userProfile = profileData
    ? {
        fullName: profileData.full_name || '',
        headline: profileData.headline || 'Diagram Architect',
        avatarUrl: profileData.avatar_url || ''
      }
    : null;

  return {
    session,
    folders,
    diagrams,
    organizations,
    userProfile
  };
};

