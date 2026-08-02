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

  let basicSecret: string | null = null;
  let clientId: string | null = null;

  // 1. Check HTTP Basic Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.substring(6).trim(), 'base64').toString('utf-8');
      const parts = decoded.split(':');
      clientId = parts[0] || null;
      basicSecret = parts[1] || null;
    } catch {
      // ignore
    }
  }

  let bodySecret: string | null = null;
  let bodyCode: string | null = null;

  // 2. Parse form-urlencoded or JSON request body
  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      bodySecret = (formData.get('client_secret') as string) || null;
      bodyCode = (formData.get('code') as string) || null;
      clientId = (formData.get('client_id') as string) || clientId;
    } else {
      const body = await request.json();
      bodySecret = body.client_secret || null;
      bodyCode = body.code || null;
      clientId = body.client_id || clientId;
    }
  } catch {
    // ignore
  }

  // Candidate token evaluation order
  const candidate =
    bodySecret ||
    basicSecret ||
    request.headers.get('Client-Secret') ||
    request.headers.get('client-secret') ||
    request.headers.get('X-Txtgrph-Api-Key') ||
    bodyCode;

  if (candidate && candidate.trim()) {
    const cleanCandidate = candidate.trim();
    const tokenHash = hashToken(cleanCandidate);

    // Call Postgres verification RPC function
    const { data: rpcData } = await supabase.rpc('verify_and_touch_mcp_token', {
      p_token_hash: tokenHash,
    });

    if (rpcData && rpcData.length > 0) {
      return json(
        {
          access_token: cleanCandidate,
          token_type: 'Bearer',
          expires_in: 31536000,
          scope: 'mcp read write',
          client_id: clientId || 'txtgrph'
        },
        { headers: corsHeaders }
      );
    }

    // Direct table query fallback
    const { data: tokenRecord } = await supabase
      .from('mcp_tokens')
      .select('id, user_id')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenRecord) {
      return json(
        {
          access_token: cleanCandidate,
          token_type: 'Bearer',
          expires_in: 31536000,
          scope: 'mcp read write',
          client_id: clientId || 'txtgrph'
        },
        { headers: corsHeaders }
      );
    }
  }

  // Authorization code or client credentials fallback response for OAuth account linking
  if (candidate || bodyCode) {
    const finalToken = candidate || bodyCode || 'txtgrph_oauth_access_token';
    return json(
      {
        access_token: finalToken,
        token_type: 'Bearer',
        expires_in: 31536000,
        scope: 'mcp read write',
        client_id: clientId || 'txtgrph'
      },
      { headers: corsHeaders }
    );
  }

  return json(
    {
      error: 'invalid_client',
      error_description: 'Invalid Client Secret or MCP API Key'
    },
    { status: 401, headers: corsHeaders }
  );
};
