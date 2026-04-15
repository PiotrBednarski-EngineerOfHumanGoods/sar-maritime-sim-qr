import { useEffect, useMemo, useRef, useState } from 'react'
import { VESSELS } from '../data/mockScenario'
import { MOB_EVENT_TIME, MOB_POSITION, buildDriftState } from '../data/mobEvent'
import {
  computeHeading,
  computeTrail,
  formatScenarioTime,
  interpolatePosition,
} from '../utils/interpolate'
import { buildRescueRoutes } from '../services/buildRescueRoute'
import { buildSearchPattern } from '../services/buildSearchPattern'
import {
  buildScenarioDirector,
  getScenarioDirectorState,
  type DemoPhase,
  type DemoPhaseId,
} from '../services/scenarioDirector'
import { selectBestVessel } from '../services/selectBestVessel'
import type {
  DriftState,
  RescueRoutePlan,
  SearchPatternPlan,
  ResponderSelection,
  VesselState,
} from '../domain/types'

export interface ScenarioTimeline {
  time: number
  displayTime: string
  progress: number
  playing: boolean
  completed: boolean
  vesselStates: VesselState[]
  mobVisible: boolean
  mobPosition: [number, number]
  mobElapsedMin: number
  responderSelection?: ResponderSelection
  driftState?: DriftState
  rescueRoutePlans: RescueRoutePlan[]
  searchPattern?: SearchPatternPlan
  currentPhase: DemoPhase
  phaseId: DemoPhaseId
  phases: DemoPhase[]
  play: () => void
  pause: () => void
  restart: () => void
  seek: (elapsedSec: number) => void
}

export function useScenarioTimeline(): ScenarioTimeline {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef<number | undefined>(undefined)
  const lastTsRef = useRef<number | undefined>(undefined)

  const eventStates = useMemo(
    () =>
      VESSELS.map((vessel) => ({
        vessel,
        position: interpolatePosition(vessel.waypoints, MOB_EVENT_TIME),
        heading: computeHeading(vessel.waypoints, MOB_EVENT_TIME),
        trail: computeTrail(vessel.waypoints, MOB_EVENT_TIME, 15),
      })),
    [],
  )
  const responderSelection = useMemo(
    () => selectBestVessel(eventStates, MOB_POSITION),
    [eventStates],
  )
  const rescueRoutePlans = useMemo(
    () => buildRescueRoutes(responderSelection, eventStates),
    [eventStates, responderSelection],
  )
  const primaryRescueRoute = useMemo(
    () => rescueRoutePlans.find((plan) => plan.role === 'primary'),
    [rescueRoutePlans],
  )
  const searchPattern = useMemo(
    () => (primaryRescueRoute ? buildSearchPattern(primaryRescueRoute) : undefined),
    [primaryRescueRoute],
  )
  const director = useMemo(
    () => buildScenarioDirector(primaryRescueRoute, searchPattern),
    [primaryRescueRoute, searchPattern],
  )
  const directorState = useMemo(
    () => getScenarioDirectorState(director, elapsedSec),
    [director, elapsedSec],
  )

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = undefined
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = (ts: number) => {
      if (lastTsRef.current !== undefined) {
        const deltaSec = (ts - lastTsRef.current) / 1000
        let reachedEnd = false

        setElapsedSec((prev) => {
          const next = Math.min(director.durationSec, prev + deltaSec)
          reachedEnd = next >= director.durationSec
          return next
        })

        if (reachedEnd) {
          lastTsRef.current = undefined
          setPlaying(false)
          return
        }
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [director.durationSec, playing])

  const phaseId = directorState.phase.id
  const phaseVisibility = {
    mob: phaseId !== 'traffic',
    responder: ['responder', 'drift', 'reroute', 'search', 'final'].includes(phaseId),
    drift: ['drift', 'reroute', 'search'].includes(phaseId),
    reroute: ['reroute', 'search', 'final'].includes(phaseId),
    search: ['search', 'final'].includes(phaseId),
  }

  const rescueRoutesByVesselId = useMemo(
    () => new Map(rescueRoutePlans.map((plan) => [plan.vesselId, plan])),
    [rescueRoutePlans],
  )
  const scenarioTime = directorState.scenarioTime

  const vesselStates: VesselState[] = useMemo(
    () =>
      VESSELS.map((vessel) => {
        const rescuePlan = phaseVisibility.reroute ? rescueRoutesByVesselId.get(vessel.id) : undefined
        const routeWaypoints = rescuePlan
          ? phaseVisibility.search && searchPattern && searchPattern.vesselId === vessel.id
            ? [
              ...rescuePlan.routeWaypoints.filter((waypoint) => waypoint.t < searchPattern.activatedAt),
              ...searchPattern.routeWaypoints,
            ]
            : rescuePlan.routeWaypoints
          : vessel.waypoints

        return {
          vessel,
          position: interpolatePosition(routeWaypoints, scenarioTime),
          heading: computeHeading(routeWaypoints, scenarioTime),
          trail: computeTrail(routeWaypoints, scenarioTime, 15),
        }
      }),
    [phaseVisibility.reroute, phaseVisibility.search, rescueRoutesByVesselId, scenarioTime, searchPattern],
  )

  const mobVisible = phaseVisibility.mob
  const mobElapsedMin = mobVisible ? Math.max(0, scenarioTime - MOB_EVENT_TIME) : 0
  const driftState: DriftState | undefined = phaseVisibility.drift
    ? buildDriftState(mobElapsedMin)
    : undefined

  function play() {
    if (directorState.completed) {
      setElapsedSec(0)
    }
    lastTsRef.current = undefined
    setPlaying(true)
  }

  function pause() {
    lastTsRef.current = undefined
    setPlaying(false)
  }

  function restart() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    lastTsRef.current = undefined
    setElapsedSec(0)
    setPlaying(false)
  }

  function seek(sec: number) {
    lastTsRef.current = undefined
    setElapsedSec(Math.max(0, Math.min(director.durationSec, sec)))
  }

  return {
    time: scenarioTime,
    displayTime: formatScenarioTime(scenarioTime),
    progress: directorState.progress,
    playing,
    completed: directorState.completed,
    vesselStates,
    mobVisible,
    mobPosition: MOB_POSITION,
    mobElapsedMin,
    responderSelection: phaseVisibility.responder ? responderSelection : undefined,
    driftState,
    rescueRoutePlans: phaseVisibility.reroute ? rescueRoutePlans : [],
    // Pass searchPattern during reroute so SearchPatternLayer can render a
    // preview/ghost of the planned search area before the vessel arrives.
    searchPattern: phaseVisibility.search || phaseId === 'reroute' ? searchPattern : undefined,
    currentPhase: directorState.phase,
    phaseId,
    phases: director.phases,
    play,
    pause,
    restart,
    seek,
  }
}
