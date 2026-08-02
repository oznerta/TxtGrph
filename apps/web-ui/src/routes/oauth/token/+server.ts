import { POST as handleTokenPost, OPTIONS as handleTokenOptions } from '../../api/v1/oauth/token/+server';

export const OPTIONS = handleTokenOptions;
export const POST = handleTokenPost;
export const GET = handleTokenPost;
