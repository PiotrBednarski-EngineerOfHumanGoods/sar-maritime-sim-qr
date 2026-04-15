import './OperationalPanel.css'
import { VESSELS, VESSEL_TYPE_LABELS } from '../../data/mockScenario'
import { MOB_REPORTED_BY, MOB_REPORTED_UTC } from '../../data/mobEvent'
import { getMissionPhase, getSearchPatternLegInfo } from '../../services/buildSearchPattern'
import type { DemoPhase } from '../../services/scenarioDirector'
import { formatDuration, formatLatLon } from '../../utils/interpolate'
import type {
  DriftState,
  MissionPhase,
  RescueRoutePlan,
  ResponderAssignment,
  ResponderSelection,
  SearchPatternPlan,
  VesselState,
} from '../../domain/types'

interface OperationalPanelProps {
  vesselStates:  VesselState[]
  mobVisible:    boolean
  mobPosition:   [number, number]
  mobElapsedMin: number
  responderSelection?: ResponderSelection
  driftState?: DriftState
  rescueRoutePlans: RescueRoutePlan[]
  searchPattern?: SearchPatternPlan
  time: number
  currentPhase: DemoPhase
  phases: DemoPhase[]
}

export default function OperationalPanel({
  vesselStates,
  mobVisible,
  mobPosition,
  mobElapsedMin,
  responderSelection,
  driftState,
  rescueRoutePlans,
  searchPattern,
  time,
  currentPhase,
  phases,
}: OperationalPanelProps) {
  const primaryResponderId = responderSelection?.primary.vessel.id
  const secondaryResponderId = responderSelection?.secondary?.vessel.id
  const routePlanByVesselId = new Map(rescueRoutePlans.map((plan) => [plan.vesselId, plan]))
  const primaryRoutePlan = primaryResponderId
    ? routePlanByVesselId.get(primaryResponderId)
    : undefined
  const primaryHeading = vesselStates.find(({ vessel }) => vessel.id === primaryResponderId)?.heading
  const missionPhase = getMissionPhase(time, primaryRoutePlan, searchPattern)
  const activeSearchLeg = searchPattern
    ? getSearchPatternLegInfo(searchPattern, time)
    : undefined
  const suggestedHeading = activeSearchLeg?.heading ?? primaryHeading
  const methodLabel = missionPhase === 'search'
    ? searchPattern?.patternName ?? 'Expanding Square'
    : 'Direct Intercept'
  const currentPhaseIndex = phases.findIndex(({ id }) => id === currentPhase.id)
  const phaseNarrative = getPhaseNarrative(currentPhase.id)
  const alertStatusLabel = !mobVisible
    ? 'No active SAR alert'
    : !responderSelection
      ? 'SAR incident in progress'
      : currentPhase.id === 'final'
        ? 'SAR incident in progress · final operational picture'
        : currentPhase.id === 'search'
          ? 'SAR incident in progress · search pattern active'
          : 'SAR incident in progress · intercept route active'

  return (
    <aside className="op-panel panel">
      {/* ── Header ── */}
      <div className="panel-header">
        <RadarIcon />
        <span className="panel-title">Operations</span>
        <span style={{ marginLeft: 'auto' }}>
          <span className={`badge ${mobVisible ? 'badge-danger' : 'badge-neutral'}`}>
            {mobVisible ? '⚠ INCIDENT ACTIVE' : `${VESSELS.length} vessels`}
          </span>
        </span>
      </div>

      <div className="panel-section story-summary-section">
        <p className="section-label">What You’re Seeing</p>
        <div className="story-summary-card">
          <span className="story-summary-title">{phaseNarrative.title}</span>
          <p className="story-summary-copy">{phaseNarrative.copy}</p>
        </div>
      </div>

      {/* ── Active incident card — slides in when MOB fires ── */}
      <div className={`incident-section ${mobVisible ? 'incident-section--visible' : ''}`}>
        <div className="panel-section">
          <p className="section-label">Incident Summary</p>
          <div className="incident-card">
            <div className="incident-header">
              <span className="incident-dot" />
              <span className="incident-title">MOB ALERT</span>
              <span className="incident-active-badge">ACTIVE</span>
            </div>
            <div className="incident-details">
              <IncidentRow label="Position" value={formatLatLon(mobPosition[0], mobPosition[1])} mono />
              <IncidentRow label="Reported" value={MOB_REPORTED_UTC} mono />
              <IncidentRow label="By"       value={MOB_REPORTED_BY} />
              {driftState ? (
                <IncidentRow
                  label="Drift"
                  value={`${formatCompassPoint(driftState.heading)} ${Math.round(driftState.heading)}°`}
                />
              ) : null}
              <IncidentRow
                label="Elapsed"
                value={formatDuration(mobElapsedMin)}
                mono
                highlight
              />
            </div>
          </div>
        </div>

        {responderSelection ? (
          <div className="panel-section responder-section">
            <p className="section-label">Response Plan</p>
            <div className="responder-stack">
              <ResponderCard
                assignment={responderSelection.primary}
                routePlan={routePlanByVesselId.get(responderSelection.primary.vessel.id)}
                searchPattern={searchPattern}
                time={time}
              />
              {responderSelection.secondary ? (
                <ResponderCard
                  assignment={responderSelection.secondary}
                  routePlan={routePlanByVesselId.get(responderSelection.secondary.vessel.id)}
                  searchPattern={searchPattern}
                  time={time}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {responderSelection && primaryRoutePlan ? (
          <div className="panel-section mission-section">
            <p className="section-label">Mission Phase</p>
            <div className="mission-card">
              <IncidentRow label="Assigned" value={responderSelection.primary.vessel.name} />
              <IncidentRow label="Method" value={methodLabel} />
              <IncidentRow
                label="Heading"
                value={suggestedHeading !== undefined
                  ? `${formatCompassPoint(suggestedHeading)} ${Math.round(suggestedHeading)}°`
                  : 'Stand by'}
              />
              <IncidentRow
                label="Phase"
                value={formatMissionPhase(missionPhase, activeSearchLeg?.legIndex)}
                highlight
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Vessel list ── */}
      <div className="panel-section">
        <p className="section-label">Traffic Overview</p>
        <ul className="vessel-list">
          {vesselStates.map(({ vessel, heading }) => (
            <li
              key={vessel.id}
              className={`vessel-row ${
                vessel.id === primaryResponderId
                  ? 'vessel-row--primary'
                  : vessel.id === secondaryResponderId
                    ? 'vessel-row--secondary'
                    : ''
              }`}
            >
              <VesselArrow color={vessel.color} heading={heading} />
              <div className="vessel-info">
                <span className="vessel-name">{vessel.name}</span>
                <span className="vessel-meta">
                  {VESSEL_TYPE_LABELS[vessel.vesselType]} · {vessel.speed} kt · {Math.round(heading)}°
                </span>
              </div>
              <span className={`badge ${
                vessel.id === primaryResponderId
                  ? 'badge-accent'
                  : vessel.id === secondaryResponderId
                    ? 'badge-warning'
                    : 'badge-neutral'
              }`}
              >
                {vessel.id === primaryResponderId
                  ? 'Primary'
                  : vessel.id === secondaryResponderId
                    ? 'Secondary'
                    : 'Underway'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Situation grid ── */}
      <div className="panel-section">
        <p className="section-label">Scenario Flow</p>
        <div className="story-flow">
          {phases.map((phase, index) => {
            const state = index < currentPhaseIndex
              ? 'complete'
              : index === currentPhaseIndex
                ? 'active'
                : 'upcoming'

            return (
              <div
                key={phase.id}
                className={`story-step story-step--${state}`}
              >
                <span className="story-step-index">{index + 1}</span>
                <div className="story-step-copy">
                  <span className="story-step-title">{phase.shortLabel}</span>
                  <span className="story-step-status">{phase.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Alert status ── */}
      <div className="panel-section">
        <p className="section-label">Alert Status</p>
        <div className={`alert-status ${mobVisible ? 'alert-status--active' : 'alert-status--clear'}`}>
          <span className={`dot ${mobVisible ? 'dot-danger' : 'dot-success'}`} />
          <span>{alertStatusLabel}</span>
        </div>
      </div>
    </aside>
  )
}

function ResponderCard({
  assignment,
  routePlan,
  searchPattern,
  time,
}: {
  assignment: ResponderAssignment
  routePlan?: RescueRoutePlan
  searchPattern?: SearchPatternPlan
  time: number
}) {
  const phase = getMissionPhase(
    time,
    routePlan,
    assignment.role === 'primary' ? searchPattern : undefined,
  )
  const routeStatus = routePlan
    ? phase === 'dispatch'
      ? 'Reroute queued'
      : phase === 'search'
        ? 'Pattern active'
        : time < routePlan.turnStartedAt + 18
          ? 'Course adjusted'
          : 'Intercept route active'
    : 'Assigned'

  return (
    <div className={`responder-card responder-card--${assignment.role}`}>
      <div className="responder-card-header">
        <span className={`responder-role responder-role--${assignment.role}`}>
          {assignment.role === 'primary' ? 'Primary responder' : 'Secondary responder'}
        </span>
        <span className="responder-eta">ETA {formatDuration(assignment.etaMin)}</span>
      </div>

      <div className="responder-card-body">
        <span className="responder-name">{assignment.vessel.name}</span>
        <div className="responder-metrics">
          <span>{VESSEL_TYPE_LABELS[assignment.vessel.vesselType]}</span>
          <span>{Math.round(assignment.distanceNm)} nm</span>
        </div>
        <div className="responder-status-row">
          <span className={`badge ${
            assignment.role === 'primary' ? 'badge-accent' : 'badge-warning'
          }`}
          >
            {routeStatus}
          </span>
        </div>
      </div>
    </div>
  )
}

function IncidentRow({
  label, value, mono = false, highlight = false,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean
}) {
  return (
    <div className={`incident-row ${highlight ? 'incident-row--highlight' : ''}`}>
      <span className="incident-row-label">{label}</span>
      <span className={`incident-row-value ${mono ? 'incident-row-value--mono' : ''}`}>{value}</span>
    </div>
  )
}

function VesselArrow({ color, heading }: { color: string; heading: number }) {
  return (
    <div style={{
      width: 18, height: 18, flexShrink: 0,
      transform: `rotate(${heading}deg)`,
      transformOrigin: '50% 50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 20 28" width="14" height="14">
        <path d="M10 1 L18 25 L10 20 L2 25 Z"
          fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function RadarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M12 10a2 2 0 1 0 2 2" />
      <line x1="12" y1="12" x2="22" y2="2" />
    </svg>
  )
}

function formatCompassPoint(heading: number): string {
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % labels.length
  return labels[index]
}

function formatMissionPhase(phase: MissionPhase, legIndex?: number): string {
  if (phase === 'dispatch') return 'Dispatch'
  if (phase === 'intercept') return 'Direct intercept'
  return legIndex ? `Search leg ${legIndex}` : 'Pattern search'
}

function getPhaseNarrative(phaseId: DemoPhase['id']) {
  switch (phaseId) {
    case 'traffic':
      return {
        title: 'Traffic establishing shot',
        copy: 'Several scripted vessels are underway on normal routes before the incident begins.',
      }
    case 'mob-alert':
      return {
        title: 'Man overboard reported',
        copy: 'A clear MOB alert fixes the incident location and immediately shifts the story to the target area.',
      }
    case 'responder':
      return {
        title: 'Responder selected',
        copy: 'The system highlights the most suitable nearby vessel so the response decision is obvious in a few seconds.',
      }
    case 'drift':
      return {
        title: 'Drift estimate added',
        copy: 'A dashed drift line shows how the casualty may be moving, turning a single point into a search area.',
      }
    case 'reroute':
      return {
        title: 'Intercept underway',
        copy: 'The primary vessel visibly alters course and follows a highlighted route toward the target area.',
      }
    case 'search':
      return {
        title: 'Pattern search active',
        copy: 'Near datum, the vessel transitions into a clean expanding-square pattern that reads clearly on the map.',
      }
    case 'final':
      return {
        title: 'Presentation hold',
        copy: 'The final operational picture stays on screen with the responder, drift, search pattern, and context all visible together.',
      }
  }
}
