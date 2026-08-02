import { GET as handleGet, POST as handlePost, OPTIONS as handleOptions } from '../../api/v1/oauth/authorize/+server';

export const OPTIONS = handleOptions;
export const GET = handleGet;
export const POST = handlePost;
