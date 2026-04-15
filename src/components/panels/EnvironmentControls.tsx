import './EnvironmentPanels.css'
import {
  ENVIRONMENT_LAYER_META,
  type EnvironmentLayerKey,
} from '../../data/mockEnvironment'

interface EnvironmentControlsProps {
  activeLayer: EnvironmentLayerKey | null
  onToggle: (layer: EnvironmentLayerKey) => void
}

const LAYER_ORDER: EnvironmentLayerKey[] = ['wind', 'waves', 'sst']

export default function EnvironmentControls({
  activeLayer,
  onToggle,
}: EnvironmentControlsProps) {
  return (
    <div className="env-toggles">
      {LAYER_ORDER.map((layer) => {
        const meta = ENVIRONMENT_LAYER_META[layer]
        const active = layer === activeLayer

        return (
          <button
            key={layer}
            type="button"
            className={`env-toggle-btn${active ? ' env-toggle-btn--active' : ''}`}
            onClick={() => onToggle(layer)}
            title={meta.shortLabel}
            style={active ? { color: meta.accent } : undefined}
          >
            <LayerGlyph layer={layer} />
          </button>
        )
      })}
    </div>
  )
}

function LayerGlyph({ layer }: { layer: EnvironmentLayerKey }) {
  if (layer === 'wind') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 7h7" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  if (layer === 'waves') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 11c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sst-g" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="7" stroke="url(#sst-g)" strokeWidth="2" />
      <path d="M12 7v10M7 12h10" stroke="url(#sst-g)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
