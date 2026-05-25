import type { PlaybackScene } from '@/interfaces/types';
import type { KnobType } from '@/interfaces/types';
import { BeatExplorerPanel } from './BeatExplorerPanel';
import { PerformanceDeck } from '../PerformanceDeck';
import { StageErrorBoundary } from './StageErrorBoundary';
import { StageHeader } from './StageHeader';
import { StageSidebar } from './StageSidebar';

interface StageViewProps {
  bpm: number;
  clientsCount: number;
  audioStarted: boolean;
  onStartAudioStage: () => void;
  orderedScenes: PlaybackScene[];
  activeSceneId: string;
  activeBarIndex: number;
  playheadSceneId: string;
  playheadBarIndex: number;
  activeStep: number;
  recentlyChangedBars: string[];
  sliderVals: {
    filter: number;
    delay: number;
    reverb: number;
    volume: number;
  };
  onSelectScene: (sceneId: string) => void;
  onToggleTrackStep: (sceneId: string, trackId: string, barIndex: number, index: number) => void;
  onHandleSliderChange: (type: KnobType, value: number) => void;
  copilot: React.ReactNode;
}

export function StageView(props: StageViewProps) {
  return (
    <div className="stage-shell">
      <div className="stage-main glass stage-workspace">
        <StageHeader
          bpm={props.bpm}
          clientsCount={props.clientsCount}
          audioStarted={props.audioStarted}
          onStartAudioStage={props.onStartAudioStage}
        />

        <div className="stage-control-rail">
          <PerformanceDeck
            compact
            sliderVals={props.sliderVals}
            onHandleSliderChange={props.onHandleSliderChange}
          />
        </div>

        <StageErrorBoundary>
          <BeatExplorerPanel
            orderedScenes={props.orderedScenes}
            activeSceneId={props.activeSceneId}
            activeBarIndex={props.activeBarIndex}
            playheadSceneId={props.playheadSceneId}
            playheadBarIndex={props.playheadBarIndex}
            activeStep={props.activeStep}
            recentlyChangedBars={props.recentlyChangedBars}
            onSelectScene={props.onSelectScene}
            onToggleTrackStep={props.onToggleTrackStep}
          />
        </StageErrorBoundary>
      </div>

      <StageSidebar
        copilot={props.copilot}
      />
    </div>
  );
}
