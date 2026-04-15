import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import './mob.css'

interface MobRecoveredLayerProps {
  visible: boolean
  position: [number, number]
}

function createRecoveredIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    html: /* html */ `
      <div class="mob-marker" aria-label="MOB Recovered">
        <div class="mob-found-ring"></div>
        <div class="mob-found-ring"></div>
        <div class="mob-found-ring"></div>
        <div class="mob-found-core">✓</div>
        <div class="mob-found-label">Person Recovered</div>
      </div>
    `,
  })
}

export default function MobRecoveredLayer({ visible, position }: MobRecoveredLayerProps) {
  const map       = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!visible) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(position, {
        icon:         createRecoveredIcon(),
        zIndexOffset: 2500,
        interactive:  false,
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(position)
    }
  }, [visible, map, position])

  useEffect(() => {
    return () => {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [])

  return null
}
