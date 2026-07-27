import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';
import { sanitizeMermaidOutput } from '@txtgrph/core';

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  const { id } = event.params;

  const { data, error } = await supabase
    .from('diagrams')
    .select('id, title, code, config, folder_id, is_shared, share_token, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .single();

  if (error || !data) {
    return json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Diagram not found' } },
      { status: 404 }
    );
  }

  return json({ success: true, data });
};

export const PUT: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  const { id } = event.params;

  try {
    const body = await event.request.json();
    const updatePayload: Record<string, any> = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      updatePayload.title = body.title.trim();
    }
    if (typeof body.code === 'string') {
      updatePayload.code = sanitizeMermaidOutput(body.code);
    }
    if (body.folder_id !== undefined) {
      updatePayload.folder_id = body.folder_id ? body.folder_id.trim() : null;
    }
    if (typeof body.config === 'object' && body.config !== null) {
      updatePayload.config = body.config;
    }

    if (Object.keys(updatePayload).length === 0) {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No valid fields provided for update' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('diagrams')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', authUser.userId)
      .eq('is_deleted', false)
      .select('id, title, code, config, folder_id, updated_at')
      .single();

    if (error || !data) {
      return json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Diagram not found or update failed' } },
        { status: 404 }
      );
    }

    return json({ success: true, data });
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON body' } },
      { status: 400 }
    );
  }
};

export const DELETE: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  const { id } = event.params;

  const { data, error } = await supabase
    .from('diagrams')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .select('id')
    .single();

  if (error || !data) {
    return json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Diagram not found or already deleted' } },
      { status: 404 }
    );
  }

  return json({ success: true, data: { id, deleted: true } });
};
