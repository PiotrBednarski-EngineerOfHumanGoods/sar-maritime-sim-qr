import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import AISLayer from './AISLayer'
import BestFitVesselLayer from './BestFitVesselLayer'
import CameraController from './CameraController'
import DriftLayer from './DriftLayer'
import EnvironmentLayer from './EnvironmentLayer'
import MobAlertLayer from './MobAlertLayer'
import MobRecoveredLayer from './MobRecoveredLayer'
import RescueRouteLayer from './RescueRouteLayer'
import SearchPatternLayer from './SearchPatternLayer'
import type { EnvironmentLayerKey } from '../../data/mockEnvironment'
import type { DemoPhase } from '../../services/scenarioDirector'
import type {
  DriftState,
  RescueRoutePlan,
  ResponderSelection,
  SearchPatternPlan,
  VesselState,
} from '../../domain/types'

const MAP_CENTER: [number, number] = [57.0, 19.0]
const MAP_ZOOM = 7

interface MapSceneProps {
  time: number
  currentPhase: DemoPhase
  vesselStates: VesselState[]
  mobVisible: boolean
  mobPosition: [number, number]
  responderSelection?: ResponderSelection
  driftState?: DriftState
  rescueRoutePlans: RescueRoutePlan[]
  searchPattern?: SearchPatternPlan
  activeEnvironmentLayer: EnvironmentLayerKey | null
}

export default function MapScene({
  time,
  currentPhase,
  vesselStates,
  mobVisible,
  mobPosition,
  responderSelection,
  driftState,
  rescueRoutePlans,
  searchPattern,
  activeEnvironmentLayer,
}: MapSceneProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {/* Phase-driven camera choreography */}
      <CameraController
        currentPhase={currentPhase}
        vesselStates={vesselStates}
        responderSelection={responderSelection}
      />

      <EnvironmentLayer activeLayer={activeEnvironmentLayer} />

      {/* Vessel tracks + markers */}
      <AISLayer
        vesselStates={vesselStates}
        routePlans={rescueRoutePlans}
        time={time}
      />

      {/* Rescue route overlays */}
      <RescueRouteLayer
        visible={mobVisible}
        time={time}
        routePlans={rescueRoutePlans}
      />

      <SearchPatternLayer
        visible={mobVisible}
        time={time}
        pattern={searchPattern}
        currentPhaseId={currentPhase.id}
      />

      {/* MOB drift trace */}
      <DriftLayer visible={mobVisible} driftState={driftState} />

      {/* System-selected responder highlight */}
      <BestFitVesselLayer
        vesselStates={vesselStates}
        responderSelection={responderSelection}
      />

      {/* MOB alert marker — appears when timeline crosses MOB_EVENT_TIME */}
      <MobAlertLayer visible={mobVisible} position={mobPosition} currentPhaseId={currentPhase.id} />

      {/* MOB recovered — green pulsing ring at datum in final phase */}
      <MobRecoveredLayer
        visible={currentPhase.id === 'final' && searchPattern != null}
        position={searchPattern?.datum ?? mobPosition}
      />
    </MapContainer>
  )
}
