import { create } from 'zustand'
import type { BackendState, PersonState } from '../lib/types'
import type { LayoutResult, Vec3 } from '../engine/types'
import { computeLayout, computeSpawnPosition } from '../engine/layoutEngine'
import { planPath } from '../engine/pathPlanner'
import { PERSON_WALK_SPEED, PATH_LINE_Y_OFFSET, COLORS, WINDOW_DEPTH } from '../engine/constants'

export interface AnimatedPerson {
  id: number
  groupId: number
  position: [number, number, number]
  targetPosition: [number, number, number]
  walkStartPosition: [number, number, number]
  rotation: number
  personState: PersonState
  visualState: PersonState
  color: string
  groupColor: string
  startTime: number
  walking: boolean
  pendingState: PersonState | null
  pendingTarget: [number, number, number] | null
}

export interface PathVis {
  id: string
  waypoints: [number, number, number][]
  progress: number
  active: boolean
  color: string
}

export interface SimulationStore {
  // Layout
  layout: LayoutResult | null
  layoutReady: boolean

  // Entities
  persons: Record<number, AnimatedPerson>
  paths: Record<string, PathVis>

  // Stats
  timestep: number
  queuingCount: number
  seatedCount: number
  totalArrived: number
  totalLeft: number
  avgWaitTime: number
  windowStates: { id: number; queue_length: number; cumulative_served: number; is_open: boolean; current_service_speed: number }[]
  activatingWindows: { id: number; ready_at: number }[]

  // Control
  isPlaying: boolean
  speed: number
  simId: string | null
  wsConnected: boolean
  showEndDialog: boolean

  // Actions
  buildLayout: (windowCount: number, twoP: number, fourP: number, sixP: number, barS: number, sofaS: number) => void
  applyBackendState: (state: BackendState) => void
  updateAnimations: (deltaTime: number) => void
  setIsPlaying: (p: boolean) => void
  setSpeed: (s: number) => void
  setSimId: (id: string | null) => void
  setWsConnected: (c: boolean) => void
  setShowEndDialog: (v: boolean) => void
  reset: () => void
}

function personColor(id: number): string {
  const colors = COLORS.groupFlagColors
  return colors[id % colors.length]
}

export function groupFlagColor(groupId: number): string {
  if (groupId < 0) return '#ffffff'
  const colors = COLORS.groupFlagColors
  return colors[groupId % colors.length]
}

const initialState = {
  layout: null as LayoutResult | null,
  layoutReady: false,
  persons: {} as Record<number, AnimatedPerson>,
  paths: {} as Record<string, PathVis>,
  timestep: 0,
  queuingCount: 0,
  seatedCount: 0,
  totalArrived: 0,
  totalLeft: 0,
  avgWaitTime: 0,
  windowStates: [] as { id: number; queue_length: number; cumulative_served: number; is_open: boolean; current_service_speed: number }[],
  activatingWindows: [] as { id: number; ready_at: number }[],
  isPlaying: false,
  speed: 1,
  simId: null as string | null,
  wsConnected: false,
  showEndDialog: false,
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...initialState,

  buildLayout: (windowCount, twoP, fourP, sixP, barS, sofaS) => {
    const layout = computeLayout({
      window_count: windowCount,
      two_person_tables: twoP,
      four_person_tables: fourP,
      six_person_tables: sixP,
      bar_seats: barS,
      sofa_seats: sofaS,
    })
    set({ layout, layoutReady: true })
  },

  applyBackendState: (backendState: BackendState) => {
    const { layout, persons: prevPersons, paths: prevPaths } = get()
    if (!layout) return

    const now = performance.now()
    const updatedPersons = { ...prevPersons }
    const updatedPaths = { ...prevPaths }
    const backendIds = new Set<number>()

    function dist3(a: [number, number, number], b: [number, number, number]): number {
      const dx = a[0] - b[0]
      const dz = a[2] - b[2]
      return Math.sqrt(dx * dx + dz * dz)
    }

    function spawnPos(): [number, number, number] {
      const s = computeSpawnPosition(layout!.entrance)
      return [s.x, s.y, s.z]
    }

    // Find first bar/sofa table IDs for global seat index mapping
    let firstBarTableId = -1
    let firstSofaTableId = -1
    if (backendState.tables) {
      for (const t of backendState.tables) {
        if (t.type === 'bar' && firstBarTableId < 0) firstBarTableId = t.id
        if (t.type === 'sofa' && firstSofaTableId < 0) firstSofaTableId = t.id
      }
    }

    // Process all persons from backend — update or create
    for (const p of backendState.all_persons) {
      backendIds.add(p.id)
      let target: [number, number, number]
      const personState = p.state as PersonState
      const existing = prevPersons[p.id]

      if (personState === 'left' || personState === 'leaving') {
        const offsetX = ((p.id * 137) % 100 - 50) / 100 * 0.8
        const offsetZ = ((p.id * 271) % 100 - 50) / 100 * 0.4
        target = [layout.exit.x + offsetX, 0.1, layout.exit.z + offsetZ]
      } else if (personState === 'arrived' && p.window_id != null) {
        const window = layout.windows.find(w => w.id === p.window_id)
        const wPos = window?.position ?? layout.allWindowPositions[p.window_id]
        if (wPos) {
          const z0 = wPos.z + WINDOW_DEPTH / 2 + 0.3
          target = [wPos.x, 0.1, z0 + p.queue_index * 0.55]
        } else {
          target = spawnPos()
        }
      } else if (personState === 'seated' && p.table_id != null) {
        // Route based on table_type to correct layout section
        if (p.table_type === 'bar' && layout.bar && firstBarTableId >= 0) {
          const globalIdx = p.table_id - firstBarTableId
          if (globalIdx >= 0 && globalIdx < layout.bar.seatPositions.length) {
            const seatPos = layout.bar.seatPositions[globalIdx]
            target = [seatPos.x, 0.1, seatPos.z]
          } else {
            target = [layout.bar.seatPositions[0]?.x ?? layout.entrance.x, 0.1, layout.entrance.z]
          }
        } else if (p.table_type === 'sofa' && layout.sofa && firstSofaTableId >= 0) {
          const globalIdx = (p.table_id - firstSofaTableId) * 3 + p.seat_index
          if (globalIdx >= 0 && globalIdx < layout.sofa.positions.length) {
            const sofaPos = layout.sofa.positions[globalIdx]
            target = [sofaPos.x, 0.1, sofaPos.z]
          } else {
            target = [layout.sofa.positions[0]?.x ?? layout.entrance.x, 0.1, layout.entrance.z]
          }
        } else {
          const table = layout.tables.find(t => t.id === p.table_id)
          if (table && p.seat_index < table.seatPositions.length) {
            const seatPos = table.seatPositions[p.seat_index]
            target = [seatPos.x, 0.1, seatPos.z]
          } else {
            const tpos = table?.position ?? layout.entrance
            target = [tpos.x, 0.1, tpos.z]
          }
        }
      } else if ((personState === 'queuing' || personState === 'serving' || personState === 'arrived') && p.window_id != null) {
        const window = layout.windows.find(w => w.id === p.window_id)
        const wPos = window?.position ?? layout.allWindowPositions[p.window_id]
        if (wPos) {
          const z0 = wPos.z + WINDOW_DEPTH / 2 + 0.3
          target = [wPos.x, 0.1, z0 + p.queue_index * 0.55]
        } else {
          target = spawnPos()
        }
      } else {
        target = spawnPos()
      }

      // Current position: use existing interpolated position or spawn
      const cPos: [number, number, number] = existing
        ? existing.position
        : spawnPos()

      // Defer state transition if person is mid-walk (finish current journey first)
      let effectiveState = personState
      let effectiveTarget = target
      let pendingState: PersonState | null = existing?.pendingState ?? null
      let pendingTarget: [number, number, number] | null = existing?.pendingTarget ?? null
      const stateChanged = existing?.personState !== personState

      if (existing?.walking && stateChanged) {
        // Defer: finish walking to current target, then apply new state
        effectiveState = existing.personState
        effectiveTarget = existing.targetPosition
        // Don't overwrite existing pending — queue transitions sequentially
        if (!existing.pendingState) {
          pendingState = personState
          pendingTarget = target
        } else {
          pendingState = existing.pendingState
          pendingTarget = existing.pendingTarget
        }
      } else if (!existing?.walking) {
        // Clear pending when not walking (fresh apply)
        pendingState = null
        pendingTarget = null
      }

      // Only reset walk origin on major position changes or when not walking
      const targetMovedFar = existing?.walking && dist3(existing.targetPosition, effectiveTarget) > 1.5
      const shouldResetWalk = !existing || targetMovedFar || !existing.walking

      const walkStart: [number, number, number] = shouldResetWalk
        ? cPos
        : existing.walkStartPosition
      const startTime = shouldResetWalk
        ? now
        : existing.startTime

      const walking = dist3(cPos, effectiveTarget) > 0.02

      // Defer visual state transition — keep previous color while walking
      let visualState = effectiveState
      if (walking && stateChanged && existing) {
        visualState = existing.visualState ?? existing.personState
      }

      updatedPersons[p.id] = {
        id: p.id,
        groupId: p.group_id,
        position: cPos,
        targetPosition: effectiveTarget,
        walkStartPosition: walkStart,
        rotation: 0,
        personState: effectiveState,
        visualState,
        color: personColor(p.id),
        groupColor: groupFlagColor(p.group_id),
        startTime,
        walking,
        pendingState,
        pendingTarget,
      }

      // Path line: create/update only while walking
      if (walking) {
        const waypoints = planPath(
          { x: walkStart[0], y: walkStart[1], z: walkStart[2] },
          { x: effectiveTarget[0], y: effectiveTarget[1], z: effectiveTarget[2] },
          layout
        )
        updatedPaths[`path-${p.id}`] = {
          id: `path-${p.id}`,
          waypoints: waypoints.map(w => [w.x, PATH_LINE_Y_OFFSET, w.z]),
          progress: 0,
          active: true,
          color: groupFlagColor(p.group_id),
        }
      } else {
        // Deactivate path when not walking
        const key = `path-${p.id}`
        if (updatedPaths[key]) {
          updatedPaths[key] = { ...updatedPaths[key], active: false }
        }
      }
    }

    // Remove persons backend no longer tracks, UNLESS still walking to exit
    for (const idStr of Object.keys(updatedPersons)) {
      const id = Number(idStr)
      const person = updatedPersons[id]
      const isLeaving = person.personState === 'left' || person.personState === 'leaving'
      const nearExit = dist3(person.position, [layout.exit.x, 0.1, layout.exit.z]) < 1.0

      if (!backendIds.has(id)) {
        if (!isLeaving || nearExit || !person.walking) {
          delete updatedPersons[id]
          delete updatedPaths[`path-${id}`]
        }
      } else if (isLeaving && nearExit && !person.walking) {
        // Still tracked by backend (LEFT retention period) but already at exit — remove now
        delete updatedPersons[id]
        delete updatedPaths[`path-${id}`]
      }
    }

    // Clean up stale inactive paths
    for (const key of Object.keys(updatedPaths)) {
      if (!updatedPaths[key].active) delete updatedPaths[key]
    }

    set({
      persons: updatedPersons,
      paths: updatedPaths,
      timestep: backendState.timestep,
      queuingCount: backendState.queuing_count,
      seatedCount: backendState.seated_count,
      totalArrived: backendState.total_arrived,
      totalLeft: backendState.total_left,
      avgWaitTime: backendState.avg_wait_time,
      windowStates: backendState.windows ?? [],
      activatingWindows: backendState.activating_windows ?? [],
    })
  },

  updateAnimations: (deltaTime: number) => {
    const { persons, paths, speed } = get()
    const now = performance.now()
    let changed = false

    const updatedPersons = { ...persons }
    const updatedPaths = { ...paths }

    for (const idStr of Object.keys(updatedPersons)) {
      const id = Number(idStr)
      const p = updatedPersons[id]
      if (!p?.walking) continue

      const elapsed = (now - p.startTime) / 1000 * speed
      const sx = p.walkStartPosition[0]
      const sz = p.walkStartPosition[2]
      const tx = p.targetPosition[0]
      const tz = p.targetPosition[2]
      const dx = tx - sx
      const dz = tz - sz
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < 0.02) {
        // Walk complete — apply pending state if any
        if (p.pendingState) {
          const newTarget = p.pendingTarget!
          const newDist = Math.sqrt(
            (newTarget[0] - p.targetPosition[0]) ** 2 +
            (newTarget[2] - p.targetPosition[2]) ** 2
          )
          updatedPersons[id] = {
            ...p,
            position: p.targetPosition,
            personState: p.pendingState,
            visualState: p.pendingState,
            targetPosition: newTarget,
            walkStartPosition: p.targetPosition,
            startTime: now,
            walking: newDist > 0.02,
            pendingState: null,
            pendingTarget: null,
          }
          // Create path for new walk if needed
          if (newDist > 0.02) {
            const waypoints = planPath(
              { x: p.targetPosition[0], y: p.targetPosition[1], z: p.targetPosition[2] },
              { x: newTarget[0], y: newTarget[1], z: newTarget[2] },
              get().layout
            )
            updatedPaths[`path-${id}`] = {
              id: `path-${id}`,
              waypoints: waypoints.map(w => [w.x, PATH_LINE_Y_OFFSET, w.z]),
              progress: 0,
              active: true,
              color: p.groupColor,
            }
          }
        } else {
          updatedPersons[id] = {
            ...p,
            position: p.targetPosition,
            walking: false,
            visualState: p.personState,
            pendingState: null,
            pendingTarget: null,
          }
        }
        const pathKey = `path-${id}`
        if (updatedPaths[pathKey]) {
          updatedPaths[pathKey] = { ...updatedPaths[pathKey], active: false }
        }
        changed = true
        continue
      }

      const totalDuration = dist / PERSON_WALK_SPEED
      const t = Math.min(elapsed / totalDuration, 1.0)
      // easeInOutQuad
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      const newPos: [number, number, number] = [
        sx + (tx - sx) * ease,
        // Walking bob based on movement progress
        p.targetPosition[1] + Math.sin(t * Math.PI * 4) * 0.05,
        sz + (tz - sz) * ease,
      ]

      // Snap if nearly done
      if (t >= 0.99) {
        if (p.pendingState) {
          const newTarget = p.pendingTarget!
          const newDist = Math.sqrt(
            (newTarget[0] - p.targetPosition[0]) ** 2 +
            (newTarget[2] - p.targetPosition[2]) ** 2
          )
          updatedPersons[id] = {
            ...p,
            position: p.targetPosition,
            personState: p.pendingState,
            visualState: p.pendingState,
            targetPosition: newTarget,
            walkStartPosition: p.targetPosition,
            startTime: now,
            walking: newDist > 0.02,
            pendingState: null,
            pendingTarget: null,
          }
          if (newDist > 0.02) {
            const waypoints = planPath(
              { x: p.targetPosition[0], y: p.targetPosition[1], z: p.targetPosition[2] },
              { x: newTarget[0], y: newTarget[1], z: newTarget[2] },
              get().layout
            )
            updatedPaths[`path-${id}`] = {
              id: `path-${id}`,
              waypoints: waypoints.map(w => [w.x, PATH_LINE_Y_OFFSET, w.z]),
              progress: 0,
              active: true,
              color: p.groupColor,
            }
          }
        } else {
          updatedPersons[id] = {
            ...p,
            position: p.targetPosition,
            walking: false,
            visualState: p.personState,
            pendingState: null,
            pendingTarget: null,
          }
        }
      } else {
        updatedPersons[id] = { ...p, position: newPos }
      }

      // Update path progress
      const pathKey = `path-${id}`
      if (updatedPaths[pathKey]) {
        updatedPaths[pathKey] = { ...updatedPaths[pathKey], progress: t }
      }
      changed = true
    }

    if (changed) {
      set({ persons: updatedPersons, paths: updatedPaths })
    }
  },

  setIsPlaying: (p) => set({ isPlaying: p }),
  setSpeed: (s) => set({ speed: s }),
  setSimId: (id) => set({ simId: id }),
  setWsConnected: (c) => set({ wsConnected: c }),
  setShowEndDialog: (v: boolean) => set({ showEndDialog: v }),
  reset: () => set({ ...initialState }),
}))
