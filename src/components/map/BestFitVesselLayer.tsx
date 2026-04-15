import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ResponderSelection, VesselState } from '../../domain/types'

interface BestFitVesselLayerProps {
  vesselStates: VesselState[]
  responderSelection?: ResponderSelection
}

interface HighlightBundle {
  trackGlow: L.Polyline
  track: L.Polyline
  ringGlow: L.CircleMarker
  ring: L.CircleMarker
  label?: L.Marker
}

function createPrimaryLabel(_name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: /* html */ `
      <div style="
        transform:translate(16px,-34px);
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
        ">Primary responder</div>
      </div>
    `,
  })
}

function createBundle(
  map: L.Map,
  variant: 'primary' | 'secondary',
  label?: string,
): HighlightBundle {
  const isPrimary = variant === 'primary'

  const trackGlow = L.polyline([], {
    color: isPrimary ? '#7dd3fc' : '#cbd5e1',
    weight: isPrimary ? 16 : 7,
    opacity: isPrimary ? 0.30 : 0.12,
    lineCap: 'round',
    lineJoin: 'round',
    interactive: false,
  }).addTo(map)

  const track = L.polyline([], {
    color: isPrimary ? '#0284c7' : '#64748b',
    weight: isPrimary ? 5.5 : 2.5,
    opacity: isPrimary ? 1 : 0.55,
    dashArray: isPrimary ? undefined : '10 10',
    lineCap: 'round',
    lineJoin: 'round',
    interactive: false,
  }).addTo(map)

  const ringGlow = L.circleMarker([0, 0], {
    radius: isPrimary ? 24 : 16,
    color: isPrimary ? '#38bdf8' : '#94a3b8',
    weight: isPrimary ? 14 : 7,
    opacity: isPrimary ? 0.26 : 0.10,
    fillOpacity: 0,
    interactive: false,
  }).addTo(map)

  const ring = L.circleMarker([0, 0], {
    radius: isPrimary ? 17 : 12,
    color: isPrimary ? '#0284c7' : '#64748b',
    weight: isPrimary ? 3.5 : 1.5,
    opacity: isPrimary ? 1 : 0.50,
    fillOpacity: 0,
    interactive: false,
  }).addTo(map)

  const bundle: HighlightBundle = {
    trackGlow,
    track,
    ringGlow,
    ring,
  }

  if (isPrimary && label) {
    bundle.label = L.marker([0, 0], {
      icon: createPrimaryLabel(label),
      zIndexOffset: 1600,
      interactive: false,
    }).addTo(map)
  }

  return bundle
}

function removeBundle(bundle: HighlightBundle | null) {
  bundle?.trackGlow.remove()
  bundle?.track.remove()
  bundle?.ringGlow.remove()
  bundle?.ring.remove()
  bundle?.label?.remove()
}

function updateBundle(bundle: HighlightBundle, state: VesselState) {
  bundle.trackGlow.setLatLngs(state.trail)
  bundle.track.setLatLngs(state.trail)
  bundle.ringGlow.setLatLng(state.position)
  bundle.ring.setLatLng(state.position)
  bundle.label?.setLatLng(state.position)
}

export default function BestFitVesselLayer({
  vesselStates,
  responderSelection,
}: BestFitVesselLayerProps) {
  const map = useMap()
  const primaryRef   = useRef<HighlightBundle | null>(null)
  const secondaryRef = useRef<HighlightBundle | null>(null)
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
    if (!responderSelection) {
      removeBundle(primaryRef.current)
      removeBundle(secondaryRef.current)
      primaryRef.current = null
      secondaryRef.current = null
      return
    }

    const primaryState = vesselStates.find(
      ({ vessel }) => vessel.id === responderSelection.primary.vessel.id,
    )
    const secondaryState = responderSelection.secondary
      ? vesselStates.find(({ vessel }) => vessel.id === responderSelection.secondary?.vessel.id)
      : undefined

    if (primaryState) {
      if (!primaryRef.current) {
        // Always position on first creation — ring must never sit at [0,0]
        primaryRef.current = createBundle(map, 'primary', responderSelection.primary.vessel.name)
        updateBundle(primaryRef.current, primaryState)
      } else if (!isZoomingRef.current) {
        updateBundle(primaryRef.current, primaryState)
      }
    }

    if (secondaryState) {
      if (!secondaryRef.current) {
        secondaryRef.current = createBundle(map, 'secondary')
        updateBundle(secondaryRef.current, secondaryState)
      } else if (!isZoomingRef.current) {
        updateBundle(secondaryRef.current, secondaryState)
      }
    } else if (secondaryRef.current) {
      removeBundle(secondaryRef.current)
      secondaryRef.current = null
    }
  }, [map, responderSelection, vesselStates])

  useEffect(() => {
    return () => {
      removeBundle(primaryRef.current)
      removeBundle(secondaryRef.current)
      primaryRef.current = null
      secondaryRef.current = null
    }
  }, [])

  return null
}
