import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';
import { TOOL_DEFINITIONS, handleMcpToolCall } from '@txtgrph/mcp-server';

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  return json({
    success: true,
    data: {
      server: 'txtgrph-mcp-server',
      version: '0.1.0',
      tools: TOOL_DEFINITIONS,
    },
  });
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
    const { name, arguments: toolArgs } = body;

    if (!name || typeof name !== 'string') {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing tool name' } },
        { status: 400 }
      );
    }

    const result = await handleMcpToolCall(name, toolArgs || {}, supabase, authUser.userId);

    return json({
      success: !result.isError,
      data: result,
    });
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON payload' } },
      { status: 400 }
    );
  }
};
