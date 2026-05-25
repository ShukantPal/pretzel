import type {
  KnobChangePayload,
  RegisterPayload,
  SelectScenePayload,
  ToggleStepPayload,
} from '@/interfaces/socket';
import type { ClientRole } from '@/interfaces/types';

export type ServerEventName =
  | 'state-update'
  | 'clients-update'
  | 'knob-apply';

export type WireMessage =
  | { type: 'register'; payload: RegisterPayload }
  | { type: 'select-scene'; payload: SelectScenePayload }
  | { type: 'toggle-step'; payload: ToggleStepPayload }
  | { type: 'knob-change'; payload: KnobChangePayload }
  | { type: ServerEventName; payload?: unknown };

export type ClientAttachment = {
  id: string;
  name: string;
  role: ClientRole;
};

export function encodeMessage<T>(type: ServerEventName, payload?: T): string {
  return JSON.stringify({ type, payload });
}

export function decodeMessage(data: string): WireMessage | null {
  try {
    const parsed = JSON.parse(data) as WireMessage;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createWebSocketUpgradeResponse(client: WebSocket): Response {
  return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
}
