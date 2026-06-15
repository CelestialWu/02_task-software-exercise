import { useFrame } from '@react-three/fiber'
import { useSimulationStore } from '../store/simulationStore'

export function useAnimationLoop() {
  const isPlaying = useSimulationStore(s => s.isPlaying)
  const updateAnimations = useSimulationStore(s => s.updateAnimations)

  useFrame((_, delta) => {
    if (isPlaying) {
      updateAnimations(delta)
    }
  })
}
