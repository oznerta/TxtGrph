import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';
import { TOOL_DEFINITIONS, handleMcpToolCall } from '@txtgrph/mcp-server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Client-Id, Client-Secret, X-Txtgrph-Api-Key',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
};

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);
  const origin = event.url.origin;

  return json(
    {
      success: true,
      data: {
        server: 'txtgrph-mcp-server',
        version: '0.1.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          auth: {
            type: 'oauth2',
            issuer: origin,
            authorization_endpoint: `${origin}/api/v1/oauth/authorize`,
            token_endpoint: `${origin}/api/v1/oauth/token`,
            userinfo_endpoint: `${origin}/api/v1/oauth/userinfo`
          }
        },
        tools: TOOL_DEFINITIONS,
      },
    },
    { headers: corsHeaders }
  );
};

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized: Invalid or missing Bearer API Token or OAuth credentials' },
        id: null
      },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await event.request.json();
    const requestId = body?.id ?? null;

    // Handle JSON-RPC 2.0 protocol requests (initialize, ping, tools/list, tools/call)
    if (body?.jsonrpc === '2.0' || body?.method) {
      const method = body.method;

      if (method === 'initialize') {
        return json(
          {
            jsonrpc: '2.0',
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                auth: {
                  type: 'oauth2',
                  token_endpoint: `${event.url.origin}/api/v1/oauth/token`
                }
              },
              serverInfo: { name: 'txtgrph-mcp-server', version: '0.1.0' }
            },
            id: requestId
          },
          { headers: corsHeaders }
        );
      }

      if (method === 'ping') {
        return json({ jsonrpc: '2.0', result: {}, id: requestId }, { headers: corsHeaders });
      }

      if (method === 'tools/list') {
        return json(
          {
            jsonrpc: '2.0',
            result: { tools: TOOL_DEFINITIONS },
            id: requestId
          },
          { headers: corsHeaders }
        );
      }

      if (method === 'tools/call') {
        const toolName = body.params?.name;
        const toolArgs = body.params?.arguments || {};
        if (!toolName) {
          return json(
            {
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Invalid params: Missing tool name' },
              id: requestId
            },
            { status: 400, headers: corsHeaders }
          );
        }

        const result = await handleMcpToolCall(toolName, toolArgs, supabase, authUser.userId);
        if (result.isError) {
          return json(
            {
              jsonrpc: '2.0',
              error: { code: -32603, message: result.content[0]?.text || 'Tool execution failed' },
              id: requestId
            },
            { headers: corsHeaders }
          );
        }

        return json(
          {
            jsonrpc: '2.0',
            result: { content: result.content },
            id: requestId
          },
          { headers: corsHeaders }
        );
      }

      return json(
        {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id: requestId
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Direct REST tool call format fallback ({ name, arguments })
    const { name, arguments: toolArgs } = body;
    if (!name || typeof name !== 'string') {
      return json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing tool name or method' } },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await handleMcpToolCall(name, toolArgs || {}, supabase, authUser.userId);

    return json(
      {
        success: !result.isError,
        data: result,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return json(
      { success: false, error: { code: 'INVALID_JSON', message: err?.message || 'Malformed JSON payload' } },
      { status: 400, headers: corsHeaders }
    );
  }
};
