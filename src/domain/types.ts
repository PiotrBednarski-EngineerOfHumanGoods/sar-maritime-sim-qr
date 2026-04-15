// ============================================================
// Domain types — shared across the whole application.
// ============================================================

export interface Waypoint {
  /** Scenario time in minutes from 0 (= 08:00 UTC). */
  t: number
  lat: number
  lng: number
}

export type VesselType =
  | 'cargo'
  | 'tanker'
  | 'container'
  | 'ferry'
  | 'fishing'
  | 'osv'          // offshore supply
  | 'research'

export interface Vessel {
  id: string
  name: string
  mmsi: string
  vesselType: VesselType
  /** Nominal cruising speed in knots (informational). */
  speed: number
  /** Hex colour used for icon + trail. */
  color: string
  waypoints: Waypoint[]
}

/** Live position + derived motion state at a given scenario time. */
export interface VesselState {
  vessel: Vessel
  position: [number, number]   // [lat, lng]
  heading: number              // 0–360 degrees
  trail: [number, number][]    // past track positions
}

export type ResponderRole = 'primary' | 'secondary'

export interface ResponderAssignment {
  vessel: Vessel
  role: ResponderRole
  score: number
  distanceNm: number
  etaMin: number
  headingDelta: number
}

export interface ResponderSelection {
  primary: ResponderAssignment
  secondary?: ResponderAssignment
}

export interface DriftState {
  origin: [number, number]
  line: [number, number][]
  arrow: [number, number][]
  corridor: [number, number][]
  heading: number
  distanceNm: number
  elapsedMin: number
}

export interface RescueRoutePlan {
  vesselId: string
  role: ResponderRole
  activatedAt: number
  turnStartedAt: number
  arrivalAt: number
  routeWaypoints: Waypoint[]
  originalPath: [number, number][]
  interceptPath: [number, number][]
  interceptPoint: [number, number]
}

export type MissionPhase = 'dispatch' | 'intercept' | 'search'

export interface SearchPatternPlan {
  vesselId: string
  patternName: string
  activatedAt: number
  phaseEndsAt: number
  datum: [number, number]
  routeWaypoints: Waypoint[]
  patternPath: [number, number][]
}
