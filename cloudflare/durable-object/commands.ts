import type { PlaybackState } from '@/interfaces/playback';
import type { GridTrackPayload, StepValue } from '@/interfaces/types';
import {
  getTrack,
  listTracks,
  putTrackInScene,
  removeTrackFromScene,
  setActiveScene,
  setSceneOrder,
  toggleTrackStepInScene,
  updateTrackBars,
  type PersistedPretzelState,
} from '@/cloudflare/state-utils';
import type { ClientAttachment, ServerEventName, WireMessage } from './socket-protocol';
import { listPresentClients } from '@/cloudflare/state-utils';

export type MutationResult = {
  playbackChanged?: boolean;
  clientsChanged?: boolean;
};

export type InternalCommand =
  | { type: 'get-playback-state' }
  | { type: 'list-tracks'; payload?: { sceneId?: string } }
  | { type: 'get-track'; payload: { trackId: string; sceneId?: string } }
  | { type: 'set-scene-order'; payload: { sceneOrder: string[] } }
  | { type: 'set-active-scene'; payload: { sceneId: string } }
  | { type: 'set-track-steps'; payload: { sceneId: string; trackId: string; bars: StepValue[][] } }
  | { type: 'put-track'; payload: { sceneId: string; track: GridTrackPayload } }
  | { type: 'remove-track'; payload: { sceneId?: string; trackId: string } };

type CommitPlaybackUpdate = (nextPlaybackState: PlaybackState) => Promise<PlaybackState>;
type BroadcastEvent = (type: ServerEventName, payload?: unknown) => void;

export async function applyWireMessage(
  stateData: PersistedPretzelState,
  message: WireMessage,
  {
    commitPlaybackUpdate,
    broadcastEvent,
  }: {
    commitPlaybackUpdate: CommitPlaybackUpdate;
    broadcastEvent: BroadcastEvent;
  },
): Promise<MutationResult> {
  switch (message.type) {
    case 'select-scene':
      await commitPlaybackUpdate(setActiveScene(stateData.playbackState, message.payload.sceneId));
      return { playbackChanged: true };
    case 'toggle-step':
      await commitPlaybackUpdate(
        toggleTrackStepInScene(
          stateData.playbackState,
          message.payload.sceneId,
          message.payload.trackId,
          message.payload.barIndex,
          message.payload.stepIndex,
        ),
      );
      return { playbackChanged: true };
    case 'knob-change':
      broadcastEvent('knob-apply', message.payload);
      return {};
    default:
      return {};
  }
}

export async function applyInternalCommand(
  stateData: PersistedPretzelState,
  command: InternalCommand,
  commitPlaybackUpdate: CommitPlaybackUpdate,
): Promise<unknown> {
  switch (command.type) {
    case 'get-playback-state':
      return stateData.playbackState;
    case 'list-tracks':
      return listTracks(stateData.playbackState, command.payload?.sceneId);
    case 'get-track':
      return getTrack(stateData.playbackState, command.payload.trackId, command.payload.sceneId);
    case 'set-scene-order':
      return commitPlaybackUpdate(setSceneOrder(stateData.playbackState, command.payload.sceneOrder));
    case 'set-active-scene':
      return commitPlaybackUpdate(setActiveScene(stateData.playbackState, command.payload.sceneId));
    case 'set-track-steps':
      return commitPlaybackUpdate(
        updateTrackBars(
          stateData.playbackState,
          command.payload.sceneId,
          command.payload.trackId,
          command.payload.bars,
        ),
      );
    case 'put-track':
      return commitPlaybackUpdate(
        putTrackInScene(
          stateData.playbackState,
          command.payload.sceneId,
          command.payload.track,
        ),
      );
    case 'remove-track':
      return commitPlaybackUpdate(
        removeTrackFromScene(
          stateData.playbackState,
          command.payload.sceneId,
          command.payload.trackId,
        ),
      );
    default:
      throw new Error(`Unsupported command type: ${(command as { type: string }).type}`);
  }
}

export function listClients(attachments: ClientAttachment[]) {
  return listPresentClients(attachments);
}
