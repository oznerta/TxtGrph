import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url }) => {
  return json(
    {
      success: true,
      message: 'TxtGrph Dynamic Client Registration Endpoint (RFC 7591)',
      usage: 'Send a POST request with client_name, redirect_uris, and grant_types to dynamically register an OAuth 2.0 client.'
    },
    { headers: corsHeaders }
  );
};

/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration Protocol
 * Automatically registers clients (e.g. Google Gemini, Claude, ChatGPT, OpenHands)
 * so users never have to manually generate or paste Client ID / Client Secret.
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    let body: any = {};
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const clientName = (typeof body.client_name === 'string' && body.client_name.trim())
      ? body.client_name.trim()
      : 'Gemini Custom Connected App';

    let redirectUris: string[] = [];
    if (Array.isArray(body.redirect_uris)) {
      redirectUris = body.redirect_uris;
    } else if (typeof body.redirect_uris === 'string') {
      redirectUris = [body.redirect_uris];
    } else if (typeof body.redirect_uri === 'string') {
      redirectUris = [body.redirect_uri];
    }

    const grantTypes = Array.isArray(body.grant_types) && body.grant_types.length > 0
      ? body.grant_types
      : ['authorization_code', 'refresh_token'];

    const responseTypes = Array.isArray(body.response_types) && body.response_types.length > 0
      ? body.response_types
      : ['code'];

    const tokenEndpointAuthMethod = body.token_endpoint_auth_method || 'client_secret_post';

    // Generate dynamic client credentials
    const clientId = `txtgrph_client_${randomBytes(16).toString('hex')}`;
    const clientSecret = `txtgrph_secret_${randomBytes(32).toString('hex')}`;
    const issuedAt = Math.floor(Date.now() / 1000);

    const clientMetadata = {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      client_id_issued_at: issuedAt,
      client_secret_expires_at: 0,
      scope: 'mcp read write'
    };

    return json(clientMetadata, {
      status: 201,
      headers: corsHeaders
    });
  } catch (err: any) {
    return json(
      {
        error: 'invalid_client_metadata',
        error_description: err?.message || 'Failed to process client registration'
      },
      {
        status: 400,
        headers: corsHeaders
      }
    );
  }
};
