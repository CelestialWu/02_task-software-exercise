import { useSimulationStore } from '../../store/simulationStore'

function AnimatedNumber({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-pixel text-amber-200">{value}</span>
      <span className="text-xs text-amber-400/70 mt-1 font-sans">{label}</span>
    </div>
  )
}

export function HUDPanel() {
  const timestep = useSimulationStore(s => s.timestep)
  const queuingCount = useSimulationStore(s => s.queuingCount)
  const seatedCount = useSimulationStore(s => s.seatedCount)
  const totalLeft = useSimulationStore(s => s.totalLeft)
  const avgWaitTime = useSimulationStore(s => s.avgWaitTime)
  const speed = useSimulationStore(s => s.speed)

  return (
    <div className="bg-stone-900/80 backdrop-blur-md rounded-xl p-4 border border-amber-700/30 shadow-lg min-w-[180px]">
      <div className="grid grid-cols-2 gap-4">
        <AnimatedNumber value={timestep} label="Time" />
        <AnimatedNumber value={queuingCount} label="Queue" />
        <AnimatedNumber value={seatedCount} label="Seated" />
        <AnimatedNumber value={totalLeft} label="Left" />
      </div>
      <div className="mt-3 pt-3 border-t border-amber-700/20 flex justify-between text-xs text-amber-400/70 font-sans">
        <span>Wait: {avgWaitTime.toFixed(1)}min</span>
        <span>Speed: {speed}x</span>
      </div>
    </div>
  )
}
