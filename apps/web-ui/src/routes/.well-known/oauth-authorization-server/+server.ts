import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url }) => {
  const origin = url.origin;
  return json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/v1/oauth/authorize`,
      token_endpoint: `${origin}/api/v1/oauth/token`,
      userinfo_endpoint: `${origin}/api/v1/oauth/userinfo`,
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['client_credentials', 'authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
      scopes_supported: ['read', 'write', 'mcp']
    },
    { headers: corsHeaders }
  );
};
