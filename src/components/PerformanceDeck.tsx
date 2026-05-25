import type { KnobType } from '@/interfaces/types';

type SliderValues = {
  filter: number;
  delay: number;
  reverb: number;
  volume: number;
};

interface PerformanceDeckProps {
  compact?: boolean;
  sliderVals: SliderValues;
  onHandleSliderChange: (type: KnobType, value: number) => void;
}

const SLIDERS: Array<{
  key: KnobType;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  color: string;
}> = [
  {
    key: 'filter',
    label: 'Low-Pass Filter',
    min: 100,
    max: 20000,
    step: 50,
    format: (value) => `${Math.round(value)} Hz`,
    color: 'var(--neon-cyan)',
  },
  {
    key: 'delay',
    label: 'Delay Feedback',
    min: 0,
    max: 0.9,
    step: 0.05,
    format: (value) => `${Math.round(value * 100)}%`,
    color: 'var(--neon-pink)',
  },
  {
    key: 'reverb',
    label: 'Reverb Wetness',
    min: 0,
    max: 0.9,
    step: 0.05,
    format: (value) => `${Math.round(value * 100)}%`,
    color: 'var(--neon-cyan)',
  },
  {
    key: 'volume',
    label: 'Master Volume',
    min: 0,
    max: 1,
    step: 0.05,
    format: (value) => `${Math.round(value * 100)}%`,
    color: 'var(--neon-gold)',
  },
];

export function PerformanceDeck({
  compact = false,
  sliderVals,
  onHandleSliderChange,
}: PerformanceDeckProps) {
  if (compact) {
    return (
      <div
        className="performance-deck performance-deck-compact"
        style={{
          padding: '0',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          Controls
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
            gap: '12px',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          {SLIDERS.map((slider) => (
            <label
              key={slider.key}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(72px, 1fr) auto',
                gap: '8px',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {slider.key === 'filter'
                  ? 'LPF'
                  : slider.key === 'delay'
                    ? 'Delay'
                    : slider.key === 'reverb'
                      ? 'Reverb'
                      : 'Level'}
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={sliderVals[slider.key]}
                onChange={(e) => onHandleSliderChange(slider.key, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: slider.color, height: '3px', cursor: 'pointer' }}
              />
              <span
                className="mono"
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.67rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {slider.format(sliderVals[slider.key])}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass performance-deck"
      style={{
        padding: compact ? '12px 14px' : '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '12px' : '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <h3
          className="pane-title"
          style={{
            color: 'var(--text-secondary)',
            fontSize: compact ? '0.78rem' : '0.82rem',
            letterSpacing: '0.08em',
          }}
        >
          Live Performance Deck
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '14px', marginTop: compact ? '0' : '4px' }}>
        {SLIDERS.map((slider) => (
          <div key={slider.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: compact ? '0.72rem' : '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{slider.label}</span>
              <span className="mono" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {slider.format(sliderVals[slider.key])}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={sliderVals[slider.key]}
              onChange={(e) => onHandleSliderChange(slider.key, parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: slider.color, height: '4px', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
