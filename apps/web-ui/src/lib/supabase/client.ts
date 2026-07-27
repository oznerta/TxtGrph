import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );
}
