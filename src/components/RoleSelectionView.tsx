interface RoleSelectionViewProps {
  nickname: string;
  setNickname: (value: string) => void;
  setRole: (role: 'stage' | 'controller') => void;
}

export function RoleSelectionView({ nickname, setNickname, setRole }: RoleSelectionViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '32px', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: '800', letterSpacing: '-0.05em', color: 'var(--neon-gold)', textShadow: '0 0 20px var(--neon-gold-glow)' }}>PRETZEL 🥨</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '1.2rem' }}>The Cooperative AI Live-Coding DAW</p>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Choose a Hacker Alias</label>
          <input
            type="text"
            placeholder="e.g. DJ-Pretzel-Chef"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#0a0a0f', color: '#fff', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={() => setRole('stage')}
            className="glow-gold"
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--neon-gold)', color: '#000', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', border: 'none', transition: '0.2s' }}
          >
            🎤 Launch Master Stage (Play Audio)
          </button>

          <button
            onClick={() => setRole('controller')}
            className="glow-cyan"
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', transition: '0.2s' }}
          >
            📱 Join as Phone Controller (Silent)
          </button>
        </div>
      </div>
    </div>
  );
}
