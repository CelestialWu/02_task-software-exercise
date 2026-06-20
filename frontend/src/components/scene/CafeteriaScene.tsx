import { useSimulationStore } from '../../store/simulationStore'
import { CameraController } from './CameraController'
import { Lighting } from './Lighting'
import { Floor } from './Floor'
import { Walls } from './Walls'
import { Window } from './Window'
import { Table } from './Table'
import { BarCounter } from './BarCounter'
import { Sofa } from './Sofa'
import { Person } from './Person'
import { PathLine } from './PathLine'
import { Decorations } from './Decorations'
import { useEffect, useMemo } from 'react'
//从Zustand读数据，react钩子
export function CafeteriaScene() {
  const layout = useSimulationStore(s => s.layout)
  const persons = useSimulationStore(s => s.persons)
  const paths = useSimulationStore(s => s.paths)
  const timestep = useSimulationStore(s => s.timestep)
  const windowStates = useSimulationStore(s => s.windowStates)
  const activatingWindows = useSimulationStore(s => s.activatingWindows)
  const buildLayout = useSimulationStore(s => s.buildLayout)
  const layoutReady = useSimulationStore(s => s.layoutReady)
  //读数据
  //默认参数
  useEffect(() => {
    if (!layoutReady) {
      buildLayout(4, 8, 10, 5, 6, 4)
    }
  }, [layoutReady, buildLayout])

  if (!layout) return null

  // 对象转化成数组
  const personList = Object.values(persons)
  const pathList = Object.values(paths).filter(p => p.active)

  // Merge active and activating windows for rendering
  const allWindows = useMemo(() => {
    const result: { id: number; isOpen: boolean; isActivating: boolean }[] = []
    const activatingIds = new Set(activatingWindows.map(w => w.id))
    for (const w of windowStates) {
      result.push({ id: w.id, isOpen: w.is_open, isActivating: false })
    }
    for (const a of activatingWindows) {
      if (!result.find(r => r.id === a.id)) {
        result.push({ id: a.id, isOpen: false, isActivating: true })
      }
    }
    result.sort((a, b) => a.id - b.id)
    return result
  }, [windowStates, activatingWindows])

  return (
    <group>
      <CameraController floorWidth={layout.floorWidth} floorDepth={layout.floorDepth} />
      <Lighting />

      <Floor width={layout.floorWidth} depth={layout.floorDepth} />
      <Walls width={layout.floorWidth} depth={layout.floorDepth} />

      {/* Windows — from store state */}
      {allWindows.map(w => {
        const pos = layout.allWindowPositions[w.id]
        if (!pos) return null
        return (
          <Window
            key={`win-${w.id}`}
            position={[pos.x, 0, pos.z]}
            id={w.id}
            isOpen={w.isOpen}
            isActivating={w.isActivating}
            queueLength={0}
          />
        )
      })}

      {/* Tables */}
      {layout.tables.map(t => {
        const occupiedSeats: boolean[] = t.seatPositions.map((_, i) => {
          return personList.some(
            p => p.personState === 'seated' &&
              Math.abs(p.targetPosition[0] - t.seatPositions[i].x) < 0.3 &&
              Math.abs(p.targetPosition[2] - t.seatPositions[i].z) < 0.3
          )
        })
        return (
          <Table
            key={`table-${t.id}`}
            position={[t.position.x, t.position.y, t.position.z]}
            type={t.type}
            id={t.id}
            occupiedSeats={occupiedSeats}
          />
        )
      })}

      {/* Bar */}
      {layout.bar.seatPositions.length > 0 && (
        <BarCounter
          counterStart={[layout.bar.counterStart.x, layout.bar.counterStart.y, layout.bar.counterStart.z]}
          counterEnd={[layout.bar.counterEnd.x, layout.bar.counterEnd.y, layout.bar.counterEnd.z]}
          seatPositions={layout.bar.seatPositions.map(s => [s.x, s.y, s.z] as [number, number, number])}
          occupiedSeats={layout.bar.seatPositions.map((_, i) => {
            return personList.some(
              p => p.personState === 'seated' &&
                Math.abs(p.targetPosition[0] - layout.bar.seatPositions[i].x) < 0.3 &&
                Math.abs(p.targetPosition[2] - layout.bar.seatPositions[i].z) < 0.3
            )
          })}
        />
      )}

      {/* Sofa */}
      {layout.sofa.positions.length > 0 && (
        <Sofa
          seatPositions={layout.sofa.positions.map(s => [s.x, s.y, s.z] as [number, number, number])}
          occupiedSeats={layout.sofa.positions.map((_, i) => {
            return personList.some(
              p => p.personState === 'seated' &&
                Math.abs(p.targetPosition[0] - layout.sofa.positions[i].x) < 0.3 &&
                Math.abs(p.targetPosition[2] - layout.sofa.positions[i].z) < 0.3
            )
          })}
        />
      )}

      {/* People */}
      {personList.map(p => (
        <Person
          key={`person-${p.id}`}
          position={p.position}
          personState={p.personState}
          visualState={p.visualState}
          personColor={p.color}
          groupColor={p.groupColor}
          groupId={p.groupId}
          walking={p.walking}
        />
      ))}

      {/* Path lines */}
      {pathList.map(p => (
        <PathLine
          key={p.id}
          waypoints={p.waypoints}
          progress={p.progress}
          active={p.active}
          color={p.color}
        />
      ))}

      <Decorations floorWidth={layout.floorWidth} floorDepth={layout.floorDepth} timestep={timestep} />
    </group>
  )
}
