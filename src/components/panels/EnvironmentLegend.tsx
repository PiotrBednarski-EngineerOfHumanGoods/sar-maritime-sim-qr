import './EnvironmentPanels.css'
import {
  ENVIRONMENT_LAYER_META,
  type EnvironmentLayerKey,
} from '../../data/mockEnvironment'

interface EnvironmentLegendProps {
  activeLayer: EnvironmentLayerKey | null
}

export default function EnvironmentLegend({ activeLayer }: EnvironmentLegendProps) {
  if (!activeLayer) return null

  const meta = ENVIRONMENT_LAYER_META[activeLayer]

  return (
    <section className="environment-panel">
      <div className="environment-panel-header">
        <LegendIcon />
        <span className="environment-panel-title">Legend</span>
      </div>

      <div className="environment-panel-body">
        <div className="environment-legend-heading">
          <span className="environment-legend-title">{meta.legendTitle}</span>
          <span className="environment-legend-unit">{meta.legendUnit}</span>
        </div>

        <div className="environment-legend-scale">
          {meta.legendStops.map((stop) => (
            <div key={stop.label} className="environment-legend-stop">
              <span
                className="environment-legend-swatch"
                style={{ background: stop.color }}
              />
              <span className="environment-legend-label">{stop.label}</span>
            </div>
          ))}
        </div>

        <p className="environment-legend-description">{meta.description}</p>
      </div>
    </section>
  )
}

function LegendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16" />
      <path d="M4 12h16" />
      <path d="M4 5h16" />
    </svg>
  )
}
