import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { SearchPatternPlan } from '../../domain/types'
import { getSearchPatternLegInfo } from '../../services/buildSearchPattern'
import './search-pattern.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PatternMode = 'preview' | 'active'

interface SearchPatternLayerProps {
  visible: boolean
  time: number
  pattern?: SearchPatternPlan
  currentPhaseId?: string
}

interface SearchBundle {
  mode: PatternMode
  datumRing: L.CircleMarker
  pathHalo: L.Polyline
  path: L.Polyline
  // Active-mode only — undefined in preview
  ghostPath?: L.Polyline    // full planned path at very low opacity (geometry reference)
  activeLegHalo?: L.Polyline
  activeLeg?: L.Polyline
  patternLabel?: L.Marker
}

// ---------------------------------------------------------------------------
// Mode derivation
// ---------------------------------------------------------------------------

/**
 * preview — reroute phase: vessel is approaching, pattern shown as a ghost
 *           so the audience understands where the vessel is heading.
 * active  — search/final: vessel is on-scene; pattern is the focal element.
 */
function deriveMode(phaseId: string | undefined): PatternMode {
  if (phaseId === 'search' || phaseId === 'final') return 'active'
  return 'preview'
}

// ---------------------------------------------------------------------------
// Label factory (active mode only)
// ---------------------------------------------------------------------------

function createPatternLabel(text: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: /* html */ `
      <div style="
        transform:translate(20px,12px);
        pointer-events:none;
      ">
        <div style="
          font-family:system-ui,-apple-system,sans-serif;
          font-size:7.5px;
          font-weight:700;
          letter-spacing:0.06em;
          text-transform:uppercase;
          color:#0c4a6e;
          text-shadow:
            0 0 3px rgba(255,255,255,1),
            0 0 7px rgba(255,255,255,0.9),
            0  1px 2px rgba(255,255,255,1),
            0 -1px 2px rgba(255,255,255,1);
          white-space:nowrap;
        ">Pattern: ${text}</div>
      </div>
    `,
  })
}

// ---------------------------------------------------------------------------
// Bundle factory
// ---------------------------------------------------------------------------

function createBundle(map: L.Map, mode: PatternMode): SearchBundle {
  if (mode === 'preview') {
    // Ghost / planned state: faint dashed outline of the future search box.
    // Shows "this is where we're heading" without competing with the route story.
    return {
      mode,
      datumRing: L.circleMarker([0, 0], {
        radius: 9,
        color: '#7dd3fc',
        weight: 1.5,
        opacity: 0.55,
        fillColor: '#bfdbfe',
        fillOpacity: 0.20,
        interactive: false,
      }).addTo(map),
      pathHalo: L.polyline([], {
        color: '#ffffff',
        weight: 5,
        opacity: 0.40,
        dashArray: '8 11',
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 0,
        interactive: false,
      }).addTo(map),
      path: L.polyline([], {
        color: '#7dd3fc',
        weight: 2,
        opacity: 0.52,
        dashArray: '8 11',
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 0,
        interactive: false,
      }).addTo(map),
    }
  }

  // Active state — bold, animated, dominant.
  // Ghost path added first (lowest z-order) so it renders behind everything else.

  // Ghost: full planned path at very low opacity — shows the complete search
  // geometry before the vessel has finished all legs, without competing with
  // the actively drawn portion.
  const ghostPath = L.polyline([], {
    color: '#0ea5e9',
    weight: 3.5,
    opacity: 0.18,
    dashArray: '4 10',
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0,
    interactive: false,
  }).addTo(map)

  const datumRing = L.circleMarker([0, 0], {
    radius: 16,
    color: '#0284c7',
    weight: 3,
    opacity: 1,
    fillColor: '#bae6fd',
    fillOpacity: 0.75,
    interactive: false,
    className: 'sp-datum-ring',
  }).addTo(map)

  const pathHalo = L.polyline([], {
    color: '#ffffff',
    weight: 14,
    opacity: 0.65,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0,
    interactive: false,
    className: 'sp-path',
  }).addTo(map)

  const path = L.polyline([], {
    color: '#0369a1',
    weight: 5,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0,
    interactive: false,
    className: 'sp-path',
  }).addTo(map)

  const activeLegHalo = L.polyline([], {
    color: '#fde68a',
    weight: 24,
    opacity: 0.28,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0,
    interactive: false,
  }).addTo(map)

  const activeLeg = L.polyline([], {
    color: '#d97706',
    weight: 7,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0,
    interactive: false,
  }).addTo(map)

  const patternLabel = L.marker([0, 0], {
    icon: createPatternLabel('Expanding Square'),
    zIndexOffset: 1700,
    interactive: false,
  }).addTo(map)

  return { mode, datumRing, pathHalo, path, ghostPath, activeLegHalo, activeLeg, patternLabel }
}

function removeBundle(bundle: SearchBundle | null) {
  if (!bundle) return
  bundle.ghostPath?.remove()
  bundle.datumRing.remove()
  bundle.pathHalo.remove()
  bundle.path.remove()
  bundle.activeLegHalo?.remove()
  bundle.activeLeg?.remove()
  bundle.patternLabel?.remove()
}

// ---------------------------------------------------------------------------
// Progressive path reveal (active mode only)
// ---------------------------------------------------------------------------

function getRevealedPath(
  pattern: SearchPatternPlan,
  time: number,
): [number, number][] {
  const pts: [number, number][] = []
  const wps = pattern.routeWaypoints

  for (let i = 0; i < wps.length; i++) {
    if (wps[i].t <= time) {
      pts.push([wps[i].lat, wps[i].lng])
    } else if (i > 0) {
      const prev = wps[i - 1]
      const t = (time - prev.t) / (wps[i].t - prev.t)
      pts.push([
        prev.lat + (wps[i].lat - prev.lat) * t,
        prev.lng + (wps[i].lng - prev.lng) * t,
      ])
      break
    } else {
      break
    }
  }

  return pts
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchPatternLayer({
  visible,
  time,
  pattern,
  currentPhaseId,
}: SearchPatternLayerProps) {
  const map         = useMap()
  const bundleRef   = useRef<SearchBundle | null>(null)
  const isZoomingRef = useRef(false)

  useEffect(() => {
    const onZoomStart = () => { isZoomingRef.current = true }
    const onZoomEnd   = () => { isZoomingRef.current = false }
    map.on('zoomstart', onZoomStart)
    map.on('zoomend',   onZoomEnd)
    return () => {
      map.off('zoomstart', onZoomStart)
      map.off('zoomend',   onZoomEnd)
    }
  }, [map])

  useEffect(() => {
    if (!visible || !pattern) {
      removeBundle(bundleRef.current)
      bundleRef.current = null
      return
    }

    const mode = deriveMode(currentPhaseId)

    // Recreate bundle when mode tier changes (preview → active transition)
    if (bundleRef.current && bundleRef.current.mode !== mode) {
      removeBundle(bundleRef.current)
      bundleRef.current = null
    }

    const bundle = bundleRef.current ?? createBundle(map, mode)
    if (!bundleRef.current) bundleRef.current = bundle

    if (mode === 'preview') {
      bundle.datumRing.setLatLng(pattern.datum)
      if (!isZoomingRef.current) {
        bundle.pathHalo.setLatLngs(pattern.patternPath)
        bundle.path.setLatLngs(pattern.patternPath)
      }
      return
    }

    // ── Active mode ──────────────────────────────────────────────────────
    const revealedPath = getRevealedPath(pattern, time)
    const legInfo      = getSearchPatternLegInfo(pattern, time)

    bundle.datumRing.setLatLng(pattern.datum)

    if (!isZoomingRef.current) {
      bundle.ghostPath?.setLatLngs(pattern.patternPath)
      bundle.pathHalo.setLatLngs(revealedPath)
      bundle.path.setLatLngs(revealedPath)

      if (legInfo && bundle.activeLeg && bundle.activeLegHalo) {
        const activeLeg: [number, number][] = [legInfo.from, legInfo.to]
        bundle.activeLegHalo.setLatLngs(activeLeg)
        bundle.activeLeg.setLatLngs(activeLeg)
      } else {
        bundle.activeLegHalo?.setLatLngs([])
        bundle.activeLeg?.setLatLngs([])
      }
    }

    if (bundle.patternLabel) {
      bundle.patternLabel.setLatLng(pattern.datum)
      bundle.patternLabel.setIcon(createPatternLabel(pattern.patternName))
      bundle.patternLabel.setOpacity(1)
    }
  }, [map, pattern, time, visible, currentPhaseId])

  useEffect(() => {
    const bundleStore = bundleRef
    return () => {
      removeBundle(bundleStore.current)
      bundleStore.current = null
    }
  }, [])

  return null
}
