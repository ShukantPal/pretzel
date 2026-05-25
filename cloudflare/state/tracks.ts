import type { PlaybackState } from '@/interfaces/playback';
import type { SceneName } from '@/interfaces/types';

export type TrackSceneRef = {
  sceneId: string;
  sceneName: SceneName;
};

export type ListedTrack = {
  trackId: string;
  trackName: string;
  soundCode: string;
  sceneRefs: TrackSceneRef[];
};

export function listTracks(playbackState: PlaybackState, sceneId?: string): ListedTrack[] {
  const targetScenes = sceneId
    ? playbackState.scenes.filter((scene) => scene.id === sceneId)
    : playbackState.scenes;

  const byTrackId = new Map<string, ListedTrack>();

  for (const scene of targetScenes) {
    for (const track of scene.tracks) {
      const existing = byTrackId.get(track.id);
      if (existing) {
        existing.sceneRefs.push({
          sceneId: scene.id,
          sceneName: scene.name,
        });
        continue;
      }

      byTrackId.set(track.id, {
        trackId: track.id,
        trackName: track.name,
        soundCode: track.soundCode,
        sceneRefs: [
          {
            sceneId: scene.id,
            sceneName: scene.name,
          },
        ],
      });
    }
  }

  return Array.from(byTrackId.values());
}

export function getTrack(playbackState: PlaybackState, trackId: string, sceneId?: string) {
  if (sceneId) {
    const scene = playbackState.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found.`);
    }

    const track = scene.tracks.find((candidate) => candidate.id === trackId);
    if (!track) {
      throw new Error(`Track ${trackId} not found in ${sceneId}.`);
    }

    return {
      trackId,
      trackName: track.name,
      soundCode: track.soundCode,
      sceneRefs: [
        {
          sceneId: scene.id,
          sceneName: scene.name,
        },
      ],
      instances: [
        {
          sceneId: scene.id,
          sceneName: scene.name,
          track,
        },
      ],
    };
  }

  const instances = playbackState.scenes.flatMap((scene) => {
    const track = scene.tracks.find((candidate) => candidate.id === trackId);
    return track
      ? [{
          sceneId: scene.id,
          sceneName: scene.name,
          track,
        }]
      : [];
  });

  if (instances.length === 0) {
    throw new Error(`Track ${trackId} not found.`);
  }

  return {
    trackId,
    trackName: instances[0].track.name,
    soundCode: instances[0].track.soundCode,
    sceneRefs: instances.map(({ sceneId: resolvedSceneId, sceneName }) => ({
      sceneId: resolvedSceneId,
      sceneName,
    })),
    instances,
  };
}
