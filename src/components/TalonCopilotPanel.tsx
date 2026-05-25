import { useEffect, useMemo, useRef } from 'react';
import { TalonCopilot } from '@talonai/copilot';

type TalonCopilotPanelProps = {
  gatewayUrl: string;
  namespace: string;
  agent: string;
  authToken: string | null;
  sessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  viewerLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function TalonCopilotPanel({
  gatewayUrl,
  namespace,
  agent,
  authToken,
  sessionId,
  onSessionChange,
  viewerLabel = 'Anonymous',
  className,
  style,
}: TalonCopilotPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rootClassName = className ? `talon-copilot-shell ${className}` : 'talon-copilot-shell';

  const pretzelIcon = useMemo(
    () => (
      <div
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        🥨
      </div>
    ),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const replaceBranding = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const textContent = node.textContent ?? '';
        if (textContent === 'Talon') {
          node.textContent = 'Pretzel';
        } else if (textContent === 'Operator') {
          node.textContent = viewerLabel;
        } else if (textContent.includes('Talon runtime initialized.')) {
          node.textContent = textContent.replaceAll('Talon runtime initialized.', 'Pretzel runtime initialized.');
        }
        node = walker.nextNode();
      }
    };

    replaceBranding();

    const observer = new MutationObserver(() => {
      replaceBranding();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [authToken, sessionId, viewerLabel]);

  if (!authToken) {
    return (
      <div
        ref={rootRef}
        className={rootClassName}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          padding: '16px',
        }}
      >
        Connecting Talon session...
      </div>
    );
  }

  return (
    <div ref={rootRef} className={rootClassName} style={style}>
      <TalonCopilot
        namespace={namespace}
        agent={agent}
        gatewayUrl={gatewayUrl}
        authToken={authToken}
        sessionId={sessionId || undefined}
        onSessionChange={onSessionChange}
        placeholder="What do you want to hear?"
        talonIcon={pretzelIcon}
      />
    </div>
  );
}
