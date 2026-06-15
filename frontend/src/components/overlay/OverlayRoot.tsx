import { ControlBar } from './ControlBar'
import { SimulationHeader } from './SimulationHeader'
import { StatPanels } from './StatPanels'

interface Props {
  onBack: () => void
}

export function OverlayRoot({ onBack }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 pointer-events-auto">
        <SimulationHeader onBack={onBack} />
      </div>

      {/* Expandable stat panels - right side */}
      <StatPanels />

      {/* Control bar - bottom center */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <ControlBar />
      </div>
    </div>
  )
}
