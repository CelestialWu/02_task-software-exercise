import { TABLE_HEIGHT, TABLE_DIMENSIONS, TABLE_COLORS } from '../../engine/constants'
import type { SeatType } from '../../lib/types'

interface Props {
  position: [number, number, number]
  type: SeatType
  id: number
  occupiedSeats: boolean[]
}

export function Table({ position, type, occupiedSeats }: Props) {
  const dims = TABLE_DIMENSIONS[type]
  const color = TABLE_COLORS[type]
  const [x, y, z] = position

  const tw = dims.width
  const td = dims.depth
  const legHeight = TABLE_HEIGHT - 0.06
  const legOffset = 0.08

  const seats: [number, number, number][] = []
  const hw = tw / 2
  const hd = td / 2
  const offset = 0.35

  // Calculate local seat positions (relative to the table group)
  for (let side = 0; side < dims.seatsPerSide.length; side++) {
    const count = dims.seatsPerSide[side]
    if (count === 0) continue
    const zDir = side === 0 ? 1 : -1
    const seatZ = zDir * (hd + offset)
    const span = (count - 1) * 0.55
    const startX = -span / 2
    for (let s = 0; s < count; s++) {
      seats.push([startX + s * 0.55, 0.02, seatZ])
    }
  }

  return (
    <group position={[x, y, z]}>
      {/* Table legs */}
      {[[-hw + legOffset, 0, -hd + legOffset], [hw - legOffset, 0, -hd + legOffset],
        [-hw + legOffset, 0, hd - legOffset], [hw - legOffset, 0, hd - legOffset]
      ].map(([lx, ly, lz], i) => (
        <mesh key={`leg-${i}`} position={[lx, legHeight / 2, lz]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, legHeight, 8]} />
          <meshStandardMaterial color="#8B6914" roughness={0.7} />
        </mesh>
      ))}

      {/* Table top */}
      <mesh position={[0, TABLE_HEIGHT, 0]} castShadow>
        <boxGeometry args={[tw + 0.2, 0.12, td + 0.2]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Seat indicators */}
      {seats.map(([sx, sy, sz], i) => {
        const occupied = occupiedSeats[i] ?? false
        return (
          <mesh key={`seat-${i}`} position={[sx, 0.01, sz]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshBasicMaterial
              color={occupied ? '#FF6B6B' : '#90EE90'}
              transparent
              opacity={0.5}
            />
          </mesh>
        )
      })}
    </group>
  )
}
