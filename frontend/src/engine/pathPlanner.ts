import type { Vec3, LayoutResult } from './types'
import { PATH_LINE_Y_OFFSET, WALL_MARGIN, FLOOR_WIDTH, FLOOR_DEPTH, WINDOW_DEPTH, TABLE_DIMENSIONS, BAR_COUNTER_WIDTH, SOFA_SEAT_WIDTH } from './constants'

export interface Waypoint {
  x: number
  z: number
  y: number
}

const GRID_CELL_SIZE = 0.5
const OBSTACLE_BUFFER = 0.3

interface GridCell {
  walkable: boolean
}

interface Grid {
  width: number
  height: number
  cells: GridCell[][]
  cellSize: number
  offsetX: number
  offsetZ: number
}

interface PathNode {
  gx: number
  gz: number
  g: number
  h: number
  f: number
  parent: PathNode | null
}

function buildCollisionGrid(layout: LayoutResult): Grid {
  const cellSize = GRID_CELL_SIZE
  const gridWidth = Math.ceil(layout.floorWidth / cellSize)
  const gridHeight = Math.ceil(layout.floorDepth / cellSize)

  const cells: GridCell[][] = []
  for (let z = 0; z < gridHeight; z++) {
    const row: GridCell[] = []
    for (let x = 0; x < gridWidth; x++) {
      row.push({ walkable: true })
    }
    cells.push(row)
  }

  const grid: Grid = { width: gridWidth, height: gridHeight, cells, cellSize, offsetX: 0, offsetZ: 0 }

  const markCellsAsObstacle = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const x1 = Math.max(0, Math.floor((minX - OBSTACLE_BUFFER) / cellSize))
    const x2 = Math.min(gridWidth - 1, Math.ceil((maxX + OBSTACLE_BUFFER) / cellSize))
    const z1 = Math.max(0, Math.floor((minZ - OBSTACLE_BUFFER) / cellSize))
    const z2 = Math.min(gridHeight - 1, Math.ceil((maxZ + OBSTACLE_BUFFER) / cellSize))

    for (let z = z1; z <= z2; z++) {
      for (let x = x1; x <= x2; x++) {
        cells[z][x].walkable = false
      }
    }
  }

  // Mark walls
  const wallMargin = WALL_MARGIN + OBSTACLE_BUFFER
  markCellsAsObstacle(-10, wallMargin, -10, layout.floorDepth + 10)
  markCellsAsObstacle(layout.floorWidth - wallMargin, layout.floorWidth + 10, -10, layout.floorDepth + 10)
  markCellsAsObstacle(0, layout.floorWidth, -10, wallMargin)
  markCellsAsObstacle(0, layout.floorWidth, layout.floorDepth - wallMargin, layout.floorDepth + 10)

  // Mark tables
  for (const table of layout.tables) {
    const tableW = table.position.x
    const tableZ = table.position.z
    const dim = TABLE_DIMENSIONS[table.type]
    markCellsAsObstacle(tableW - dim.width / 2, tableW + dim.width / 2, tableZ - dim.depth / 2, tableZ + dim.depth / 2)
  }

  // Mark bar
  if (layout.bar && layout.bar.seatCount > 0) {
    const startZ = layout.bar.counterStart.z
    const endZ = layout.bar.counterEnd.z
    markCellsAsObstacle(WALL_MARGIN, WALL_MARGIN + BAR_COUNTER_WIDTH, startZ - 0.3, endZ + 0.3)
  }

  // Mark sofa
  if (layout.sofa && layout.sofa.positions.length > 0) {
    for (const pos of layout.sofa.positions) {
      markCellsAsObstacle(pos.x - SOFA_SEAT_WIDTH / 2, pos.x + SOFA_SEAT_WIDTH / 2, pos.z - SOFA_SEAT_WIDTH / 2, pos.z + SOFA_SEAT_WIDTH / 2)
    }
  }

  // Mark windows/service areas
  for (const w of layout.windows) {
    const winW = w.position.x
    const winZ = w.position.z
    markCellsAsObstacle(winW - 0.9, winW + 0.9, winZ - OBSTACLE_BUFFER, winZ + WINDOW_DEPTH / 2 + 0.2)
  }

  return grid
}

function worldToGrid(x: number, z: number, grid: Grid): { gx: number; gz: number } {
  return { gx: Math.round(x / grid.cellSize), gz: Math.round(z / grid.cellSize) }
}

function gridToWorld(gx: number, gz: number, grid: Grid): [number, number] {
  return [gx * grid.cellSize, gz * grid.cellSize]
}

function isCellWalkable(gx: number, gz: number, grid: Grid): boolean {
  if (gx < 0 || gx >= grid.width || gz < 0 || gz >= grid.height) return false
  return grid.cells[gz][gx].walkable
}

function heuristic(gx: number, gz: number, targetGx: number, targetGz: number): number {
  return Math.abs(gx - targetGx) + Math.abs(gz - targetGz)
}

function aStar(startGx: number, startGz: number, goalGx: number, goalGz: number, grid: Grid): Array<[number, number]> {
  const openSet: Map<string, PathNode> = new Map()
  const closedSet: Set<string> = new Set()

  const start: PathNode = {
    gx: startGx,
    gz: startGz,
    g: 0,
    h: heuristic(startGx, startGz, goalGx, goalGz),
    f: 0,
    parent: null,
  }
  start.f = start.g + start.h

  const key = (gx: number, gz: number) => `${gx},${gz}`
  openSet.set(key(startGx, startGz), start)

  while (openSet.size > 0) {
    let current: PathNode | null = null
    let minF = Infinity
    for (const node of openSet.values()) {
      if (node.f < minF) {
        minF = node.f
        current = node
      }
    }

    if (!current) break

    if (current.gx === goalGx && current.gz === goalGz) {
      const path: Array<[number, number]> = []
      let node: PathNode | null = current
      while (node) {
        path.unshift([node.gx, node.gz])
        node = node.parent
      }
      return path
    }

    openSet.delete(key(current.gx, current.gz))
    closedSet.add(key(current.gx, current.gz))

    const neighbors = [
      [current.gx + 1, current.gz],
      [current.gx - 1, current.gz],
      [current.gx, current.gz + 1],
      [current.gx, current.gz - 1],
    ]

    for (const [nx, nz] of neighbors) {
      if (!isCellWalkable(nx, nz, grid) || closedSet.has(key(nx, nz))) continue

      const g = current.g + 1
      const neighbor = openSet.get(key(nx, nz))

      if (!neighbor) {
        const h = heuristic(nx, nz, goalGx, goalGz)
        const newNode: PathNode = { gx: nx, gz: nz, g, h, f: g + h, parent: current }
        openSet.set(key(nx, nz), newNode)
      } else if (g < neighbor.g) {
        neighbor.g = g
        neighbor.f = g + neighbor.h
        neighbor.parent = current
      }
    }
  }

  return [[startGx, startGz], [goalGx, goalGz]]
}

function simplifyPath(gridPath: Array<[number, number]>, grid: Grid): Waypoint[] {
  if (gridPath.length === 0) return []

  const waypoints: Waypoint[] = []
  let currentIdx = 0

  while (currentIdx < gridPath.length) {
    let lastValidIdx = currentIdx

    for (let i = gridPath.length - 1; i > currentIdx; i--) {
      const [sx, sz] = gridPath[currentIdx]
      const [ex, ez] = gridPath[i]

      let canSkip = true
      const steps = Math.max(Math.abs(ex - sx), Math.abs(ez - sz))
      for (let step = 1; step <= steps; step++) {
        const t = step / steps
        const cx = Math.round(sx + (ex - sx) * t)
        const cz = Math.round(sz + (ez - sz) * t)
        if (!isCellWalkable(cx, cz, grid)) {
          canSkip = false
          break
        }
      }

      if (canSkip) {
        lastValidIdx = i
        break
      }
    }

    const [wx, wz] = gridToWorld(gridPath[lastValidIdx][0], gridPath[lastValidIdx][1], grid)
    waypoints.push({ x: wx, z: wz, y: PATH_LINE_Y_OFFSET })
    currentIdx = lastValidIdx + 1
  }

  return waypoints
}

export function planPath(from: Vec3, to: Vec3, layout: LayoutResult | null): Waypoint[] {
  const result: Waypoint[] = []
  const midY = PATH_LINE_Y_OFFSET

  result.push({ x: from.x, z: from.z, y: midY })

  if (!layout) {
    result.push({ x: to.x, z: to.z, y: midY })
    return result
  }

  const grid = buildCollisionGrid(layout)
  const startGrid = worldToGrid(from.x, from.z, grid)
  const goalGrid = worldToGrid(to.x, to.z, grid)

  if (!isCellWalkable(startGrid.gx, startGrid.gz, grid)) {
    for (let radius = 1; radius <= 3; radius++) {
      let found = false
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (isCellWalkable(startGrid.gx + dx, startGrid.gz + dz, grid)) {
            const [wx, wz] = gridToWorld(startGrid.gx + dx, startGrid.gz + dz, grid)
            result[0] = { x: wx, z: wz, y: midY }
            found = true
            break
          }
        }
        if (found) break
      }
      if (found) break
    }
  }

  if (!isCellWalkable(goalGrid.gx, goalGrid.gz, grid)) {
    for (let radius = 1; radius <= 3; radius++) {
      let found = false
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (isCellWalkable(goalGrid.gx + dx, goalGrid.gz + dz, grid)) {
            result.push({ x: (goalGrid.gx + dx) * grid.cellSize, z: (goalGrid.gz + dz) * grid.cellSize, y: midY })
            found = true
            break
          }
        }
        if (found) break
      }
      if (found) break
    }
  } else {
    result.push({ x: to.x, z: to.z, y: midY })
  }

  if (result.length === 1) return result

  const gridPath = aStar(startGrid.gx, startGrid.gz, goalGrid.gx, goalGrid.gz, grid)
  const pathWaypoints = simplifyPath(gridPath, grid)

  if (pathWaypoints.length > 0) {
    return [result[0], ...pathWaypoints.slice(1)]
  }

  return result
}
