import type { PlaybackState } from '@/interfaces/playback';
import type { PretzelGlobalState } from './durable-object/pretzel-global-state';

export type Env = {
  PRETZEL_GLOBAL_STATE: DurableObjectNamespace<PretzelGlobalState>;
  ASSETS: Fetcher;
  PRETZEL_GLOBAL_DO_NAME?: string;
  TALON_MCP_TOKEN?: string;
  GATEWAY_JWT_SECRET?: string;
};

export const STATE_STORAGE_KEY = 'pretzel-state-v1';
export const TALON_NAMESPACE = 'pretzel';
export const TALON_AGENT = 'dj';
export const TALON_SESSION_ID = '019e57e5-2901-7643-b82b-79c8750eccde';
export const TALON_SESSION_TOKEN_TTL_SECONDS = 60 * 5;

export type TalonSessionClaims = {
  sub: string;
  aud: 'talon';
  exp: number;
  'talon:ns': string;
  'talon:agent': string;
  'talon:session': string;
};

export type JsonResponsePayload = PlaybackState | { error: string } | Record<string, unknown>;
