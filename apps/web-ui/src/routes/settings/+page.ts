import { createSupabaseBrowserClient } from '$lib/supabase/client';
import type { PageLoad } from './$types';

export interface UserKeyRecord {
  id: string;
  provider: 'anthropic' | 'openai' | 'gemini' | 'custom';
  encrypted_key: string;
  key_hint: string;
  base_url: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export const load: PageLoad = async () => {
  const supabase = createSupabaseBrowserClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return {
      session: null,
      userKeys: [] as UserKeyRecord[],
    };
  }

  const { data: keysData } = await supabase
    .from('user_keys')
    .select('*')
    .order('created_at', { ascending: true });

  return {
    session,
    userKeys: (keysData || []) as UserKeyRecord[],
  };
};
