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
  const { data, error } = await db
    .from('folders')
    .select('id, name, parent_id, created_at, updated_at')
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (error) {
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500, headers: corsHeaders }
    );
  }

  return json({ success: true, data }, { headers: corsHeaders });
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
