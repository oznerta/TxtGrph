import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { hashToken, verifyAuthCode, createIdToken, verifyMcpToken } from '$lib/server/mcpAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Client-Id, Client-Secret, X-Txtgrph-Api-Key',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async (event) => {
  const request = event.request;
  const origin = event.url.origin;

  // --- Parse all possible credential sources ---
  let basicClientId: string | null = null;
  let basicClientSecret: string | null = null;

  // HTTP Basic: Authorization: Basic base64(client_id:client_secret)
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
      // ignore malformed Basic header
    }
  }

  // Body parameters (form-urlencoded or JSON)
  let bodyGrantType: string | null = null;
  let bodyClientId: string | null = null;
  let bodyClientSecret: string | null = null;
  let bodyCode: string | null = null;
  let bodyRefreshToken: string | null = null;

  try {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      bodyGrantType = (formData.get('grant_type') as string) || null;
      bodyClientId = (formData.get('client_id') as string) || null;
      bodyClientSecret = (formData.get('client_secret') as string) || null;
      bodyCode = (formData.get('code') as string) || null;
      bodyRefreshToken = (formData.get('refresh_token') as string) || null;
    } else {
      const body = await request.json();
      bodyGrantType = body.grant_type || null;
      bodyClientId = body.client_id || null;
      bodyClientSecret = body.client_secret || null;
      bodyCode = body.code || null;
      bodyRefreshToken = body.refresh_token || null;
    }
  } catch {
    // ignore parse errors — we'll work with what we have
  }

  // Also check custom headers
  const headerSecret =
    request.headers.get('Client-Secret') ||
    request.headers.get('client-secret') ||
    request.headers.get('X-Txtgrph-Api-Key') ||
    null;

  // Resolve final values
  const grantType = bodyGrantType || 'authorization_code';
  const clientId = bodyClientId || basicClientId || 'gemini';
  const clientSecret = bodyClientSecret || basicClientSecret || headerSecret;

  // ================================================================
  // authorization_code grant (used by Gemini and OAuth clients)
  // ================================================================
  if (grantType === 'authorization_code') {
    let accessToken = '';
    let userId = 'user';
    let userEmail = 'user@txtgrph.app';

    if (bodyCode) {
      const verified = verifyAuthCode(bodyCode.trim());
      if (verified?.token) {
        accessToken = verified.token;
        userId = verified.user || userId;
        userEmail = verified.email || userEmail;
      } else if (bodyCode.startsWith('txtgrph_mcp_')) {
        accessToken = bodyCode.trim();
      }
    }

    if (!accessToken && clientSecret?.trim() && clientSecret.startsWith('txtgrph_mcp_')) {
      accessToken = clientSecret.trim();
    }

    if (!accessToken) {
      accessToken = clientSecret?.trim() || bodyCode?.trim() || '';
    }

    if (accessToken) {
      const signedMcp = verifyMcpToken(accessToken);
      if (signedMcp?.userId) {
        userId = signedMcp.userId;
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Missing or invalid authorization code' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Best-effort token activity touch
    try {
      const supabase = createSupabaseServerClient(event);
      const tokenHash = hashToken(accessToken);
      await supabase.rpc('verify_and_touch_mcp_token', { p_token_hash: tokenHash });
    } catch {
      // Verification is best-effort — don't block the token exchange
    }

    const idToken = createIdToken(userId, userEmail, origin, clientId);

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 31536000,
        refresh_token: accessToken,
        id_token: idToken,
        scope: 'mcp read write openid profile email'
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // ================================================================
  // refresh_token grant (used by Google to maintain offline access)
  // ================================================================
  if (grantType === 'refresh_token') {
    const rawToken = bodyRefreshToken || clientSecret || bodyCode || '';
    if (!rawToken || !rawToken.trim()) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing refresh_token' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanToken = rawToken.trim();
    const idToken = createIdToken('user', 'user@txtgrph.app', origin, clientId);

    return new Response(
      JSON.stringify({
        access_token: cleanToken,
        token_type: 'Bearer',
        expires_in: 31536000,
        refresh_token: cleanToken,
        id_token: idToken,
        scope: 'mcp read write openid profile email'
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // ================================================================
  // client_credentials grant
  // ================================================================
  if (grantType === 'client_credentials') {
    if (!clientSecret || !clientSecret.trim()) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing client_secret' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanSecret = clientSecret.trim();

    try {
      const supabase = createSupabaseServerClient(event);
      const tokenHash = hashToken(cleanSecret);
      const { data: rpcData } = await supabase.rpc('verify_and_touch_mcp_token', {
        p_token_hash: tokenHash,
      });

      if (rpcData && rpcData.length > 0) {
        return new Response(
          JSON.stringify({
            access_token: cleanSecret,
            token_type: 'Bearer',
            expires_in: 31536000,
            refresh_token: cleanSecret,
            scope: 'mcp read write openid profile email'
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      // Fallback direct query
      const { data: tokenRecord } = await supabase
        .from('mcp_tokens')
        .select('id, user_id')
        .eq('token_hash', tokenHash)
        .single();

      if (tokenRecord) {
        return new Response(
          JSON.stringify({
            access_token: cleanSecret,
            token_type: 'Bearer',
            expires_in: 31536000,
            refresh_token: cleanSecret,
            scope: 'mcp read write openid profile email'
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } catch {
      // DB error — fall through to error response
    }

    return new Response(
      JSON.stringify({ error: 'invalid_client', error_description: 'Invalid client_secret' }),
      { status: 401, headers: corsHeaders }
    );
  }

  // ================================================================
  // Unsupported grant type
  // ================================================================
  return new Response(
    JSON.stringify({ error: 'unsupported_grant_type', error_description: `Unsupported: ${grantType}` }),
    { status: 400, headers: corsHeaders }
  );
};
