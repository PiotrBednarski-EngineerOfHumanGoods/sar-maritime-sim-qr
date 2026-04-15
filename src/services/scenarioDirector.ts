import { MOB_EVENT_TIME } from '../data/mobEvent'
import type { RescueRoutePlan, SearchPatternPlan } from '../domain/types'

export type DemoPhaseId =
  | 'traffic'
  | 'mob-alert'
  | 'responder'
  | 'drift'
  | 'reroute'
  | 'search'
  | 'final'

export interface DemoPhase {
  id: DemoPhaseId
  label: string
  shortLabel: string
  status: string
  startSec: number
  endSec: number
  scenarioStart: number
  scenarioEnd: number
}

export interface ScenarioDirector {
  durationSec: number
  phases: DemoPhase[]
}

export interface ScenarioDirectorState {
  progress: number
  elapsedSec: number
  scenarioTime: number
  phase: DemoPhase
  phaseIndex: number
  completed: boolean
}

function easeInOutCubic(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value < 0.5
    ? 4 * value * value * value
    : 1 - (((-2 * value) + 2) ** 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + ((b - a) * t)
}

export function buildScenarioDirector(
  primaryRoutePlan?: RescueRoutePlan,
  searchPattern?: SearchPatternPlan,
): ScenarioDirector {
  const rerouteStart = primaryRoutePlan?.turnStartedAt ?? (MOB_EVENT_TIME + 4)
  const searchStart = searchPattern?.activatedAt ?? (rerouteStart + 56)
  // Advance scenario time during search to animate the expanding-square reveal,
  // then freeze at the end of that window for the final picture.
  // Vessel positions are frozen separately in useScenarioTimeline at activatedAt.
  const searchAnimMinutes = 20
  const finalScenarioTime = searchPattern
    ? searchPattern.activatedAt + searchAnimMinutes
    : searchStart + searchAnimMinutes

  const phases: DemoPhase[] = [
    {
      id: 'traffic',
      label: 'Normal Traffic Picture',
      shortLabel: 'Traffic',
      status: 'Traffic only',
      startSec: 0,
      endSec: 1.5,
      scenarioStart: Math.max(0, MOB_EVENT_TIME - 84),
      scenarioEnd: MOB_EVENT_TIME - 1.6,
    },
    {
      id: 'mob-alert',
      label: 'MOB Alert Confirmed',
      shortLabel: 'Alert',
      status: 'Incident visible',
      startSec: 1.5,
      endSec: 4,
      scenarioStart: MOB_EVENT_TIME - 1.6,
      scenarioEnd: MOB_EVENT_TIME + 0.5,
    },
    {
      id: 'responder',
      label: 'Primary Responder Selected',
      shortLabel: 'Assign',
      status: 'Responder highlighted',
      startSec: 4,
      endSec: 6,
      scenarioStart: MOB_EVENT_TIME + 0.5,
      scenarioEnd: rerouteStart - 1.2,
    },
    {
      id: 'drift',
      label: 'Drift Estimate Added',
      shortLabel: 'Drift',
      status: 'Datum updated',
      startSec: 6,
      endSec: 8,
      scenarioStart: rerouteStart - 1.2,
      scenarioEnd: rerouteStart + 0.6,
    },
    {
      id: 'reroute',
      label: 'Rescue Vessel Altering Course',
      shortLabel: 'Intercept',
      status: 'Intercept underway',
      startSec: 8,
      endSec: 13.5,
      scenarioStart: rerouteStart + 0.6,
      scenarioEnd: searchStart - 1.2,
    },
    {
      id: 'search',
      label: 'Search Pattern Active',
      shortLabel: 'Pattern',
      status: 'Pattern underway',
      startSec: 13.5,
      endSec: 18,
      scenarioStart: searchStart,
      scenarioEnd: finalScenarioTime,
    },
    {
      id: 'final',
      label: 'Final Operational Picture',
      shortLabel: 'Final',
      status: 'Ready for screenshot',
      startSec: 18,
      endSec: 23.5,
      scenarioStart: finalScenarioTime,
      scenarioEnd: finalScenarioTime,
    },
  ]

  return {
    durationSec: phases[phases.length - 1].endSec,
    phases,
  }
}

export function getScenarioDirectorState(
  director: ScenarioDirector,
  elapsedSec: number,
): ScenarioDirectorState {
  const durationSec = director.durationSec
  const clampedElapsedSec = Math.max(0, Math.min(durationSec, elapsedSec))
  const phaseIndex = director.phases.findIndex(
    (phase) => clampedElapsedSec >= phase.startSec && clampedElapsedSec <= phase.endSec,
  )
  const resolvedPhaseIndex = phaseIndex === -1 ? director.phases.length - 1 : phaseIndex
  const phase = director.phases[resolvedPhaseIndex]
  const phaseDuration = Math.max(0.0001, phase.endSec - phase.startSec)
  const phaseProgress = (clampedElapsedSec - phase.startSec) / phaseDuration
  const eased = phase.id === 'final' ? 1 : easeInOutCubic(phaseProgress)

  return {
    progress: durationSec === 0 ? 1 : clampedElapsedSec / durationSec,
    elapsedSec: clampedElapsedSec,
    scenarioTime: lerp(phase.scenarioStart, phase.scenarioEnd, eased),
    phase,
    phaseIndex: resolvedPhaseIndex,
    completed: clampedElapsedSec >= durationSec,
  }
}
