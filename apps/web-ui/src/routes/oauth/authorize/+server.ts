import { GET as handleAuthorizeGet, OPTIONS as handleAuthorizeOptions } from '../../api/v1/oauth/authorize/+server';

export const OPTIONS = handleAuthorizeOptions;
export const GET = handleAuthorizeGet;
