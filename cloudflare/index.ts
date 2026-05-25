import type { Env } from '@/cloudflare/env';
import { handleHealthCheck } from './routes/health';
import { handleMcpRoute } from './routes/mcp';
import { handleTalonSessionToken, handleTalonSessionTokenOptions } from './routes/talon';
import { handleWebSocketRoute } from './routes/websocket';
export { PretzelGlobalState } from './durable-object/pretzel-global-state';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname === '/talon/session-token') {
      return handleTalonSessionTokenOptions();
    }

    if (url.pathname === '/healthz') {
      return handleHealthCheck();
    }

    if (url.pathname === '/talon/session-token') {
      return handleTalonSessionToken(env);
    }

    if (url.pathname === '/ws') {
      return handleWebSocketRoute(request, env);
    }

    if (url.pathname === '/mcp') {
      return handleMcpRoute(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
