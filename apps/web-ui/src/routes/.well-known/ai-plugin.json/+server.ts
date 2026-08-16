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
      schema_version: 'v1',
      name_for_human: 'TxtGrph Diagrams',
      name_for_model: 'txtgrph',
      description_for_human: 'Create, edit, and organize Mermaid diagrams and flowcharts directly in your TxtGrph workspace.',
      description_for_model: 'TxtGrph allows creating, editing, managing, and rendering Mermaid diagrams and workspace folders for visualization.',
      auth: {
        type: 'oauth',
        client_url: `${origin}/api/v1/oauth/authorize`,
        scope: 'mcp read write openid profile email',
        authorization_url: `${origin}/api/v1/oauth/token`,
        authorization_content_type: 'application/x-www-form-urlencoded',
        verification_tokens: {}
      },
      api: {
        type: 'openapi',
        url: `${origin}/api/v1/openapi.json`
      },
      logo_url: `${origin}/favicon.png`,
      contact_email: 'support@txtgrph.app',
      legal_info_url: `${origin}/settings`
    },
    { headers: corsHeaders }
  );
};
