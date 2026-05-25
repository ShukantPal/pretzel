import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PLAYBACK_STATE } from '../pretzel/index';
import {
  getTrack,
  listTracks,
  normalizePlaybackState,
  putTrackInScene,
  removeTrackFromScene,
  updateTrackBars,
} from '../cloudflare/state-utils';
import { isSupportedSoundCode } from '../pretzel/sound-support';
import type { PlaybackState } from '../interfaces/playback';
import type { StepValue } from '../interfaces/types';

const MID_BASS_NAME = 'MID BASS';
const MID_BASS_SOUND = "note('e2').s('sawtooth')";

function cloneState(): PlaybackState {
  return structuredClone(DEFAULT_PLAYBACK_STATE);
}

function filledBars(stepIndexes: number[]): StepValue[][] {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 16 }, (_, stepIndex) => (stepIndexes.includes(stepIndex) ? 3 : 0 as StepValue)),
  );
}

test('putTrackInScene preserves arbitrary track identity through repeated normalization', () => {
  let state = cloneState();
  const bars = filledBars([0, 4, 8, 12]);

  state = putTrackInScene(state, 'scene-intro', {
    id: 'mid-bass-intro',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars,
    volume: 0.61,
    isActive: true,
  });

  state = normalizePlaybackState(state);
  state = normalizePlaybackState(state);

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro, 'intro scene should exist');

  const midBass = intro.tracks.find((track) => track.id === 'mid-bass-intro');
  assert.ok(midBass, 'MID BASS track should still exist after normalization');
  assert.equal(midBass.name, MID_BASS_NAME);
  assert.equal(midBass.soundCode, MID_BASS_SOUND);
  assert.equal(midBass.volume, 0.61);
  assert.deepEqual(midBass.bars, bars);
});

test('updateTrackBars updates exact track id without coercing identity', () => {
  let state = cloneState();
  state = putTrackInScene(state, 'scene-intro', {
    id: 'custom-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0]),
    volume: 0.5,
    isActive: true,
  });

  const nextBars = filledBars([1, 7, 10, 13]);
  state = updateTrackBars(state, 'scene-intro', 'custom-mid-bass', nextBars);

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro, 'intro scene should exist');
  const midBass = intro.tracks.find((track) => track.id === 'custom-mid-bass');
  assert.ok(midBass, 'updated track should still be the same track');
  assert.equal(midBass.name, MID_BASS_NAME);
  assert.equal(midBass.soundCode, MID_BASS_SOUND);
  assert.deepEqual(midBass.bars, nextBars);
});

test('removeTrackFromScene removes only the exact matching track id', () => {
  let state = cloneState();
  state = putTrackInScene(state, 'scene-intro', {
    id: 'mid-bass-intro',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4]),
    volume: 0.6,
    isActive: true,
  });
  state = putTrackInScene(state, 'scene-intro', {
    id: 'low-rumble-intro',
    name: 'LOW RUMBLE BED',
    soundCode: "note('c1').s('sawtooth')",
    bars: filledBars([2, 6]),
    volume: 0.4,
    isActive: true,
  });

  state = removeTrackFromScene(state, 'scene-intro', 'mid-bass-intro');

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro, 'intro scene should exist');
  assert.equal(intro.tracks.some((track) => track.name === MID_BASS_NAME), false);
  assert.equal(intro.tracks.some((track) => track.name === 'LOW RUMBLE BED'), true);
});

test('removeTrackFromScene removes the matching track id from every scene when sceneId is omitted', () => {
  let state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4]),
    volume: 0.6,
    isActive: true,
  });

  state = putTrackInScene(state, 'scene-groove', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([2, 6]),
    volume: 0.7,
    isActive: true,
  });

  state = removeTrackFromScene(state, undefined, 'track-mid-bass');

  assert.equal(state.scenes.every((scene) => scene.tracks.every((track) => track.name !== MID_BASS_NAME)), true);
});

test('listTracks returns exact ids and scene refs for the current state', () => {
  let state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4]),
    volume: 0.6,
    isActive: true,
  });

  state = putTrackInScene(state, 'scene-groove', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([2, 6]),
    volume: 0.7,
    isActive: true,
  });

  const tracks = listTracks(state);
  const midBass = tracks.find((track) => track.trackId === 'track-mid-bass');
  assert.ok(midBass);
  assert.equal(midBass.trackName, MID_BASS_NAME);
  assert.deepEqual(midBass.sceneRefs, [
    { sceneId: 'scene-intro', sceneName: 'INTRO' },
    { sceneId: 'scene-groove', sceneName: 'GROOVE' },
  ]);
});

test('getTrack returns all instances for a track id across scenes', () => {
  let state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4]),
    volume: 0.6,
    isActive: true,
  });

  state = putTrackInScene(state, 'scene-groove', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([2, 6]),
    volume: 0.7,
    isActive: true,
  });

  const result = getTrack(state, 'track-mid-bass');
  assert.equal(result.trackId, 'track-mid-bass');
  assert.equal(result.instances.length, 2);
  assert.deepEqual(result.sceneRefs, [
    { sceneId: 'scene-intro', sceneName: 'INTRO' },
    { sceneId: 'scene-groove', sceneName: 'GROOVE' },
  ]);
});

test('normalizePlaybackState preserves custom tracks not in the canonical palette', () => {
  const state = normalizePlaybackState({
    ...cloneState(),
    scenes: [
      {
        id: 'scene-intro',
        name: 'INTRO',
        tracks: [
          {
            id: 'custom-track',
            name: 'VOCAL CHOP',
            soundCode: "note('g4').s('sawtooth').env(0.01,0.2,0.8,0.4).gain(0.5)",
            bars: filledBars([3, 7, 11, 15]),
            volume: 0.33,
            isActive: true,
          },
        ],
      },
      {
        id: 'scene-groove',
        name: 'GROOVE',
        tracks: [],
      },
    ],
    sceneOrder: ['scene-intro', 'scene-groove'],
    activeSceneId: 'scene-intro',
  });

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro, 'intro scene should exist');
  assert.deepEqual(intro.tracks[0], {
    id: 'custom-track',
    name: 'VOCAL CHOP',
    soundCode: "note('g4').s('sawtooth').env(0.01,0.2,0.8,0.4).gain(0.5)",
    bars: filledBars([3, 7, 11, 15]),
    volume: 0.33,
    isActive: true,
  });
});

test('normalizePlaybackState preserves custom scene names instead of coercing them', () => {
  const state = normalizePlaybackState({
    ...cloneState(),
    scenes: [
      {
        id: 'scene-build',
        name: 'BUILD UP',
        tracks: [],
      },
    ],
    sceneOrder: ['scene-build'],
    activeSceneId: 'scene-build',
  });

  assert.equal(state.scenes[0]?.name, 'BUILD UP');
  assert.equal(state.sceneOrder[0], 'scene-build');
  assert.equal(state.activeSceneId, 'scene-build');
});

test('putTrackInScene atomically upserts an exact custom track payload', () => {
  const state = putTrackInScene(cloneState(), 'scene-intro', {
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4, 8, 12]),
    volume: 0.61,
    isActive: true,
  });

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro);
  const midBass = intro.tracks.find((track) => track.id === 'track-mid-bass');
  assert.ok(midBass);
  assert.equal(midBass.soundCode, MID_BASS_SOUND);
  assert.equal(midBass.volume, 0.61);
  assert.deepEqual(midBass.bars, filledBars([0, 4, 8, 12]));
});

test('putTrackInScene preserves a custom track across repeated upserts and normalization', () => {
  let state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'mid-bass-intro',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4, 8, 12]),
    volume: 0.61,
    isActive: true,
  });

  state = putTrackInScene(state, 'scene-intro', {
    id: 'mid-bass-intro',
    name: MID_BASS_NAME,
    soundCode: "note('e2').s('sawtooth').lpf(600).distort(0.4)",
    bars: filledBars([1, 7, 10, 13]),
    volume: 0.72,
    isActive: true,
  });

  state = normalizePlaybackState(state);

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro);
  const midBass = intro.tracks.find((track) => track.id === 'mid-bass-intro');
  assert.ok(midBass);
  assert.equal(midBass.name, MID_BASS_NAME);
  assert.equal(midBass.soundCode, "note('e2').s('sawtooth').lpf(600).distort(0.4)");
  assert.equal(midBass.volume, 0.72);
  assert.deepEqual(midBass.bars, filledBars([1, 7, 10, 13]));
});

test('custom track survives unrelated track-step updates in another scene', () => {
  const withMidBass = putTrackInScene(cloneState(), 'scene-intro', {
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4, 8, 12]),
    volume: 0.61,
    isActive: true,
  });
  const grooveTrackId = withMidBass.scenes.find((scene) => scene.id === 'scene-groove')?.tracks[0]?.id;
  assert.ok(grooveTrackId, 'scene-groove should contain at least one existing track');

  const mutated = updateTrackBars(
    withMidBass,
    'scene-groove',
    grooveTrackId,
    filledBars([2, 6, 10, 14]),
  );

  const intro = mutated.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro);
  assert.ok(intro.tracks.some((track) => track.id === 'track-mid-bass'));
});

test('putTrackInScene rejects unsupported soundCode before it can reach the compiler', () => {
  assert.throws(
    () => putTrackInScene(cloneState(), 'scene-intro', {
      name: 'BROKEN TRACK',
      soundCode: 'sample(\"vox\").gain(0.5)',
      bars: filledBars([0, 4, 8, 12]),
      volume: 0.5,
      isActive: true,
    }),
    /Unsupported soundCode/,
  );
});

test('sound support only accepts runtime-backed synth and sample names', () => {
  assert.equal(isSupportedSoundCode('kick'), true);
  assert.equal(isSupportedSoundCode("note('e2').s('sawtooth').lpf(600).distort(0.4)"), true);
  assert.equal(isSupportedSoundCode("note('g4').s('saw').env(0.01,0.2,0.8,0.4).gain(0.9)"), true);
  assert.equal(isSupportedSoundCode("note('c5').s('triangle').slide(0.2)"), true);
  assert.equal(isSupportedSoundCode("note('e4').s('lead').fx('reverb').lpf(5000).env(0.01,0.2,0.8,0.4).gain(1)"), true);
  assert.equal(isSupportedSoundCode("note('e5').s('lead').fx('dist').lpf(4000).env(0.01,0.2,0.8,0.3).gain(1)"), true);
  assert.equal(isSupportedSoundCode("note('e2').s('supersaw')"), false);
  assert.equal(isSupportedSoundCode("note('e2').s('saw').room(0.5)"), true);
  assert.equal(isSupportedSoundCode("note('e2').s('lead').fx('chorus')"), false);
});

test('putTrackInScene canonicalizes supported synth aliases to runtime-safe names', () => {
  const state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-lead',
    name: 'LEAD',
    soundCode: "note('g4').s('saw').env(0.01,0.2,0.8,0.4).gain(0.9)",
    bars: filledBars([0, 4, 8, 12]),
    volume: 0.9,
    isActive: true,
  });

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro);
  const lead = intro.tracks.find((track) => track.id === 'track-lead');
  assert.ok(lead);
  assert.equal(lead.soundCode, "note('g4').s('sawtooth').env(0.01,0.2,0.8,0.4).gain(0.9)");
});

test('putTrackInScene canonicalizes lead and fx aliases to runtime-safe names', () => {
  const state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-fx-lead',
    name: 'FX LEAD',
    soundCode: "note('e4').s('lead').fx('reverb').lpf(5000).env(0.01,0.2,0.8,0.4).gain(1)",
    bars: filledBars([0, 4, 8, 12]),
    volume: 1,
    isActive: true,
  });

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  assert.ok(intro);
  const lead = intro.tracks.find((track) => track.id === 'track-fx-lead');
  assert.ok(lead);
  assert.equal(lead.soundCode, "note('e4').s('sawtooth').room(0.4).lpf(5000).env(0.01,0.2,0.8,0.4).gain(1)");
});

test('putTrackInScene in one scene does not disappear when another scene is updated', () => {
  let state = putTrackInScene(cloneState(), 'scene-intro', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([0, 4, 8, 12]),
    volume: 0.61,
    isActive: true,
  });

  state = putTrackInScene(state, 'scene-groove', {
    id: 'track-mid-bass',
    name: MID_BASS_NAME,
    soundCode: MID_BASS_SOUND,
    bars: filledBars([1, 7, 10, 13]),
    volume: 0.64,
    isActive: true,
  });

  state = updateTrackBars(state, 'scene-groove', 'track-mid-bass', filledBars([2, 6, 10, 14]));
  state = normalizePlaybackState(state);

  const intro = state.scenes.find((scene) => scene.id === 'scene-intro');
  const groove = state.scenes.find((scene) => scene.id === 'scene-groove');
  assert.ok(intro);
  assert.ok(groove);
  assert.ok(intro.tracks.some((track) => track.id === 'track-mid-bass'));
  assert.ok(groove.tracks.some((track) => track.id === 'track-mid-bass'));
});

test('updateTrackBars rejects creating missing tracks implicitly', () => {
  assert.throws(
    () => updateTrackBars(cloneState(), 'scene-groove', 'track-mid-bass', filledBars([0, 4])),
    /Use put_track to create it first/,
  );
});
