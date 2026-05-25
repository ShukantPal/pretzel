import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_PLAYBACK_STATE, getArrangementBarCount, getOrderedScenes, playbackStateToStrudelCode } from '@/pretzel';
import type { PlaybackState } from '@/interfaces/playback';
import type { KnobChangePayload } from '@/interfaces/socket';
import type {
  AudioControlsState,
  ClientRole,
  PlaybackScene,
} from '@/interfaces/types';
import { StrudelAudioEngine } from './audio/StrudelAudioEngine';
import { TalonCopilotPanel } from './components/TalonCopilotPanel';
import { ControllerView } from './components/ControllerView';
import { RoleSelectionView } from './components/RoleSelectionView';
import { StageView } from './components/stage/StageView';
import { usePretzelClient } from './client/usePretzelClient';
import { getBackendUrl } from './client/CreateSocketClient';
import { getInitialTalonConfig, persistTalonConfig } from './utils/talon-config';

function getGlobalPlayheadPosition(playbackState: PlaybackState, globalStep: number) {
  const orderedScenes = getOrderedScenes(playbackState);
  let stepCursor = 0;

  for (const scene of orderedScenes) {
    const sceneBarCount = Math.max(1, ...scene.tracks.map((track) => track.bars.length || 0));
    const sceneStepCount = sceneBarCount * playbackState.stepsPerBar;
    if (globalStep < stepCursor + sceneStepCount) {
      const localStep = globalStep - stepCursor;
      return {
        sceneId: scene.id,
        barIndex: Math.floor(localStep / playbackState.stepsPerBar),
        stepIndex: localStep % playbackState.stepsPerBar,
      };
    }
    stepCursor += sceneStepCount;
  }

  return {
    sceneId: playbackState.activeSceneId,
    barIndex: 0,
    stepIndex: 0,
  };
}

export default function App() {
  const [role, setRole] = useState<'selection' | ClientRole>(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('role');
    return value === 'stage' || value === 'controller' ? value : 'selection';
  });
  const [nickname, setNickname] = useState(() => new URLSearchParams(window.location.search).get('nickname') || '');
  const [talonConfig, setTalonConfig] = useState(() => getInitialTalonConfig());
  const [mintedTalonAuthToken, setMintedTalonAuthToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(EMPTY_PLAYBACK_STATE);
  const [sliderVals, setSliderVals] = useState<AudioControlsState>({
    filter: 20000,
    delay: 0.35,
    reverb: 0.25,
    volume: 0.8,
  });
  const [activeSceneStep, setActiveSceneStep] = useState({
    sceneId: '',
    barIndex: 0,
    stepIndex: -1,
  });
  const [recentlyChangedBars, setRecentlyChangedBars] = useState<string[]>([]);

  const audioEngineRef = useRef<StrudelAudioEngine | null>(null);
  const playheadIntervalRef = useRef<number | null>(null);
  const playheadStepRef = useRef(0);
  const playbackStateRef = useRef(playbackState);
  const changedBarsTimeoutRef = useRef<number | null>(null);
  const previousScenesRef = useRef<PlaybackScene[]>([]);

  const bpm = playbackState.bpm;
  const orderedScenes = useMemo(() => getOrderedScenes(playbackState), [playbackState]);
  const activeCode = useMemo(
    () => playbackStateToStrudelCode(playbackState, sliderVals),
    [playbackState, sliderVals],
  );
  const totalBars = useMemo(() => getArrangementBarCount(playbackState), [playbackState]);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    if (previousScenesRef.current.length === 0) {
      previousScenesRef.current = orderedScenes;
      return;
    }

    const previousScenes = previousScenesRef.current;
    const nextChangedBars = new Set<string>();

    orderedScenes.forEach((scene) => {
      const previousScene = previousScenes.find((candidate) => candidate.id === scene.id);
      const barCount = Math.max(1, ...scene.tracks.map((track) => track.bars.length || 0));

      for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
        const currentSnapshot = JSON.stringify(
          scene.tracks.map((track) => ({
            id: track.id,
            bars: track.bars[barIndex] ?? [],
            volume: track.volume,
            isActive: track.isActive,
          })),
        );
        const previousSnapshot = previousScene
          ? JSON.stringify(
              previousScene.tracks.map((track) => ({
                id: track.id,
                bars: track.bars[barIndex] ?? [],
                volume: track.volume,
                isActive: track.isActive,
              })),
            )
          : '';

        if (currentSnapshot !== previousSnapshot) {
          nextChangedBars.add(`${scene.id}:${barIndex}`);
        }
      }
    });

    previousScenesRef.current = orderedScenes;
    if (nextChangedBars.size === 0) {
      return;
    }

    if (changedBarsTimeoutRef.current !== null) {
      window.clearTimeout(changedBarsTimeoutRef.current);
    }

    setRecentlyChangedBars(Array.from(nextChangedBars));
    changedBarsTimeoutRef.current = window.setTimeout(() => {
      setRecentlyChangedBars([]);
      changedBarsTimeoutRef.current = null;
    }, 2200);
  }, [orderedScenes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (role !== 'selection') params.set('role', role);
    else params.delete('role');

    if (nickname) params.set('nickname', nickname);
    else params.delete('nickname');

    const searchStr = params.toString();
    const newUrl = `${window.location.pathname}${searchStr ? `?${searchStr}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [role, nickname]);

  useEffect(() => {
    persistTalonConfig(talonConfig);
  }, [talonConfig]);

  useEffect(() => {
    const abortController = new AbortController();
    let refreshTimeout: number | null = null;

    const loadSessionToken = async () => {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(new URL('/talon/session-token', backendUrl).toString(), {
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch Talon session token (${response.status})`);
        }
        const payload = (await response.json()) as {
          token?: string;
          namespace?: string;
          agent?: string;
          sessionId?: string;
          expiresInSeconds?: number;
        };
        if (abortController.signal.aborted) {
          return;
        }
        if (typeof payload.token === 'string' && payload.token.trim().length > 0) {
          setMintedTalonAuthToken(`Bearer ${payload.token.trim()}`);
        }
        setTalonConfig((prev) => ({
          ...prev,
          namespace:
            typeof payload.namespace === 'string' && payload.namespace.trim().length > 0
              ? payload.namespace.trim()
              : prev.namespace,
          agent:
            typeof payload.agent === 'string' && payload.agent.trim().length > 0
              ? payload.agent.trim()
              : prev.agent,
          sessionId:
            typeof payload.sessionId === 'string' && payload.sessionId.trim().length > 0
              ? payload.sessionId.trim()
              : prev.sessionId,
        }));
        const expiresInSeconds =
          typeof payload.expiresInSeconds === 'number' && Number.isFinite(payload.expiresInSeconds)
            ? payload.expiresInSeconds
            : 300;
        const refreshInMs = Math.max(30_000, expiresInSeconds * 1000 - 30_000);
        refreshTimeout = window.setTimeout(() => {
          void loadSessionToken();
        }, refreshInMs);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('[Talon] Failed to fetch session token:', error);
          setMintedTalonAuthToken(null);
          refreshTimeout = window.setTimeout(() => {
            void loadSessionToken();
          }, 30_000);
        }
      }
    };

    void loadSessionToken();

    return () => {
      abortController.abort();
      if (refreshTimeout !== null) {
        window.clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const socketRef = usePretzelClient({
    role,
    nickname,
    setConnected,
    setClientsCount,
    setPlaybackState,
    setSliderVals,
  });

  const schedulePlayhead = () => {
    if (playheadIntervalRef.current !== null) {
      window.clearInterval(playheadIntervalRef.current);
      playheadIntervalRef.current = null;
    }

    playheadStepRef.current = 0;
    playheadIntervalRef.current = window.setInterval(() => {
      const nextState = playbackStateRef.current;
      const arrangementStepCount = Math.max(1, getArrangementBarCount(nextState) * nextState.stepsPerBar);
      const globalStep =
        audioEngineRef.current?.getTransportStep(nextState.stepsPerBar) ?? playheadStepRef.current % arrangementStepCount;
      const nextPosition = getGlobalPlayheadPosition(nextState, globalStep);
      setActiveSceneStep(nextPosition);
      playheadStepRef.current = globalStep;
    }, 50);
  };

  const startAudioStage = async () => {
    const engine = new StrudelAudioEngine();
    const compileResult = await engine.compile(activeCode, totalBars);
    if (!compileResult.success) {
      console.error('[Audio] Failed to compile initial Strudel pattern.', compileResult.error);
      return;
    }
    await engine.start();
    audioEngineRef.current = engine;
    schedulePlayhead();

    setAudioStarted(true);
  };

  useEffect(() => {
    return () => {
      if (changedBarsTimeoutRef.current !== null) {
        window.clearTimeout(changedBarsTimeoutRef.current);
      }
      if (playheadIntervalRef.current !== null) {
        window.clearInterval(playheadIntervalRef.current);
      }
      audioEngineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (audioStarted && audioEngineRef.current) {
      audioEngineRef.current.setBpm(bpm);
      void audioEngineRef.current.compile(activeCode, totalBars);
      schedulePlayhead();
    }
  }, [activeCode, audioStarted, bpm, totalBars]);

  const toggleTrackStep = (sceneId: string, trackId: string, barIndex: number, stepIndex: number) => {
    socketRef.current?.emit('toggle-step', {
      sceneId,
      trackId,
      barIndex,
      stepIndex,
    });
  };

  const selectScene = (sceneId: string) => {
    socketRef.current?.emit('select-scene', { sceneId });
  };

  const handleSliderChange = (type: KnobChangePayload['type'], value: number) => {
    setSliderVals((prev) => ({ ...prev, [type]: value }));
    socketRef.current?.emit('knob-change', { type, value });
  };
  if (role === 'selection') {
    return <RoleSelectionView nickname={nickname} setNickname={setNickname} setRole={setRole} />;
  }

  if (role === 'stage') {
    return (
      <StageView
        bpm={bpm}
        clientsCount={clientsCount}
        audioStarted={audioStarted}
        onStartAudioStage={startAudioStage}
        orderedScenes={orderedScenes}
        activeSceneId={playbackState.activeSceneId}
        activeBarIndex={playbackState.activeBarIndex}
        playheadSceneId={activeSceneStep.sceneId}
        playheadBarIndex={activeSceneStep.barIndex}
        activeStep={activeSceneStep.stepIndex}
        recentlyChangedBars={recentlyChangedBars}
        sliderVals={sliderVals}
        onSelectScene={selectScene}
        onToggleTrackStep={toggleTrackStep}
        onHandleSliderChange={handleSliderChange}
        copilot={
          <TalonCopilotPanel
            gatewayUrl={talonConfig.gatewayUrl}
            namespace={talonConfig.namespace}
            agent={talonConfig.agent}
            authToken={mintedTalonAuthToken}
            sessionId={talonConfig.sessionId}
            onSessionChange={(sessionId) => setTalonConfig((prev) => ({ ...prev, sessionId }))}
            viewerLabel="Anonymous"
            style={{ height: '100%' }}
          />
        }
      />
    );
  }

  return (
    <ControllerView
      nickname={nickname}
      bpm={bpm}
      connected={connected}
      copilot={
        <TalonCopilotPanel
          gatewayUrl={talonConfig.gatewayUrl}
          namespace={talonConfig.namespace}
          agent={talonConfig.agent}
          authToken={mintedTalonAuthToken}
          sessionId={talonConfig.sessionId}
          onSessionChange={(sessionId) => setTalonConfig((prev) => ({ ...prev, sessionId }))}
          viewerLabel="Anonymous"
        />
      }
      sliderVals={sliderVals}
      onHandleSliderChange={handleSliderChange}
    />
  );
}
