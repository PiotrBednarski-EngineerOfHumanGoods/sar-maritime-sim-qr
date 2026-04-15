import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DriftState } from '../../domain/types'

interface DriftLayerProps {
  visible: boolean
  driftState?: DriftState
}

interface DriftBundle {
  corridor: L.Polygon
  lineHalo: L.Polyline
  line: L.Polyline
  arrow: L.Polyline
}

function createBundle(map: L.Map): DriftBundle {
  return {
    corridor: L.polygon([], {
      color: '#fca5a5',
      weight: 1,
      opacity: 0.5,
      fillColor: '#ef4444',
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map),
    lineHalo: L.polyline([], {
      color: '#ffffff',
      weight: 10,
      opacity: 0.75,
      dashArray: '14 7',
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
    line: L.polyline([], {
      color: '#ef4444',
      weight: 4,
      opacity: 0.95,
      dashArray: '14 7',
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
    arrow: L.polyline([], {
      color: '#ef4444',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
  }
}

function removeBundle(bundle: DriftBundle | null) {
  bundle?.corridor.remove()
  bundle?.lineHalo.remove()
  bundle?.line.remove()
  bundle?.arrow.remove()
}

function updateBundle(bundle: DriftBundle, driftState: DriftState) {
  bundle.corridor.setLatLngs(driftState.corridor)
  bundle.lineHalo.setLatLngs(driftState.line)
  bundle.line.setLatLngs(driftState.line)
  bundle.arrow.setLatLngs(driftState.arrow)
}

export default function DriftLayer({ visible, driftState }: DriftLayerProps) {
  const map = useMap()
  const bundleRef   = useRef<DriftBundle | null>(null)
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
    if (!visible || !driftState) {
      removeBundle(bundleRef.current)
      bundleRef.current = null
      return
    }

    if (!bundleRef.current) {
      bundleRef.current = createBundle(map)
    }

    if (!isZoomingRef.current) {
      updateBundle(bundleRef.current, driftState)
    }
  }, [driftState, map, visible])

  useEffect(() => {
    return () => {
      removeBundle(bundleRef.current)
      bundleRef.current = null
    }
  }, [])

  return null
}
