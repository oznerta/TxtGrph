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
      registration_endpoint: `${origin}/api/v1/oauth/register`,
      userinfo_endpoint: `${origin}/api/v1/oauth/userinfo`,
      response_types_supported: ['code', 'token', 'id_token', 'code id_token'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      code_challenge_methods_supported: ['S256', 'plain'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256', 'RS256'],
      scopes_supported: ['mcp', 'read', 'write', 'openid', 'profile', 'email'],
      service_documentation: `${origin}/settings`
    },
    { headers: corsHeaders }
  );
};
