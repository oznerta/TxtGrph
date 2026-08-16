import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient, createSupabaseAdminClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Client-Id, Client-Secret, X-Txtgrph-Api-Key',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401, headers: corsHeaders }
    );
  }

  const db = createSupabaseAdminClient();
  const { data: directFolders, error } = await db
    .from('folders')
    .select('id, name, parent_id, is_shared, organization_id, created_at, updated_at')
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  let allFolders: any[] = directFolders || [];

  try {
    const { data: sharedCollabs } = await db
      .from('folder_collaborators')
      .select('folder_id')
      .eq('user_id', authUser.userId);

    if (sharedCollabs && sharedCollabs.length > 0) {
      const sharedIds = sharedCollabs
        .map((sc: any) => sc.folder_id)
        .filter((id: string) => !allFolders.some((f) => f.id === id));

      if (sharedIds.length > 0) {
        const { data: sharedFolders } = await db
          .from('folders')
          .select('id, name, parent_id, is_shared, organization_id, created_at, updated_at')
          .in('id', sharedIds)
          .eq('is_deleted', false);

        if (sharedFolders) {
          allFolders = [...allFolders, ...sharedFolders];
        }
      }
    }

    const { data: orgMemberships } = await db
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', authUser.userId);

    if (orgMemberships && orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((om: any) => om.organization_id);
      const { data: orgFolders } = await db
        .from('folders')
        .select('id, name, parent_id, is_shared, organization_id, created_at, updated_at')
        .in('organization_id', orgIds)
        .eq('is_deleted', false);

      if (orgFolders) {
        orgFolders.forEach((of: any) => {
          if (!allFolders.some((f) => f.id === of.id)) {
            allFolders.push(of);
          }
        });
      }
    }
  } catch {
    // best-effort
  }

  if (error && allFolders.length === 0) {
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500, headers: corsHeaders }
    );
  }

  return json({ success: true, data: allFolders }, { headers: corsHeaders });
};

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await event.request.json();
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const parentId = typeof body.parent_id === 'string' && body.parent_id.trim() ? body.parent_id.trim() : null;

    if (!name) {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required field: name' } },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = createSupabaseAdminClient();

    // Check if folder already exists
    let checkQuery = db
      .from('folders')
      .select('id, name, parent_id, created_at, updated_at')
      .eq('user_id', authUser.userId)
      .eq('name', name)
      .eq('is_deleted', false);

    if (parentId) {
      checkQuery = checkQuery.eq('parent_id', parentId);
    } else {
      checkQuery = checkQuery.is('parent_id', null);
    }

    const { data: existing } = await checkQuery.maybeSingle();
    if (existing) {
      return json(
        {
          success: true,
          data: existing,
          message: 'Folder already exists'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const { data, error } = await db
      .from('folders')
      .insert({
        user_id: authUser.userId,
        name: name,
        parent_id: parentId,
        is_deleted: false
      })
      .select('id, name, parent_id, created_at, updated_at')
      .single();

    if (error) {
      return json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
        { status: 500, headers: corsHeaders }
      );
    }

    return json({ success: true, data }, { status: 201, headers: corsHeaders });
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON payload' } },
      { status: 400, headers: corsHeaders }
    );
  }
};
