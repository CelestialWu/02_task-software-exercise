import type { SeatType } from '../lib/types'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface WindowLayout {
  id: number
  position: Vec3
  queueStartPositions: Vec3[] // positions where queuing people stand (pre-computed)
}

export interface TableLayout {
  id: number
  type: SeatType
  capacity: number
  position: Vec3
  rotation: number // Y-axis rotation in radians
  seatPositions: Vec3[] // world-space seat positions
  seatRotations: number[] // facing direction for each seat
}

export interface BarLayout {
  seatCount: number
  counterStart: Vec3
  counterEnd: Vec3
  seatPositions: Vec3[]
  seatRotations: number[]
}

export interface SofaLayout {
  seatCount: number
  positions: Vec3[] // seat positions along the L-shape
  rotations: number[]
}

export interface LayoutResult {
  floorWidth: number
  floorDepth: number
  windows: WindowLayout[]
  tables: TableLayout[]
  bar: BarLayout
  sofa: SofaLayout
  entrance: Vec3
  exit: Vec3
  aisleGraph: AisleGraph
  allWindowPositions: Vec3[] // index by window ID, up to max (8)
}

export interface AisleNode {
  id: string
  position: Vec3
  neighbors: string[]
}

export interface AisleGraph {
  nodes: Record<string, AisleNode>
}

export interface LayoutInput {
  window_count: number
  two_person_tables: number
  four_person_tables: number
  six_person_tables: number
  bar_seats: number
  sofa_seats: number
}
