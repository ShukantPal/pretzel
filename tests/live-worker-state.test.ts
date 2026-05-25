import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { playbackStateToStrudelCode } from '../pretzel/index';
import { isSupportedSoundCode } from '../pretzel/sound-support';
import type { PlaybackState } from '../interfaces/playback';

const WORKER_URL = 'https://pretzel.cloudflare-7a3.workers.dev/mcp';
const SECRET_PATH = '/tmp/pretezel_mcp_secret.txt';

function getMcpToken() {
  const envToken = process.env.PRETZEL_MCP_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }

  if (existsSync(SECRET_PATH)) {
    return readFileSync(SECRET_PATH, 'utf8').trim();
  }

  throw new Error('Missing PRETZEL_MCP_TOKEN and /tmp/pretezel_mcp_secret.txt');
}

async function getLivePlaybackState(): Promise<PlaybackState> {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getMcpToken()}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_playback_state',
        arguments: {},
      },
    }),
  });

  assert.equal(response.ok, true, `Worker returned ${response.status}`);
  const rawBody = await response.text();
  const jsonLine = rawBody
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('data: '));

  assert.ok(jsonLine, `MCP event stream did not include a data payload:\n${rawBody}`);

  const payload = JSON.parse(jsonLine.slice('data: '.length)) as {
    result?: {
      content?: Array<{
        type?: string;
        text?: string;
      }>;
      structuredContent?: {
        playbackState?: PlaybackState;
      };
    };
  };
  const playbackState = payload.result?.structuredContent?.playbackState;
  assert.ok(playbackState, 'MCP response did not include structured playbackState');
  return playbackState;
}

test('live worker playback state only contains runtime-supported sound codes', async () => {
  const playbackState = await getLivePlaybackState();

  for (const scene of playbackState.scenes) {
    for (const track of scene.tracks) {
      assert.equal(
        isSupportedSoundCode(track.soundCode),
        true,
        `Unsupported live soundCode in ${scene.id}/${track.id}: ${track.soundCode}`,
      );
    }
  }
});

test('live worker playback state converts to Strudel code', async () => {
  const playbackState = await getLivePlaybackState();
  const code = playbackStateToStrudelCode(playbackState);

  assert.equal(typeof code, 'string');
  assert.ok(code.includes('stack('), 'Expected generated Strudel code to include stack(...)');
  assert.ok(code.length > 32, 'Expected non-trivial Strudel output for live state');
});
