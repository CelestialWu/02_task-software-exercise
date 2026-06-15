import { useState, useMemo } from 'react'
import { useSimulationStore } from '../../store/simulationStore'
import {
  BarChart3, Store, Armchair, Settings,
  ChevronRight, X, Users, Clock, TrendingUp, DoorOpen,
} from 'lucide-react'

type PanelId = 'stats' | 'windows' | 'tables' | null

function CircleButton({ icon, active, onClick, label }: {
  icon: React.ReactNode; active: boolean; onClick: () => void; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
        ${active
          ? 'bg-amber-600/60 text-amber-100 shadow-lg shadow-amber-900/30 scale-110'
          : 'bg-stone-800/80 text-amber-300/70 hover:bg-amber-700/30 hover:text-amber-200 border border-amber-700/20'
        }`}
      title={label}
    >
      {icon}
    </button>
  )
}

function StatCard({ title, icon, onClose, children }: {
  title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="bg-stone-900/92 backdrop-blur-xl rounded-2xl border border-amber-700/30 shadow-2xl shadow-black/40 w-72 overflow-hidden animate-slide-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/20 bg-stone-800/60">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{icon}</span>
          <span className="text-sm font-medium text-amber-200">{title}</span>
        </div>
        <button onClick={onClose} className="text-amber-500/50 hover:text-amber-300 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function StatItem({ icon, label, value, color = 'text-amber-200' }: {
  icon: React.ReactNode; label: string; value: string | number; color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-amber-400/60 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-mono font-medium ${color}`}>{value}</span>
    </div>
  )
}

export function StatPanels() {
  const [activePanel, setActivePanel] = useState<PanelId>(null)

  const timestep = useSimulationStore(s => s.timestep)
  const queuingCount = useSimulationStore(s => s.queuingCount)
  const seatedCount = useSimulationStore(s => s.seatedCount)
  const totalArrived = useSimulationStore(s => s.totalArrived)
  const totalLeft = useSimulationStore(s => s.totalLeft)
  const avgWaitTime = useSimulationStore(s => s.avgWaitTime)
  const persons = useSimulationStore(s => s.persons)
  const layout = useSimulationStore(s => s.layout)

  const togglePanel = (id: PanelId) => {
    setActivePanel(prev => prev === id ? null : id)
  }

  const windowStates = useSimulationStore(s => s.windowStates)

  const windowStats = useMemo(() => {
    return windowStates.map(w => ({
      id: w.id,
      queueLen: w.queue_length,
      served: w.cumulative_served,
      speed: w.current_service_speed,
      open: w.is_open,
    }))
  }, [windowStates])

  const tableStats = useMemo(() => {
    if (!layout) return { twoP: { total: 0, occupied: 0 }, fourP: { total: 0, occupied: 0 }, sixP: { total: 0, occupied: 0 }, bar: { total: 0, occupied: 0 }, sofa: { total: 0, occupied: 0 } }
    const personList = Object.values(persons)
    const seated = personList.filter(p => p.personState === 'seated')

    const countNear = (positions: { x: number; z: number }[]) =>
      seated.filter(s => positions.some(pos =>
        Math.abs(s.targetPosition[0] - pos.x) < 0.3 && Math.abs(s.targetPosition[2] - pos.z) < 0.3
      )).length

    const twoPTotal = layout.tables.filter(t => t.type === 'two_person').length * 2
    const fourPTotal = layout.tables.filter(t => t.type === 'four_person').length * 4
    const sixPTotal = layout.tables.filter(t => t.type === 'six_person').length * 6
    const barTotal = layout.bar.seatPositions.length
    const sofaTotal = layout.sofa.positions.length

    const twoPOcc = layout.tables.filter(t => t.type === 'two_person').reduce((sum, t) => sum + countNear(t.seatPositions), 0)
    const fourPOcc = layout.tables.filter(t => t.type === 'four_person').reduce((sum, t) => sum + countNear(t.seatPositions), 0)
    const sixPOcc = layout.tables.filter(t => t.type === 'six_person').reduce((sum, t) => sum + countNear(t.seatPositions), 0)
    const barOcc = countNear(layout.bar.seatPositions)
    const sofaOcc = countNear(layout.sofa.positions)

    return {
      twoP: { total: twoPTotal, occupied: twoPOcc },
      fourP: { total: fourPTotal, occupied: fourPOcc },
      sixP: { total: sixPTotal, occupied: sixPOcc },
      bar: { total: barTotal, occupied: barOcc },
      sofa: { total: sofaTotal, occupied: sofaOcc },
    }
  }, [layout, persons])

  const totalCapacity = useMemo(() =>
    tableStats.twoP.total + tableStats.fourP.total + tableStats.sixP.total + tableStats.bar.total + tableStats.sofa.total,
    [tableStats]
  )
  const totalOccupied = useMemo(() =>
    tableStats.twoP.occupied + tableStats.fourP.occupied + tableStats.sixP.occupied + tableStats.bar.occupied + tableStats.sofa.occupied,
    [tableStats]
  )

  return (
    <>
      {/* Circle buttons - right side, below header */}
      <div className="absolute top-16 right-4 flex flex-col gap-2.5 pointer-events-auto z-30">
        <CircleButton
          icon={<BarChart3 size={18} />}
          active={activePanel === 'stats'}
          onClick={() => togglePanel('stats')}
          label="Statistics"
        />
        <CircleButton
          icon={<Store size={18} />}
          active={activePanel === 'windows'}
          onClick={() => togglePanel('windows')}
          label="Windows"
        />
        <CircleButton
          icon={<Armchair size={18} />}
          active={activePanel === 'tables'}
          onClick={() => togglePanel('tables')}
          label="Tables"
        />
      </div>

      {/* Stats Card */}
      {activePanel === 'stats' && (
        <div className="absolute top-16 right-20 pointer-events-auto z-40">
          <StatCard title="Simulation Stats" icon={<BarChart3 size={16} />} onClose={() => setActivePanel(null)}>
            <StatItem icon={<Clock size={13} />} label="Timestep" value={timestep} />
            <StatItem icon={<Users size={13} />} label="In Queue" value={queuingCount} color="text-orange-300" />
            <StatItem icon={<Armchair size={13} />} label="Seated" value={seatedCount} color="text-green-300" />
            <StatItem icon={<DoorOpen size={13} />} label="Total Arrived" value={totalArrived} color="text-blue-300" />
            <StatItem icon={<TrendingUp size={13} />} label="Total Left" value={totalLeft} color="text-gray-300" />
            <StatItem icon={<Clock size={13} />} label="Avg Wait" value={`${avgWaitTime.toFixed(1)}m`} color="text-yellow-300" />
            <div className="pt-2 border-t border-amber-700/20 mt-2">
              <StatItem icon={<Armchair size={13} />} label="Occupancy" value={`${totalOccupied} / ${totalCapacity}`} color="text-amber-200" />
              <StatItem icon={<TrendingUp size={13} />} label="Utilization" value={`${totalCapacity > 0 ? (totalOccupied / totalCapacity * 100).toFixed(1) : 0}%`} color="text-amber-200" />
            </div>
          </StatCard>
        </div>
      )}

      {/* Windows Card */}
      {activePanel === 'windows' && (
        <div className="absolute top-16 right-20 pointer-events-auto z-40">
          <StatCard title="Window Status" icon={<Store size={16} />} onClose={() => setActivePanel(null)}>
            {windowStats.length === 0 && (
              <p className="text-xs text-amber-400/40">No windows configured</p>
            )}
            {windowStats.map(w => (
              <div key={w.id} className="space-y-1.5 border-b border-amber-700/10 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${!w.open ? 'bg-gray-500' : w.queueLen > 10 ? 'bg-red-400' : w.queueLen > 5 ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <span className="text-xs text-amber-300/80">Window W{w.id + 1}</span>
                    {!w.open && <span className="text-[10px] text-gray-500">(closed)</span>}
                  </div>
                  <span className="text-xs font-mono text-amber-200">{w.queueLen} in queue</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-400/50">
                  <span>Served: {w.served}</span>
                  <span>Speed: {w.speed.toFixed(2)}m/p</span>
                </div>
              </div>
            ))}
          </StatCard>
        </div>
      )}

      {/* Tables Card */}
      {activePanel === 'tables' && (
        <div className="absolute top-16 right-20 pointer-events-auto z-40">
          <StatCard title="Table Occupancy" icon={<Armchair size={16} />} onClose={() => setActivePanel(null)}>
            {([
              ['2P Tables', tableStats.twoP],
              ['4P Tables', tableStats.fourP],
              ['6P Tables', tableStats.sixP],
              ['Bar', tableStats.bar],
              ['Sofa', tableStats.sofa],
            ] as const).map(([label, stats]) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300/80">{label}</span>
                  <span className="text-xs font-mono text-amber-200">{stats.occupied}/{stats.total}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-stone-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.total > 0 ? (stats.occupied / stats.total * 100) : 0}%`,
                      backgroundColor: stats.total > 0 && stats.occupied / stats.total > 0.8 ? '#EF4444' :
                        stats.total > 0 && stats.occupied / stats.total > 0.5 ? '#F59E0B' : '#22C55E',
                    }}
                  />
                </div>
              </div>
            ))}
          </StatCard>
        </div>
      )}
    </>
  )
}
