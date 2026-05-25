import { useEffect, useRef } from 'react';
import type { PlaybackState } from '@/interfaces/playback';
import type { KnobChangePayload } from '@/interfaces/socket';
import type {
  ClientInfo,
  ClientRole,
} from '@/interfaces/types';
import { createSocketClient, type PretzelSocket } from './CreateSocketClient';

interface UsePretzelClientOptions {
  role: 'selection' | ClientRole;
  nickname: string;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setClientsCount: React.Dispatch<React.SetStateAction<number>>;
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>;
  setSliderVals: React.Dispatch<
    React.SetStateAction<{
      filter: number;
      delay: number;
      reverb: number;
      volume: number;
    }>
  >;
}

export function usePretzelClient({
  role,
  nickname,
  setConnected,
  setClientsCount,
  setPlaybackState,
  setSliderVals,
}: UsePretzelClientOptions) {
  const socketRef = useRef<PretzelSocket | null>(null);

  useEffect(() => {
    if (role === 'selection') return;

    const socket = createSocketClient();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to server.');
      socket.emit('register', {
        role: role === 'stage' ? 'stage' : 'controller',
        name: nickname || undefined,
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('clients-update', (data: ClientInfo[]) => {
      const controllers = data.filter((client) => client.role === 'controller');
      setClientsCount(controllers.length);
    });

    socket.on('state-update', (data) => {
      setPlaybackState(data);
    });

    if (role === 'stage') {
      socket.on('knob-apply', (data: KnobChangePayload) => {
        switch (data.type) {
          case 'filter':
            setSliderVals((prev) => ({ ...prev, filter: data.value }));
            break;
          case 'delay':
            setSliderVals((prev) => ({ ...prev, delay: data.value }));
            break;
          case 'reverb':
            setSliderVals((prev) => ({ ...prev, reverb: data.value }));
            break;
          case 'volume':
            setSliderVals((prev) => ({ ...prev, volume: data.value }));
            break;
        }
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    nickname,
    role,
    setClientsCount,
    setConnected,
    setPlaybackState,
    setSliderVals,
  ]);

  return socketRef;
}
