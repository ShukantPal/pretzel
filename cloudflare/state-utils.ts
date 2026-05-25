export {
  clonePlaybackScenes as cloneScenes,
  createEmptyScene,
  deriveTrackId,
  normalizePlaybackState,
  normalizeScenePayloads,
  normalizeTrack,
  normalizeTrackBars,
  slugifyTrackName,
} from './state/normalize';
export { listPresentClients } from './state/clients';
export { getTrack, listTracks, type ListedTrack, type TrackSceneRef } from './state/tracks';
export {
  putTrackInScene,
  removeTrackFromScene,
  setActiveScene,
  setSceneOrder,
  toggleTrackStepInScene,
  updateTrackBars,
  upsertScene,
} from './state/mutations';
import { DEFAULT_PLAYBACK_STATE } from '@/pretzel';
import type { PlaybackState } from '@/interfaces/playback';

export type PersistedPretzelState = {
  playbackState: PlaybackState;
};

export const DEFAULT_PERSISTED_STATE: PersistedPretzelState = {
  playbackState: structuredClone(DEFAULT_PLAYBACK_STATE),
};
