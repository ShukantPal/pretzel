import { STATE_STORAGE_KEY } from '@/cloudflare/env';
import { DEFAULT_PERSISTED_STATE, normalizePlaybackState, type PersistedPretzelState } from '@/cloudflare/state-utils';

export async function loadPersistedState(ctx: DurableObjectState): Promise<PersistedPretzelState> {
  const storedState = await ctx.storage.get<PersistedPretzelState>(STATE_STORAGE_KEY);
  return storedState
    ? {
        playbackState: normalizePlaybackState(storedState.playbackState),
      }
    : structuredClone(DEFAULT_PERSISTED_STATE);
}

export async function persistState(ctx: DurableObjectState, stateData: PersistedPretzelState): Promise<void> {
  await ctx.storage.put(STATE_STORAGE_KEY, stateData);
}
