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
      name: 'txtgrph-mcp-server',
      version: '0.1.0',
      description: 'TxtGrph MCP Server for Gemini, Claude, ChatGPT, and Cursor',
      protocolVersion: '2024-11-05',
      transports: [
        {
          type: 'http',
          url: `${origin}/api/v1/mcp`
        }
      ],
      authentication: {
        type: 'oauth2',
        authorization_url: `${origin}/api/v1/oauth/authorize`,
        token_url: `${origin}/api/v1/oauth/token`,
        scopes: ['mcp', 'read', 'write']
      }
    },
    { headers: corsHeaders }
  );
};
