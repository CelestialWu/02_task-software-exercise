import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

interface Props {
  floorWidth: number
  floorDepth: number
}

export function CameraController({ floorWidth, floorDepth }: Props) {
  const camera = useThree(s => s.camera)

  useEffect(() => {
    const pitch = Math.PI / 6
    const yaw = Math.PI / 4
    const dist = Math.max(floorWidth, floorDepth) * 0.85
    const cx = floorWidth / 2
    const cz = floorDepth / 2

    camera.position.set(
      cx + dist * Math.cos(pitch) * Math.sin(yaw),
      dist * Math.sin(pitch),
      cz + dist * Math.cos(pitch) * Math.cos(yaw),
    )
    camera.lookAt(cx, 0, cz)
  }, [floorWidth, floorDepth, camera])

  return (
    <OrbitControls
      target={[floorWidth / 2, 0, floorDepth / 2]}
      enableDamping
      dampingFactor={0.08}
      minDistance={Math.max(floorWidth, floorDepth) * 0.3}
      maxDistance={Math.max(floorWidth, floorDepth) * 2.5}
      maxPolarAngle={Math.PI / 2 + 0.3}
      minPolarAngle={0.1}
    />
  )
}
