import { createHash, randomBytes, createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const AUTH_CODE_SECRET = process.env.AUTH_CODE_SECRET || 'txtgrph_oauth_code_signing_secret_key_2026';

export interface AuthenticatedUser {
  userId: string;
  tokenId?: string;
  scopes?: string[];
}

/**
 * Computes SHA-256 hash of an access token string.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates a high-entropy MCP access token.
 * When userId is provided, generates a tamper-proof HMAC-signed token.
 */
export function generateMcpToken(userId?: string): { rawToken: string; tokenHash: string; tokenPrefix: string } {
  const randomHex = randomBytes(16).toString('hex');
  let rawToken: string;

  if (userId) {
    const payload = JSON.stringify({
      user: userId,
      rnd: randomHex,
      iat: Date.now()
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = createHmac('sha256', AUTH_CODE_SECRET).update(b64).digest('base64url');
    rawToken = `txtgrph_mcp_${b64}.${sig}`;
  } else {
    rawToken = `txtgrph_mcp_${randomBytes(32).toString('hex')}`;
  }

  const tokenHash = hashToken(rawToken);
  const tokenPrefix = `txtgrph_mcp_${randomHex.slice(0, 8)}`;
  return { rawToken, tokenHash, tokenPrefix };
}

/**
 * Validates a signed MCP token and extracts the userId if valid.
 */
export function verifyMcpToken(token: string): { userId: string } | null {
  if (!token || !token.startsWith('txtgrph_mcp_')) return null;
  const rest = token.substring(12);
  const dotIndex = rest.indexOf('.');
  if (dotIndex === -1) return null;
  const b64 = rest.substring(0, dotIndex);
  const sig = rest.substring(dotIndex + 1);
  if (!b64 || !sig) return null;
  const expectedSig = createHmac('sha256', AUTH_CODE_SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    if (data.user) {
      return { userId: data.user };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Creates an HMAC-signed stateless authorization code containing the user's raw token and metadata.
 */
export function createAuthCode(rawToken: string, userId: string, email?: string): string {
  const payload = JSON.stringify({
    token: rawToken,
    user: userId,
    email: email || 'user@txtgrph.app',
    exp: Date.now() + 15 * 60 * 1000
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', AUTH_CODE_SECRET).update(b64).digest('base64url');
  return `txtgrph_ac_${b64}.${sig}`;
}

/**
 * Verifies and decodes an HMAC-signed authorization code.
 */
export function verifyAuthCode(code: string): { token: string; user: string; email?: string } | null {
  if (!code || !code.startsWith('txtgrph_ac_')) return null;
  const rest = code.substring(11);
  const [b64, sig] = rest.split('.');
  if (!b64 || !sig) return null;
  const expectedSig = createHmac('sha256', AUTH_CODE_SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    if (data.exp && Date.now() > data.exp) return null;
    return { token: data.token, user: data.user, email: data.email };
  } catch {
    return null;
  }
}

/**
 * Generates an OpenID Connect compliant signed JWT ID Token for Google Gemini / OAuth clients.
 */
export function createIdToken(userId: string, userEmail: string, origin: string, clientId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: origin,
      sub: userId,
      aud: clientId,
      exp: now + 365 * 24 * 60 * 60,
      iat: now,
      email: userEmail || 'user@txtgrph.app',
      email_verified: true,
      name: 'TxtGrph User'
    })
  ).toString('base64url');
  const sig = createHmac('sha256', AUTH_CODE_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

/**
 * Authenticates a request via Bearer MCP token, Client-Secret header, or active user session.
 */
export async function authenticateMcpRequest(
  request: Request,
  supabase: SupabaseClient
): Promise<AuthenticatedUser | null> {
  let rawToken: string | null = null;

  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  }

  // 2. Client-Secret or X-Client-Secret or X-Txtgrph-Api-Key headers (Gemini Spark connected apps support)
  if (!rawToken) {
    rawToken =
      request.headers.get('Client-Secret')?.trim() ||
      request.headers.get('client-secret')?.trim() ||
      request.headers.get('X-Client-Secret')?.trim() ||
      request.headers.get('X-Txtgrph-Api-Key')?.trim() ||
      null;
  }

  // 3. Fallback to query string parameter ?api_key= or ?token= or ?client_secret=
  if (!rawToken && request.url) {
    try {
      const url = new URL(request.url);
      rawToken =
        url.searchParams.get('api_key') ||
        url.searchParams.get('token') ||
        url.searchParams.get('client_secret');
    } catch {
      // ignore URL parse error
    }
  }

  if (rawToken) {
    // Check if token is a signed stateless MCP token
    const signedData = verifyMcpToken(rawToken);
    if (signedData?.userId) {
      // Touch activity in DB best-effort without blocking
      try {
        const tokenHash = hashToken(rawToken);
        await supabase.rpc('verify_and_touch_mcp_token', { p_token_hash: tokenHash });
      } catch {
        // best-effort
      }

      return {
        userId: signedData.userId,
        scopes: ['read', 'write', 'mcp']
      };
    }

    const tokenHash = hashToken(rawToken);

    // Call Postgres verification RPC function
    const { data, error } = await supabase.rpc('verify_and_touch_mcp_token', {
      p_token_hash: tokenHash,
    });

    if (error || !data || data.length === 0) {
      // Fallback: Direct table query if RPC is not deployed yet in dev
      const { data: tokenRecord, error: queryErr } = await supabase
        .from('mcp_tokens')
        .select('id, user_id, scopes, expires_at')
        .eq('token_hash', tokenHash)
        .single();

      if (queryErr || !tokenRecord) return null;

      if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
        return null; // Expired
      }

      // Touch last_used_at
      await supabase
        .from('mcp_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id);

      return {
        userId: tokenRecord.user_id,
        tokenId: tokenRecord.id,
        scopes: tokenRecord.scopes || ['read', 'write'],
      };
    }

    const record = data[0];
    return {
      userId: record.user_id,
      tokenId: record.token_id,
      scopes: record.scopes || ['read', 'write'],
    };
  }

  // Fallback to cookie-based session user if header absent
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      userId: user.id,
      scopes: ['read', 'write'],
    };
  }

  return null;
}
