import { EffectComposer, wrapEffect } from '@react-three/postprocessing'
import { CombinedWatercolorEffect } from './CombinedWatercolorEffect'

const Watercolor = wrapEffect(CombinedWatercolorEffect)

export function WatercolorPipeline() {
  return (
    <EffectComposer multisampling={0}>
      <Watercolor radius={2} intensity={0.6} edgeStrength={0.35} paperOpacity={0.1} />
    </EffectComposer>
  )
}
