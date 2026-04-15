// ============================================================
// SAR DEMO — Scripted Scenario Data
// All data is fake and deterministic — built for demo clarity.
// ============================================================

export const SCENARIO_DURATION = 720     // minutes  (08:00–20:00 UTC)
export const SCENARIO_START_HOUR = 8
export const MOB_EVENT_TIME = 240        // t=240  → 12:00 UTC
export const RESPONDER_ID = 'coastal-queen'
export const SEARCH_START_TIME = 362     // responder on-scene
export const MOB_POSITION: [number, number] = [55.5, 4.2]

// Drift model — simple linear, direction 310° (NW), 0.7 kts
export const DRIFT_DIR_DEG = 310
export const DRIFT_SPEED_KTS = 0.7

export type ShipType = 'cargo' | 'tanker' | 'container' | 'ferry' | 'fishing'
export type ShipStatus = 'underway' | 'responding' | 'on-scene'

export interface Waypoint {
  t: number   // scenario time in minutes
  lat: number
  lng: number
}

export interface Ship {
  id: string
  name: string
  type: ShipType
  callsign: string
  speed: number    // knots (nominal)
  color: string
  waypoints: Waypoint[]
  respondingAt?: number
}

// ---- Scripted ship routes ----
// All routes are over the North Sea, centred ~55–56°N 3–5°E.
// COASTAL QUEEN is the clear best responder (closest + fastest at MOB time).

export const SHIPS: Ship[] = [
  {
    id: 'helios-star',
    name: 'HELIOS STAR',
    type: 'cargo',
    callsign: 'PCAB',
    speed: 12,
    color: '#2563eb',
    waypoints: [
      { t: 0,   lat: 52.0, lng: 3.5 },
      { t: 240, lat: 53.8, lng: 2.7 },
      { t: 480, lat: 55.5, lng: 2.0 },
      { t: 720, lat: 57.2, lng: 1.2 },
    ],
  },
  {
    id: 'polar-dawn',
    name: 'POLAR DAWN',
    type: 'tanker',
    callsign: 'OJHM',
    speed: 10,
    color: '#7c3aed',
    waypoints: [
      { t: 0,   lat: 58.0, lng: 1.5 },
      { t: 240, lat: 56.2, lng: 3.0 },
      { t: 480, lat: 54.5, lng: 4.5 },
      { t: 720, lat: 52.8, lng: 6.0 },
    ],
  },
  {
    id: 'meridian-ace',
    name: 'MERIDIAN ACE',
    type: 'container',
    callsign: 'LAXR',
    speed: 15,
    color: '#059669',
    waypoints: [
      { t: 0,   lat: 57.5, lng: 5.5 },
      { t: 180, lat: 56.5, lng: 5.0 },
      { t: 360, lat: 55.5, lng: 4.5 },
      { t: 540, lat: 54.2, lng: 4.8 },
      { t: 720, lat: 52.8, lng: 5.2 },
    ],
  },
  {
    // Original course: due north along 3.8°E.
    // At t=252 she receives divert order and turns NE toward MOB.
    // Arrives on scene at t=362 (≈18:00 UTC… wait, 240+122=362 min = 14:02 UTC).
    id: 'coastal-queen',
    name: 'COASTAL QUEEN',
    type: 'ferry',
    callsign: 'MABZ',
    speed: 18,
    color: '#d97706',
    waypoints: [
      { t: 0,   lat: 53.8, lng: 3.8  },
      { t: 240, lat: 55.0, lng: 3.8  },   // position at MOB event
      { t: 252, lat: 55.07, lng: 3.8 },   // brief continuation on N course
      { t: 362, lat: 55.5,  lng: 4.2 },   // ARRIVES ON SCENE
      { t: 720, lat: 55.5,  lng: 4.2 },   // remains on scene
    ],
    respondingAt: 252,
  },
  {
    id: 'njord',
    name: 'NJORD',
    type: 'fishing',
    callsign: 'LNFW',
    speed: 7,
    color: '#0891b2',
    waypoints: [
      { t: 0,   lat: 55.5, lng: 6.0 },
      { t: 180, lat: 55.8, lng: 5.5 },
      { t: 360, lat: 55.3, lng: 5.8 },
      { t: 540, lat: 55.7, lng: 6.2 },
      { t: 720, lat: 56.0, lng: 5.8 },
    ],
  },
]

export const WEATHER = {
  windDir: 310,
  windSpeed: 14,    // knots
  waveHeight: 1.8,  // metres
  visibility: 6,    // nautical miles
  seaState: 3,
  condition: 'Partly Cloudy',
  tempC: 9,
}

// ---- Pure helper functions ----

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function interpolateShipPosition(ship: Ship, t: number): [number, number] {
  const wps = ship.waypoints
  if (t <= wps[0].t) return [wps[0].lat, wps[0].lng]
  const last = wps[wps.length - 1]
  if (t >= last.t) return [last.lat, last.lng]
  for (let i = 0; i < wps.length - 1; i++) {
    if (t >= wps[i].t && t < wps[i + 1].t) {
      const r = (t - wps[i].t) / (wps[i + 1].t - wps[i].t)
      return [lerp(wps[i].lat, wps[i + 1].lat, r), lerp(wps[i].lng, wps[i + 1].lng, r)]
    }
  }
  return [last.lat, last.lng]
}

export function getShipHeading(ship: Ship, t: number): number {
  const [lat1, lng1] = interpolateShipPosition(ship, t)
  const [lat2, lng2] = interpolateShipPosition(ship, t + 2)
  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  if (Math.abs(dLat) < 1e-9 && Math.abs(dLng) < 1e-9) return 0
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (angle + 360) % 360
}

export function getShipStatus(ship: Ship, t: number): ShipStatus {
  if (t < MOB_EVENT_TIME) return 'underway'
  if (!ship.respondingAt || t < ship.respondingAt) return 'underway'
  const [lat, lng] = interpolateShipPosition(ship, t)
  const dLatNm = (lat - MOB_POSITION[0]) * 60
  const dLngNm = (lng - MOB_POSITION[1]) * 60 * Math.cos(lat * Math.PI / 180)
  if (Math.sqrt(dLatNm ** 2 + dLngNm ** 2) < 3) return 'on-scene'
  return 'responding'
}

export function getDriftPosition(t: number): [number, number] {
  if (t < MOB_EVENT_TIME) return [MOB_POSITION[0], MOB_POSITION[1]]
  const hours = (t - MOB_EVENT_TIME) / 60
  const distNm = DRIFT_SPEED_KTS * hours
  const rad = (DRIFT_DIR_DEG * Math.PI) / 180
  const dLat = (distNm * Math.cos(rad)) / 60
  const dLng = (distNm * Math.sin(rad)) / (60 * Math.cos(MOB_POSITION[0] * Math.PI / 180))
  return [MOB_POSITION[0] + dLat, MOB_POSITION[1] + dLng]
}

export function distanceToMOBnm(ship: Ship, t: number): number {
  const [lat, lng] = interpolateShipPosition(ship, t)
  const dLat = (lat - MOB_POSITION[0]) * 60
  const dLng = (lng - MOB_POSITION[1]) * 60 * Math.cos(lat * Math.PI / 180)
  return Math.sqrt(dLat ** 2 + dLng ** 2)
}

export function etaMinutes(ship: Ship, t: number): number | null {
  if (!ship.respondingAt || t < MOB_EVENT_TIME) return null
  const dist = distanceToMOBnm(ship, t)
  return dist / ship.speed * 60  // minutes
}

export function formatScenarioTime(t: number): string {
  const totalMin = SCENARIO_START_HOUR * 60 + Math.floor(t)
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`
}

export function formatLatLon(lat: number, lng: number): string {
  const latD = Math.floor(Math.abs(lat))
  const latM = ((Math.abs(lat) - latD) * 60).toFixed(1)
  const lngD = Math.floor(Math.abs(lng))
  const lngM = ((Math.abs(lng) - lngD) * 60).toFixed(1)
  return `${latD}°${latM}'N  ${lngD}°${lngM}'E`
}

// ---- Expanding Square Search pattern (IAMSAR Vol II) ----
// Computed from predicted datum at t=SEARCH_START_TIME.
// Track spacing S = 5 nm  ≈  0.083° lat.
export function computeSearchPattern(): [number, number][] {
  const [dLat, dLng] = getDriftPosition(SEARCH_START_TIME)
  const S = 0.083
  const SL = S / Math.cos(dLat * Math.PI / 180)

  // Expanding square: cumulative positions starting from datum
  // Legs: N1, E1, S2, W2, N3, E3, S4, W4, N5
  const pts: [number, number][] = [[dLat, dLng]]
  let la = dLat, lo = dLng
  const steps: [number, number, number][] = [
    [1, 0, 1], [0, 1, 1],
    [-1, 0, 2], [0, -1, 2],
    [1, 0, 3], [0, 1, 3],
    [-1, 0, 4], [0, -1, 4],
    [1, 0, 5],
  ]
  for (const [dL, dO, n] of steps) {
    la += dL * n * S
    lo += dO * n * SL
    pts.push([la, lo])
  }
  return pts
}

export const SEARCH_PATTERN = computeSearchPattern()
