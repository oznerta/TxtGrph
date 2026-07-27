import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  try {
    const { session } = (await locals.safeGetSession?.()) || { session: null };
    return {
      session,
    };
  } catch (err) {
    console.error('+layout.server load error:', err);
    return {
      session: null,
    };
  }
};
