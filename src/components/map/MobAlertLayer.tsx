import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { createMobIcon } from './MobAlertMarker'
import type { MobAlertIntensity } from './MobAlertMarker'
import type { DemoPhaseId } from '../../services/scenarioDirector'

interface MobAlertLayerProps {
  visible: boolean
  position: [number, number]
  currentPhaseId: DemoPhaseId
}

type MobState = MobAlertIntensity | 'found'

function getMobState(phaseId: DemoPhaseId): MobState {
  if (phaseId === 'mob-alert' || phaseId === 'responder') return 'full'
  if (phaseId === 'drift'     || phaseId === 'reroute')   return 'reduced'
  if (phaseId === 'search')                               return 'quiet'
  return 'found'   // final — marker removed (person recovered)
}

/**
 * MobAlertLayer — manages a single MOB marker whose visual intensity
 * degrades as the scenario progresses, then disappears at recovery.
 *
 * Phase lifecycle:
 *   full     (mob-alert, responder) — 4 rings, pulsing core, "MOB ALERT" label
 *   reduced  (drift, reroute)       — 2 slow rings, smaller core, no label
 *   quiet    (search)               — static small dot, no rings, no label
 *   found    (final)                — marker removed from map (person recovered)
 */
export default function MobAlertLayer({ visible, position, currentPhaseId }: MobAlertLayerProps) {
  const map          = useMap()
  const markerRef    = useRef<L.Marker | null>(null)
  const stateRef     = useRef<MobState | null>(null)

  useEffect(() => {
    const mobState = getMobState(currentPhaseId)

    if (!visible || mobState === 'found') {
      // Remove marker — either scenario hasn't reached MOB phase, or MOB was found
      markerRef.current?.remove()
      markerRef.current = null
      stateRef.current  = null
      return
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(position, {
        icon:         createMobIcon(mobState),
        zIndexOffset: 2000,
        interactive:  false,
      }).addTo(map)
      stateRef.current = mobState
      return
    }

    if (stateRef.current !== mobState) {
      markerRef.current.setIcon(createMobIcon(mobState))
      stateRef.current = mobState
    }
  }, [visible, map, position, currentPhaseId])

  useEffect(() => {
    return () => {
      markerRef.current?.remove()
    }
  }, [])

  return null
}
