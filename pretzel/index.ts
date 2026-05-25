import type { PlaybackState } from '@/interfaces/playback';
import type {
  AudioControlsState,
  PlaybackScene,
  SceneName,
  SequencerTrack,
  StepValue,
} from '@/interfaces/types';
import { canonicalizeSoundCode } from './sound-support';

export const STEPS_PER_BAR = 16;
export const DEFAULT_SCENE_NAMES: SceneName[] = ['INTRO', 'GROOVE', 'LIFT', 'PEAK', 'BREAKDOWN'];
const SUB_BASS_SOUND_CODE = "note('e1').s('triangle')";
const LOW_RUMBLE_SOUND_CODE = "note('c1').s('sawtooth')";
const MID_BASS_SOUND_CODE = "note('e2').s('sawtooth')";

const STEP_GAIN_BY_LEVEL: Record<Exclude<StepValue, 0>, number> = {
  1: 0.45,
  2: 0.72,
  3: 1.0,
};

const DEFAULT_AUDIO_CONTROLS: AudioControlsState = {
  filter: 20000,
  delay: 0.35,
  reverb: 0.25,
  volume: 0.8,
};

function createBars(stepIndexes: number[][], barCount = 4): StepValue[][] {
  return Array.from({ length: barCount }, (_, barIndex) =>
    Array.from({ length: STEPS_PER_BAR }, (_, stepIndex) => (stepIndexes[barIndex]?.includes(stepIndex) ? 3 : 0)),
  );
}

function createTrack(
  id: string,
  name: string,
  soundCode: string,
  stepIndexes: number[][],
  volume: number,
  isActive = true,
): SequencerTrack {
  return {
    id,
    name,
    soundCode,
    bars: createBars(stepIndexes),
    volume,
    isActive,
  };
}

function cloneTracks(tracks: SequencerTrack[]): SequencerTrack[] {
  return tracks.map((track) => ({
    ...track,
    bars: track.bars.map((bar) => [...bar]),
  }));
}

function createScene(id: string, name: SceneName, tracks: SequencerTrack[]): PlaybackScene {
  return {
    id,
    name,
    tracks,
  };
}

export const DEFAULT_SCENES: PlaybackScene[] = [
  createScene('scene-intro', 'INTRO', [
    createTrack('intro-kick', 'KICK DRUM', 'kick', [[0, 8], [0, 8], [0, 8], [0, 4, 8, 12]], 1.0),
    createTrack('intro-hat', 'OFF-BEAT HAT', 'hat', [[2, 10], [2, 10], [2, 10], [2, 6, 10, 14]], 0.45),
    createTrack('intro-closed', 'CLOSED SHUFFLE', 'closed', [[1, 5, 9, 13], [1, 5, 9, 13], [1, 5, 9, 13], [1, 3, 5, 7, 9, 11, 13, 15]], 0.35),
    createTrack('intro-bass', 'SUB BASS RUMBLE', SUB_BASS_SOUND_CODE, [[1, 9], [1, 9], [1, 9], [1, 3, 9, 11]], 0.55),
  ]),
  createScene('scene-groove', 'GROOVE', [
    createTrack('groove-kick', 'KICK DRUM', 'kick', [[0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12]], 1.0),
    createTrack('groove-snare', 'BACKBEAT SNARE', 'snare', [[4, 12], [4, 12], [4, 12], [4, 12]], 0.8),
    createTrack('groove-closed', 'CLOSED SHUFFLE', 'closed', [[1, 3, 5, 7, 9, 11, 13, 15], [1, 5, 7, 9, 11, 13, 15], [1, 3, 5, 7, 9, 11, 13, 15], [1, 3, 5, 7, 9, 11, 13, 15]], 0.5),
    createTrack('groove-bass', 'SUB BASS RUMBLE', SUB_BASS_SOUND_CODE, [[1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], [1, 3, 5, 7, 9, 11, 13, 15], [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]], 0.8),
  ]),
];

export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  bpm: 135,
  mode: 'strudel',
  stepsPerBar: STEPS_PER_BAR,
  sceneOrder: DEFAULT_SCENES.map((scene) => scene.id),
  activeSceneId: DEFAULT_SCENES[0]?.id ?? '',
  activeBarIndex: 0,
  scenes: cloneScenes(DEFAULT_SCENES),
};

export const EMPTY_PLAYBACK_STATE: PlaybackState = {
  bpm: DEFAULT_PLAYBACK_STATE.bpm,
  mode: DEFAULT_PLAYBACK_STATE.mode,
  stepsPerBar: STEPS_PER_BAR,
  sceneOrder: [],
  activeSceneId: '',
  activeBarIndex: 0,
  scenes: [],
};

export function cloneScenes(scenes: PlaybackScene[]): PlaybackScene[] {
  return scenes.map((scene) => ({
    ...scene,
    tracks: cloneTracks(scene.tracks),
  }));
}

export function getOrderedScenes(playbackState: PlaybackState): PlaybackScene[] {
  const byId = new Map(playbackState.scenes.map((scene) => [scene.id, scene]));
  return playbackState.sceneOrder
    .map((sceneId) => byId.get(sceneId))
    .filter((scene): scene is PlaybackScene => Boolean(scene));
}

export function getSceneBarCount(scene: PlaybackScene): number {
  return Math.max(1, ...scene.tracks.map((track) => track.bars.length || 0));
}

export function getArrangementBarCount(playbackState: PlaybackState): number {
  return getOrderedScenes(playbackState).reduce((totalBars, scene) => totalBars + getSceneBarCount(scene), 0);
}

export function getSceneById(playbackState: PlaybackState, sceneId: string): PlaybackScene | undefined {
  return playbackState.scenes.find((scene) => scene.id === sceneId);
}

export function getActiveScene(playbackState: PlaybackState): PlaybackScene {
  return getSceneById(playbackState, playbackState.activeSceneId) ?? getOrderedScenes(playbackState)[0] ?? cloneScenes(DEFAULT_SCENES)[0];
}

export function flattenTrackBars(track: SequencerTrack): StepValue[] {
  return track.bars.flat();
}

function buildPatternForLevel(track: SequencerTrack, level: Exclude<StepValue, 0>, flattenedSteps: StepValue[]): string | null {
  if (!flattenedSteps.some((step) => step === level)) {
    return null;
  }

  const cleanSound = canonicalizeSoundCode(track.soundCode) ?? track.soundCode.trim();
  const gain = Number((track.volume * STEP_GAIN_BY_LEVEL[level]).toFixed(3));

  if (cleanSound === SUB_BASS_SOUND_CODE) {
    const melodicSteps = flattenedSteps.map((step) => (step === level ? 'e1' : '~')).join(' ');
    return `note("${melodicSteps}").s("triangle").gain(${gain})`;
  }

  if (cleanSound === LOW_RUMBLE_SOUND_CODE) {
    const rumbleSteps = flattenedSteps.map((step) => (step === level ? 'c1' : '~')).join(' ');
    const rumbleGain = Number((gain * 0.7).toFixed(3));
    return `note("${rumbleSteps}").s("sawtooth").gain(${rumbleGain}).lpf(180)`;
  }

  if (cleanSound === MID_BASS_SOUND_CODE) {
    const bassSteps = flattenedSteps.map((step) => (step === level ? 'e2' : '~')).join(' ');
    return `note("${bassSteps}").s("sawtooth").gain(${gain}).lpf(600)`;
  }

  const melodicMatch = cleanSound.match(/^note\((['"])(.+?)\1\)\.s\((['"])(.+?)\3\)(.*)$/);
  if (melodicMatch) {
    const [, , noteName, , synthName, rawSuffix = ''] = melodicMatch;
    const melodicSteps = flattenedSteps.map((step) => (step === level ? noteName : '~')).join(' ');
    const suffixWithoutGain = rawSuffix.replace(/\.gain\(([^()]|\([^()]*\))*\)/g, '');
    return `note("${melodicSteps}").s("${synthName}")${suffixWithoutGain}.gain(${gain})`;
  }

  const stepString = flattenedSteps.map((step) => (step === level ? cleanSound : '~')).join(' ');
  return `s("${stepString}").gain(${gain})`;
}

function applyGlobalTrackFx(pattern: string, controls: AudioControlsState): string {
  const sanitizedFilter = Math.max(100, Math.min(20000, controls.filter));
  const sanitizedDelay = Math.max(0, Math.min(0.9, controls.delay));
  const sanitizedReverb = Math.max(0, Math.min(0.9, controls.reverb));
  const sanitizedVolume = Math.max(0, Math.min(1.2, controls.volume));
  return `${pattern}.lpf(${sanitizedFilter}).delay(${sanitizedDelay}).delaytime(0.25).delayfeedback(${sanitizedDelay}).room(${sanitizedReverb}).gain(${Number(sanitizedVolume.toFixed(3))})`;
}

function buildTrackPattern(track: SequencerTrack, controls: AudioControlsState = DEFAULT_AUDIO_CONTROLS): string | null {
  if (!track.isActive) {
    return null;
  }

  const flattenedSteps = flattenTrackBars(track);
  if (!flattenedSteps.some((step) => step > 0)) {
    return null;
  }
  const levelParts = [1, 2, 3]
    .map((level) => buildPatternForLevel(track, level as Exclude<StepValue, 0>, flattenedSteps))
    .filter((part): part is string => Boolean(part));

  if (levelParts.length === 0) {
    return null;
  }

  return applyGlobalTrackFx(`stack(${levelParts.join(', ')})`, controls);
}

export function sceneToStrudelCode(scene: PlaybackScene): string {
  const parts = scene.tracks
    .map((track) => buildTrackPattern(track))
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) {
    return 'stack()';
  }

  return `stack(\n  ${parts.join(',\n  ')}\n)`;
}

export function playbackStateToStrudelCode(
  playbackState: PlaybackState,
  controls: AudioControlsState = DEFAULT_AUDIO_CONTROLS,
): string {
  const orderedScenes = getOrderedScenes(playbackState);
  const sceneBarCounts = orderedScenes.map((scene) => getSceneBarCount(scene));
  const mergedTracks = new Map<string, SequencerTrack>();

  orderedScenes.forEach((scene, sceneIndex) => {
    const sceneBarCount = sceneBarCounts[sceneIndex] ?? 0;
    const tracksById = new Map(scene.tracks.map((track) => [track.id, track]));

    scene.tracks.forEach((track) => {
      const existing = mergedTracks.get(track.id);
      if (!existing) {
        const leadingBars = sceneBarCounts
          .slice(0, sceneIndex)
          .flatMap((barCount) => Array.from({ length: barCount }, () => Array(playbackState.stepsPerBar).fill(0) as StepValue[]));

        mergedTracks.set(track.id, {
          ...track,
          bars: [...leadingBars, ...track.bars.map((bar) => [...bar])],
        });
        return;
      }

      existing.bars.push(...track.bars.map((bar) => [...bar]));
      existing.isActive = existing.isActive || track.isActive;
      existing.volume = track.volume;
      existing.soundCode = track.soundCode;
    });

    mergedTracks.forEach((track, trackId) => {
      if (tracksById.has(trackId)) {
        return;
      }
      track.bars.push(
        ...Array.from({ length: sceneBarCount }, () => Array(playbackState.stepsPerBar).fill(0) as StepValue[]),
      );
    });
  });

  const parts = Array.from(mergedTracks.values())
    .map((track) => buildTrackPattern(track, controls))
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) {
    return 'stack()';
  }

  return `stack(\n  ${parts.join(',\n  ')}\n)`;
}
