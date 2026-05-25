import {
  TALON_AGENT,
  TALON_NAMESPACE,
  TALON_SESSION_ID,
  TALON_SESSION_TOKEN_TTL_SECONDS,
  type Env,
} from '@/cloudflare/env';
import { mintTalonSessionJwt } from '@/cloudflare/auth/jwt';

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}

export function handleTalonSessionTokenOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });
}

export async function handleTalonSessionToken(env: Env) {
  const jwtSecret = env.GATEWAY_JWT_SECRET?.trim();
  if (!jwtSecret) {
    return jsonResponse(
      { error: 'Gateway JWT secret is not configured.' },
      {
        status: 500,
        headers: {
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
        },
      },
    );
  }

  const token = await mintTalonSessionJwt(jwtSecret);
  return jsonResponse(
    {
      token,
      namespace: TALON_NAMESPACE,
      agent: TALON_AGENT,
      sessionId: TALON_SESSION_ID,
      expiresInSeconds: TALON_SESSION_TOKEN_TTL_SECONDS,
    },
    {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    },
  );
}
