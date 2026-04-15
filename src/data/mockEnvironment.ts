export type EnvironmentLayerKey = 'wind' | 'waves' | 'sst'

export interface EnvironmentLegendStop {
  color: string
  label: string
}

export interface WindVector {
  lat: number
  lng: number
  heading: number
  speed: number
}

// Bounds covering the Baltic scenario area: 54.5–60°N, 14–24°E
// Replaces the old North Sea bounds [51.9,1.0]–[58.5,7.7].
export const ENVIRONMENT_BOUNDS: [[number, number], [number, number]] = [
  [54.5, 14.0],
  [60.0, 24.0],
]

// Wind vectors relocated from North Sea to Baltic.
// 4×4 grid roughly covering 55.5–59°N, 15–23°E.
// Headings: predominantly SE (120–150°) — westerly Baltic wind pattern.
export const WIND_VECTORS: WindVector[] = [
  // Northern row (~58.8°N)
  { lat: 58.8, lng: 16.5, heading: 132, speed: 17 },
  { lat: 58.8, lng: 18.8, heading: 138, speed: 19 },
  { lat: 58.8, lng: 21.0, heading: 145, speed: 16 },
  { lat: 58.8, lng: 23.0, heading: 130, speed: 15 },
  // Upper-middle row (~57.8°N)
  { lat: 57.8, lng: 15.8, heading: 124, speed: 16 },
  { lat: 57.8, lng: 17.8, heading: 131, speed: 20 },
  { lat: 57.8, lng: 20.0, heading: 140, speed: 21 },
  { lat: 57.8, lng: 22.2, heading: 148, speed: 18 },
  // Lower-middle row (~56.8°N)
  { lat: 56.8, lng: 15.3, heading: 118, speed: 15 },
  { lat: 56.8, lng: 17.2, heading: 128, speed: 17 },
  { lat: 56.8, lng: 19.2, heading: 136, speed: 20 },
  { lat: 56.8, lng: 21.2, heading: 144, speed: 19 },
  // Southern row (~55.8°N)
  { lat: 55.8, lng: 15.5, heading: 116, speed: 14 },
  { lat: 55.8, lng: 17.2, heading: 124, speed: 16 },
  { lat: 55.8, lng: 19.0, heading: 133, speed: 17 },
  { lat: 55.8, lng: 20.8, heading: 142, speed: 16 },
]

export const ENVIRONMENT_LAYER_META: Record<
  EnvironmentLayerKey,
  {
    label: string
    shortLabel: string
    description: string
    accent: string
    legendTitle: string
    legendUnit: string
    legendStops: EnvironmentLegendStop[]
  }
> = {
  wind: {
    label: 'Wind',
    shortLabel: 'Wind',
    description: 'Directional field · stylized westerly flow',
    accent: '#0ea5e9',
    legendTitle: 'Surface wind',
    legendUnit: 'kt',
    legendStops: [
      { color: '#dbeafe', label: '10' },
      { color: '#93c5fd', label: '15' },
      { color: '#38bdf8', label: '20' },
      { color: '#0284c7', label: '25+' },
    ],
  },
  waves: {
    label: 'Wave Height',
    shortLabel: 'Waves',
    description: 'Soft contour wash · significant wave height',
    accent: '#3b82f6',
    legendTitle: 'Wave height',
    legendUnit: 'm',
    legendStops: [
      { color: '#eff6ff', label: '0.8' },
      { color: '#bfdbfe', label: '1.4' },
      { color: '#60a5fa', label: '2.0' },
      { color: '#1d4ed8', label: '2.8+' },
    ],
  },
  sst: {
    label: 'Sea Temp',
    shortLabel: 'SST',
    description: 'Sea surface temperature gradient',
    accent: '#14b8a6',
    legendTitle: 'Sea surface temp',
    legendUnit: '°C',
    legendStops: [
      { color: '#0f766e', label: '7' },
      { color: '#14b8a6', label: '9' },
      { color: '#99f6e4', label: '11' },
      { color: '#fde68a', label: '13+' },
    ],
  },
}
