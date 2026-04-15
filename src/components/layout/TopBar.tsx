import './TopBar.css'
import type { DemoPhase } from '../../services/scenarioDirector'

interface TopBarProps {
  displayTime: string   // formatted "HH:MM"
  playing: boolean
  currentPhase: DemoPhase
}

export default function TopBar({ displayTime, playing, currentPhase }: TopBarProps) {
  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <span className="topbar-logo" aria-hidden="true">
          <AnchorIcon />
        </span>
        <span className="topbar-name">SARWATCH</span>
        <span className="topbar-divider" />
        <span className="topbar-subtitle">North Sea · Demo Scenario</span>
      </div>

      {/* Centre: scenario label */}
      <div className="topbar-centre">
        <div className="topbar-phase">
          <span className="badge badge-accent">Scripted Demo</span>
          <span className="topbar-phase-label">{currentPhase.label}</span>
        </div>
      </div>

      {/* Right: scenario time + status */}
      <div className="topbar-right">
        <span className="topbar-time">{displayTime} UTC</span>
        <StatusPill playing={playing} status={currentPhase.status} />
      </div>
    </header>
  )
}

function StatusPill({ playing, status }: { playing: boolean; status: string }) {
  return (
    <div className={`status-pill ${playing ? 'status-pill--online' : ''}`}>
      <span className="status-pill-dot" />
      {playing ? status : 'Paused'}
    </div>
  )
}

function AnchorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  )
}
