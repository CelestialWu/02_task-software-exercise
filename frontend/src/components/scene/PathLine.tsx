import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

interface Props {
  waypoints: [number, number, number][]
  progress: number
  active: boolean
  color: string
}

export function PathLine({ waypoints, progress, active, color }: Props) {
  if (!active || waypoints.length < 2) return null

  // Show the path trail for the completed portion
  const visibleWaypoints = waypoints.slice(0, Math.ceil(waypoints.length * progress + 1))

  if (visibleWaypoints.length < 2) return null

  return (
    <group>
      {/* Path line */}
      <Line
        points={visibleWaypoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.4}
        dashed
        dashSize={0.3}
        gapSize={0.2}
        depthWrite={false}
      />
      {/* Small dots at waypoints */}
      {visibleWaypoints.slice(0, -1).map((wp, i) => (
        <mesh key={`dot-${i}`} position={wp}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
