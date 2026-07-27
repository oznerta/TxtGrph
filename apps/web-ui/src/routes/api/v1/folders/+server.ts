import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { authenticateMcpRequest } from '$lib/server/mcpAuth';

export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const authUser = await authenticateMcpRequest(event.request, supabase);

  if (!authUser) {
    return json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('folders')
    .select('id, name, parent_id, created_at, updated_at')
    .eq('user_id', authUser.userId)
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (error) {
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return json({ success: true, data });
};
