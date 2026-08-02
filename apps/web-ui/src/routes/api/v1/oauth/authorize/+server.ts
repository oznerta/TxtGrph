import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url }) => {
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const responseType = url.searchParams.get('response_type');

  if (redirectUri) {
    try {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', 'txtgrph_oauth_success');
      if (state) redirectUrl.searchParams.set('state', state);
      return Response.redirect(redirectUrl.toString(), 302);
    } catch {
      // ignore invalid redirect_uri
    }
  }

  return json(
    {
      success: true,
      message: 'TxtGrph OAuth 2.0 Authorization Server',
      response_type: responseType || 'code',
      state: state || null
    },
    { headers: corsHeaders }
  );
};
