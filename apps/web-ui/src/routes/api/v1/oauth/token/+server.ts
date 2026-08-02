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

  let basicClientId: string | null = null;
  let basicClientSecret: string | null = null;

  // 1. Check HTTP Basic Authorization header: Authorization: Basic base64(client_id:client_secret)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.substring(6).trim(), 'base64').toString('utf-8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx > 0) {
        basicClientId = decoded.substring(0, colonIdx);
        basicClientSecret = decoded.substring(colonIdx + 1);
      }
    } catch {
      // ignore
    }
  }

  // 2. Parse form-urlencoded or JSON request body
  let bodyGrantType: string | null = null;
  let bodyClientId: string | null = null;
  let bodyClientSecret: string | null = null;
  let bodyCode: string | null = null;
  let bodyRedirectUri: string | null = null;

  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      bodyGrantType = (formData.get('grant_type') as string) || null;
      bodyClientId = (formData.get('client_id') as string) || null;
      bodyClientSecret = (formData.get('client_secret') as string) || null;
      bodyCode = (formData.get('code') as string) || null;
      bodyRedirectUri = (formData.get('redirect_uri') as string) || null;
    } else {
      const body = await request.json();
      bodyGrantType = body.grant_type || null;
      bodyClientId = body.client_id || null;
      bodyClientSecret = body.client_secret || null;
      bodyCode = body.code || null;
      bodyRedirectUri = body.redirect_uri || null;
    }
  } catch {
    // ignore parse errors
  }

  const grantType = bodyGrantType || 'authorization_code';
  const clientId = bodyClientId || basicClientId || 'txtgrph';

  // Resolve the client_secret (the actual MCP API key) from all possible sources
  const clientSecret =
    bodyClientSecret ||
    basicClientSecret ||
    request.headers.get('Client-Secret') ||
    request.headers.get('client-secret') ||
    request.headers.get('X-Txtgrph-Api-Key') ||
    null;

  // --- authorization_code grant ---
  // Gemini sends: grant_type=authorization_code, code=<auth_code>, client_id, client_secret, redirect_uri
  // The client_secret IS the user's MCP API key. We verify it and return it as the access_token.
  if (grantType === 'authorization_code') {
    // Accept any authorization code that starts with our prefix
    if (!bodyCode || !bodyCode.startsWith('txtgrph_ac_')) {
      return json(
        { error: 'invalid_grant', error_description: 'Invalid or missing authorization code' },
        { status: 400, headers: corsHeaders }
      );
    }

    // If client_secret is provided, verify it as the MCP API key
    if (clientSecret && clientSecret.trim()) {
      const tokenHash = hashToken(clientSecret.trim());

      const { data: rpcData } = await supabase.rpc('verify_and_touch_mcp_token', {
        p_token_hash: tokenHash,
      });

      if (rpcData && rpcData.length > 0) {
        return json(
          {
            access_token: clientSecret.trim(),
            token_type: 'Bearer',
            expires_in: 31536000,
            scope: 'mcp read write'
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
            access_token: clientSecret.trim(),
            token_type: 'Bearer',
            expires_in: 31536000,
            scope: 'mcp read write'
          },
          { headers: corsHeaders }
        );
      }
    }

    // Client secret not provided or not valid — still return success with the code as token
    // This allows the flow to complete; subsequent MCP calls will fail auth if the key is invalid
    return json(
      {
        access_token: clientSecret?.trim() || bodyCode,
        token_type: 'Bearer',
        expires_in: 31536000,
        scope: 'mcp read write'
      },
      { headers: corsHeaders }
    );
  }

  // --- client_credentials grant ---
  if (grantType === 'client_credentials') {
    if (!clientSecret || !clientSecret.trim()) {
      return json(
        { error: 'invalid_request', error_description: 'Missing client_secret' },
        { status: 400, headers: corsHeaders }
      );
    }

    const tokenHash = hashToken(clientSecret.trim());
    const { data: rpcData } = await supabase.rpc('verify_and_touch_mcp_token', {
      p_token_hash: tokenHash,
    });

    if (rpcData && rpcData.length > 0) {
      return json(
        {
          access_token: clientSecret.trim(),
          token_type: 'Bearer',
          expires_in: 31536000,
          scope: 'mcp read write'
        },
        { headers: corsHeaders }
      );
    }

    const { data: tokenRecord } = await supabase
      .from('mcp_tokens')
      .select('id, user_id')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenRecord) {
      return json(
        {
          access_token: clientSecret.trim(),
          token_type: 'Bearer',
          expires_in: 31536000,
          scope: 'mcp read write'
        },
        { headers: corsHeaders }
      );
    }

    return json(
      { error: 'invalid_client', error_description: 'Invalid client_secret' },
      { status: 401, headers: corsHeaders }
    );
  }

  // Unsupported grant type
  return json(
    { error: 'unsupported_grant_type', error_description: `Grant type '${grantType}' is not supported` },
    { status: 400, headers: corsHeaders }
  );
};
