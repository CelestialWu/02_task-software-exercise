import { COLORS } from '../../engine/constants'
import { useRef } from 'react'
import * as THREE from 'three'

interface Props {
  width: number
  depth: number
}

export function Floor({ width, depth }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Generate procedural wood-plank texture
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = COLORS.floor
  ctx.fillRect(0, 0, 512, 512)

  // Draw plank lines
  for (let i = 0; i < 32; i++) {
    const y = i * 16
    ctx.strokeStyle = COLORS.floorHighlight
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()

    // Subtle vertical joints
    for (let j = 0; j < 8; j++) {
      const x = j * 64 + (i % 3) * 20
      ctx.strokeStyle = '#B8956A'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 16)
      ctx.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(width / 4, depth / 4)

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[width / 2, 0, depth / 2]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.8}
        metalness={0.05}
        color={COLORS.floor}
      />
    </mesh>
  )
}
