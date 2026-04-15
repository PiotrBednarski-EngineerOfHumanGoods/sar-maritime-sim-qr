/**
 * MobAlertMarker — icon factory for the MOB Leaflet marker.
 *
 * Importing this module injects mob.css into the page globally,
 * which is required for the CSS animations to work inside a divIcon.
 */
import './mob.css'
import L from 'leaflet'

export type MobAlertIntensity = 'full' | 'reduced' | 'quiet'

/**
 * Build the Leaflet divIcon for the MOB alert marker.
 *
 * Uses iconSize [0, 0] / iconAnchor [0, 0] so the marker pin sits
 * exactly at the incident's geographic coordinate.  Every child
 * element centres itself with `translate(-50%, -50%)`, expanding
 * visually in all directions from that pinpoint.
 *
 * intensity:
 *   full    — 4 rings, pulsing core, "MOB ALERT" label (mob-alert + responder phases)
 *   reduced — 2 slower rings, smaller quiet core, no label (drift + reroute phases)
 *   quiet   — static small dot, no rings, no label (search + final phases)
 */
export function createMobIcon(intensity: MobAlertIntensity = 'full'): L.DivIcon {
  let html: string

  if (intensity === 'full') {
    html = /* html */ `
      <div class="mob-marker" aria-label="MOB Alert">
        <div class="mob-ring"></div>
        <div class="mob-ring"></div>
        <div class="mob-ring"></div>
        <div class="mob-ring"></div>
        <div class="mob-core">!</div>
        <div class="mob-label">MOB ALERT</div>
      </div>
    `
  } else if (intensity === 'reduced') {
    // Two slow rings — still visible but calm; no label
    html = /* html */ `
      <div class="mob-marker" aria-label="MOB position">
        <div class="mob-ring" style="animation-duration:2.8s;animation-delay:0s;border-color:rgba(239,68,68,0.55)"></div>
        <div class="mob-ring" style="animation-duration:2.8s;animation-delay:1.4s;border-color:rgba(239,68,68,0.32)"></div>
        <div class="mob-core" style="width:20px;height:20px;font-size:0;box-shadow:0 0 0 1.5px rgba(239,68,68,0.4),0 0 12px 3px rgba(239,68,68,0.25);"></div>
      </div>
    `
  } else {
    // Quiet: small static red dot — marks the location without competing with the search story
    html = /* html */ `
      <div class="mob-marker" aria-label="MOB position">
        <div style="
          position:absolute;
          width:12px;
          height:12px;
          border-radius:50%;
          background:#ef4444;
          opacity:0.50;
          transform:translate(-50%,-50%);
          border:2px solid rgba(255,255,255,0.80);
          box-shadow:0 0 6px rgba(239,68,68,0.30);
          pointer-events:none;
        "></div>
      </div>
    `
  }

  return L.divIcon({
    className: '',
    iconSize:   [0, 0],
    iconAnchor: [0, 0],
    html,
  })
}
