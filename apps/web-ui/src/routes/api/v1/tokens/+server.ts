import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient, createSupabaseAdminClient } from '$lib/supabase/server';
import { generateMcpToken } from '$lib/server/mcpAuth';

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'User session required' } },
      { status: 401 }
    );
  }

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('mcp_tokens')
    .select('id, name, token_prefix, scopes, last_used_at, expires_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'User session required' } },
      { status: 401 }
    );
  }

  try {
    const body = await event.request.json();
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'API Access Token';

    const { rawToken, tokenHash, tokenPrefix } = generateMcpToken(user.id);
    const db = createSupabaseAdminClient();

    const { data, error } = await db
      .from('mcp_tokens')
      .insert({
        user_id: user.id,
        name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        scopes: ['read', 'write', 'mcp'],
      })
      .select('id, name, token_prefix, created_at')
      .single();

    if (error) {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }

    return json({
      success: true,
      data: {
        ...data,
        rawToken, // Provided ONCE upon creation
      },
    }, { status: 201 });
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON payload' } },
      { status: 400 }
    );
  }
};

export const DELETE: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'User session required' } },
      { status: 401 }
    );
  }

  const tokenId = event.url.searchParams.get('id');

  if (!tokenId) {
    return json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing token ID query parameter' } },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('mcp_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', user.id);

  if (error) {
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return json({ success: true, data: { id: tokenId, revoked: true } });
};
