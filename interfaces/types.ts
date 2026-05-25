export type ClientRole = 'stage' | 'controller';

export type KnobType = 'filter' | 'delay' | 'reverb' | 'volume';

export type DrumPadInstrument = 'kick' | 'snare' | 'hat';

export type PlaybackMode = 'strudel' | 'explorer';
export type SceneName = string;
export type StepValue = 0 | 1 | 2 | 3;

export interface AudioControlsState {
  filter: number;
  delay: number;
  reverb: number;
  volume: number;
}

export interface ClientInfo {
  id: string;
  name: string;
  role: ClientRole;
}

export interface GridTrackPayload {
  id?: string;
  name?: string;
  soundCode?: string;
  bars?: unknown[];
  volume?: number;
  isActive?: boolean;
}

export interface SequencerTrack {
  id: string;
  name: string;
  soundCode: string;
  bars: StepValue[][];
  volume: number;
  isActive: boolean;
}

export interface ScenePayload {
  id?: string;
  name?: string;
  tracks?: GridTrackPayload[];
}

export interface PlaybackScene {
  id: string;
  name: SceneName;
  tracks: SequencerTrack[];
}
