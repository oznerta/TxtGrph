import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  let session = null;
  try {
    const res = await locals.safeGetSession?.();
    session = res?.session;
  } catch (err) {
    console.error('Workspace session load error:', err);
  }

  if (!session) {
    redirect(303, '/auth');
  }
  return {
    session,
  };
};
