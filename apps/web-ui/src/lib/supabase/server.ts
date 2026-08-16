import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export function createSupabaseServerClient(event: RequestEvent) {
  return createServerClient(
    PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: any }>) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              event.cookies.set(name, value, { ...options, path: '/' });
            });
          } catch {
            // The `setAll` method was called from a Server Component / late response context.
          }
        },
      },
    }
  );
}

export function createSupabaseAdminClient() {
  const key = SUPABASE_SERVICE_ROLE_KEY || PUBLIC_SUPABASE_ANON_KEY;
  return createClient(
    PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
