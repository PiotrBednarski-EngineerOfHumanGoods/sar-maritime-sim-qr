import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { RescueRoutePlan, VesselState } from '../../domain/types'

// ---- Icon factory -------------------------------------------------------

type VesselRouteMode = 'normal' | 'intercept' | 'support'

/**
 * Create (or update) a divIcon for a vessel.
 * The SVG arrow points north at heading=0 and rotates clockwise.
 * Only called when heading changes by ≥ 2° to avoid per-frame DOM churn.
 */
function createVesselIcon(
  color: string,
  heading: number,
  label: string,
  routeMode: VesselRouteMode,
): L.DivIcon {
  const S = 26   // arrow size px
  const H = `${heading.toFixed(1)}`

  return L.divIcon({
    className: '',   // suppress default leaflet-div-icon styles
    iconSize:   [S, S],
    iconAnchor: [S / 2, S / 2],
    html: /* html */ `
      <div style="
        position:relative;
        width:${S}px;
        height:${S}px;
      ">
        <!-- Rotated ship arrow -->
        <div style="
          width:${S}px;
          height:${S}px;
          transform:rotate(${H}deg);
          transform-origin:${S / 2}px ${S / 2}px;
          filter:${routeMode === 'normal'
            ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.28))'
            : 'drop-shadow(0 0 10px rgba(14,165,233,0.42)) drop-shadow(0 2px 6px rgba(0,0,0,0.24))'};
        ">
          <svg viewBox="0 0 20 28" width="${S}" height="${S}"
               xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 1 L18 25 L10 20 L2 25 Z"
              fill="${color}"
              stroke="white"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <!-- Name label — cartographic callout style -->
        <div style="
          position:absolute;
          top:${S + 5}px;
          left:50%;
          transform:translateX(-50%);
          font-family:system-ui,-apple-system,sans-serif;
          font-size:7px;
          font-weight:600;
          letter-spacing:0.06em;
          text-transform:uppercase;
          color:#64748b;
          background:rgba(255,255,255,0.65);
          padding:1px 3px;
          border-radius:2px;
          white-space:nowrap;
          pointer-events:none;
        ">${label}</div>
      </div>
    `,
  })
}

// ---- Component ----------------------------------------------------------

interface AISLayerProps {
  vesselStates: VesselState[]
  routePlans: RescueRoutePlan[]
  time: number
}

/**
 * AISLayer — renders vessels and their tracks directly via the Leaflet API.
 *
 * Why imperative instead of react-leaflet Markers?
 * Positions update at ~60 fps. Letting React reconcile 8 Markers every frame
 * causes unnecessary virtual-DOM work. Instead:
 *   • L.Marker instances live in a ref; positions updated with setLatLng().
 *   • Icons rebuilt only when heading changes by ≥ 2° (not every frame).
 *   • L.Polyline trails updated with setLatLngs() every frame (very cheap).
 *
 * This keeps animation butter-smooth while the React component tree stays idle.
 */
export default function AISLayer({ vesselStates, routePlans, time }: AISLayerProps) {
  const map = useMap()

  // Refs holding live Leaflet layer instances.
  const markersRef   = useRef<Map<string, L.Marker>>(new Map())
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const headingsRef  = useRef<Map<string, number>>(new Map())   // last heading used to build icon
  const smoothedRef  = useRef<Map<string, number>>(new Map())   // exponentially-smoothed heading
  const modesRef     = useRef<Map<string, VesselRouteMode>>(new Map())
  const isMovingRef  = useRef(false)

  const routePlansByVesselId = useMemo(
    () => new Map(routePlans.map((plan) => [plan.vesselId, plan])),
    [routePlans],
  )

  const getRouteMode = useCallback((vesselId: string): VesselRouteMode => {
    const plan = routePlansByVesselId.get(vesselId)
    if (!plan || time < plan.turnStartedAt) return 'normal'
    return plan.role === 'primary' ? 'intercept' : 'support'
  }, [routePlansByVesselId, time])

  // ── Initialise layers once on mount ──────────────────────────────────
  useEffect(() => {
    const markers = markersRef.current
    const polylines = polylinesRef.current
    const headings = headingsRef.current
    const modes = modesRef.current

    const smoothed = smoothedRef.current
    const isMoving = isMovingRef

    // Freeze during zoom animations only (not pans).
    // During zoom, Leaflet CSS-scales the SVG/markerPane — updating positions
    // then causes double-transform artifacts. At zoomend, Leaflet resets the
    // transform and we resume normal updates.
    const onZoomStart = () => { isMoving.current = true }
    const onZoomEnd   = () => { isMoving.current = false }
    map.on('zoomstart', onZoomStart)
    map.on('zoomend',   onZoomEnd)

    vesselStates.forEach(({ vessel, position, heading, trail }) => {
      const label = vessel.name.split(' ')[0]   // first word only
      const routeMode = getRouteMode(vessel.id)

      // Trail polyline (drawn first so it sits beneath the marker)
      const polyline = L.polyline(trail, {
        color:       vessel.color,
        weight:      2,
        opacity:     0.22,
        smoothFactor: 0,
      }).addTo(map)
      polylines.set(vessel.id, polyline)

      // Vessel marker — seed smoothed heading with initial value
      smoothed.set(vessel.id, heading)
      const icon = createVesselIcon(vessel.color, heading, label, routeMode)
      const marker = L.marker(position, {
        icon,
        zIndexOffset: routeMode === 'intercept' ? 220 : routeMode === 'support' ? 160 : 100,
      }).addTo(map)
      markers.set(vessel.id, marker)
      headings.set(vessel.id, heading)
      modes.set(vessel.id, routeMode)
    })

    // Cleanup on unmount
    return () => {
      map.off('zoomstart', onZoomStart)
      map.off('zoomend',   onZoomEnd)
      markers.forEach((marker) => marker.remove())
      polylines.forEach((polyline) => polyline.remove())
      markers.clear()
      polylines.clear()
      headings.clear()
      smoothed.clear()
      modes.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // mount-only — layer objects persist for the component lifetime

  // ── Update layers every frame (called by parent at ~60 fps) ──────────
  useEffect(() => {
    vesselStates.forEach(({ vessel, position, heading, trail }) => {
      const routeMode = getRouteMode(vessel.id)

      // ── Heading — smooth with capped angular velocity (≤3°/frame) ──
      const prevSmoothed = smoothedRef.current.get(vessel.id) ?? heading
      const rawDiff = ((heading - prevSmoothed + 540) % 360) - 180
      const maxTurn = 3
      const delta = Math.max(-maxTurn, Math.min(maxTurn, rawDiff))
      const smoothedHeading = ((prevSmoothed + delta) + 360) % 360
      smoothedRef.current.set(vessel.id, smoothedHeading)

      // Freeze position + trail during zoom — vessel and lines stay static while
      // the camera animates, then snap to correct geo position at zoomend.
      if (!isMovingRef.current) {
        markersRef.current.get(vessel.id)?.setLatLng(position)
        polylinesRef.current.get(vessel.id)?.setLatLngs(trail)
      }

      // ── Icon rebuild (heading/mode changes — independent of zoom freeze) ──
      const prevIconHeading = headingsRef.current.get(vessel.id) ?? -999
      const prevMode = modesRef.current.get(vessel.id) ?? 'normal'
      if (Math.abs(smoothedHeading - prevIconHeading) >= 1 || prevMode !== routeMode) {
        const label = vessel.name.split(' ')[0]
        const icon = createVesselIcon(vessel.color, smoothedHeading, label, routeMode)
        const marker = markersRef.current.get(vessel.id)
        marker?.setIcon(icon)
        marker?.setZIndexOffset(routeMode === 'intercept' ? 220 : routeMode === 'support' ? 160 : 100)
        headingsRef.current.set(vessel.id, smoothedHeading)
        modesRef.current.set(vessel.id, routeMode)
      }
    })
  }, [getRouteMode, vesselStates])

  // This component owns no React-rendered DOM.
  return null
}
