import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/interfaces/socket';

type FirstArg<T> = T extends (...args: infer Args) => void
  ? Args extends []
    ? void
    : Args[0]
  : never;

type ClientEventName = keyof ClientToServerEvents | 'connect' | 'disconnect';
type ServerEventName = keyof ServerToClientEvents;
type EventName = ClientEventName | ServerEventName;

type EventPayloadMap = {
  connect: void;
  disconnect: void;
} & {
  [K in keyof ClientToServerEvents]: FirstArg<ClientToServerEvents[K]>;
} & {
  [K in keyof ServerToClientEvents]: FirstArg<ServerToClientEvents[K]>;
};

type EventCallback<K extends EventName> = (payload: EventPayloadMap[K]) => void;

type WireMessage = {
  type: string;
  payload?: unknown;
};

export function getBackendUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const queryBackendUrl = params.get('backendUrl') || params.get('socketUrl');
  if (queryBackendUrl) {
    return queryBackendUrl;
  }

  const envBackendUrl = import.meta.env.VITE_PRETZEL_BACKEND_URL || import.meta.env.VITE_SOCKET_URL;
  if (envBackendUrl) {
    return envBackendUrl;
  }

  return 'https://pretzel.shukant.com';
}

function toWebSocketUrl(baseUrl: string): string {
  const parsedUrl = new URL(baseUrl, window.location.href);
  parsedUrl.protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  parsedUrl.pathname = '/ws';
  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

export type PretzelSocket = {
  on: <K extends EventName>(event: K, callback: EventCallback<K>) => void;
  off: <K extends EventName>(event: K, callback: EventCallback<K>) => void;
  emit: <K extends keyof ClientToServerEvents>(event: K, payload: Parameters<ClientToServerEvents[K]>[0]) => void;
  disconnect: () => void;
};

export function createSocketClient(): PretzelSocket {
  const webSocketUrl = toWebSocketUrl(getBackendUrl());
  const listeners = new Map<EventName, Set<(payload: unknown) => void>>();
  let webSocket: WebSocket | null = null;
  let disposed = false;
  let reconnectTimeout: number | null = null;
  let reconnectAttempts = 0;

  const notify = <K extends EventName>(event: K, payload: EventPayloadMap[K]) => {
    const callbacks = listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((callback) => callback(payload));
  };

  const connect = () => {
    if (disposed) return;

    console.log(`[App] Connecting to Pretzel backend at ${webSocketUrl}...`);
    webSocket = new WebSocket(webSocketUrl);

    webSocket.addEventListener('open', () => {
      reconnectAttempts = 0;
      notify('connect', undefined);
    });

    webSocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as WireMessage;
        if (!message?.type) return;
        notify(message.type as EventName, message.payload as EventPayloadMap[EventName]);
      } catch (error) {
        console.warn('[PretzelWS] Failed to parse message:', error);
      }
    });

    webSocket.addEventListener('close', () => {
      notify('disconnect', undefined);
      webSocket = null;

      if (!disposed) {
        const backoffMs = Math.min(5000, 500 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;
        reconnectTimeout = window.setTimeout(connect, backoffMs);
      }
    });

    webSocket.addEventListener('error', () => {
      webSocket?.close();
    });
  };

  connect();

  return {
    on(event, callback) {
      const callbacks = listeners.get(event) ?? new Set<(payload: unknown) => void>();
      callbacks.add(callback as (payload: unknown) => void);
      listeners.set(event, callbacks);
    },
    off(event, callback) {
      const callbacks = listeners.get(event);
      callbacks?.delete(callback as (payload: unknown) => void);
      if (callbacks && callbacks.size === 0) {
        listeners.delete(event);
      }
    },
    emit(event, payload) {
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        console.warn(`[PretzelWS] Dropping ${String(event)} because socket is not open yet.`);
        return;
      }

      webSocket.send(JSON.stringify({
        type: event,
        payload,
      }));
    },
    disconnect() {
      disposed = true;
      if (reconnectTimeout !== null) {
        window.clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      webSocket?.close();
      webSocket = null;
    },
  };
}
