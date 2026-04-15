import type {
  ResponderAssignment,
  ResponderSelection,
  VesselState,
} from '../domain/types'

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function normalizeAngleDelta(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360
  return delta > 180 ? 360 - delta : delta
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

function distanceNmBetween(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const meanLatRad = toRadians((lat1 + lat2) / 2)
  const dLatNm = (lat2 - lat1) * 60
  const dLngNm = (lng2 - lng1) * 60 * Math.cos(meanLatRad)
  return Math.hypot(dLatNm, dLngNm)
}

function createAssignment(
  state: VesselState,
  mobPosition: [number, number],
  role: 'primary' | 'secondary',
): ResponderAssignment {
  const distanceNm = distanceNmBetween(state.position, mobPosition)
  const bearingToMob = bearingBetween(state.position, mobPosition)
  const headingDelta = normalizeAngleDelta(state.heading, bearingToMob)

  const distanceScore = Math.max(0, 1 - distanceNm / 90)
  const headingScore = Math.max(0, 1 - headingDelta / 120)
  const speedScore = Math.min(state.vessel.speed / 18, 1)

  const score = (distanceScore * 0.7) + (headingScore * 0.23) + (speedScore * 0.07)

  const effectiveSpeed = Math.max(
    7,
    state.vessel.speed * (0.72 + (headingScore * 0.18)),
  )
  const etaMin = Math.max(12, Math.round((distanceNm / effectiveSpeed) * 60))

  return {
    vessel: state.vessel,
    role,
    score,
    distanceNm,
    etaMin,
    headingDelta,
  }
}

export function selectBestVessel(
  vesselStates: VesselState[],
  mobPosition: [number, number],
): ResponderSelection {
  const ranked = vesselStates
    .map((state) => createAssignment(state, mobPosition, 'primary'))
    .sort((a, b) => b.score - a.score)

  const primary = ranked[0]
  const candidate = ranked[1]

  const secondary = candidate
    && candidate.distanceNm <= 60
    && candidate.score >= primary.score * 0.78
    ? { ...candidate, role: 'secondary' as const }
    : undefined

  return { primary, secondary }
}
