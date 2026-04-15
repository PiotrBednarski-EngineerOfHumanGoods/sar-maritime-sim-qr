import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { RescueRoutePlan } from '../../domain/types'
import { interpolatePosition } from '../../utils/interpolate'

interface RescueRouteLayerProps {
  visible: boolean
  time: number
  routePlans: RescueRoutePlan[]
}

interface RouteBundle {
  originalRoute: L.Polyline
  interceptHalo: L.Polyline
  interceptRoute: L.Polyline
}

function createBundle(map: L.Map, plan: RescueRoutePlan): RouteBundle {
  const isPrimary = plan.role === 'primary'

  const targetOpacity = {
    originalRoute:  isPrimary ? 0.20 : 0.14,
    interceptHalo:  isPrimary ? 0.34 : 0.18,
    interceptRoute: isPrimary ? 0.96 : 0.52,
  }

  const bundle: RouteBundle = {
    originalRoute: L.polyline([], {
      color: '#94a3b8',
      weight: isPrimary ? 1.5 : 1,
      opacity: 0,
      dashArray: '5 10',
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
    interceptHalo: L.polyline([], {
      color: isPrimary ? '#bae6fd' : '#d1fae5',
      weight: isPrimary ? 11 : 8,
      opacity: 0,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
    interceptRoute: L.polyline([], {
      color: isPrimary ? '#0ea5e9' : '#10b981',
      weight: isPrimary ? 4.5 : 2.5,
      opacity: 0,
      dashArray: isPrimary ? '14 10' : '8 12',
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      interactive: false,
    }).addTo(map),
  }

  // Smooth fade-in over 900 ms using easeOutCubic
  const start = performance.now()
  const duration = isPrimary ? 900 : 600
  function fadeIn() {
    const t = Math.min(1, (performance.now() - start) / duration)
    const eased = 1 - (1 - t) ** 3   // easeOutCubic
    bundle.originalRoute.setStyle({ opacity: eased * targetOpacity.originalRoute })
    bundle.interceptHalo.setStyle({ opacity: eased * targetOpacity.interceptHalo })
    bundle.interceptRoute.setStyle({ opacity: eased * targetOpacity.interceptRoute })
    if (t < 1) requestAnimationFrame(fadeIn)
  }
  requestAnimationFrame(fadeIn)

  return bundle
}

function removeBundle(bundle: RouteBundle | null) {
  bundle?.originalRoute.remove()
  bundle?.interceptHalo.remove()
  bundle?.interceptRoute.remove()
}

function buildRemainingRoute(plan: RescueRoutePlan, time: number): [number, number][] {
  const currentPosition = interpolatePosition(plan.routeWaypoints, time)
  const futureWaypoints = plan.routeWaypoints
    .filter((waypoint) => waypoint.t > time && waypoint.t <= plan.arrivalAt)
    .map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number])

  return [currentPosition, ...futureWaypoints]
}

function updateBundle(
  bundle: RouteBundle,
  plan: RescueRoutePlan,
  time: number,
) {
  bundle.originalRoute.setLatLngs(plan.originalPath)
  const remainingRoute = buildRemainingRoute(plan, time)
  bundle.interceptHalo.setLatLngs(remainingRoute)
  bundle.interceptRoute.setLatLngs(remainingRoute)
}

export default function RescueRouteLayer({
  visible,
  time,
  routePlans,
}: RescueRouteLayerProps) {
  const map = useMap()
  const bundlesRef  = useRef<Map<string, RouteBundle>>(new Map())
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
    if (!visible) {
      bundlesRef.current.forEach((bundle) => removeBundle(bundle))
      bundlesRef.current.clear()
      return
    }

    const activeIds = new Set(routePlans.map((plan) => plan.vesselId))

    routePlans.forEach((plan) => {
      const existing = bundlesRef.current.get(plan.vesselId)
      const bundle = existing ?? createBundle(map, plan)
      if (!existing) {
        bundlesRef.current.set(plan.vesselId, bundle)
      }
      if (!isZoomingRef.current) {
        updateBundle(bundle, plan, time)
      }
    })

    bundlesRef.current.forEach((bundle, vesselId) => {
      if (!activeIds.has(vesselId)) {
        removeBundle(bundle)
        bundlesRef.current.delete(vesselId)
      }
    })
  }, [map, routePlans, time, visible])

  useEffect(() => {
    const bundles = bundlesRef.current

    return () => {
      bundles.forEach((bundle) => removeBundle(bundle))
      bundles.clear()
    }
  }, [])

  return null
}
