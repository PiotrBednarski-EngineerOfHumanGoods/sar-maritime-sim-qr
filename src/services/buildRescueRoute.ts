import {
  MOB_DRIFT_HEADING,
  MOB_EVENT_TIME,
  buildDriftState,
} from '../data/mobEvent'
import { SCENARIO_DURATION } from '../data/mockScenario'
import type {
  RescueRoutePlan,
  ResponderAssignment,
  ResponderSelection,
  VesselState,
  Waypoint,
} from '../domain/types'
import { interpolatePosition } from '../utils/interpolate'

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function distanceNmBetween(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const meanLatRad = toRadians((lat1 + lat2) / 2)
  const dLatNm = (lat2 - lat1) * 60
  const dLngNm = (lng2 - lng1) * 60 * Math.cos(meanLatRad)
  return Math.hypot(dLatNm, dLngNm)
}

function bearingBetween(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const y = lng2 - lng1
  const x = lat2 - lat1
  const angle = Math.atan2(y, x) * (180 / Math.PI)
  return (angle + 360) % 360
}

function offsetPosition(
  [lat, lng]: [number, number],
  distanceNm: number,
  bearingDeg: number,
): [number, number] {
  const bearingRad = toRadians(bearingDeg)
  const latOffset = (distanceNm / 60) * Math.cos(bearingRad)
  const lngOffset = (distanceNm / (60 * Math.cos(toRadians(lat)))) * Math.sin(bearingRad)
  return [lat + latOffset, lng + lngOffset]
}

function interpolateBearing(from: number, to: number, t: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180
  return (from + (delta * t) + 360) % 360
}

function easeOutCubic(value: number): number {
  return 1 - ((1 - value) ** 3)
}

function buildOriginalPath(
  waypoints: Waypoint[],
  startPosition: [number, number],
): [number, number][] {
  const futureWaypoints = waypoints
    .filter((waypoint) => waypoint.t > MOB_EVENT_TIME)
    .map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number])

  return [startPosition, ...futureWaypoints]
}

function buildCombinedWaypoints(
  originalWaypoints: Waypoint[],
  startPosition: [number, number],
  rerouteTail: Waypoint[],
): Waypoint[] {
  const prefix = originalWaypoints
    .filter((waypoint) => waypoint.t < MOB_EVENT_TIME)
    .map((waypoint) => ({ ...waypoint }))

  return [
    ...prefix,
    {
      t: MOB_EVENT_TIME,
      lat: startPosition[0],
      lng: startPosition[1],
    },
    ...rerouteTail,
  ]
}

function buildSupportIntercept(primaryIntercept: [number, number]): [number, number] {
  return offsetPosition(primaryIntercept, 3.6, MOB_DRIFT_HEADING + 90)
}

function buildPlanForAssignment(
  assignment: ResponderAssignment,
  eventState: VesselState,
  interceptPoint: [number, number],
): RescueRoutePlan {
  const isPrimary = assignment.role === 'primary'
  const reactionDelay = isPrimary ? 4 : 8
  const turnSegmentCount = isPrimary ? 4 : 3
  const turnSegmentMinutes = isPrimary ? 4 : 5
  const turnSpeedFactor = isPrimary ? 0.95 : 0.88
  const cruiseSpeed = Math.max(7.5, assignment.vessel.speed * (isPrimary ? 0.92 : 0.84))

  const startPosition = eventState.position
  const continuationPosition = interpolatePosition(
    assignment.vessel.waypoints,
    MOB_EVENT_TIME + reactionDelay,
  )

  const rerouteTail: Waypoint[] = [
    {
      t: MOB_EVENT_TIME + reactionDelay,
      lat: continuationPosition[0],
      lng: continuationPosition[1],
    },
  ]

  const initialBearing = bearingBetween(startPosition, continuationPosition)
  const targetBearing = bearingBetween(continuationPosition, interceptPoint)

  let currentTime = MOB_EVENT_TIME + reactionDelay
  let currentPosition = continuationPosition

  for (let step = 1; step <= turnSegmentCount; step += 1) {
    currentTime += turnSegmentMinutes
    const blend = easeOutCubic(step / turnSegmentCount)
    const bearing = interpolateBearing(initialBearing, targetBearing, blend)
    const stepDistanceNm = assignment.vessel.speed * turnSpeedFactor * (turnSegmentMinutes / 60)
    currentPosition = offsetPosition(currentPosition, stepDistanceNm, bearing)

    rerouteTail.push({
      t: currentTime,
      lat: currentPosition[0],
      lng: currentPosition[1],
    })
  }

  const remainingDistanceNm = distanceNmBetween(currentPosition, interceptPoint)
  const cruiseMinutes = Math.max(
    isPrimary ? 28 : 36,
    Math.round((remainingDistanceNm / cruiseSpeed) * 60),
  )
  const arrivalAt = Math.min(SCENARIO_DURATION - 1, currentTime + cruiseMinutes)

  rerouteTail.push({
    t: arrivalAt,
    lat: interceptPoint[0],
    lng: interceptPoint[1],
  })
  rerouteTail.push({
    t: SCENARIO_DURATION,
    lat: interceptPoint[0],
    lng: interceptPoint[1],
  })

  return {
    vesselId: assignment.vessel.id,
    role: assignment.role,
    activatedAt: MOB_EVENT_TIME,
    turnStartedAt: MOB_EVENT_TIME + reactionDelay,
    arrivalAt,
    routeWaypoints: buildCombinedWaypoints(
      assignment.vessel.waypoints,
      startPosition,
      rerouteTail,
    ),
    originalPath: buildOriginalPath(assignment.vessel.waypoints, startPosition),
    interceptPath: [startPosition, ...rerouteTail.slice(0, -1).map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number])],
    interceptPoint,
  }
}

export function buildRescueRoutes(
  responderSelection: ResponderSelection,
  eventStates: VesselState[],
): RescueRoutePlan[] {
  const primaryState = eventStates.find(
    ({ vessel }) => vessel.id === responderSelection.primary.vessel.id,
  )

  if (!primaryState) return []

  // Iteratively solve for the lead time that aligns the interceptPoint with
  // where the drift tip will actually be when the vessel arrives.
  // Without iteration the distance heuristic underestimates travel time, making
  // the interceptPoint too close to MOB while the drift corridor extends farther.
  const estimatedCruiseSpeed = Math.max(7.5, responderSelection.primary.vessel.speed * 0.92)
  const reactionAndTurnMin   = 20  // 4 reaction + 4×4 turn segments (matches buildPlanForAssignment)

  let leadMin = Math.min(60, 16 + (responderSelection.primary.distanceNm * 0.6))
  for (let iter = 0; iter < 4; iter++) {
    const candidate = buildDriftState(leadMin).line[1]
    const dist = distanceNmBetween(primaryState.position, candidate)
    leadMin = Math.min(SCENARIO_DURATION, reactionAndTurnMin + (dist / estimatedCruiseSpeed) * 60)
  }
  const primaryIntercept = buildDriftState(leadMin).line[1]

  const plans = [
    buildPlanForAssignment(
      responderSelection.primary,
      primaryState,
      primaryIntercept,
    ),
  ]

  if (responderSelection.secondary) {
    const secondaryState = eventStates.find(
      ({ vessel }) => vessel.id === responderSelection.secondary?.vessel.id,
    )

    if (secondaryState) {
      plans.push(
        buildPlanForAssignment(
          responderSelection.secondary,
          secondaryState,
          buildSupportIntercept(primaryIntercept),
        ),
      )
    }
  }

  return plans
}
