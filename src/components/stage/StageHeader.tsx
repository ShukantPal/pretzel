interface StageHeaderProps {
  bpm: number;
  clientsCount: number;
  audioStarted: boolean;
  onStartAudioStage: () => void;
}

export function StageHeader({
  bpm,
  clientsCount,
  audioStarted,
  onStartAudioStage,
}: StageHeaderProps) {
  return (
    <div className="pane-header stage-topbar">
      <div className="pane-header-main">
        <div className="pane-brand">
          <div className="pane-brand-badge">
            <span className="pretzel-mark" aria-hidden="true">🥨</span>
          </div>
          <h1 className="pane-header-title">Pretzel</h1>
        </div>
      </div>

      <div className="pane-header-rail">
        <p className="pane-meta pane-header-meta stage-header-meta">
          <span>BPM {bpm}</span>
          <span>{clientsCount} clients</span>
        </p>

        {audioStarted ? (
          <div className="pane-status pane-header-status stage-running-pill">
            <div className="pane-status-dot" />
            <span>Audio running</span>
          </div>
        ) : (
          <button
            onClick={onStartAudioStage}
            className="pane-button pane-button-primary pane-button-compact"
          >
            Start audio
          </button>
        )}
      </div>
    </div>
  );
}
