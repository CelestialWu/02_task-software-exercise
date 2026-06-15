import { SOFA_SEAT_DEPTH, SOFA_BACK_HEIGHT, COLORS } from '../../engine/constants'

interface Props {
  seatPositions: [number, number, number][]
  occupiedSeats: boolean[]
}

export function Sofa({ seatPositions, occupiedSeats }: Props) {
  if (seatPositions.length === 0) return null

  // Compute bounding box of all seat positions
  const xs = seatPositions.map(s => s[0])
  const zs = seatPositions.map(s => s[2])
  const minX = Math.min(...xs) - 0.4
  const maxX = Math.max(...xs) + 0.4
  const minZ = Math.min(...zs) - 0.4
  const maxZ = Math.max(...zs) + 0.4
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const spreadX = maxX - minX
  const spreadZ = maxZ - minZ

  return (
    <group>
      {/* Sofa base */}
      <mesh position={[cx, 0.18, cz]} receiveShadow castShadow>
        <boxGeometry args={[spreadX, 0.35, spreadZ]} />
        <meshStandardMaterial color="#E8A87C" roughness={0.85} />
      </mesh>

      {/* Back rest along one edge */}
      <mesh position={[cx - spreadX / 2 + 0.15, 0.55, cz]}>
        <boxGeometry args={[0.15, SOFA_BACK_HEIGHT, spreadZ]} />
        <meshStandardMaterial color={COLORS.wallTrim} roughness={0.7} />
      </mesh>

      {/* Seat cushion indicators */}
      {seatPositions.map(([sx, _, sz], i) => (
        <mesh key={`sofa-seat-${i}`} position={[sx, 0.37, sz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.45, 0.45]} />
          <meshBasicMaterial
            color={occupiedSeats[i] ? '#FF6B6B' : '#90EE90'}
            transparent
            opacity={0.4}
            side={2}
          />
        </mesh>
      ))}
    </group>
  )
}
