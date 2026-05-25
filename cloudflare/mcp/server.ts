import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { PlaybackState } from '@/interfaces/playback';
import type { StepValue } from '@/interfaces/types';
import type { Env } from '@/cloudflare/env';
import { getTrack, listTracks } from '@/cloudflare/state-utils';
import type { InternalCommand } from '@/cloudflare/durable-object/commands';

function getGlobalStub(env: Env): DurableObjectStub {
  const objectId = env.PRETZEL_GLOBAL_STATE.idFromName(env.PRETZEL_GLOBAL_DO_NAME || 'global-dj');
  return env.PRETZEL_GLOBAL_STATE.get(objectId);
}

export async function callGlobalState<T>(env: Env, command: InternalCommand): Promise<T> {
  const stub = getGlobalStub(env);
  const response = await stub.fetch('https://pretzel.internal/control', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Global state command failed with ${response.status}`);
  }

  return response.json<T>();
}

export function createMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: 'pretzel-global-dj',
    version: '1.0.0',
  });

  server.registerTool(
    'get_playback_state',
    {
      description: 'Get the current authoritative Pretzel playback state for the global DJ.',
      outputSchema: z.object({
        playbackState: z.unknown(),
      }),
    },
    async () => {
      const playbackState = await callGlobalState<PlaybackState>(env, { type: 'get-playback-state' });
      return {
        content: [{ type: 'text', text: 'Fetched the current Pretzel playback state.' }],
        structuredContent: { playbackState },
      };
    },
  );

  server.registerTool(
    'list_tracks',
    {
      description: 'List exact track ids currently present in the authoritative playback state. Use this before remove_track or set_track_steps so you have the exact trackId.',
      inputSchema: z.object({
        sceneId: z.string().optional(),
      }),
      outputSchema: z.object({
        tracks: z.array(z.object({
          trackId: z.string(),
          trackName: z.string(),
          soundCode: z.string(),
          sceneRefs: z.array(z.object({
            sceneId: z.string(),
            sceneName: z.string(),
          })),
        })),
      }),
    },
    async ({ sceneId }) => {
      const tracks = await callGlobalState<ReturnType<typeof listTracks>>(env, {
        type: 'list-tracks',
        payload: sceneId ? { sceneId } : undefined,
      });
      return {
        content: [{ type: 'text', text: sceneId ? `Listed tracks in ${sceneId}.` : 'Listed tracks across all scenes.' }],
        structuredContent: { tracks },
      };
    },
  );

  server.registerTool(
    'get_track',
    {
      description: 'Get one exact track by trackId from the authoritative playback state. If sceneId is omitted, returns every scene instance of that trackId.',
      inputSchema: z.object({
        trackId: z.string(),
        sceneId: z.string().optional(),
      }),
      outputSchema: z.object({
        track: z.unknown(),
      }),
    },
    async ({ trackId, sceneId }) => {
      const track = await callGlobalState<ReturnType<typeof getTrack>>(env, {
        type: 'get-track',
        payload: { trackId, sceneId },
      });
      return {
        content: [{ type: 'text', text: sceneId ? `Fetched ${trackId} in ${sceneId}.` : `Fetched ${trackId}.` }],
        structuredContent: { track },
      };
    },
  );

  server.registerTool(
    'set_scene_order',
    {
      description: 'Change the playback order of scenes.',
      inputSchema: z.object({
        sceneOrder: z.array(z.string()),
      }),
    },
    async ({ sceneOrder }) => {
      const playbackState = await callGlobalState<PlaybackState>(env, {
        type: 'set-scene-order',
        payload: { sceneOrder },
      });
      return {
        content: [{ type: 'text', text: 'Updated the scene order.' }],
        structuredContent: { playbackState },
      };
    },
  );

  server.registerTool(
    'set_active_scene',
    {
      description: 'Set the currently active scene.',
      inputSchema: z.object({
        sceneId: z.string(),
      }),
    },
    async ({ sceneId }) => {
      const playbackState = await callGlobalState<PlaybackState>(env, {
        type: 'set-active-scene',
        payload: { sceneId },
      });
      return {
        content: [{ type: 'text', text: `Set active scene to ${sceneId}.` }],
        structuredContent: { playbackState },
      };
    },
  );

  server.registerTool(
    'set_track_steps',
    {
      description: 'Set all bars of steps for an existing track id inside a scene. This will fail if the exact track id does not already exist. Use put_track first for any new track.',
      inputSchema: z.object({
        sceneId: z.string(),
        trackId: z.string(),
        bars: z.array(z.array(z.number().int().min(0).max(3))),
      }),
    },
    async ({ sceneId, trackId, bars }) => {
      const playbackState = await callGlobalState<PlaybackState>(env, {
        type: 'set-track-steps',
        payload: {
          sceneId,
          trackId,
          bars: bars as StepValue[][],
        },
      });
      return {
        content: [{ type: 'text', text: `Updated ${trackId} in ${sceneId}.` }],
        structuredContent: { playbackState },
      };
    },
  );

  server.registerTool(
    'put_track',
    {
      description: 'Atomically create or replace one exact track inside a scene. Use this for every new musical lane and for any soundCode or bars update that must persist exactly.',
      inputSchema: z.object({
        sceneId: z.string(),
        trackId: z.string(),
        trackName: z.string(),
        soundCode: z.string(),
        bars: z.array(z.array(z.number().int().min(0).max(3))),
        volume: z.number().min(0).max(1).optional(),
        isActive: z.boolean().optional(),
      }),
    },
    async ({ sceneId, trackId, trackName, soundCode, bars, volume, isActive }) => {
      const playbackState = await callGlobalState<PlaybackState>(env, {
        type: 'put-track',
        payload: {
          sceneId,
          track: {
            id: trackId,
            name: trackName,
            soundCode,
            bars: bars as StepValue[][],
            volume,
            isActive,
          },
        },
      });
      return {
        content: [{ type: 'text', text: `Put ${trackName} in ${sceneId}.` }],
        structuredContent: { playbackState },
      };
    },
  );

  server.registerTool(
    'remove_track',
    {
      description: 'Remove a track by exact track id. If sceneId is omitted, remove it from every scene.',
      inputSchema: z.object({
        sceneId: z.string().optional(),
        trackId: z.string(),
      }),
    },
    async ({ sceneId, trackId }) => {
      const playbackState = await callGlobalState<PlaybackState>(env, {
        type: 'remove-track',
        payload: { sceneId, trackId },
      });
      return {
        content: [{ type: 'text', text: sceneId ? `Removed ${trackId} from ${sceneId}.` : `Removed ${trackId} from all scenes.` }],
        structuredContent: { playbackState },
      };
    },
  );

  return server;
}
