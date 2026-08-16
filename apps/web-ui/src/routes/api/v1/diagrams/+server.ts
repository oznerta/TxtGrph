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

  const folderId = event.url.searchParams.get('folder_id');
  const limitParam = event.url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

  let query = supabase
    .from('diagrams')
    .select('id, title, folder_id, config, created_at, updated_at')
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  const { data, error } = await query;

  if (error) {
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return json({ success: true, data });
};

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  try {
    const body = await event.request.json();
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Untitled Diagram';
    const rawCode = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : 'flowchart TD\n    A[Start] --> B[End]';
    let folderId = typeof body.folder_id === 'string' && body.folder_id.trim() ? body.folder_id.trim() : null;
    const folderName = typeof body.folder_name === 'string' && body.folder_name.trim() ? body.folder_name.trim() : null;
    const config = typeof body.config === 'object' && body.config !== null ? body.config : {};

    // Auto-resolve or create folder by name if folder_id is not specified
    if (!folderId && folderName) {
      const { data: existingFolder } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', authUser.userId)
        .eq('name', folderName)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existingFolder?.id) {
        folderId = existingFolder.id;
      } else {
        const { data: newFolder } = await supabase
          .from('folders')
          .insert({
            user_id: authUser.userId,
            name: folderName,
            is_deleted: false,
          })
          .select('id')
          .single();

        if (newFolder?.id) {
          folderId = newFolder.id;
        }
      }
    }

    // Sanitize Mermaid code string
    const sanitizedCode = sanitizeMermaidOutput(rawCode);

    const { data, error } = await supabase
      .from('diagrams')
      .insert({
        user_id: authUser.userId,
        title,
        code: sanitizedCode,
        folder_id: folderId,
        config,
        is_deleted: false,
      })
      .select('id, title, code, config, folder_id, created_at, updated_at')
      .single();

    if (error) {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }

    return json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON payload' } },
      { status: 400 }
    );
  }
};
