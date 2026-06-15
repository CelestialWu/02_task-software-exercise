import type { SeatType } from '../lib/types'
import type { LayoutInput, LayoutResult, WindowLayout, TableLayout, BarLayout, SofaLayout, Vec3, AisleNode, AisleGraph } from './types'
import {
  FLOOR_WIDTH, FLOOR_DEPTH, WALL_MARGIN,
  WINDOW_WIDTH, WINDOW_DEPTH, WINDOW_SPACING,
  TABLE_SPACING, TABLE_HEIGHT, CENTER_PATH_WIDTH,
  SERVICE_AISLE_DEPTH, AISLE_WIDTH,
  BAR_COUNTER_WIDTH, BAR_STOOL_SPACING,
  SOFA_SEAT_DEPTH, SOFA_BACK_HEIGHT, SOFA_SEAT_WIDTH,
  TABLE_DIMENSIONS, FRONT_DOOR_WIDTH, FRONT_DOOR_GAP,
} from './constants'

function makeVec(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

function floorForTable(type: SeatType): number {
  // Tables sit on the floor, top = TABLE_HEIGHT
  return 0
}

export function computeLayout(input: LayoutInput): LayoutResult {
  const {
    window_count, two_person_tables, four_person_tables,
    six_person_tables, bar_seats, sofa_seats,
  } = input

  const floorWidth = FLOOR_WIDTH
  const floorDepth = FLOOR_DEPTH

  const cx = floorWidth / 2
  const cz = floorDepth / 2

  const usableMinX = WALL_MARGIN
  const usableMaxX = floorWidth - WALL_MARGIN
  const usableWidth = usableMaxX - usableMinX

  // --- Windows along back wall (small Z) ---
  const windowZ = WALL_MARGIN + WINDOW_DEPTH / 2
  const maxWindows = 8
  const totalWindowSpan = maxWindows * WINDOW_WIDTH + (maxWindows - 1) * WINDOW_SPACING
  const windowSpan = Math.min(totalWindowSpan, usableWidth * 0.9)
  const windowScale = totalWindowSpan > 0 ? windowSpan / totalWindowSpan : 1
  const winW = WINDOW_WIDTH * windowScale
  const winSpacing = WINDOW_SPACING * windowScale
  const winStartX = cx - (maxWindows * winW + (maxWindows - 1) * winSpacing) / 2 + winW / 2

  // Pre-compute physical positions left-to-right, then reorder by window ID (center-outward)
  const physicalPositions: Vec3[] = []
  for (let i = 0; i < maxWindows; i++) {
    const wx = winStartX + i * (winW + winSpacing)
    physicalPositions.push(makeVec(wx, 0, windowZ))
  }

  // Center-outward index ordering: for 8 positions [0..7] left-to-right,
  // preferred order is [3, 4, 2, 5, 1, 6, 0, 7]
  const centerOutwardOrder = (() => {
    const total = physicalPositions.length
    const order: number[] = []
    const mid = Math.floor((total - 1) / 2)
    order.push(mid)
    order.push(mid + 1)
    for (let offset = 1; offset <= mid; offset++) {
      if (mid - offset >= 0) order.push(mid - offset)
      if (mid + 1 + offset < total) order.push(mid + 1 + offset)
    }
    return order
  })()

  // allWindowPositions indexed by window ID (center-outward), NOT physical position
  const allWindowPositions: Vec3[] = []
  for (let i = 0; i < maxWindows; i++) {
    allWindowPositions.push(physicalPositions[centerOutwardOrder[i]])
  }

  const windows: WindowLayout[] = []
  for (let i = 0; i < window_count; i++) {
    const pos = allWindowPositions[i]
    const queueStartZ = windowZ + WINDOW_DEPTH / 2 + 0.3
    const queuePositions: Vec3[] = []
    for (let q = 0; q < 15; q++) {
      queuePositions.push(makeVec(pos.x, 0.01, queueStartZ + q * 0.55))
    }
    windows.push({
      id: i,
      position: pos,
      queueStartPositions: queuePositions,
    })
  }

  // --- Tables: lay out six_person -> four_person -> two_person (back to front) ---
  const tableLayouts: TableLayout[] = []
  let tableId = 0
  const tableGroupOffset = 2 * TABLE_DIMENSIONS.six_person.depth
  let currentZ = WALL_MARGIN + WINDOW_DEPTH + SERVICE_AISLE_DEPTH + tableGroupOffset

  const centerPathWidth = CENTER_PATH_WIDTH
  const leftSegmentWidth = (usableWidth - centerPathWidth) / 2

  function layRow(type: SeatType, count: number) {
    const dims = TABLE_DIMENSIONS[type]
    const tableW = dims.width
    const tableD = dims.depth
    const maxPerSideByType: Record<SeatType, number> = {
      two_person: 3,
      four_person: 3,
      six_person: 2,
      bar: 2,
      sofa: 3,
    }
    const perSide = Math.min(
      Math.max(1, Math.floor(leftSegmentWidth / (tableW + TABLE_SPACING))),
      maxPerSideByType[type]
    )
    const perRow = perSide * 2
    const totalRows = Math.ceil(count / perRow)

    let leftTotal = 0
    let rightTotal = 0

    for (let row = 0; row < totalRows; row++) {
      const remaining = count - leftTotal - rightTotal
      const rowCount = Math.min(perRow, remaining)
      const base = Math.floor(rowCount / 2)
      let leftCount = base
      let rightCount = base

      if (rowCount % 2 === 1) {
        if (leftTotal <= rightTotal) {
          rightCount += 1
        } else {
          leftCount += 1
        }
      }

      const leftStartX = usableMinX + tableW / 2
      for (let c = 0; c < leftCount; c++) {
        const tx = leftStartX + c * (tableW + TABLE_SPACING)
        const tz = currentZ + tableD / 2
        const seatPositions = computeSeatPositions(type, makeVec(tx, 0, tz), 0)
        tableLayouts.push({
          id: tableId++,
          type,
          capacity: dims.seatsPerSide.reduce((a, b) => a + b, 0),
          position: makeVec(tx, 0, tz),
          rotation: 0,
          seatPositions,
          seatRotations: seatPositions.map(() => 0),
        })
      }

      const rightStartX = usableMaxX - tableW / 2 - (rightCount - 1) * (tableW + TABLE_SPACING)
      for (let c = 0; c < rightCount; c++) {
        const tx = rightStartX + c * (tableW + TABLE_SPACING)
        const tz = currentZ + tableD / 2
        const seatPositions = computeSeatPositions(type, makeVec(tx, 0, tz), 0)
        tableLayouts.push({
          id: tableId++,
          type,
          capacity: dims.seatsPerSide.reduce((a, b) => a + b, 0),
          position: makeVec(tx, 0, tz),
          rotation: 0,
          seatPositions,
          seatRotations: seatPositions.map(() => 0),
        })
      }

      leftTotal += leftCount
      rightTotal += rightCount
      currentZ += tableD + AISLE_WIDTH
    }
  }

  layRow('six_person', six_person_tables)
  layRow('four_person', four_person_tables)
  layRow('two_person', two_person_tables)

  // --- Bar along left wall (length proportional to seat count) ---
  const barStartZ = WALL_MARGIN + WINDOW_DEPTH + 0.5
  const barX = WALL_MARGIN + BAR_COUNTER_WIDTH / 2

  const barSeatPositions: Vec3[] = []
  const barSeatRotations: number[] = []
  const maxBarSeats = Math.floor((floorDepth - WALL_MARGIN - 2.0 - barStartZ) / BAR_STOOL_SPACING)
  const actualBarSeats = Math.min(bar_seats, maxBarSeats)
  // Bar counter length exactly fits the seats
  const barEndZ = barStartZ + actualBarSeats * BAR_STOOL_SPACING + 0.5
  const barStart = barStartZ + 0.25
  for (let i = 0; i < actualBarSeats; i++) {
    barSeatPositions.push(makeVec(barX + BAR_COUNTER_WIDTH / 2 + 0.3, 0, barStart + i * BAR_STOOL_SPACING))
    barSeatRotations.push(-Math.PI / 2)
  }

  const barLayout: BarLayout = {
    seatCount: actualBarSeats,
    counterStart: makeVec(barX, 0, barStartZ),
    counterEnd: makeVec(barX, 0, barEndZ),
    seatPositions: barSeatPositions,
    seatRotations: barSeatRotations,
  }

  // --- Sofa L-shape along right wall ---
  const sofaX = floorWidth - WALL_MARGIN - 0.3
  const sofaZStart = WALL_MARGIN + WINDOW_DEPTH + 0.5
  const sofaZEnd = floorDepth - WALL_MARGIN - 1.0
  const sofaPositions: Vec3[] = []
  const sofaRotations: number[] = []
  const actualSofaSeats = Math.min(sofa_seats, Math.floor((sofaZEnd - sofaZStart) / SOFA_SEAT_WIDTH) + 3)
  for (let i = 0; i < Math.min(actualSofaSeats, Math.floor((sofaZEnd - sofaZStart) / SOFA_SEAT_WIDTH)); i++) {
    sofaPositions.push(makeVec(sofaX, 0, sofaZStart + i * SOFA_SEAT_WIDTH))
    sofaRotations.push(Math.PI / 2) // face right wall
  }
  // short arm along front
  for (let i = 0; i < Math.min(3, actualSofaSeats - sofaPositions.length); i++) {
    sofaPositions.push(makeVec(sofaX - (i + 1) * SOFA_SEAT_WIDTH, 0, sofaZEnd))
    sofaRotations.push(Math.PI) // face front
  }

  const sofaLayout: SofaLayout = {
    seatCount: sofaPositions.length,
    positions: sofaPositions,
    rotations: sofaRotations,
  }

  // --- Entrance and Exit at the front wall ---
  const doorWidth = FRONT_DOOR_WIDTH
  const doorGap = FRONT_DOOR_GAP
  const entranceX = cx - (doorGap + doorWidth) / 2
  const exitX = cx + (doorGap + doorWidth) / 2
  const entrance = makeVec(entranceX, 0, floorDepth - WALL_MARGIN)
  const exit = makeVec(exitX, 0, floorDepth - WALL_MARGIN)

  // --- Aisle graph ---
  const aisleGraph = buildAisleGraph(windows, tableLayouts, barLayout, sofaLayout, entrance, exit, floorWidth, floorDepth)

  return {
    floorWidth,
    floorDepth,
    windows,
    tables: tableLayouts,
    bar: barLayout,
    sofa: sofaLayout,
    entrance,
    exit,
    aisleGraph,
    allWindowPositions,
  }
}

export function computeSeatPositions(type: SeatType, tablePos: Vec3, rotation: number): Vec3[] {
  const dims = TABLE_DIMENSIONS[type]
  const hw = dims.width / 2
  const hd = dims.depth / 2
  const offset = 0.4 // sitting distance from table edge
  const seats: Vec3[] = []

  const sides = dims.seatsPerSide
  // Side 0: +Z (bottom), Side 1: -Z (top)
  for (let side = 0; side < sides.length; side++) {
    const count = sides[side]
    if (count === 0) continue
    const zDir = side === 0 ? 1 : -1
    const baseZ = tablePos.z + zDir * (hd + offset)
    const span = (count - 1) * 0.55
    const startX = tablePos.x - span / 2
    for (let s = 0; s < count; s++) {
      seats.push(makeVec(startX + s * 0.55, 0, baseZ))
    }
  }
  return seats
}

export function buildAisleGraph(
  windows: WindowLayout[],
  tables: TableLayout[],
  bar: BarLayout,
  sofa: SofaLayout,
  entrance: Vec3,
  exit: Vec3,
  floorWidth: number,
  floorDepth: number
): AisleGraph {
  const nodes: Record<string, AisleNode> = {}
  const id = (label: string) => label

  // Entrance node
  nodes[id('entrance')] = { id: 'entrance', position: entrance, neighbors: ['aisle_main'] }
  nodes[id('exit')] = { id: 'exit', position: exit, neighbors: ['aisle_main'] }

  // Main vertical aisle along center
  nodes[id('aisle_main')] = {
    id: 'aisle_main',
    position: makeVec(floorWidth / 2, 0, entrance.z - 2),
    neighbors: ['entrance', 'exit'],
  }

  // Window queue access nodes
  for (const w of windows) {
    const nid = id(`window_${w.id}`)
    nodes[nid] = {
      id: nid,
      position: makeVec(w.position.x, 0, w.position.z + WINDOW_DEPTH / 2 + 0.5),
      neighbors: ['aisle_main'],
    }
    nodes[id('aisle_main')]!.neighbors.push(nid)
  }

  // Table access - horizontal aisles between each row
  const rowZ = new Map<number, string>()
  for (const t of tables) {
    const zKey = Math.round(t.position.z * 10) / 10
    if (!rowZ.has(zKey)) {
      const rid = id(`row_${rowZ.size}`)
      rowZ.set(zKey, rid)
      nodes[rid] = {
        id: rid,
        position: makeVec(floorWidth / 2, 0, t.position.z),
        neighbors: ['aisle_main'],
      }
      nodes[id('aisle_main')]!.neighbors.push(rid)
    }
    const tNodeId = id(`table_${t.id}`)
    nodes[tNodeId] = {
      id: tNodeId,
      position: t.position,
      neighbors: [rowZ.get(zKey)!],
    }
    nodes[rowZ.get(zKey)!]!.neighbors.push(tNodeId)
  }

  // Bar access
  for (let i = 0; i < bar.seatPositions.length; i++) {
    const bid = id(`bar_${i}`)
    nodes[bid] = {
      id: bid,
      position: bar.seatPositions[i],
      neighbors: ['aisle_main'],
    }
  }

  // Sofa access
  for (let i = 0; i < sofa.positions.length; i++) {
    const sid = id(`sofa_${i}`)
    nodes[sid] = {
      id: sid,
      position: sofa.positions[i],
      neighbors: ['aisle_main'],
    }
  }

  return { nodes }
}

export function computeQueuePosition(window: WindowLayout, queueIndex: number): Vec3 {
  if (queueIndex < window.queueStartPositions.length) {
    return window.queueStartPositions[queueIndex]
  }
  const last = window.queueStartPositions[window.queueStartPositions.length - 1]
  return makeVec(last.x, last.y, last.z + (queueIndex - window.queueStartPositions.length + 1) * 0.55)
}

export function computeSpawnPosition(entrance: Vec3): Vec3 {
  return makeVec(entrance.x, 0.1, entrance.z + 1.0)
}
