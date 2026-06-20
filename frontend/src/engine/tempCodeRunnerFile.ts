// Isometric cafeteria sizing constants (in world units)
import type { SeatType } from '../lib/types'

// Floor - enlarged for better spacing
export const FLOOR_WIDTH = 24
export const FLOOR_DEPTH = 26
export const FLOOR_Y = 0

// Walls
export const WALL_HEIGHT = 4.5
export const WALL_THICKNESS = 0.3

// Windows (serving counters)
export const WINDOW_WIDTH = 1.8
export const WINDOW_DEPTH = 0.8
export const WINDOW_HEIGHT = 1.5
export const WINDOW_AWNING_DEPTH = 0.4
export const WINDOW_SPACING = 0.6

// Tables
export const TABLE_HEIGHT = 0.75
export const TABLE_SPACING = 0.7
export const CENTER_PATH_WIDTH = 2.8

export const FRONT_DOOR_WIDTH = 2.5
export const FRONT_DOOR_GAP = 2.0

export const TABLE_DIMENSIONS: Record<SeatType, { width: number; depth: number; seatsPerSide: number[] }> = {
  two_person: { width: 1.4, depth: 1.0, seatsPerSide: [1, 1] },
  four_person: { width: 1.8, depth: 1.4, seatsPerSide: [2, 2] },
  six_person: { width: 2.4, depth: 1.4, seatsPerSide: [3, 3] },
  bar: { width: 0.8, depth: 0.6, seatsPerSide: [1, 0] },
  sofa: { width: 1.2, depth: 0.8, seatsPerSide: [2, 0] },
}

export const TABLE_COLORS: Record<SeatType, string> = {
  two_person: '#FFDAB9',
  four_person: '#FFE4B5',
  six_person: '#FFECD2',
  bar: '#E6C9A8',
  sofa: '#C4956A',
}

// Aisles
export const AISLE_WIDTH = 1.6
export const SERVICE_AISLE_DEPTH = 4.5
export const WALL_MARGIN = 1.2

// Bar
export const BAR_COUNTER_WIDTH = 0.7
export const BAR_STOOL_SPACING = 0.7

// Sofa
export const SOFA_SEAT_DEPTH = 0.6
export const SOFA_BACK_HEIGHT = 0.8
export const SOFA_SEAT_WIDTH = 0.6

// Path & Animation
export const PATH_LINE_Y_OFFSET = 0.03
export const PERSON_WALK_SPEED = 3.0
export const QUEUE_SPACING = 0.55

// Colors
export const COLORS = {
  floor: '#C4956A',
  floorHighlight: '#D4A76A',
  wall: '#F5F0E8',
  wallTrim: '#8B6914',
  windowCounter: '#E8D5B7',
  windowTop: '#C4956A',
  seatEmpty: '#90EE90',
  seatOccupied: '#FF6B6B',
  groupFlagColors: [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7',
    '#A8E6CF', '#FF8B94', '#45B7D1', '#F7DC6F',
    '#BB8FCE', '#82E0AA',
  ],
}

// Scene lighting
export const LIGHTING = {
  ambientColor: '#FFF8E7',
  ambientIntensity: 1.2,
  directionalColor: '#FFE4B5',
  directionalIntensity: 2.5,
  directionalPosition: [8, 12, -2] as [number, number, number],
  hemisphereSky: '#FFEEDD',
  hemisphereGround: '#8B6914',
  hemisphereIntensity: 0.6,
}
