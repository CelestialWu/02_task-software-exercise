import { Text } from '@react-three/drei'
import { WINDOW_WIDTH, WINDOW_DEPTH, WINDOW_HEIGHT, WINDOW_AWNING_DEPTH, COLORS } from '../../engine/constants'
import * as THREE from 'three'

interface Props {
  position: [number, number, number]
  id: number
  isOpen: boolean
  isActivating: boolean
  queueLength: number
}

export function Window({ position, id, isOpen, isActivating }: Props) {
  const [x, y, z] = position
  const hh = WINDOW_HEIGHT / 2
  const hd = WINDOW_DEPTH / 2

  const opacity = isActivating ? 0.35 : 1.0
  const indicatorColor = isActivating ? '#FFD93D' : (isOpen ? '#90EE90' : '#FF6B6B')

  return (
    <group position={[x, y, z]}>
      {/* Counter body */}
      <mesh position={[0, hh, 0]} castShadow>
        <boxGeometry args={[WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_DEPTH]} />
        <meshStandardMaterial color={COLORS.windowCounter} roughness={0.6} transparent opacity={opacity} />
      </mesh>

      {/* Counter top */}
      <mesh position={[0, WINDOW_HEIGHT + 0.04, hd * 0.2]} castShadow>
        <boxGeometry args={[WINDOW_WIDTH + 0.15, 0.08, WINDOW_DEPTH + 0.2]} />
        <meshStandardMaterial color={COLORS.windowTop} roughness={0.5} transparent opacity={opacity} />
      </mesh>

      {/* Awning */}
      <mesh position={[0, WINDOW_HEIGHT + 0.35, hd + WINDOW_AWNING_DEPTH / 2]}>
        <boxGeometry args={[WINDOW_WIDTH + 0.4, 0.06, WINDOW_AWNING_DEPTH]} />
        <meshStandardMaterial color="#D4A76A" roughness={0.5} transparent opacity={opacity} />
      </mesh>

      {/* Open/Closed/Activating indicator glow */}
      <mesh position={[0, WINDOW_HEIGHT + 0.1, hd + 0.05]}>
        <planeGeometry args={[WINDOW_WIDTH - 0.1, 0.12]} />
        <meshBasicMaterial
          color={indicatorColor}
          transparent
          opacity={0.6 * (isActivating ? 0.5 : 1)}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Window number */}
      <Text
        position={[0, WINDOW_HEIGHT + 0.6, hd + WINDOW_AWNING_DEPTH + 0.1]}
        fontSize={0.35}
        color="#3B2F2F"
        anchorX="center"
        anchorY="middle"
      >
        {`W${id + 1}`}
      </Text>
    </group>
  )
}
