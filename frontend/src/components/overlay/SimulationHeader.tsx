import { useSimulationStore } from '../../store/simulationStore'
import { Wifi, WifiOff, ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
}

export function SimulationHeader({ onBack }: Props) {
  const wsConnected = useSimulationStore(s => s.wsConnected)
  const timestep = useSimulationStore(s => s.timestep)

  return (
    <div className="bg-stone-900/85 backdrop-blur-md border-b border-amber-700/30 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-amber-700/20 hover:bg-amber-600/30 border border-amber-600/20
                     flex items-center justify-center text-amber-300 transition-all hover:scale-105"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm text-amber-200 font-medium tracking-wide">Cafeteria Simulator</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs">
          {wsConnected
            ? <Wifi size={14} className="text-green-400" />
            : <WifiOff size={14} className="text-red-400" />
          }
          <span className={wsConnected ? 'text-green-400/70' : 'text-red-400/70'}>
            {wsConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>

        {/* Timestep badge */}
        <div className="px-2 py-0.5 rounded-full bg-amber-700/20 border border-amber-600/20 text-xs text-amber-300 font-mono">
          T:{timestep}
        </div>
      </div>
    </div>
  )
}
