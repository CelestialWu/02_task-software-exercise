import { BAR_COUNTER_WIDTH, COLORS } from '../../engine/constants'

interface Props {
  counterStart: [number, number, number]
  counterEnd: [number, number, number]
  seatPositions: [number, number, number][]
  occupiedSeats: boolean[]
}

export function BarCounter({ counterStart, counterEnd, seatPositions, occupiedSeats }: Props) {
  const [sx, , sz] = counterStart
  const [, , ez] = counterEnd
  const length = ez - sz
  const cx = sx
  const cz = (sz + ez) / 2
  const counterHeight = 1.1

  return (
    <group>
      {/* Counter body */}
      <mesh position={[cx, counterHeight / 2, cz]} castShadow>
        <boxGeometry args={[BAR_COUNTER_WIDTH, counterHeight, length]} />
        <meshStandardMaterial color="#E8D5B7" roughness={0.6} />
      </mesh>

      {/* Counter top */}
      <mesh position={[cx, counterHeight + 0.03, cz]}>
        <boxGeometry args={[BAR_COUNTER_WIDTH + 0.15, 0.06, length + 0.1]} />
        <meshStandardMaterial color={COLORS.windowTop} roughness={0.5} />
      </mesh>

      {/* Stools */}
      {seatPositions.map(([sx, _, sz], i) => (
        <group key={`stool-${i}`} position={[sx, 0, sz]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.6, 12]} />
            <meshStandardMaterial color="#A07850" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.18, 0.12, 0.05, 16]} />
            <meshStandardMaterial color="#8B6914" roughness={0.6} />
          </mesh>
          {/* Occupied indicator */}
          <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.01, 16]} />
            <meshBasicMaterial color={occupiedSeats[i] ? '#FF6B6B' : '#90EE90'} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
