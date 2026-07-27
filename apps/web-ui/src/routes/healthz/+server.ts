import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'txtgrph-web',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
