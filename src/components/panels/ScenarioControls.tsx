import './ScenarioControls.css'
import type { DemoPhase } from '../../services/scenarioDirector'

interface ScenarioControlsProps {
  playing: boolean
  completed: boolean
  progress: number
  displayTime: string
  currentPhase: DemoPhase
  phases: DemoPhase[]
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onSeek: (elapsedSec: number) => void
}

export default function ScenarioControls({
  playing,
  completed,
  progress,
  displayTime,
  phases,
  currentPhase,
  onPlay,
  onPause,
  onRestart,
  onSeek,
}: ScenarioControlsProps) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  const totalSec = phases[phases.length - 1].endSec

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(fraction * totalSec)
  }

  return (
    <div className="scenario-bar">
      {/* Icon-only transport controls */}
      <div className="scenario-bar-btns">
        <button
          type="button"
          className="scenario-icon-btn scenario-icon-btn--primary"
          onClick={playing ? onPause : onPlay}
          disabled={completed && !playing}
          title={playing ? 'Pause' : 'Play demo'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="scenario-icon-btn"
          onClick={onRestart}
          title="Restart"
        >
          <ResetIcon />
        </button>
      </div>

      {/* Progress track — clickable for seeking */}
      <div className="scenario-track-wrap">
        <div
          className="scenario-progress-track"
          role="slider"
          aria-label="Scenario progress"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ cursor: 'pointer' }}
          onClick={handleTrackClick}
        >
          <div className="scenario-progress-fill" style={{ width: `${pct}%` }} />
          {phases.map((phase) => {
            const left = `${(phase.startSec / totalSec) * 100}%`
            const isActive  = phase.id === currentPhase.id
            const isComplete = progress >= phase.endSec / totalSec
            return (
              <span
                key={phase.id}
                className={[
                  'scenario-progress-marker',
                  isActive   ? 'scenario-progress-marker--active'   : '',
                  isComplete ? 'scenario-progress-marker--complete' : '',
                ].join(' ')}
                style={{ left }}
                aria-hidden="true"
              />
            )
          })}
        </div>
      </div>

      {/* UTC clock */}
      <span className="scenario-time">{displayTime}</span>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="3" width="4" height="18" rx="1" />
      <rect x="15" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
