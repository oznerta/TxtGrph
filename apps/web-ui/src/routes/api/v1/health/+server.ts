import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    success: true,
    data: {
      status: 'ok',
      service: 'TxtGrph Public REST API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
};
