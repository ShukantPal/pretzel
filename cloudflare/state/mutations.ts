import { DEFAULT_SCENE_NAMES } from '@/pretzel';
import type { PlaybackState } from '@/interfaces/playback';
import type { GridTrackPayload, ScenePayload, SceneName, StepValue } from '@/interfaces/types';
import {
  createEmptyScene,
  deriveTrackId,
  normalizePlaybackState,
  normalizeScenePayloads,
  normalizeTrack,
  normalizeTrackBars,
} from './normalize';

export function upsertScene(playbackState: PlaybackState, scenePayload: ScenePayload): PlaybackState {
  const currentScenes = playbackState.scenes.map((scene) => ({
    ...scene,
    tracks: scene.tracks.map((track) => ({ ...track, bars: track.bars.map((bar) => [...bar]) })),
  }));
  const existingIndex = scenePayload.id
    ? currentScenes.findIndex((scene) => scene.id === scenePayload.id)
    : -1;
  const previousScene = existingIndex >= 0 ? currentScenes[existingIndex] : undefined;
  const fallbackName = previousScene?.name || DEFAULT_SCENE_NAMES[Math.max(0, currentScenes.length - 1)] || 'GROOVE';
  const nextScene = normalizeScenePayloads([scenePayload], previousScene ? [previousScene] : [createEmptyScene(fallbackName as SceneName)])[0];

  if (existingIndex >= 0) {
    currentScenes[existingIndex] = nextScene;
  } else {
    currentScenes.push(nextScene);
  }

  const sceneOrder = playbackState.sceneOrder.filter((sceneId) => sceneId !== nextScene.id);
  sceneOrder.push(nextScene.id);

  return normalizePlaybackState({
    ...playbackState,
    scenes: currentScenes,
    sceneOrder,
  });
}

export function setSceneOrder(playbackState: PlaybackState, sceneOrder: string[]): PlaybackState {
  const validSceneIds = new Set(playbackState.scenes.map((scene) => scene.id));
  const nextSceneOrder = sceneOrder.filter((sceneId) => validSceneIds.has(sceneId));

  return normalizePlaybackState({
    ...playbackState,
    sceneOrder: nextSceneOrder.length > 0 ? nextSceneOrder : playbackState.scenes.map((scene) => scene.id),
    activeSceneId: nextSceneOrder.includes(playbackState.activeSceneId)
      ? playbackState.activeSceneId
      : nextSceneOrder[0] || playbackState.activeSceneId,
  });
}

export function setActiveScene(playbackState: PlaybackState, sceneId: string): PlaybackState {
  const validSceneIds = new Set(playbackState.scenes.map((scene) => scene.id));
  if (!validSceneIds.has(sceneId)) {
    return playbackState;
  }

  return {
    ...playbackState,
    activeSceneId: sceneId,
    activeBarIndex: 0,
  };
}

export function updateTrackBars(
  playbackState: PlaybackState,
  sceneId: string,
  trackId: string,
  bars: StepValue[][],
): PlaybackState {
  const targetScene = playbackState.scenes.find((scene) => scene.id === sceneId);
  if (!targetScene) {
    throw new Error(`Scene ${sceneId} not found.`);
  }

  if (!targetScene.tracks.some((track) => track.id === trackId)) {
    throw new Error(`Track ${trackId} not found in ${sceneId}. Use put_track to create it first.`);
  }

  return normalizePlaybackState({
    ...playbackState,
    scenes: playbackState.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;

      return {
        ...scene,
        tracks: scene.tracks.map((track) => (track.id === trackId
          ? { ...track, bars: normalizeTrackBars({ ...track, bars }) }
          : track)),
      };
    }),
  });
}

export function putTrackInScene(
  playbackState: PlaybackState,
  sceneId: string,
  trackPayload: GridTrackPayload,
): PlaybackState {
  const normalizedId = deriveTrackId(trackPayload, trackPayload.name || 'track');

  return normalizePlaybackState({
    ...playbackState,
    scenes: playbackState.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;

      const existingIndex = scene.tracks.findIndex((track) => track.id === normalizedId);
      const existingTrack = existingIndex >= 0 ? scene.tracks[existingIndex] : undefined;
      const nextTrack = normalizeTrack(
        {
          id: normalizedId,
          name: trackPayload.name,
          soundCode: trackPayload.soundCode,
          bars: Array.isArray(trackPayload.bars) ? trackPayload.bars : Array.from({ length: 4 }, () => Array(16).fill(0)),
          volume: typeof trackPayload.volume === 'number' ? trackPayload.volume : existingTrack?.volume ?? 0.8,
          isActive: typeof trackPayload.isActive === 'boolean' ? trackPayload.isActive : existingTrack?.isActive ?? true,
        },
        existingTrack,
      );

      if (existingIndex >= 0) {
        return {
          ...scene,
          tracks: scene.tracks.map((track, index) => (index === existingIndex ? nextTrack : track)),
        };
      }

      return {
        ...scene,
        tracks: [...scene.tracks, nextTrack],
      };
    }),
  });
}

export function removeTrackFromScene(
  playbackState: PlaybackState,
  sceneId: string | undefined,
  trackId: string,
): PlaybackState {
  return normalizePlaybackState({
    ...playbackState,
    scenes: playbackState.scenes.map((scene) => {
      if (sceneId && scene.id !== sceneId) return scene;
      return {
        ...scene,
        tracks: scene.tracks.filter((track) => track.id !== trackId),
      };
    }),
  });
}

export function toggleTrackStepInScene(
  playbackState: PlaybackState,
  sceneId: string,
  trackId: string,
  barIndex: number,
  stepIndex: number,
): PlaybackState {
  const targetScene = playbackState.scenes.find((scene) => scene.id === sceneId);
  if (!targetScene) {
    throw new Error(`Scene ${sceneId} not found.`);
  }

  const targetTrack = targetScene.tracks.find((track) => track.id === trackId);
  if (!targetTrack) {
    throw new Error(`Track ${trackId} not found in ${sceneId}.`);
  }

  return normalizePlaybackState({
    ...playbackState,
    scenes: playbackState.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        tracks: scene.tracks.map((track) => {
          if (track.id !== trackId) return track;
          const nextBars = track.bars.map((bar) => [...bar]);
          if (!nextBars[barIndex]) {
            throw new Error(`Bar ${barIndex} not found in ${track.name}.`);
          }
          const currentValue = nextBars[barIndex][stepIndex] ?? 0;
          nextBars[barIndex][stepIndex] = ((currentValue + 1) % 4) as StepValue;
          return {
            ...track,
            bars: nextBars,
          };
        }),
      };
    }),
  });
}
