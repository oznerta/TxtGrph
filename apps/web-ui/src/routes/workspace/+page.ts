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

  // Fetch Folders for User
  const { data: foldersData } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  // Fetch Diagrams for User
  const { data: diagramsData } = await supabase
    .from('diagrams')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  const folders: Folder[] = (foldersData || []).map((f) => ({
    id: f.id,
    userId: f.user_id,
    parentId: f.parent_id,
    name: f.name,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  }));

  const diagrams: Diagram[] = (diagramsData || []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    folderId: d.folder_id,
    title: d.title,
    code: d.code,
    config: d.config || {},
    isDeleted: d.is_deleted,
    createdAt: d.created_at,
    updatedAt: d.updated_at
  }));

  return {
    session,
    folders,
    diagrams
  };
};
