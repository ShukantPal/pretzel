import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Env } from '@/cloudflare/env';
import { isAuthorized } from '@/cloudflare/auth/bearer';
import { createMcpServer } from '@/cloudflare/mcp/server';

export async function handleMcpRoute(request: Request, env: Env) {
  if (!isAuthorized(request, env)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'www-authenticate': 'Bearer',
      },
    });
  }

  const server = createMcpServer(env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
