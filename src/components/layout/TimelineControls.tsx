import { useCallback, useRef } from 'react'
import './TimelineControls.css'
import { SCENARIO_DURATION } from '../../data/mockScenario'

const TIME_LABELS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
const MOB_PERCENT = (240 / SCENARIO_DURATION) * 100

interface TimelineControlsProps {
  displayTime: string
  progress: number        // 0–1
  playing: boolean
  onTogglePlay: () => void
  onReset: () => void
  onSeek: (t: number) => void
}

export default function TimelineControls({
  displayTime,
  progress,
  playing,
  onTogglePlay,
  onReset,
  onSeek,
}: TimelineControlsProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = Math.min(100, Math.max(0, progress * 100))

  // Convert a pointer event on the track to a scenario time and seek.
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(ratio * SCENARIO_DURATION)
    },
    [onSeek],
  )

  return (
    <div className="timeline panel">
      {/* ── Transport controls ── */}
      <div className="timeline-controls">
        <button
          className="icon-btn primary"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="icon-btn" aria-label="Restart" onClick={onReset}>
          <ResetIcon />
        </button>
      </div>

      {/* ── Scrubber ── */}
      <div className="timeline-track-area">
        <div className="timeline-labels">
          {TIME_LABELS.map(t => (
            <span key={t} className="timeline-label">{t}</span>
          ))}
        </div>

        <div
          ref={trackRef}
          className="timeline-track"
          onClick={handleTrackClick}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={SCENARIO_DURATION}
          aria-valuenow={progress * SCENARIO_DURATION}
        >
          <div className="timeline-fill" style={{ width: `${pct}%` }} />

          {/* MOB event pin — inert placeholder until Phase 3 */}
          <div className="timeline-event" style={{ left: `${MOB_PERCENT}%` }}>
            <div className="timeline-event-line" />
            <div className="timeline-event-label">MOB</div>
          </div>

          <div className="timeline-playhead" style={{ left: `${pct}%` }} />
        </div>
      </div>

      {/* ── Current time readout ── */}
      <div className="timeline-time">
        <span className="timeline-time-value">{displayTime}</span>
        <span className="timeline-time-unit">UTC</span>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="3" width="4" height="18" rx="1" />
      <rect x="15" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
