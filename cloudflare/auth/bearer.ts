import type { Env } from '@/cloudflare/env';

export function isAuthorized(request: Request, env: Env): boolean {
  const expectedToken = env.TALON_MCP_TOKEN?.trim();
  if (!expectedToken) {
    return false;
  }

  const authorizationHeader = request.headers.get('authorization') || '';
  return authorizationHeader === `Bearer ${expectedToken}`;
}
