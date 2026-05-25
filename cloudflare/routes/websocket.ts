import type { Env } from '@/cloudflare/env';

function getGlobalStub(env: Env): DurableObjectStub {
  const objectId = env.PRETZEL_GLOBAL_STATE.idFromName(env.PRETZEL_GLOBAL_DO_NAME || 'global-dj');
  return env.PRETZEL_GLOBAL_STATE.get(objectId);
}

export function handleWebSocketRoute(request: Request, env: Env) {
  const stub = getGlobalStub(env);
  return stub.fetch('https://pretzel.internal/ws', request);
}
