import { Pattern, note, repl, sequence, sound, stack } from '@strudel/core';
import { miniAllStrings } from '@strudel/mini';
import { getAudioContext, webaudioOutput } from '@strudel/webaudio';
import { initAudio, onceEnded, registerSound, registerSynthSounds } from 'superdough';

miniAllStrings();

type SchedulerLike = {
  start: () => void;
  stop: () => void;
  setPattern: (pattern: unknown, autostart?: boolean) => Promise<unknown>;
  setCps: (cps: number) => void;
  now: () => number;
};

type ReplLike = {
  scheduler: SchedulerLike;
};

type StrudelSoundValue = Record<string, unknown> & {
  velocity?: number;
};

let runtimeInitPromise: Promise<void> | null = null;
let whiteNoiseBuffer: AudioBuffer | null = null;

function createWhiteNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  const durationSeconds = 1;
  const frameCount = audioContext.sampleRate * durationSeconds;
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    channelData[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function getWhiteNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  if (!whiteNoiseBuffer || whiteNoiseBuffer.sampleRate !== audioContext.sampleRate) {
    whiteNoiseBuffer = createWhiteNoiseBuffer(audioContext);
  }
  return whiteNoiseBuffer;
}

function scheduleGainEnvelope(
  audioParam: AudioParam,
  startTime: number,
  peakGain: number,
  {
    attack = 0.001,
    decay = 0.08,
    endFloor = 0.0001,
  }: {
    attack?: number;
    decay?: number;
    endFloor?: number;
  },
): number {
  audioParam.cancelScheduledValues(startTime);
  audioParam.setValueAtTime(0.0001, startTime);
  audioParam.linearRampToValueAtTime(Math.max(0.0001, peakGain), startTime + attack);
  audioParam.exponentialRampToValueAtTime(endFloor, startTime + attack + decay);
  return startTime + attack + decay;
}

function createNoiseSource(audioContext: AudioContext): AudioBufferSourceNode {
  const source = audioContext.createBufferSource();
  source.buffer = getWhiteNoiseBuffer(audioContext);
  source.loop = true;
  return source;
}

function createSimpleNoiseVoice(
  audioContext: AudioContext,
  time: number,
  peakGain: number,
  {
    decay,
    filterFrequency,
  }: {
    decay: number;
    filterFrequency: number;
  },
) {
  const source = createNoiseSource(audioContext);
  const filter = audioContext.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(filterFrequency, time);
  const gainNode = audioContext.createGain();
  const endTime = scheduleGainEnvelope(gainNode.gain, time, peakGain, { decay });

  source.connect(filter);
  filter.connect(gainNode);
  source.start(time);
  source.stop(endTime + 0.02);

  return {
    node: gainNode,
    source,
    stop: (stopTime: number) => source.stop(stopTime),
  };
}

function createKickVoice(audioContext: AudioContext, time: number, peakGain: number) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(150, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.12);

  const gainNode = audioContext.createGain();
  const endTime = scheduleGainEnvelope(gainNode.gain, time, peakGain, { decay: 0.22 });

  oscillator.connect(gainNode);
  oscillator.start(time);
  oscillator.stop(endTime + 0.02);

  return {
    node: gainNode,
    source: oscillator,
    stop: (stopTime: number) => oscillator.stop(stopTime),
  };
}

function createSnareVoice(audioContext: AudioContext, time: number, peakGain: number) {
  const toneOscillator = audioContext.createOscillator();
  toneOscillator.type = 'triangle';
  toneOscillator.frequency.setValueAtTime(180, time);
  toneOscillator.frequency.exponentialRampToValueAtTime(100, time + 0.05);

  const toneGain = audioContext.createGain();
  const toneEnd = scheduleGainEnvelope(toneGain.gain, time, peakGain * 0.45, { decay: 0.08 });

  toneOscillator.connect(toneGain);
  toneOscillator.start(time);
  toneOscillator.stop(toneEnd + 0.02);

  const noise = createNoiseSource(audioContext);
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(1000, time);
  const noiseGain = audioContext.createGain();
  const noiseEnd = scheduleGainEnvelope(noiseGain.gain, time, peakGain, { decay: 0.18 });

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noise.start(time);
  noise.stop(noiseEnd + 0.02);

  const mix = audioContext.createGain();
  toneGain.connect(mix);
  noiseGain.connect(mix);

  return {
    node: mix,
    source: noise,
    stop: (stopTime: number) => {
      toneOscillator.stop(stopTime);
      noise.stop(stopTime);
    },
  };
}

function createOscillatorVoice(
  audioContext: AudioContext,
  time: number,
  peakGain: number,
  {
    type,
    startFrequency,
    endFrequency,
    decay,
  }: {
    type: OscillatorType;
    startFrequency: number;
    endFrequency: number;
    decay: number;
  },
) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + decay);

  const gainNode = audioContext.createGain();
  const endTime = scheduleGainEnvelope(gainNode.gain, time, peakGain, { decay });

  oscillator.connect(gainNode);
  oscillator.start(time);
  oscillator.stop(endTime + 0.02);

  return {
    node: gainNode,
    source: oscillator,
    stop: (stopTime: number) => oscillator.stop(stopTime),
  };
}

function registerPretzelPalette() {
  registerSynthSounds();

  registerSound('kick', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createKickVoice(audioContext, time, 0.9 * velocity);
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('snare', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createSnareVoice(audioContext, time, 0.7 * velocity);
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('hat', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createSimpleNoiseVoice(audioContext, time, 0.32 * velocity, {
      decay: 0.08,
      filterFrequency: 7000,
    });
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('closed', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createSimpleNoiseVoice(audioContext, time, 0.26 * velocity, {
      decay: 0.045,
      filterFrequency: 6500,
    });
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('ride', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createSimpleNoiseVoice(audioContext, time, 0.22 * velocity, {
      decay: 0.32,
      filterFrequency: 8000,
    });
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('rim', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createOscillatorVoice(audioContext, time, 0.4 * velocity, {
      type: 'triangle',
      startFrequency: 850,
      endFrequency: 400,
      decay: 0.025,
    });
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });

  registerSound('tom', (time: number, value: StrudelSoundValue, onended: () => void) => {
    const audioContext = getAudioContext();
    const velocity = typeof value.velocity === 'number' ? value.velocity : 1;
    const voice = createOscillatorVoice(audioContext, time, 0.55 * velocity, {
      type: 'sine',
      startFrequency: 130,
      endFrequency: 65,
      decay: 0.18,
    });
    onceEnded(voice.source, onended);
    return {
      node: voice.node,
      stop: voice.stop,
    };
  });
}

async function ensureRuntimeReady() {
  if (!runtimeInitPromise) {
    runtimeInitPromise = (async () => {
      await initAudio();
      registerPretzelPalette();
    })();
  }
  await runtimeInitPromise;
}

export class StrudelAudioEngine {
  private scheduler: SchedulerLike | null = null;
  private activePatternString = '';
  private startedAtSeconds: number | null = null;
  private bpm = 135;
  private arrangementBars = 1;

  private ensureScheduler() {
    if (this.scheduler) {
      return this.scheduler;
    }

    const audioContext = getAudioContext();
    const runtime = repl({
      defaultOutput: webaudioOutput,
      getTime: () => audioContext.currentTime,
    }) as ReplLike;
    this.scheduler = runtime.scheduler;
    this.applyTempo();
    return this.scheduler;
  }

  private applyTempo() {
    if (!this.scheduler) {
      return;
    }

    const cps = this.bpm / 240;
    const arrangementScale = Math.max(1, this.arrangementBars);
    this.scheduler.setCps(cps / arrangementScale);
  }

  public async compile(codeStr: string, cycleBars = 1): Promise<{ success: boolean; error?: string }> {
    try {
      await ensureRuntimeReady();
      const scheduler = this.ensureScheduler();
      const context = {
        sound,
        s: sound,
        note,
        n: note,
        stack,
        sequence,
      };
      const runner = new Function(...Object.keys(context), `return ${codeStr.trim()}`);
      const compiledPattern = runner(...Object.values(context));

      if (!(compiledPattern instanceof Pattern)) {
        throw new Error('Code did not return a valid Strudel Pattern object.');
      }

      this.arrangementBars = Math.max(1, Math.floor(cycleBars));
      this.applyTempo();
      await scheduler.setPattern(compiledPattern, false);
      this.activePatternString = codeStr;
      return { success: true };
    } catch (error) {
      console.error('[Audio] Strudel compile failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async start() {
    await ensureRuntimeReady();
    const scheduler = this.ensureScheduler();
    const audioContext = getAudioContext();
    if (audioContext.state !== 'running') {
      await audioContext.resume();
    }
    scheduler.start();
    this.startedAtSeconds = audioContext.currentTime;
  }

  public stop() {
    this.scheduler?.stop();
    this.startedAtSeconds = null;
  }

  public destroy() {
    this.stop();
    this.scheduler = null;
    this.activePatternString = '';
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    this.applyTempo();
  }

  public getActivePatternString() {
    return this.activePatternString;
  }

  public getElapsedSeconds() {
    if (this.startedAtSeconds === null) {
      return 0;
    }

    return Math.max(0, getAudioContext().currentTime - this.startedAtSeconds);
  }

  public getTransportStep(stepsPerBar: number) {
    if (!this.scheduler) {
      return 0;
    }

    const phase = this.scheduler.now();
    const normalizedPhase = ((phase % 1) + 1) % 1;
    const totalSteps = Math.max(1, this.arrangementBars * stepsPerBar);
    return Math.floor(normalizedPhase * totalSteps) % totalSteps;
  }
}
