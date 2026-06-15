import { LIGHTING } from '../../engine/constants'

export function Lighting() {
  return (
    <>
      <ambientLight color={LIGHTING.ambientColor} intensity={LIGHTING.ambientIntensity} />
      <directionalLight
        color={LIGHTING.directionalColor}
        intensity={LIGHTING.directionalIntensity}
        position={LIGHTING.directionalPosition}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight
        color={LIGHTING.hemisphereSky}
        groundColor={LIGHTING.hemisphereGround}
        intensity={LIGHTING.hemisphereIntensity}
      />
    </>
  )
}
