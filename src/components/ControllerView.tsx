import { PerformanceDeck } from './PerformanceDeck';

interface ControllerViewProps {
  nickname: string;
  bpm: number;
  connected: boolean;
  copilot: React.ReactNode;
  sliderVals: {
    filter: number;
    delay: number;
    reverb: number;
    volume: number;
  };
  onHandleSliderChange: (type: 'filter' | 'delay' | 'reverb' | 'volume', value: number) => void;
}

export function ControllerView({
  nickname,
  bpm,
  connected,
  copilot,
  sliderVals,
  onHandleSliderChange,
}: ControllerViewProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      padding: '16px', 
      gap: '16px', 
      maxWidth: '480px', 
      margin: '0 auto',
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <div className="glass glow-cyan" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: '800', letterSpacing: '-0.03em' }}>Pretzel Remote 🥨</h2>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{nickname || 'Chef'} | BPM {bpm}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: connected ? 'var(--neon-cyan)' : '#ff3366',
            boxShadow: connected ? '0 0 8px var(--neon-cyan)' : '0 0 8px #ff3366'
          }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{connected ? 'SYNC' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        overflowY: 'auto',
        paddingRight: '2px'
      }}>
        <PerformanceDeck
          sliderVals={sliderVals}
          onHandleSliderChange={onHandleSliderChange}
        />

        {/* AI Co-Producer Chat Card */}
        <div className="glass" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: '280px', overflow: 'hidden' }}>
          <h3 className="pane-title" style={{ color: 'var(--neon-cyan)', fontSize: '0.9rem' }}>💬 AI Co-Producer Chat</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            {copilot}
          </div>
        </div>
      </div>
    </div>
  );
}
