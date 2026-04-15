import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ENVIRONMENT_BOUNDS,
  WIND_VECTORS,
  type EnvironmentLayerKey,
} from '../../data/mockEnvironment'

interface EnvironmentLayerProps {
  activeLayer: EnvironmentLayerKey | null
}

const ENVIRONMENT_PANE = 'environment-pane'

function createWindIcon(heading: number, speed: number): L.DivIcon {
  const arrowLength = 18 + ((speed - 12) * 0.9)

  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: /* html */ `
      <div style="
        width:38px;
        height:38px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform:rotate(${heading}deg);
        opacity:${Math.min(0.9, 0.58 + (speed - 10) * 0.02)};
        pointer-events:none;
      ">
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 19 H${arrowLength}" stroke="#0ea5e9" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M${arrowLength - 5} 14 L${arrowLength + 2} 19 L${arrowLength - 5} 24" stroke="#0ea5e9" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 14 H${Math.max(12, arrowLength - 8)}" stroke="rgba(14,165,233,0.26)" stroke-width="6" stroke-linecap="round"/>
        </svg>
      </div>
    `,
  })
}

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function createWaveOverlay(): L.ImageOverlay {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720">
      <defs>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <radialGradient id="waveA" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(59,130,246,0.42)" />
          <stop offset="100%" stop-color="rgba(59,130,246,0)" />
        </radialGradient>
        <radialGradient id="waveB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(14,165,233,0.30)" />
          <stop offset="100%" stop-color="rgba(14,165,233,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" />
      <g filter="url(#blur)">
        <ellipse cx="320" cy="200" rx="240" ry="170" fill="url(#waveA)" />
        <ellipse cx="660" cy="280" rx="280" ry="210" fill="url(#waveB)" />
        <ellipse cx="510" cy="520" rx="250" ry="170" fill="url(#waveA)" />
      </g>
      <g fill="none" stroke="rgba(255,255,255,0.78)" stroke-width="3">
        <path d="M130 190c110-70 240-60 360 0s220 60 320-5" />
        <path d="M100 255c120-66 255-55 370 8s220 58 340-10" />
        <path d="M170 340c105-58 228-49 336 9s216 58 314 0" />
        <path d="M240 430c96-46 196-36 284 10s177 47 271 4" />
        <path d="M308 510c86-34 166-27 242 12s146 38 224 5" />
      </g>
    </svg>
  `

  return L.imageOverlay(svgUrl(svg), ENVIRONMENT_BOUNDS, {
    opacity: 0.9,
    interactive: false,
    pane: ENVIRONMENT_PANE,
  })
}

function createSstOverlay(): L.ImageOverlay {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720">
      <defs>
        <linearGradient id="sstBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(15,118,110,0.34)" />
          <stop offset="46%" stop-color="rgba(45,212,191,0.18)" />
          <stop offset="72%" stop-color="rgba(153,246,228,0.14)" />
          <stop offset="100%" stop-color="rgba(253,230,138,0.34)" />
        </linearGradient>
        <filter id="sstBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#sstBase)" />
      <g filter="url(#sstBlur)">
        <ellipse cx="260" cy="150" rx="220" ry="150" fill="rgba(15,118,110,0.20)" />
        <ellipse cx="520" cy="360" rx="260" ry="180" fill="rgba(45,212,191,0.16)" />
        <ellipse cx="810" cy="560" rx="230" ry="170" fill="rgba(253,230,138,0.24)" />
      </g>
      <g stroke="rgba(255,255,255,0.35)" stroke-width="2" fill="none">
        <path d="M120 130c145 56 278 74 404 45 111-25 203-18 355 32" />
        <path d="M96 260c164 54 290 65 418 34 117-28 220-18 356 38" />
        <path d="M140 405c170 39 288 36 390 9 129-35 228-29 340 19" />
        <path d="M232 555c124 20 218 18 312-9 111-32 192-30 280-4" />
      </g>
    </svg>
  `

  return L.imageOverlay(svgUrl(svg), ENVIRONMENT_BOUNDS, {
    opacity: 0.82,
    interactive: false,
    pane: ENVIRONMENT_PANE,
  })
}

function createWindLayer(): L.LayerGroup {
  const layerGroup = L.layerGroup()

  WIND_VECTORS.forEach((vector) => {
    L.marker([vector.lat, vector.lng], {
      icon: createWindIcon(vector.heading, vector.speed),
      interactive: false,
      pane: ENVIRONMENT_PANE,
      zIndexOffset: -100,
    }).addTo(layerGroup)
  })

  return layerGroup
}

function buildLayer(activeLayer: EnvironmentLayerKey): L.Layer {
  if (activeLayer === 'wind') return createWindLayer()
  if (activeLayer === 'waves') return createWaveOverlay()
  return createSstOverlay()
}

export default function EnvironmentLayer({ activeLayer }: EnvironmentLayerProps) {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    const pane = map.getPane(ENVIRONMENT_PANE) ?? map.createPane(ENVIRONMENT_PANE)
    pane.style.zIndex = '330'
    pane.style.pointerEvents = 'none'
  }, [map])

  useEffect(() => {
    layerRef.current?.remove()
    layerRef.current = null

    if (!activeLayer) return

    const layer = buildLayer(activeLayer)
    layer.addTo(map)
    layerRef.current = layer
  }, [activeLayer, map])

  useEffect(() => {
    return () => {
      layerRef.current?.remove()
      layerRef.current = null
    }
  }, [])

  return null
}
