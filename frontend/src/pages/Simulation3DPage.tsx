import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { CafeteriaScene } from '../components/scene/CafeteriaScene'
import { WatercolorPipeline } from '../components/postprocessing/WatercolorPipeline'
import { OverlayRoot } from '../components/overlay/OverlayRoot'
import { SimulationEndDialog } from '../components/overlay/SimulationEndDialog'
import { useAnimationLoop } from '../hooks/useAnimationFrame'
import { useSimulationWebSocket } from '../hooks/useSimulationWebSocket'
import { useSimulationStore } from '../store/simulationStore'

function SceneWithAnimation() {
  useAnimationLoop()
  return (
    <>
      <CafeteriaScene />
      <WatercolorPipeline />
    </>
  )
}

interface Props {
  onBack: () => void
}

export function Simulation3DPage({ onBack }: Props) {
  const layoutReady = useSimulationStore(s => s.layoutReady)
  const simId = useSimulationStore(s => s.simId)

  useSimulationWebSocket(simId)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#3B2F2F' }}>
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          outputColorSpace: 'srgb',
          stencil: false,
          depth: true,
        }}
        camera={{ position: [15, 12, 20], fov: 45, near: 0.1, far: 100 }}
      >
        <Suspense fallback={null}>
          {layoutReady && <SceneWithAnimation />}
        </Suspense>
      </Canvas>

      {/* Loading indicator */}
      {!layoutReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
          <div className="text-amber-200 text-lg animate-pulse">
            正在准备食堂场景...
          </div>
        </div>
      )}

      <OverlayRoot onBack={onBack} />

      {/* Simulation end dialog */}
      <SimulationEndDialog onBack={onBack} />
    </div>
  )
}
