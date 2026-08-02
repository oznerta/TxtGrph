import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

// Generate a short-lived authorization code
function generateAuthCode(): string {
  return 'txtgrph_ac_' + crypto.randomBytes(24).toString('hex');
}

// Build the HTML consent page that Gemini opens in a popup
function buildConsentPage(params: {
  redirectUri: string;
  state: string | null;
  clientId: string | null;
  scope: string | null;
  responseType: string | null;
  code: string;
}): string {
  const { redirectUri, state, clientId, scope, code } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize TxtGrph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0b0e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #13141a;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .logo {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05));
      border: 1px solid rgba(245,158,11,0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 28px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.3px;
    }
    .subtitle {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .app-name {
      color: #f59e0b;
      font-weight: 600;
    }
    .permissions {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 28px;
      text-align: left;
    }
    .permissions h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.4);
      margin-bottom: 12px;
    }
    .perm-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    }
    .perm-item + .perm-item {
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .check {
      color: #22c55e;
      font-size: 16px;
      flex-shrink: 0;
    }
    .btn-authorize {
      display: block;
      width: 100%;
      padding: 14px;
      background: #f59e0b;
      color: #000;
      font-size: 15px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s;
      letter-spacing: -0.2px;
    }
    .btn-authorize:hover {
      background: #d97706;
    }
    .btn-deny {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      background: transparent;
      color: rgba(255,255,255,0.4);
      font-size: 13px;
      font-weight: 500;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-deny:hover {
      color: rgba(255,255,255,0.7);
      border-color: rgba(255,255,255,0.2);
    }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: rgba(255,255,255,0.25);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📊</div>
    <h1>Authorize TxtGrph</h1>
    <p class="subtitle">
      <span class="app-name">${escapeHtml(clientId || 'An application')}</span>
      wants to access your TxtGrph workspace.
    </p>

    <div class="permissions">
      <h3>This will allow access to:</h3>
      <div class="perm-item"><span class="check">✓</span> View your diagrams and folders</div>
      <div class="perm-item"><span class="check">✓</span> Create and edit diagrams</div>
      <div class="perm-item"><span class="check">✓</span> Manage workspace folders</div>
    </div>

    <form method="POST" action="">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(state || '')}" />
      <input type="hidden" name="code" value="${escapeHtml(code)}" />
      <input type="hidden" name="client_id" value="${escapeHtml(clientId || '')}" />
      <input type="hidden" name="scope" value="${escapeHtml(scope || 'mcp read write')}" />
      <input type="hidden" name="action" value="approve" />
      <button type="submit" class="btn-authorize">Authorize Access</button>
    </form>

    <form method="POST" action="">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(state || '')}" />
      <input type="hidden" name="action" value="deny" />
      <button type="submit" class="btn-deny">Deny</button>
    </form>

    <p class="footer">You can revoke access at any time from your TxtGrph settings.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

// GET: Show the interactive consent page
export const GET: RequestHandler = async ({ url }) => {
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const clientId = url.searchParams.get('client_id');
  const scope = url.searchParams.get('scope');
  const responseType = url.searchParams.get('response_type');

  // If no redirect_uri, return JSON metadata
  if (!redirectUri) {
    return json(
      {
        success: true,
        message: 'TxtGrph OAuth 2.0 Authorization Endpoint',
        usage: 'Provide redirect_uri, client_id, response_type=code, state, and scope as query parameters.'
      },
      { headers: corsHeaders }
    );
  }

  // Generate a one-time authorization code
  const code = generateAuthCode();

  // Serve the interactive HTML consent page
  const html = buildConsentPage({ redirectUri, state, clientId, scope, responseType, code });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
};

// POST: Process consent form submission
export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get('action') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const state = formData.get('state') as string;
  const code = formData.get('code') as string;

  if (!redirectUri) {
    return json(
      { error: 'invalid_request', error_description: 'Missing redirect_uri' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const redirectUrl = new URL(redirectUri);

    if (action === 'approve') {
      // User approved — redirect with authorization code
      redirectUrl.searchParams.set('code', code || generateAuthCode());
      if (state) redirectUrl.searchParams.set('state', state);
    } else {
      // User denied — redirect with error
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'User denied the authorization request');
      if (state) redirectUrl.searchParams.set('state', state);
    }

    return Response.redirect(redirectUrl.toString(), 302);
  } catch {
    return json(
      { error: 'invalid_request', error_description: 'Invalid redirect_uri' },
      { status: 400, headers: corsHeaders }
    );
  }
};
