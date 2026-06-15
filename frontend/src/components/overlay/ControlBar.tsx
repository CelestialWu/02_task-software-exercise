import { useSimulationStore } from '../../store/simulationStore'
import { sendStep } from '../../lib/wsManager'
import { Play, Pause, ChevronRight, Square } from 'lucide-react'

const SPEEDS = [0.5, 0.8, 1, 2, 4, 8] as const

export function ControlBar() {
  const isPlaying = useSimulationStore(s => s.isPlaying)
  const speed = useSimulationStore(s => s.speed)
  const setIsPlaying = useSimulationStore(s => s.setIsPlaying)
  const setSpeed = useSimulationStore(s => s.setSpeed)
  const setShowEndDialog = useSimulationStore(s => s.setShowEndDialog)

  const handleStop = () => {
    setIsPlaying(false)
    setShowEndDialog(true)
  }

  return (
    <div className="bg-stone-900/90 backdrop-blur-md border-t border-amber-700/30 px-4 py-3 flex items-center justify-center gap-3">
      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 rounded-lg bg-amber-700/40 hover:bg-amber-600/50 border border-amber-600/30
                   flex items-center justify-center text-amber-200 transition-all hover:scale-105 active:scale-95"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Step */}
      <button
        onClick={() => sendStep()}
        disabled={isPlaying}
        className="w-10 h-10 rounded-lg bg-amber-700/20 hover:bg-amber-600/30 border border-amber-600/20
                   flex items-center justify-center text-amber-300 transition-all hover:scale-105 active:scale-95
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-amber-700/30 mx-1" />

      {/* Speed selector */}
      {SPEEDS.map(s => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all
            ${s === speed
              ? 'bg-amber-600/50 text-amber-100 border border-amber-500/40 shadow-sm'
              : 'bg-amber-700/10 text-amber-400/60 border border-transparent hover:bg-amber-600/20 hover:text-amber-300'
            }`}
        >
          {s}x
        </button>
      ))}

      {/* Stop */}
      <button
        onClick={handleStop}
        className="w-10 h-10 rounded-lg bg-red-900/20 hover:bg-red-800/30 border border-red-700/20
                   flex items-center justify-center text-red-400/60 hover:text-red-300 transition-all ml-2"
      >
        <Square size={16} />
      </button>
    </div>
  )
}
