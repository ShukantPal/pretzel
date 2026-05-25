# Pretzel

Pretzel is a live browser-based sequencer with a Talon-powered co-producer.  
The browser renders the stage, Cloudflare Durable Objects hold the authoritative playback state, and Talon drives changes through a narrow MCP contract.

## What it does

- Renders a multi-scene step sequencer in the browser
- Plays audio directly from `PlaybackState -> Strudel code -> @strudel/webaudio`
- Exposes a small MCP surface so an agent can inspect and mutate the arrangement
- Uses a single global Durable Object as the realtime source of truth

## Architecture

### Frontend

- `src/`
- React + Vite
- browser stage/controller UI
- audio runtime in `src/audio/StrudelAudioEngine.ts`

### Backend

- `cloudflare/`
- `index.ts`: top-level request router
- `routes/`: HTTP/WebSocket/Talon/MCP entrypoints
- `durable-object/`: global state class + socket/control protocol
- `mcp/`: MCP server/tool registration
- `state/`: playback normalization and exact mutations

### Agent control plane

- Talon session auth minted at `/talon/session-token`
- MCP endpoint at `/mcp`
- exact mutation contract only; no whole-state overwrite tools

## MCP contract

Current supported tools:

- `get_playback_state()`
- `list_tracks({ sceneId?: string })`
- `get_track({ trackId: string, sceneId?: string })`
- `set_scene_order({ sceneOrder: string[] })`
- `set_active_scene({ sceneId: string })`
- `set_track_steps({ sceneId: string, trackId: string, bars: number[][] })`
- `put_track({ sceneId: string, trackId: string, trackName: string, soundCode: string, bars: number[][], volume?: number, isActive?: boolean })`
- `remove_track({ trackId: string, sceneId?: string })`

Rules:

- `trackId` is authoritative identity
- `trackName` is display-only
- `put_track` is the only create/replace path
- `remove_track` removes by exact `trackId`
- the backend is the source of truth; the frontend should only render snapshots

## Sound model

Pretzel supports a constrained Strudel subset for grid tracks:

- samples: `kick`, `snare`, `hat`, `closed`, `ride`, `rim`, `tom`
- synth voices: `sine`, `triangle`, `square`, `sawtooth`
- supported single-voice chains such as:
  - `note('e2').s('sawtooth').lpf(80).distort(0.4).slide(0.12)`
  - `note('e4').s('sawtooth').room(0.4).env(0.01,0.2,0.8,0.4).gain(1)`

Aliases are canonicalized server-side to runtime-safe forms.

## Local development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the Cloudflare worker locally:

```bash
npm run worker:dev
```

## Validation

Typecheck:

```bash
npm run typecheck
```

Unit and integration tests:

```bash
npm run test
```

Live worker state validation:

```bash
npm run test:live
```

Full repo check:

```bash
npm run check
```

## Deploy

```bash
npm run worker:deploy
```

Required Worker secrets:

- `TALON_MCP_TOKEN`
- `GATEWAY_JWT_SECRET`

## Notes

- The current system uses one global DJ state, not rooms.
- The stage UI intentionally renders the global union of track rows across scenes.
- The backend stores sparse per-scene tracks; absent rows in a scene are rendered as silence.
