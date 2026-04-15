/**
 * CameraController — phase-driven map choreography
 *
 * Lives *inside* the MapContainer so it can call useMap().
 * Watches for phase transitions and fires smooth Leaflet flyTo / flyToBounds
 * transitions. Returns null — pure side-effect component.
 *
 * Camera states:
 *   traffic    → wide North Sea overview, zoom 6
 *   mob-alert  → barely-perceptible drift toward incident, zoom 6.2  (hold the drama)
 *   responder  → zoom in to frame MOB + primary responder together
 *   drift      → widen slightly to include the SE drift corridor
 *   reroute    → frame the full triangle: responder → MOB + drift corridor
 *   search     → re-center on datum / expanding-square area, zoom 7.5
 *   final      → pull back to a balanced presentation frame
 */

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DemoPhase } from '../../services/scenarioDirector'
import type { VesselState, ResponderSelection } from '../../domain/types'
import { MOB_POSITION, MOB_DRIFT_HEADING } from '../../data/mobEvent'

// ---------------------------------------------------------------------------
// Geometry helpers — mirror the formula used in buildDriftState so the
// camera anchors match the actual drift corridor drawn on the map.
// ---------------------------------------------------------------------------

function toRad(deg: number) { return (deg * Math.PI) / 180 }

function offsetPosition(
  [lat, lng]: [number, number],
  distNm: number,
  bearingDeg: number,
): L.LatLngTuple {
  const rad    = toRad(bearingDeg)
  const latOff = (distNm / 60) * Math.cos(rad)
  const lngOff = (distNm / (60 * Math.cos(toRad(lat)))) * Math.sin(rad)
  return [lat + latOff, lng + lngOff]
}

// Drift anchor used for bounding-box framing (8 nm gives good local context
// without forcing the camera to back out after the first close zoom).
const DRIFT_NEAR = offsetPosition(MOB_POSITION, 8, MOB_DRIFT_HEADING)

// ---------------------------------------------------------------------------
// Leaflet helpers
// ---------------------------------------------------------------------------

const EASE: Partial<L.ZoomPanOptions> = {
  animate:       true,
  easeLinearity: 0.10,   // very pronounced cubic ease — cinematic deceleration
}

function flyTo(
  map:      L.Map,
  center:   L.LatLngTuple,
  zoom:     number,
  duration: number,
) {
  map.flyTo(center, zoom, { ...EASE, duration } as L.ZoomPanOptions)
}

/**
 * Fly to the smallest bounding box that contains all given positions,
 * with per-side padding (pixels) to avoid UI chrome.
 *
 * paddingTopLeft    = [leftPx, topPx]
 * paddingBottomRight = [rightPx, bottomPx]
 *
 * The chip stack lives at top-right (~185 px wide).
 * The playback bar lives at the bottom (~60 px tall).
 * Left and top are clear, so minimal padding there.
 */
function flyBounds(
  map:      L.Map,
  points:   L.LatLngTuple[],
  duration: number,
  maxZoom = 8.2,
) {
  if (points.length === 0) return

  if (points.length === 1) {
    // Single point — just centre on it
    flyTo(map, points[0], maxZoom, duration)
    return
  }

  const bounds = L.latLngBounds(points.map(([la, ln]) => L.latLng(la, ln)))

  map.flyToBounds(bounds, {
    animate:       true,
    duration,
    easeLinearity: 0.10,   // match EASE — pronounced cubic curve for cinematic feel
    // Compensate for the chip stack (top-right) and the playback bar (bottom)
    paddingTopLeft:     L.point(30, 30),
    paddingBottomRight: L.point(190, 70),
    maxZoom,
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CameraControllerProps {
  currentPhase:       DemoPhase
  vesselStates:       VesselState[]
  responderSelection?: ResponderSelection
}

export default function CameraController({
  currentPhase,
  vesselStates,
  responderSelection,
}: CameraControllerProps) {
  const map         = useMap()
  const prevPhaseId = useRef<string | null>(null)

  useEffect(() => {
    // Fire only on phase transitions, not on every render
    if (prevPhaseId.current === currentPhase.id) return
    prevPhaseId.current = currentPhase.id

    // Resolve primary responder's live position (if available)
    const responderState = responderSelection
      ? vesselStates.find(vs => vs.vessel.id === responderSelection.primary.vessel.id)
      : null
    const respPos = responderState?.position ?? null

    switch (currentPhase.id) {

      // ── Wide overview (3 s phase) ──────────────────────────────────────────
      case 'traffic':
        // Closer opening shot at zoom 7 — matches MAP_CENTER/MAP_ZOOM defaults
        // so there is no jarring animation on first load.
        flyTo(map, [57.0, 19.0], 7, 1.2)
        break

      // ── MOB fires (2.5 s phase) ────────────────────────────────────────────
      case 'mob-alert':
        // Subtle nudge toward the incident at a slightly tighter zoom.
        flyTo(map, [56.7, 18.9], 7.2, 1.4)
        break

      // ── Responder highlighted (2 s phase) ─────────────────────────────────
      case 'responder': {
        // Tight zoom-in on MOB + primary responder + start of drift corridor.
        // maxZoom 9.2 gives a noticeably closer frame than the previous 8.2.
        // DRIFT_NEAR included so the drift vector has room to appear on screen
        // without requiring another camera lurch when the drift phase starts.
        const pts: L.LatLngTuple[] = [MOB_POSITION, DRIFT_NEAR]
        if (respPos) pts.push(respPos)
        flyBounds(map, pts, 1.3, 9.2)
        break
      }

      // ── Drift corridor (2 s phase) ─────────────────────────────────────────
      case 'drift': {
        // Hold the same close frame as responder — camera stays locked,
        // drift elements animate into the already-established view.
        const pts: L.LatLngTuple[] = [MOB_POSITION, DRIFT_NEAR]
        if (respPos) pts.push(respPos)
        flyBounds(map, pts, 0.6, 9.2)
        break
      }

      // ── Reroute underway (5.5 s phase — the money shot) ───────────────────
      case 'reroute': {
        // Keep the same tight close frame — no zoom-out.
        // The intercept route line is fully visible at this zoom level;
        // DRIFT_MID is no longer needed (would have forced camera to zoom out).
        const pts: L.LatLngTuple[] = [MOB_POSITION, DRIFT_NEAR]
        if (respPos) pts.push(respPos)
        flyBounds(map, pts, 1.0, 9.0)
        break
      }

      // ── Search pattern (3 s phase) ─────────────────────────────────────────
      case 'search': {
        // Centre on the primary responder (who is AT the datum executing the pattern),
        // not on MOB_POSITION which may be many nm away from the search area.
        const searchCenter: L.LatLngTuple = respPos ?? MOB_POSITION
        flyTo(map, searchCenter, 10.5, 1.6)
        break
      }

      // ── Final hold (5.5 s phase) ───────────────────────────────────────────
      case 'final': {
        // Same search-area frame — nudge barely closer for the resolution shot.
        const finalCenter: L.LatLngTuple = respPos ?? MOB_POSITION
        flyTo(map, finalCenter, 10.8, 1.2)
        break
      }
    }
  }, [currentPhase.id, map, vesselStates, responderSelection])

  return null
}
