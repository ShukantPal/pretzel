import { DEFAULT_PLAYBACK_STATE, DEFAULT_SCENE_NAMES, cloneScenes } from '@/pretzel';
import { assertSupportedSoundCode } from '@/pretzel/sound-support';
import type { PlaybackState } from '@/interfaces/playback';
import type {
  GridTrackPayload,
  PlaybackScene,
  SceneName,
  ScenePayload,
  SequencerTrack,
  StepValue,
} from '@/interfaces/types';

export function slugifyTrackName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export function deriveTrackId(track: Pick<GridTrackPayload | SequencerTrack, 'id' | 'name'>, fallback = 'untitled'): string {
  if (typeof track.id === 'string' && track.id.trim().length > 0) {
    return track.id.trim();
  }
  const normalizedName = typeof track.name === 'string' ? track.name.trim() : '';
  return `track-${slugifyTrackName(normalizedName || fallback)}`;
}

function normalizeVolume(volume: unknown, fallback = 0.8): number {
  const numericValue = typeof volume === 'number' ? volume : Number(volume);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numericValue));
}

function normalizeSceneName(name: unknown, fallback: SceneName): SceneName {
  if (typeof name !== 'string') return fallback;
  const normalizedName = name.trim();
  return normalizedName || fallback;
}

export function normalizeTrackBars(track: GridTrackPayload | SequencerTrack): StepValue[][] {
  const rawBars = Array.isArray(track.bars) ? track.bars : [];
  const nextBars = rawBars.length > 0 ? rawBars : [Array(16).fill(0)];

  return nextBars.map((bar) => {
    const nextSteps = Array.isArray(bar)
      ? bar.map((value) => {
        const numericValue = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(numericValue)) {
          return Math.max(0, Math.min(3, Math.round(numericValue))) as StepValue;
        }
        return value ? 3 : 0;
      })
      : [];

    while (nextSteps.length < 16) nextSteps.push(0);
    if (nextSteps.length > 16) nextSteps.length = 16;

    return nextSteps;
  });
}

export function normalizeTrack(
  track: GridTrackPayload | SequencerTrack,
  existing?: SequencerTrack,
): SequencerTrack {
  const rawName = typeof track.name === 'string' ? track.name.trim() : '';
  const rawSoundCode = assertSupportedSoundCode(track.soundCode ?? existing?.soundCode ?? 'kick');
  const fallbackName = existing?.name || 'UNTITLED TRACK';
  const stableId = deriveTrackId(track, rawName || fallbackName);

  return {
    id: existing?.id || stableId,
    name: rawName || fallbackName,
    soundCode: rawSoundCode,
    bars: normalizeTrackBars(track),
    volume: normalizeVolume(track.volume, existing?.volume ?? 0.8),
    isActive: typeof track.isActive === 'boolean' ? track.isActive : existing?.isActive ?? true,
  };
}

export function createEmptyScene(name: SceneName): PlaybackScene {
  return {
    id: `scene-${name.toLowerCase()}`,
    name,
    tracks: [],
  };
}

export function normalizeScenePayloads(
  scenePayloads: ScenePayload[],
  previousScenes: PlaybackScene[],
): PlaybackScene[] {
  return scenePayloads.map((scenePayload, sceneIndex) => {
    const fallbackName = DEFAULT_SCENE_NAMES[sceneIndex] ?? 'GROOVE';
    const previousScene = scenePayload.id
      ? previousScenes.find((scene) => scene.id === scenePayload.id)
      : undefined;
    const name = normalizeSceneName(scenePayload.name, previousScene?.name || fallbackName);
    const rawTracks = Array.isArray(scenePayload.tracks) ? scenePayload.tracks : [];

    return {
      id: scenePayload.id || previousScene?.id || `scene-${slugifyTrackName(name)}`,
      name,
      tracks: rawTracks.map((track, trackIndex) => {
        const stableTrackId = deriveTrackId(track, `track-${sceneIndex}-${trackIndex}`);
        const existing = previousScene?.tracks.find((candidate) => candidate.id === stableTrackId);
        return normalizeTrack(
          {
            ...track,
            id: stableTrackId,
          },
          existing,
        );
      }),
    };
  });
}

export function normalizePlaybackState(playbackState: PlaybackState): PlaybackState {
  const normalizedScenes = normalizeScenePayloads(playbackState.scenes, playbackState.scenes);

  const validSceneIds = new Set(normalizedScenes.map((scene) => scene.id));
  const sceneOrder = Array.isArray(playbackState.sceneOrder) && playbackState.sceneOrder.length > 0
    ? playbackState.sceneOrder.filter((sceneId) => validSceneIds.has(sceneId))
    : normalizedScenes.map((scene) => scene.id);
  const nextSceneOrder = sceneOrder.length > 0 ? sceneOrder : normalizedScenes.map((scene) => scene.id);

  return {
    bpm: Number.isFinite(playbackState.bpm) ? playbackState.bpm : DEFAULT_PLAYBACK_STATE.bpm,
    mode: playbackState.mode || DEFAULT_PLAYBACK_STATE.mode,
    stepsPerBar: Number.isFinite(playbackState.stepsPerBar) ? playbackState.stepsPerBar : DEFAULT_PLAYBACK_STATE.stepsPerBar,
    activeSceneId: validSceneIds.has(playbackState.activeSceneId) ? playbackState.activeSceneId : nextSceneOrder[0] || DEFAULT_PLAYBACK_STATE.activeSceneId,
    activeBarIndex: Number.isFinite(playbackState.activeBarIndex) ? playbackState.activeBarIndex : 0,
    scenes: normalizedScenes,
    sceneOrder: nextSceneOrder,
  };
}

export function clonePlaybackScenes(scenes: PlaybackScene[]): PlaybackScene[] {
  return cloneScenes(scenes);
}
