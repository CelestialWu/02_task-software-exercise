import { useFrame } from '@react-three/fiber'
import { useSimulationStore } from '../store/simulationStore'

export function useAnimationLoop() {
  const isPlaying = useSimulationStore(s => s.isPlaying) //是否播放中
  const updateAnimations = useSimulationStore(s => s.updateAnimations) //插值函数

  useFrame((_, delta) => {
    if (isPlaying) {
      updateAnimations(delta)
    }
  })
}
