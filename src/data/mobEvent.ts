// ============================================================
// MOB Event — single scripted incident for the demo scenario.
// Triggered when scenario time crosses MOB_EVENT_TIME.
// ============================================================

import type { DriftState } from '../domain/types'

/** Scenario minute at which the MOB event fires (12:00 UTC). */
export const MOB_EVENT_TIME = 240

/** Fixed geographic position of the person in the water. */
export const MOB_POSITION: [number, number] = [56.2, 18.8]

/** Human-readable description shown in the incident card. */
export const MOB_REPORTED_BY = 'MV NORDIC SPIRIT'
export const MOB_REPORTED_UTC = '12:00 UTC'

/** Scripted visual drift direction used for the demo overlay. */
export const MOB_DRIFT_HEADING = 122

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

/**
 * Build a clean, screen-friendly drift trace from the fixed MOB origin.
 * The geometry is intentionally cinematic rather than operationally exact.
 */
export function buildDriftState(elapsedMin: number): DriftState {
  const distanceNm = Math.min(24, 2 + (elapsedMin * 0.14))
  const end = offsetPosition(MOB_POSITION, distanceNm, MOB_DRIFT_HEADING)

  const arrowLengthNm = Math.max(1.4, distanceNm * 0.18)
  const arrowLeft = offsetPosition(end, arrowLengthNm, MOB_DRIFT_HEADING + 158)
  const arrowRight = offsetPosition(end, arrowLengthNm, MOB_DRIFT_HEADING - 158)

  const originWidthNm = 0.5
  const endWidthNm = Math.max(2.4, distanceNm * 0.42)
  const corridor: [number, number][] = [
    offsetPosition(MOB_POSITION, originWidthNm, MOB_DRIFT_HEADING + 90),
    offsetPosition(end, endWidthNm, MOB_DRIFT_HEADING + 90),
    offsetPosition(end, endWidthNm, MOB_DRIFT_HEADING - 90),
    offsetPosition(MOB_POSITION, originWidthNm, MOB_DRIFT_HEADING - 90),
  ]

  return {
    origin: MOB_POSITION,
    line: [MOB_POSITION, end],
    arrow: [arrowLeft, end, arrowRight],
    corridor,
    heading: MOB_DRIFT_HEADING,
    distanceNm,
    elapsedMin,
  }
}
