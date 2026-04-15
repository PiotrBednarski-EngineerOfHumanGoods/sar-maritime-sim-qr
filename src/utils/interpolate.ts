import type { Waypoint } from '../domain/types'
import { SCENARIO_START_HOUR } from '../data/mockScenario'

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Interpolate a vessel position at scenario time `t` (minutes).
 * Uses linear interpolation between the surrounding waypoints.
 */
export function interpolatePosition(
  waypoints: Waypoint[],
  t: number,
): [number, number] {
  if (waypoints.length === 0) return [0, 0]
  if (t <= waypoints[0].t) return [waypoints[0].lat, waypoints[0].lng]

  const last = waypoints[waypoints.length - 1]
  if (t >= last.t) return [last.lat, last.lng]

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    if (t >= a.t && t < b.t) {
      const r = (t - a.t) / (b.t - a.t)
      return [lerp(a.lat, b.lat, r), lerp(a.lng, b.lng, r)]
    }
  }
  return [last.lat, last.lng]
}

/**
 * Compute heading (0–360°, north = 0) by looking 4 minutes ahead
 * along the route. Returns 0 when the vessel is stationary.
 * Wider lookahead softens the heading snap at waypoint corners.
 */
export function computeHeading(waypoints: Waypoint[], t: number): number {
  const [lat1, lng1] = interpolatePosition(waypoints, t)
  const [lat2, lng2] = interpolatePosition(waypoints, t + 4)
  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  if (Math.abs(dLat) < 1e-9 && Math.abs(dLng) < 1e-9) return 0
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (angle + 360) % 360
}

/**
 * Build the past-track trail as an array of [lat, lng] points.
 * Samples every `step` minutes from 0 to `currentT`, always
 * including the exact current position as the final point.
 */
export function computeTrail(
  waypoints: Waypoint[],
  currentT: number,
  step = 5,
): [number, number][] {
  const trail: [number, number][] = []
  for (let t = 0; t <= currentT; t += step) {
    trail.push(interpolatePosition(waypoints, t))
  }
  // Append exact current tip so the trail always reaches the marker.
  const tip = interpolatePosition(waypoints, currentT)
  const prev = trail[trail.length - 1]
  if (!prev || prev[0] !== tip[0] || prev[1] !== tip[1]) {
    trail.push(tip)
  }
  return trail
}

/**
 * Format scenario time (minutes from 0) as "HH:MM".
 */
export function formatScenarioTime(t: number): string {
  const total = SCENARIO_START_HOUR * 60 + Math.floor(t)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Format a duration in minutes as "Xh Ym" or "Y min".
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h === 0) return `${m} min`
  return `${h}h ${m}m`
}

/**
 * Format a [lat, lng] pair as a readable nautical position string.
 * e.g. "55°30.0'N  004°12.0'E"
 */
export function formatLatLon(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  const aLat = Math.abs(lat)
  const aLng = Math.abs(lng)
  const latD = Math.floor(aLat)
  const latM = ((aLat - latD) * 60).toFixed(1)
  const lngD = Math.floor(aLng)
  const lngM = ((aLng - lngD) * 60).toFixed(1)
  return `${latD}°${latM}'${ns}  ${String(lngD).padStart(3, '0')}°${lngM}'${ew}`
}
