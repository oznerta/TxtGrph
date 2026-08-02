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
      resource: `${origin}/api/v1/mcp`,
      authorization_servers: [origin],
      scopes_supported: ['mcp', 'read', 'write'],
      bearer_methods_supported: ['header', 'body']
    },
    { headers: corsHeaders }
  );
};
