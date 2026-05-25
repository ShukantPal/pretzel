/// <reference types="vite/client" />

declare module '@strudel/core';
declare module '@strudel/mini';
declare module '@strudel/webaudio';
declare module 'superdough' {
  export function initAudio(options?: unknown): Promise<void>;
  export function registerSynthSounds(): void;
  export function onceEnded(node: AudioScheduledSourceNode, callback: () => void): void;
  export function registerSound(
    key: string,
    onTrigger: (
      time: number,
      value: Record<string, unknown>,
      onended: () => void,
      cps?: number,
    ) => {
      node: AudioNode;
      stop?: (time: number) => void;
    },
    data?: Record<string, unknown>,
  ): void;
}
