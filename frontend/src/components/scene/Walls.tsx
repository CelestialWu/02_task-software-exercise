import { WALL_HEIGHT, WALL_THICKNESS, COLORS, FRONT_DOOR_WIDTH, FRONT_DOOR_GAP } from '../../engine/constants'
import * as THREE from 'three'

interface Props {
  width: number
  depth: number
}

function Wall({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
    </mesh>
  )
}

function WoodTrim({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={COLORS.wallTrim} roughness={0.6} />
    </mesh>
  )
}

export function Walls({ width, depth }: Props) {
  const hw = width / 2
  const hd = depth / 2
  const wh = WALL_HEIGHT / 2
  const doorWidth = FRONT_DOOR_WIDTH
  const doorGap = FRONT_DOOR_GAP
  const doorHeight = 3.5

  // Front wall segments around entrance and exit
  const entranceCenter = width / 2 - (doorGap + doorWidth) / 2
  const exitCenter = width / 2 + (doorGap + doorWidth) / 2
  const leftFrontWidth = Math.max(0, entranceCenter - doorWidth / 2)
  const middleFrontWidth = Math.max(0, exitCenter - entranceCenter - doorWidth)
  const rightFrontWidth = Math.max(0, width - (exitCenter + doorWidth / 2))

  return (
    <group>
      {/* Back wall */}
      <Wall size={[width, WALL_HEIGHT, WALL_THICKNESS]} position={[hw, wh, WALL_THICKNESS / 2]} />
      <WoodTrim
        size={[width, 0.15, WALL_THICKNESS + 0.05]}
        position={[hw, WALL_HEIGHT - 0.075, WALL_THICKNESS / 2]}
      />

      {/* Left wall */}
      <Wall size={[WALL_THICKNESS, WALL_HEIGHT, depth]} position={[WALL_THICKNESS / 2, wh, hd]} />
      <WoodTrim
        size={[WALL_THICKNESS + 0.05, 0.15, depth]}
        position={[WALL_THICKNESS / 2, WALL_HEIGHT - 0.075, hd]}
      />

      {/* Right wall */}
      <Wall size={[WALL_THICKNESS, WALL_HEIGHT, depth]} position={[width - WALL_THICKNESS / 2, wh, hd]} />
      <WoodTrim
        size={[WALL_THICKNESS + 0.05, 0.15, depth]}
        position={[width - WALL_THICKNESS / 2, WALL_HEIGHT - 0.075, hd]}
      />

      {/* Front wall - left segment */}
      {leftFrontWidth > 0 && (
        <Wall
          size={[leftFrontWidth, WALL_HEIGHT, WALL_THICKNESS]}
          position={[leftFrontWidth / 2, wh, depth - WALL_THICKNESS / 2]}
        />
      )}

      {/* Front wall - center segment between doors */}
      {middleFrontWidth > 0 && (
        <Wall
          size={[middleFrontWidth, WALL_HEIGHT, WALL_THICKNESS]}
          position={[entranceCenter + doorWidth / 2 + middleFrontWidth / 2, wh, depth - WALL_THICKNESS / 2]}
        />
      )}

      {/* Front wall - right segment */}
      {rightFrontWidth > 0 && (
        <Wall
          size={[rightFrontWidth, WALL_HEIGHT, WALL_THICKNESS]}
          position={[width - rightFrontWidth / 2, wh, depth - WALL_THICKNESS / 2]}
        />
      )}

      {/* Entrance opening marker */}
      <mesh position={[entranceCenter, doorHeight / 2, depth - WALL_THICKNESS / 2]}>
        <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
        <meshStandardMaterial color="#88CC88" roughness={0.8} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Exit opening marker */}
      <mesh position={[exitCenter, doorHeight / 2, depth - WALL_THICKNESS / 2]}>
        <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
        <meshStandardMaterial color="#CC8888" roughness={0.8} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
