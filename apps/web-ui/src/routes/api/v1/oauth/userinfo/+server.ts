import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

async function handleUserInfo(event: Parameters<RequestHandler>[0]) {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let email = 'user@txtgrph.app';
  let name = 'TxtGrph User';

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authUser.userId)
      .maybeSingle();

    if (profile?.full_name) {
      name = profile.full_name;
    }
  } catch {
    // best-effort
  }

  return json(
    {
      sub: authUser.userId,
      name: name,
      email: email,
      email_verified: true,
      updated_at: new Date().toISOString()
    },
    { headers: corsHeaders }
  );
}

export const GET: RequestHandler = handleUserInfo;
export const POST: RequestHandler = handleUserInfo;
