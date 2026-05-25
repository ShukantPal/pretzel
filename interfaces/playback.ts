import type { PlaybackMode, PlaybackScene } from './types';

export interface PlaybackState {
  bpm: number;
  mode: PlaybackMode;
  stepsPerBar: number;
  sceneOrder: string[];
  activeSceneId: string;
  activeBarIndex: number;
  scenes: PlaybackScene[];
}
