import type {
  ClientInfo,
  ClientRole,
  KnobType,
} from './types';
import type { PlaybackState } from './playback';

export interface RegisterPayload {
  role: ClientRole;
  name?: string;
}

export interface KnobChangePayload {
  type: KnobType;
  value: number;
}

export interface SelectScenePayload {
  sceneId: string;
}

export interface ToggleStepPayload {
  sceneId: string;
  trackId: string;
  barIndex: number;
  stepIndex: number;
}

export type StateUpdatePayload = PlaybackState;

export interface ClientToServerEvents {
  register: (data: RegisterPayload) => void;
  'knob-change': (data: KnobChangePayload) => void;
  'select-scene': (data: SelectScenePayload) => void;
  'toggle-step': (data: ToggleStepPayload) => void;
}

export interface ServerToClientEvents {
  'state-update': (data: StateUpdatePayload) => void;
  'clients-update': (data: ClientInfo[]) => void;
  'knob-apply': (data: KnobChangePayload) => void;
}
