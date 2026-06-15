import { useRef } from 'react'
import * as THREE from 'three'
import { PERSON_STATE_COLORS } from '../../lib/types'
import type { PersonState } from '../../lib/types'

interface Props {
  position: [number, number, number]
  personState: PersonState
  visualState: PersonState
  personColor: string
  groupColor: string
  groupId: number
  walking: boolean
}

export function Person({ position, personState, visualState, personColor, groupColor, groupId, walking }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const displayState = visualState ?? personState
  const isLeaving = displayState === 'left' || displayState === 'leaving'
  const stateColor = PERSON_STATE_COLORS[displayState] ?? personColor
  const bodyColor = isLeaving ? '#999999' : stateColor
  const headColor = isLeaving ? '#CCCCCC' : '#FFD93D'

  const isSitting = displayState === 'seated'
  const scaleY = isSitting ? 0.5 : 1.0
  const opacity = 1.0

  return (
    <group ref={groupRef} position={position}>
      {/* Group flag indicator above head */}
      {groupId >= 0 && (
        <group position={[0, isSitting ? 0.9 : 1.55, 0]}>
          {/* Flag pole */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshBasicMaterial color="#333" />
          </mesh>
          {/* Flag */}
          <mesh position={[0.12, 0.15, 0]}>
            <planeGeometry args={[0.18, 0.12]} />
            <meshBasicMaterial color={groupColor} side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Walking bob group */}
      <group scale={[1, scaleY, 1]}>
        {/* Body - capsule approximation */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.4, 4, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} transparent opacity={opacity} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color={headColor} roughness={0.4} transparent opacity={opacity} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.08, 0.3, 0]}>
          <capsuleGeometry args={[0.06, 0.2, 4, 6]} />
          <meshStandardMaterial color="#2C3E50" roughness={0.6} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0.08, 0.3, 0]}>
          <capsuleGeometry args={[0.06, 0.2, 4, 6]} />
          <meshStandardMaterial color="#2C3E50" roughness={0.6} transparent opacity={opacity} />
        </mesh>
      </group>
    </group>
  )
}

