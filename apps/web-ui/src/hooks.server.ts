import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { loadAppConfig } from '@txtgrph/config';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY, VAULT_ROOT_KEY } from '$env/static/private';

const nodeEnv = (globalThis as any).process?.env?.NODE_ENV || 'development';

// Boot validation check
try {
  loadAppConfig({
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    VAULT_ROOT_KEY,
    NODE_ENV: nodeEnv,
  });
} catch (err) {
  // Fail fast in production or log warning in dev when placeholders are present
  if (nodeEnv === 'production') {
    throw err;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  try {
    event.locals.supabase = createSupabaseServerClient(event);
  } catch (err) {
    console.error('Supabase server client init error:', err);
  }

  event.locals.safeGetSession = async () => {
    try {
      if (!event.locals.supabase) {
        return { session: null, user: null };
      }
      const {
        data: { session },
      } = await event.locals.supabase.auth.getSession();
      if (!session) {
        return { session: null, user: null };
      }

      const {
        data: { user },
        error,
      } = await event.locals.supabase.auth.getUser();
      if (error) {
        return { session: null, user: null };
      }

      return { session, user };
    } catch (err) {
      console.error('safeGetSession error:', err);
      return { session: null, user: null };
    }
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-parse-all-headers';
    },
  });
};
