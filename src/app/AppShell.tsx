import { useState } from 'react'
import './AppShell.css'
import { useScenarioTimeline } from '../hooks/useScenarioTimeline'
import MapScene from '../components/map/MapScene'
import EnvironmentControls from '../components/panels/EnvironmentControls'
import ScenarioControls from '../components/panels/ScenarioControls'
import type { EnvironmentLayerKey } from '../data/mockEnvironment'

export default function AppShell() {
  const [activeEnvironmentLayer, setActiveEnvironmentLayer] = useState<EnvironmentLayerKey | null>('wind')
  const {
    time,
    displayTime,
    progress,
    playing,
    completed,
    vesselStates,
    mobVisible,
    mobPosition,
    responderSelection,
    driftState,
    rescueRoutePlans,
    searchPattern,
    currentPhase,
    phases,
    play,
    pause,
    restart,
    seek,
  } = useScenarioTimeline()

  function handleEnvironmentToggle(layer: EnvironmentLayerKey) {
    setActiveEnvironmentLayer((current) => (current === layer ? null : layer))
  }

  // Progressive chips: each adds a new story beat as the scenario advances
  const showMobChip        = mobVisible
  const showResponderChip  = responderSelection != null
  const showInterceptChip  = rescueRoutePlans.length > 0 && currentPhase.id === 'reroute'
  const showPatternChip    = searchPattern != null && currentPhase.id === 'search'
  const showResolvedChip   = currentPhase.id === 'final'

  return (
    <div className="app-shell">
      {/* Map — fills the full viewport */}
      <div className="map-layer">
        <MapScene
          time={time}
          currentPhase={currentPhase}
          vesselStates={vesselStates}
          mobVisible={mobVisible}
          mobPosition={mobPosition}
          responderSelection={responderSelection}
          driftState={driftState}
          rescueRoutePlans={rescueRoutePlans}
          searchPattern={searchPattern}
          activeEnvironmentLayer={activeEnvironmentLayer}
        />
      </div>

      {/* Alert vignette flash */}
      <div
        className={`alert-vignette${mobVisible ? ' alert-vignette--active' : ''}`}
        aria-hidden="true"
      />

      {/* Floating overlays */}
      <div className="ui-layer">

        {/* Top-right: progressive story chips */}
        <div className="overlay-chips">
          {showMobChip && (
            <div className="chip chip--danger" key="mob">
              <span className="chip-dot chip-dot--danger" />
              EPIRB distress alert
            </div>
          )}
          {showResponderChip && (
            <div className="chip chip--accent" key="responder">
              <span className="chip-dot chip-dot--accent" />
              {responderSelection!.primary.vessel.name} · Primary responder
            </div>
          )}
          {showInterceptChip && (
            <div className="chip chip--muted" key="intercept">
              <span className="chip-dot chip-dot--muted" />
              Intercept route active
            </div>
          )}
          {showPatternChip && (
            <div className="chip chip--cyan" key="pattern">
              <span className="chip-dot chip-dot--cyan" />
              Pattern: {searchPattern?.patternName ?? 'Expanding square'}
            </div>
          )}
          {showResolvedChip && (
            <div className="chip chip--success" key="resolved">
              <span className="chip-dot chip-dot--success" />
              MOB Located — Person Recovered
            </div>
          )}
        </div>

        {/* Bottom row: environment toggles + compact playback bar */}
        <div className="overlay-bottom-row">
          <div className="overlay-env">
            <EnvironmentControls
              activeLayer={activeEnvironmentLayer}
              onToggle={handleEnvironmentToggle}
            />
          </div>
          <div className="overlay-playback">
            <ScenarioControls
              displayTime={displayTime}
              progress={progress}
              playing={playing}
              completed={completed}
              currentPhase={currentPhase}
              phases={phases}
              onPlay={play}
              onPause={pause}
              onRestart={restart}
              onSeek={seek}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
