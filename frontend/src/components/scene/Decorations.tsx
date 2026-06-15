import { COLORS } from '../../engine/constants'
import { Text } from '@react-three/drei'

interface Props {
  floorWidth: number
  floorDepth: number
  timestep: number
}

export function Decorations({ floorWidth, floorDepth, timestep }: Props) {
  return (
    <group>
      {/* Potted plants in all four corners */}
      <Pot position={[0.6, 0, 0.6]} />
      <Pot position={[floorWidth - 0.6, 0, 0.6]} />
      <Pot position={[0.6, 0, floorDepth - 1.0]} />
      <Pot position={[floorWidth - 0.6, 0, floorDepth - 1.0]} />

      {/* Additional plants along back wall — placed between window slots to avoid clipping */}
      <Pot position={[floorWidth * 0.2, 0, 0.5]} scale={0.7} />
      <Pot position={[floorWidth * 0.8, 0, 0.5]} scale={0.7} />

      {/* Wall clock on back wall */}
      <group position={[2.0, 3.2, 0.16]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 32]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <cylinderGeometry args={[0.3, 0.3, 0.01, 32]} />
          <meshBasicMaterial color="#FFFAF0" />
        </mesh>
        {/* Hour hand */}
        <mesh position={[0, 0.06, 0.05]} rotation={[0, 0, (timestep % 60) * 0.1047 + Math.PI / 2]}>
          <boxGeometry args={[0.03, 0.14, 0.01]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        {/* Minute hand */}
        <mesh position={[0, -0.03, 0.05]} rotation={[0, 0, timestep * 0.01745]}>
          <boxGeometry args={[0.02, 0.22, 0.01]} />
          <meshBasicMaterial color="#555" />
        </mesh>
      </group>

      {/* Menu board near windows - left side */}
      <group position={[1.2, 1.6, 0.5]}>
        <mesh>
          <boxGeometry args={[0.7, 0.9, 0.06]} />
          <meshStandardMaterial color="#2C1810" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.6, 0.8, 0.01]} />
          <meshBasicMaterial color="#3C2820" />
        </mesh>
        <Text position={[0, 0.15, 0.05]} fontSize={0.08} color="#F5E6D3" anchorX="center" anchorY="middle">
          TODAY'S MENU
        </Text>
        <Text position={[0, -0.08, 0.05]} fontSize={0.06} color="#C4956A" anchorX="center" anchorY="middle">
          ----------
        </Text>
      </group>

      {/* Notice board on right wall */}
      <group position={[floorWidth - 0.5, 1.8, 2.5]}>
        <mesh>
          <boxGeometry args={[0.05, 0.7, 0.6]} />
          <meshStandardMaterial color="#C4956A" roughness={0.7} />
        </mesh>
        <Text position={[0.04, 0.15, 0]} fontSize={0.07} color="#3B2F2F" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
          NOTICE
        </Text>
        <Text position={[0.04, -0.05, 0]} fontSize={0.04} color="#6B5B4F" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
          BOARD
        </Text>
      </group>

      {/* Ceiling pendant lights (floating orbs) */}
      <PendantLight position={[floorWidth * 0.2, 3.8, 3]} />
      <PendantLight position={[floorWidth * 0.4, 3.8, 3]} />
      <PendantLight position={[floorWidth * 0.6, 3.8, 3]} />
      <PendantLight position={[floorWidth * 0.8, 3.8, 3]} />
      <PendantLight position={[floorWidth * 0.3, 3.8, floorDepth - 3]} />
      <PendantLight position={[floorWidth * 0.7, 3.8, floorDepth - 3]} />

      {/* Queue area floor markings (subtle lines showing where to stand) */}
      <mesh position={[floorWidth / 2, 0.005, 4.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth * 0.8, 5.0]} />
        <meshBasicMaterial color="#D4A76A" transparent opacity={0.08} />
      </mesh>

      {/* Entrance marker */}
      <Text
        position={[floorWidth / 2 - 2.25, 0.02, floorDepth - 0.15]}
        fontSize={0.2} color="#88CC88" anchorX="center" anchorY="bottom"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        ENTRANCE
      </Text>

      {/* Exit marker */}
      <Text
        position={[floorWidth / 2 + 2.25, 0.02, floorDepth - 0.15]}
        fontSize={0.2} color="#CC8888" anchorX="center" anchorY="bottom"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        EXIT
      </Text>

      {/* Center pathway marker */}
      <mesh position={[floorWidth / 2, 0.005, floorDepth - 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 6.0]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.06} />
      </mesh>

      {/* Column pillars along walls */}
      <Pillar position={[0.5, 0, 3]} />
      <Pillar position={[0.5, 0, floorDepth - 4]} />
      <Pillar position={[floorWidth - 0.5, 0, 3]} />
      <Pillar position={[floorWidth - 0.5, 0, floorDepth - 4]} />
    </group>
  )
}

function Pot({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.6, 12]} />
        <meshStandardMaterial color={COLORS.wallTrim} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial color="#5B8C5A" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.7, 0.1]}>
        <sphereGeometry args={[0.25, 6, 5]} />
        <meshStandardMaterial color="#6BA368" roughness={0.8} />
      </mesh>
    </group>
  )
}

function PendantLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Cord */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      {/* Shade */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#FFF8E7" roughness={0.3} emissive="#FFE4B5" emissiveIntensity={0.3} />
      </mesh>
      {/* Light point */}
      <pointLight position={[0, -0.4, 0]} intensity={0.5} color="#FFE4B5" distance={6} />
    </group>
  )
}

function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.25, 3.6, 0.25]} />
        <meshStandardMaterial color="#E8D5C0" roughness={0.7} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.35, 0.16, 0.35]} />
        <meshStandardMaterial color="#C4A882" roughness={0.5} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, 3.7, 0]}>
        <boxGeometry args={[0.35, 0.12, 0.35]} />
        <meshStandardMaterial color="#C4A882" roughness={0.5} />
      </mesh>
    </group>
  )
}
