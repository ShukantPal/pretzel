interface StageSidebarProps {
  copilot: React.ReactNode;
}

export function StageSidebar({
  copilot,
}: StageSidebarProps) {
  return (
    <div className="stage-sidebar stage-sidebar-edge">
      <div className="glass stage-sidebar-panel">
        {copilot}
      </div>
    </div>
  );
}
