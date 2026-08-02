import { createHash, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

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
 * Format: txtgrph_mcp_<64_hex_characters>
 */
export function generateMcpToken(): { rawToken: string; tokenHash: string; tokenPrefix: string } {
  const randomHex = randomBytes(32).toString('hex');
  const rawToken = `txtgrph_mcp_${randomHex}`;
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, 20); // 'txtgrph_mcp_' + 8 hex chars
  return { rawToken, tokenHash, tokenPrefix };
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
