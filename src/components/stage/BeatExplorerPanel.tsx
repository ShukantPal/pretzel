import { useEffect, useMemo, useRef } from 'react';
import { Fragment } from 'react';
import type { PlaybackScene, SequencerTrack, StepValue } from '@/interfaces/types';

interface BeatExplorerPanelProps {
  orderedScenes: PlaybackScene[];
  activeSceneId: string;
  activeBarIndex: number;
  playheadSceneId: string;
  playheadBarIndex: number;
  activeStep: number;
  recentlyChangedBars: string[];
  onSelectScene: (sceneId: string) => void;
  onToggleTrackStep: (sceneId: string, trackId: string, barIndex: number, index: number) => void;
}

interface ArrangementColumn {
  sceneId: string;
  sceneName: string;
  barIndex: number;
  absoluteBarIndex: number;
}

interface ArrangementRow {
  key: string;
  trackId: string;
  label: string;
  soundCode: string;
}

function getTrackColorInfo(index: number) {
  const colors = [
    { color: 'var(--neon-gold)', glow: 'var(--neon-gold-glow)' },
    { color: 'var(--neon-pink)', glow: 'var(--neon-pink-glow)' },
    { color: 'var(--neon-cyan)', glow: 'var(--neon-cyan-glow)' },
    { color: '#c77dff', glow: 'rgba(199, 125, 255, 0.4)' },
    { color: '#2ec4b6', glow: 'rgba(46, 196, 182, 0.4)' },
    { color: '#ff9f1c', glow: 'rgba(255, 159, 28, 0.4)' },
    { color: '#e71d36', glow: 'rgba(231, 29, 54, 0.4)' },
    { color: 'var(--neon-orange)', glow: 'var(--neon-orange-glow)' },
  ];
  return colors[index % colors.length];
}

function getBarCount(scene: PlaybackScene): number {
  return Math.max(1, ...scene.tracks.map((track) => track.bars.length || 0));
}

function buildArrangementColumns(orderedScenes: PlaybackScene[]): ArrangementColumn[] {
  const columns: ArrangementColumn[] = [];
  let absoluteBarIndex = 0;

  orderedScenes.forEach((scene) => {
    const barCount = getBarCount(scene);
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      columns.push({
        sceneId: scene.id,
        sceneName: scene.name,
        barIndex,
        absoluteBarIndex,
      });
      absoluteBarIndex += 1;
    }
  });

  return columns;
}

function buildArrangementRows(orderedScenes: PlaybackScene[]): ArrangementRow[] {
  const seen = new Map<string, ArrangementRow>();

  orderedScenes.forEach((scene) => {
    scene.tracks.forEach((track) => {
      if (!seen.has(track.id)) {
        seen.set(track.id, {
          key: track.id,
          trackId: track.id,
          label: track.name,
          soundCode: track.soundCode,
        });
      }
    });
  });

  return Array.from(seen.values());
}

function findTrack(scene: PlaybackScene, row: ArrangementRow): SequencerTrack | undefined {
  return scene.tracks.find((track) => track.id === row.trackId);
}

function getStepFill(step: StepValue, color: string): string {
  if (step === 3) return color;
  if (step === 2) return `${color}dd`;
  if (step === 1) return `${color}88`;
  return 'transparent';
}

function getStepInnerHeight(step: StepValue): string {
  if (step === 3) return '14px';
  if (step === 2) return '12px';
  if (step === 1) return '8px';
  return '0px';
}

function chunkBar(bar: StepValue[]) {
  return Array.from({ length: 4 }, (_, groupIndex) => ({
    groupIndex,
    steps: bar.slice(groupIndex * 4, groupIndex * 4 + 4),
  }));
}

export function BeatExplorerPanel({
  orderedScenes,
  activeSceneId,
  activeBarIndex,
  playheadSceneId,
  playheadBarIndex,
  activeStep,
  recentlyChangedBars,
  onSelectScene,
  onToggleTrackStep,
}: BeatExplorerPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const columns = useMemo(() => buildArrangementColumns(orderedScenes), [orderedScenes]);
  const rows = useMemo(() => buildArrangementRows(orderedScenes), [orderedScenes]);
  const playheadColumnIndex = columns.findIndex(
    (column) => column.sceneId === playheadSceneId && column.barIndex === playheadBarIndex,
  );

  useEffect(() => {
    if (!scrollContainerRef.current || playheadColumnIndex < 0) {
      return;
    }

    const container = scrollContainerRef.current;
    const playheadCell = container.querySelector<HTMLElement>(`[data-bar-index="${playheadColumnIndex}"]`);
    if (!playheadCell) {
      return;
    }

    const leftEdge = playheadCell.offsetLeft;
    const rightEdge = leftEdge + playheadCell.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    const gutter = 120;

    if (leftEdge < viewLeft + gutter) {
      container.scrollTo({
        left: Math.max(0, leftEdge - gutter),
        behavior: 'smooth',
      });
      return;
    }

    if (rightEdge > viewRight - gutter) {
      container.scrollTo({
        left: rightEdge - container.clientWidth + gutter,
        behavior: 'smooth',
      });
    }
  }, [playheadColumnIndex]);

  return (
    <div className="sequencer-panel">
      <div
        className="stage-grid-shell"
        ref={scrollContainerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `220px repeat(${Math.max(columns.length, 1)}, minmax(188px, 1fr))`,
          gap: '1px',
          padding: '0',
          overflow: 'auto',
          minHeight: 0,
          background: 'var(--border-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 5,
            background: 'var(--bg-card)',
            padding: '10px 20px',
            minHeight: '54px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="pane-title" style={{ color: 'var(--neon-cyan)' }}>Tracks</div>
        </div>

        {orderedScenes.map((scene) => {
          const span = getBarCount(scene);
          const isActiveScene = scene.id === activeSceneId;
          const isPlayingScene = scene.id === playheadSceneId;

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className="stage-scene-button"
              style={{
                gridColumn: `span ${span}`,
                justifyContent: 'space-between',
                display: 'flex',
                alignItems: 'center',
                background: isActiveScene ? 'rgba(0,245,212,0.06)' : 'var(--bg-card)',
                borderColor: 'transparent',
                color: 'var(--text-primary)',
                minHeight: '54px',
                borderRadius: 0,
                padding: '0 18px',
                fontWeight: 600,
                position: 'relative',
              }}
            >
              <span className="mono" style={{ fontSize: '0.82rem', letterSpacing: '0.02em' }}>{scene.name}</span>
              <span className="mono" style={{ fontSize: '0.68rem', color: isPlayingScene ? 'var(--neon-gold)' : 'var(--text-secondary)' }}>
                {isPlayingScene ? `LIVE ${playheadBarIndex + 1}` : `${span} bars`}
              </span>
              {isActiveScene ? (
                <span
                  style={{
                    position: 'absolute',
                    left: '18px',
                    right: '18px',
                    bottom: 0,
                    height: '2px',
                    borderRadius: '999px',
                    background: 'rgba(0,245,212,0.65)',
                  }}
                />
              ) : null}
            </button>
          );
        })}

        <div
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 5,
            background: 'var(--bg-card)',
            padding: '10px 20px',
            minHeight: '54px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="pane-subtle">Timeline</div>
        </div>

        {columns.map((column) => {
          const isActiveBar = column.sceneId === activeSceneId && column.barIndex === activeBarIndex;
          const isPlayingBar = column.sceneId === playheadSceneId && column.barIndex === playheadBarIndex;
          return (
            <div
              key={`${column.sceneId}-${column.barIndex}`}
              data-bar-index={column.absoluteBarIndex}
              className="mono"
              style={{
                padding: '10px 8px',
                borderRadius: 0,
                border: 'none',
                background: isPlayingBar
                  ? 'rgba(255,183,3,0.12)'
                  : isActiveBar
                    ? 'rgba(0,245,212,0.08)'
                    : 'rgba(255,255,255,0.02)',
                color: isPlayingBar ? 'var(--neon-gold)' : isActiveBar ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                textAlign: 'center',
                fontSize: '0.72rem',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              BAR {column.barIndex + 1}
            </div>
          );
        })}

        {rows.map((row, rowIndex) => {
          const { color, glow } = getTrackColorInfo(rowIndex);

          return (
            <Fragment key={row.key}>
              <div
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 4,
                  background: 'var(--bg-card)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '80px',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    alignSelf: 'stretch',
                    marginRight: '12px',
                    borderRadius: '999px',
                    background: `linear-gradient(180deg, ${color}, transparent)`,
                    boxShadow: `0 0 12px ${glow}`,
                    opacity: 0.9,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <div className="track-label">{row.label}</div>
                  <div className="track-sublabel">{row.soundCode}</div>
                </div>
              </div>

              {columns.map((column) => {
                const scene = orderedScenes.find((candidate) => candidate.id === column.sceneId);
                const track = scene ? findTrack(scene, row) : undefined;
                const bar = track?.bars[column.barIndex] ?? Array(16).fill(false);
                const isPlayingBar = column.sceneId === playheadSceneId && column.barIndex === playheadBarIndex;
                const isActiveBar = column.sceneId === activeSceneId && column.barIndex === activeBarIndex;
                const isRecentlyChanged = recentlyChangedBars.includes(`${column.sceneId}:${column.barIndex}`);
                const playheadLeft = activeStep >= 0 ? `${((activeStep + 0.5) / 16) * 100}%` : '0%';
                const isAltBar = column.absoluteBarIndex % 2 === 1;

                return (
                  <div
                    key={`${row.key}-${column.sceneId}-${column.barIndex}`}
                    data-bar-index={column.absoluteBarIndex}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 0,
                      border: 'none',
                      background: isPlayingBar
                        ? 'rgba(255,255,255,0.045)'
                        : isActiveBar
                          ? 'rgba(255,255,255,0.028)'
                          : isAltBar
                            ? 'rgba(12,17,27,0.014)'
                            : 'var(--bg-card)',
                      opacity: track?.isActive === false ? 0.4 : 1,
                      minHeight: '74px',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isRecentlyChanged ? (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(90deg, rgba(255,183,3,0.14), rgba(255,183,3,0.06) 42%, transparent 78%)',
                          boxShadow: 'inset 0 0 0 1px rgba(255,183,3,0.22)',
                          pointerEvents: 'none',
                          animation: 'bar-change-flash 2200ms ease forwards',
                        }}
                      />
                    ) : null}
                    {isPlayingBar && activeStep >= 0 ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          bottom: '10px',
                          left: playheadLeft,
                          width: '2px',
                          transform: 'translateX(-50%)',
                          background: 'linear-gradient(180deg, rgba(255,183,3,0), rgba(255,183,3,0.92), rgba(255,183,3,0))',
                          boxShadow: '0 0 0 1px rgba(255,183,3,0.12), 0 0 18px rgba(255,183,3,0.55)',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      />
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', alignItems: 'center', width: '100%', minHeight: '24px' }}>
                      {chunkBar(bar as StepValue[]).map(({ groupIndex, steps }) => (
                        <div
                          key={groupIndex}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: '4px',
                            padding: '0 2px',
                            borderRadius: '999px',
                            background: groupIndex % 2 === 0 ? 'rgba(12,17,27,0.025)' : 'transparent',
                          }}
                        >
                          {steps.map((active, localStepIdx) => {
                            const stepIdx = groupIndex * 4 + localStepIdx;
                            const isBeatStart = localStepIdx === 0;
                            const isCurrentStep = isPlayingBar && activeStep === stepIdx;

                            return (
                              <button
                                key={stepIdx}
                                onClick={() => track && onToggleTrackStep(column.sceneId, track.id, column.barIndex, stepIdx)}
                                title={`${column.sceneName} bar ${column.barIndex + 1}, step ${stepIdx + 1}`}
                                style={{
                                  height: '14px',
                                  width: '100%',
                                  alignSelf: 'center',
                                  border: isCurrentStep
                                    ? '1px solid var(--step-highlight)'
                                    : isBeatStart
                                      ? '1px solid var(--step-off-strong)'
                                      : '1px solid transparent',
                                  borderRadius: '999px',
                                  background: isBeatStart ? 'var(--step-off-strong)' : 'var(--step-off)',
                                  position: 'relative',
                                  cursor: track ? 'pointer' : 'default',
                                  opacity: track ? 1 : 0.2,
                                  overflow: 'hidden',
                                  transition: 'transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                                  boxShadow: isCurrentStep ? `0 0 0 1px ${glow}` : 'none',
                                }}
                              >
                                {active ? (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '1px',
                                      right: '1px',
                                      top: '50%',
                                      height: getStepInnerHeight(active as StepValue),
                                      background: getStepFill(active as StepValue, color),
                                      transform: 'translateY(-50%)',
                                      borderRadius: '999px',
                                      boxShadow: `0 0 0 1px ${glow}, 0 0 12px ${glow}`,
                                    }}
                                  />
                                ) : null}
                                {isCurrentStep ? (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'rgba(255,255,255,0.08)',
                                      borderRadius: '999px',
                                    }}
                                  />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
