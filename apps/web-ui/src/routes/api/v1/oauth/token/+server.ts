import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { hashToken } from '$lib/server/mcpAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Client-Id, Client-Secret, X-Txtgrph-Api-Key',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const request = event.request;

  let rawToken: string | null = null;
  let clientId: string | null = null;

  // 1. Check HTTP Basic Authorization header: Authorization: Basic <base64(client_id:client_secret)>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.substring(6).trim(), 'base64').toString('utf-8');
      const parts = decoded.split(':');
      clientId = parts[0];
      rawToken = parts[1] || null;
    } catch {
      // ignore
    }
  }

  // 2. Parse form-urlencoded or JSON request body
  if (!rawToken) {
    try {
      const contentType = request.headers.get('Content-Type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        rawToken = (formData.get('client_secret') as string) || (formData.get('code') as string) || null;
        clientId = (formData.get('client_id') as string) || clientId;
      } else {
        const body = await request.json();
        rawToken = body.client_secret || body.code || null;
        clientId = body.client_id || clientId;
      }
    } catch {
      // ignore
    }
  }

  if (!rawToken) {
    return json(
      {
        error: 'invalid_request',
        error_description: 'Missing client_secret or authorization credentials'
      },
      { status: 400, headers: corsHeaders }
    );
  }

  const tokenHash = hashToken(rawToken);

  // Verify against Supabase mcp_tokens table
  const { data, error } = await supabase.rpc('verify_and_touch_mcp_token', {
    p_token_hash: tokenHash,
  });

  if (error || !data || data.length === 0) {
    // Fallback: Direct table query
    const { data: tokenRecord, error: queryErr } = await supabase
      .from('mcp_tokens')
      .select('id, user_id, scopes, expires_at')
      .eq('token_hash', tokenHash)
      .single();

    if (queryErr || !tokenRecord) {
      return json(
        {
          error: 'invalid_client',
          error_description: 'Invalid Client Secret or MCP API Key'
        },
        { status: 401, headers: corsHeaders }
      );
    }
  }

  // Return standard OAuth 2.0 token response
  return json(
    {
      access_token: rawToken.trim(),
      token_type: 'Bearer',
      expires_in: 31536000,
      scope: 'mcp read write',
      client_id: clientId || 'txtgrph'
    },
    { headers: corsHeaders }
  );
};
