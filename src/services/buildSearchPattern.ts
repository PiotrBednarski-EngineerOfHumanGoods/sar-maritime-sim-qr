import { SCENARIO_DURATION } from '../data/mockScenario'
import type {
  MissionPhase,
  RescueRoutePlan,
  SearchPatternPlan,
  Waypoint,
} from '../domain/types'

export interface SearchPatternLegInfo {
  legIndex: number
  heading: number
  from: [number, number]
  to: [number, number]
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
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

function bearingBetween(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const y = lng2 - lng1
  const x = lat2 - lat1
  const angle = Math.atan2(y, x) * (180 / Math.PI)
  return (angle + 360) % 360
}

function buildPatternWaypoints(
  plan: RescueRoutePlan,
  searchStartAt: number,
): Waypoint[] {
  const searchSpeed = 10.5
  const legLengthsNm = [1.8, 1.8, 3.0, 3.0, 4.2, 4.2]
  const arrivalHeading = bearingBetween(
    plan.interceptPath[plan.interceptPath.length - 2] ?? plan.interceptPoint,
    plan.interceptPoint,
  )
  const firstLegHeading = (Math.round((arrivalHeading + 90) / 10) * 10 + 360) % 360

  let currentPosition = plan.interceptPoint
  let currentTime = searchStartAt

  const waypoints: Waypoint[] = [
    {
      t: searchStartAt,
      lat: currentPosition[0],
      lng: currentPosition[1],
    },
  ]

  for (let legIndex = 0; legIndex < legLengthsNm.length; legIndex += 1) {
    const heading = (firstLegHeading + (legIndex * 90)) % 360
    const legEnd = offsetPosition(currentPosition, legLengthsNm[legIndex], heading)
    const legMinutes = Math.max(7, Math.round((legLengthsNm[legIndex] / searchSpeed) * 60))
    currentTime = Math.min(SCENARIO_DURATION, currentTime + legMinutes)

    waypoints.push({
      t: currentTime,
      lat: legEnd[0],
      lng: legEnd[1],
    })

    currentPosition = legEnd

    if (currentTime >= SCENARIO_DURATION) break
  }

  return waypoints
}

export function buildSearchPattern(plan: RescueRoutePlan): SearchPatternPlan {
  const activatedAt = Math.min(SCENARIO_DURATION - 1, plan.arrivalAt + 6)
  const routeWaypoints = buildPatternWaypoints(plan, activatedAt)

  return {
    vesselId: plan.vesselId,
    patternName: 'Expanding Square',
    activatedAt,
    phaseEndsAt: routeWaypoints[routeWaypoints.length - 1]?.t ?? activatedAt,
    datum: plan.interceptPoint,
    routeWaypoints,
    patternPath: routeWaypoints.map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number]),
  }
}

export function getSearchPatternLegInfo(
  plan: SearchPatternPlan,
  time: number,
): SearchPatternLegInfo | undefined {
  if (time < plan.activatedAt || plan.routeWaypoints.length < 2) return undefined

  for (let index = 0; index < plan.routeWaypoints.length - 1; index += 1) {
    const from = plan.routeWaypoints[index]
    const to = plan.routeWaypoints[index + 1]
    if (time < to.t) {
      return {
        legIndex: index + 1,
        heading: bearingBetween([from.lat, from.lng], [to.lat, to.lng]),
        from: [from.lat, from.lng],
        to: [to.lat, to.lng],
      }
    }
  }

  const from = plan.routeWaypoints[plan.routeWaypoints.length - 2]
  const to = plan.routeWaypoints[plan.routeWaypoints.length - 1]
  return {
    legIndex: plan.routeWaypoints.length - 1,
    heading: bearingBetween([from.lat, from.lng], [to.lat, to.lng]),
    from: [from.lat, from.lng],
    to: [to.lat, to.lng],
  }
}

export function getMissionPhase(
  time: number,
  routePlan?: RescueRoutePlan,
  searchPlan?: SearchPatternPlan,
): MissionPhase {
  if (!routePlan) return 'dispatch'
  if (time < routePlan.turnStartedAt) return 'dispatch'
  if (!searchPlan || time < searchPlan.activatedAt) return 'intercept'
  return 'search'
}
