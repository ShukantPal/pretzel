import { DurableObject } from 'cloudflare:workers';
import type { Env } from '@/cloudflare/env';
import { listPresentClients, type PersistedPretzelState } from '@/cloudflare/state-utils';
import { applyInternalCommand, applyWireMessage, type InternalCommand } from './commands';
import {
  createWebSocketUpgradeResponse,
  decodeMessage,
  encodeMessage,
  type ClientAttachment,
  type ServerEventName,
} from './socket-protocol';
import { loadPersistedState, persistState } from './repository';

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}

export class PretzelGlobalState extends DurableObject<Env> {
  private stateData: PersistedPretzelState = structuredClone({ playbackState: { bpm: 135, mode: 'strudel', stepsPerBar: 16, activeSceneId: '', activeBarIndex: 0, scenes: [], sceneOrder: [] } });

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.blockConcurrencyWhile(async () => {
      this.stateData = await loadPersistedState(this.ctx);
    });
  }

  private async persist(): Promise<void> {
    await persistState(this.ctx, this.stateData);
  }

  private getClientAttachments(): ClientAttachment[] {
    return this.ctx
      .getWebSockets()
      .map((socket) => socket.deserializeAttachment())
      .filter((attachment): attachment is ClientAttachment => Boolean(attachment?.id && attachment?.role && attachment?.name));
  }

  private emitToSocket(socket: WebSocket, type: ServerEventName, payload?: unknown): void {
    socket.send(encodeMessage(type, payload));
  }

  private broadcast(type: ServerEventName, payload?: unknown): void {
    const message = encodeMessage(type, payload);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(message);
    }
  }

  private broadcastPresence(): void {
    this.broadcast('clients-update', listPresentClients(this.getClientAttachments()));
  }

  private emitSnapshot(socket: WebSocket): void {
    this.emitToSocket(socket, 'state-update', this.stateData.playbackState);
    this.emitToSocket(socket, 'clients-update', listPresentClients(this.getClientAttachments()));
  }

  private async commitPlaybackUpdate(nextPlaybackState: PersistedPretzelState['playbackState']) {
    this.stateData = { ...this.stateData, playbackState: nextPlaybackState };
    await this.persist();
    this.broadcast('state-update', nextPlaybackState);
    return nextPlaybackState;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      if (request.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected websocket upgrade', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const anonymousAttachment: ClientAttachment = {
        id: crypto.randomUUID(),
        name: 'Anonymous',
        role: 'controller',
      };
      server.serializeAttachment(anonymousAttachment);
      this.ctx.acceptWebSocket(server);

      return createWebSocketUpgradeResponse(client);
    }

    if (url.pathname === '/control' && request.method === 'POST') {
      const command = await request.json<InternalCommand>();
      try {
        const result = await applyInternalCommand(this.stateData, command, (nextPlaybackState) => this.commitPlaybackUpdate(nextPlaybackState));
        return jsonResponse(result);
      } catch (error) {
        return jsonResponse(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 400 },
        );
      }
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    const messageText = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);
    const parsedMessage = decodeMessage(messageText);

    if (!parsedMessage) {
      return;
    }

    if (parsedMessage.type === 'register') {
      const payload = parsedMessage.payload;
      const currentAttachment = socket.deserializeAttachment() as ClientAttachment | null;
      const nextAttachment: ClientAttachment = {
        id: currentAttachment?.id || crypto.randomUUID(),
        role: payload.role,
        name: payload.name?.trim() || (payload.role === 'stage' ? 'Stage' : 'Controller'),
      };
      socket.serializeAttachment(nextAttachment);
      this.emitSnapshot(socket);
      this.broadcastPresence();
      return;
    }

    const result = await applyWireMessage(this.stateData, parsedMessage, {
      commitPlaybackUpdate: (nextPlaybackState) => this.commitPlaybackUpdate(nextPlaybackState),
      broadcastEvent: (type, payload) => this.broadcast(type, payload),
    });

    if (result.playbackChanged) {
      this.broadcast('state-update', this.stateData.playbackState);
    }

    if (result.clientsChanged) {
      this.broadcastPresence();
    }
  }

  webSocketClose(): void {
    this.broadcastPresence();
  }
}
