import { useState } from 'react'
import { useSimulationStore } from '../../store/simulationStore'
import { X } from 'lucide-react'

interface Props {
  onBack: () => void
}

export function SimulationEndDialog({ onBack }: Props) {
  const setShowEndDialog = useSimulationStore(s => s.setShowEndDialog)
  const showEndDialog = useSimulationStore(s => s.showEndDialog)
  const timestep = useSimulationStore(s => s.timestep)
  const totalArrived = useSimulationStore(s => s.totalArrived)
  const totalLeft = useSimulationStore(s => s.totalLeft)
  const seatedCount = useSimulationStore(s => s.seatedCount)
  const avgWaitTime = useSimulationStore(s => s.avgWaitTime)
  const simId = useSimulationStore(s => s.simId)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  
  const windowStates = useSimulationStore(s => s.windowStates)
  const layout = useSimulationStore(s => s.layout)
  if (!showEndDialog) return null

  const handleClose = () => {
    setShowEndDialog(false)
  }

  const displayData = {
    timestep,
    totalArrived,
    totalLeft,
    seatedCount,
    avgWaitTime,
    simId: simId ?? 'N/A',
    windowStates,
    layout,
  }

  const buildCsvContent = () => {
    const lines: string[] = []
    const w = (label: string, value: string | number) => lines.push(`${label},${value}`)
    const header = (title: string) => { lines.push(''); lines.push(`=== ${title} ===`); lines.push('') }
    const now = new Date()
    const currentQueuing = useSimulationStore.getState().queuingCount
    const state = useSimulationStore.getState()

    header('仿真基本信息')
    w('仿真编号', displayData.simId ?? 'N/A')
    w('导出时间', now.toLocaleString('zh-CN'))
    w('仿真时长(分钟)', displayData.timestep)
    w('仿真步骤', state.timestep)

    header('人员总体统计')
    w('到达总人数', displayData.totalArrived)
    w('已离场人数', displayData.totalLeft)
    w('当前排队中', currentQueuing)
    w('当前就餐中', displayData.seatedCount)
    w('仍在场内(含排队+就餐)', displayData.totalArrived - displayData.totalLeft)
    w('平均等待时间(分钟)', displayData.avgWaitTime.toFixed(2))
    w('离场率', displayData.totalArrived > 0 ? ((displayData.totalLeft / displayData.totalArrived) * 100).toFixed(1) + '%' : 'N/A')
    w('入场率(人/分钟)', displayData.timestep > 0 ? (displayData.totalArrived / displayData.timestep).toFixed(2) : 'N/A')
    w('离场率(人/分钟)', displayData.timestep > 0 ? (displayData.totalLeft / displayData.timestep).toFixed(2) : 'N/A')
    w('就座率', displayData.totalArrived > 0 ? ((displayData.seatedCount / displayData.totalArrived) * 100).toFixed(1) + '%' : 'N/A')
    w('在场率', displayData.totalArrived > 0 ? (((displayData.totalArrived - displayData.totalLeft) / displayData.totalArrived) * 100).toFixed(1) + '%' : 'N/A')

    header('窗口详细统计')
    lines.push('窗口编号,窗口ID,当前排队,累计服务人数,状态,当前服务速度(分钟/人),平均每人服务时间,服务效率(人/分钟)')
    for (const ws of displayData.windowStates) {
      const efficiency = ws.current_service_speed > 0 ? (1 / ws.current_service_speed).toFixed(2) : 'N/A'
      lines.push(`W${ws.id + 1},${ws.id},${ws.queue_length},${ws.cumulative_served},${ws.is_open ? '开启' : '关闭'},${ws.current_service_speed.toFixed(2)},${ws.current_service_speed.toFixed(2)},${efficiency}`)
    }
    const totalServed = displayData.windowStates.reduce((s, w) => s + w.cumulative_served, 0)
    const avgSpeed = displayData.windowStates.length > 0
      ? (displayData.windowStates.reduce((s, w) => s + w.current_service_speed, 0) / displayData.windowStates.length).toFixed(2)
      : 'N/A'
    lines.push(`合计,,,${totalServed},,,`)
    lines.push(`平均,,,,,${avgSpeed},,`)
    lines.push(`窗口总数,${displayData.windowStates.length}`)
    lines.push(`开启窗口数,${displayData.windowStates.filter(w => w.is_open).length}`)

    header('座位占用详细统计')
    if (displayData.layout) {
      const totalTableSeats = displayData.layout.tables.reduce((s, t) => s + t.capacity, 0)
      const totalBarSeats = displayData.layout.bar.seatCount
      const totalSofaSeats = displayData.layout.sofa.seatCount
      const totalSeats = totalTableSeats + totalBarSeats + totalSofaSeats
      const occupancyRate = totalSeats > 0 ? ((displayData.seatedCount / totalSeats) * 100).toFixed(1) : 'N/A'

      w('总座位数', totalSeats)
      w('其中餐桌座位', totalTableSeats)
      w('其中吧台座位', totalBarSeats)
      w('其中沙发座位', totalSofaSeats)
      w('当前占用', displayData.seatedCount)
      w('空余座位', totalSeats - displayData.seatedCount)
      w('占用率', occupancyRate + '%')

      lines.push('')
      lines.push('座位类型,容量,当前占用,占用率')
      const typeData: { type: string; capacity: number; occupied: number }[] = []
      let tableOccTotal = 0
      for (const t of displayData.layout.tables) {
        const existing = typeData.find(d => d.type === t.type)
        if (existing) {
          existing.capacity += t.capacity
        } else {
          typeData.push({ type: t.type, capacity: t.capacity, occupied: 0 })
        }
      }
      // Estimate occupancy from seated count proportionally
      if (displayData.seatedCount > 0) {
        const tableShare = totalTableSeats / totalSeats
        tableOccTotal = Math.round(displayData.seatedCount * tableShare)
      }
      const nameMap: Record<string, string> = { two_person: '双人桌', four_person: '四人桌', six_person: '六人桌', bar: '吧台', sofa: '沙发' }
      for (const d of typeData) {
        const occ = Math.min(d.capacity, Math.round(tableOccTotal * (d.capacity / totalTableSeats)))
        const rate = d.capacity > 0 ? ((occ / d.capacity) * 100).toFixed(1) : '0'
        lines.push(`${nameMap[d.type] ?? d.type},${d.capacity},${occ},${rate}%`)
      }
      const barOcc = Math.min(totalBarSeats, displayData.seatedCount - tableOccTotal > 0 ? displayData.seatedCount - tableOccTotal : 0)
      const sofaOcc = Math.min(totalSofaSeats, Math.max(0, displayData.seatedCount - tableOccTotal - barOcc))
      lines.push(`${nameMap['bar']},${totalBarSeats},${barOcc},${totalBarSeats > 0 ? ((barOcc / totalBarSeats) * 100).toFixed(1) : '0'}%`)
      lines.push(`${nameMap['sofa']},${totalSofaSeats},${sofaOcc},${totalSofaSeats > 0 ? ((sofaOcc / totalSofaSeats) * 100).toFixed(1) : '0'}%`)
    }

    header('时间序列汇总')
    w('说明', '以下为仿真结束时刻的状态快照，详细逐步骤数据请参考后端数据库snapshots表')
    w('最终步骤', state.timestep)
    w('最终到达', displayData.totalArrived)
    w('最终离场', displayData.totalLeft)
    w('最终排队', currentQueuing)
    w('最终就餐', displayData.seatedCount)

    header('仿真配置参数')
    w('场景', '午餐(Lunch) - 双峰高斯分布')
    w('总时长(分钟)', displayData.timestep)
    w('初始窗口数', displayData.windowStates.filter(w => w.id < 4).length || 4)
    w('动态窗口数', Math.max(0, displayData.windowStates.length - 4))
    w('窗口总数', displayData.windowStates.length)
    if (displayData.layout) {
      w('双人桌数', displayData.layout.tables.filter(t => t.type === 'two_person').length || 8)
      w('四人桌数', displayData.layout.tables.filter(t => t.type === 'four_person').length || 10)
      w('六人桌数', displayData.layout.tables.filter(t => t.type === 'six_person').length || 5)
    }
    w('吧台座位数', displayData.layout?.bar.seatCount ?? 6)
    w('沙发座位数', displayData.layout?.sofa.seatCount ?? 4)
    w('平均用餐时长(分钟)', 25)
    w('最短用餐时间(分钟)', 5)

    return lines.join('\n')
  }

  const handleExportCSV = async () => {
    setExporting(true)
    setExportStatus('导出中...')

    try {
      const csv = buildCsvContent()
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `simulation_${displayData.simId}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('✓ 导出成功!')
      setTimeout(() => setExportStatus(null), 2000)
    } catch (err) {
      setExportStatus('✗ 导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = () => {
    const currentQueuing = useSimulationStore.getState().queuingCount
    const state = useSimulationStore.getState()

    const windowRows = displayData.windowStates.map(w => `
      <tr>
        <td>W${w.id + 1}</td>
        <td>${w.id}</td>
        <td>${w.queue_length}</td>
        <td>${w.cumulative_served}</td>
        <td>${w.is_open ? '开启' : '关闭'}</td>
        <td>${w.current_service_speed.toFixed(2)}</td>
        <td>${w.current_service_speed > 0 ? (1 / w.current_service_speed).toFixed(2) : 'N/A'}</td>
      </tr>
    `).join('')

    const totalServed = displayData.windowStates.reduce((s, w) => s + w.cumulative_served, 0)
    const totalSeats = displayData.layout
      ? displayData.layout.tables.reduce((s, t) => s + t.capacity, 0) + displayData.layout.bar.seatCount + displayData.layout.sofa.seatCount
      : 0
    const totalTableSeats = displayData.layout?.tables.reduce((s, t) => s + t.capacity, 0) ?? 0
    const totalBarSeats = displayData.layout?.bar.seatCount ?? 0
    const totalSofaSeats = displayData.layout?.sofa.seatCount ?? 0
    const occupancyRate = totalSeats > 0 ? ((displayData.seatedCount / totalSeats) * 100).toFixed(1) : 'N/A'
    const departureRate = displayData.totalArrived > 0 ? ((displayData.totalLeft / displayData.totalArrived) * 100).toFixed(1) : 'N/A'
    const arrivalRate = displayData.timestep > 0 ? (displayData.totalArrived / displayData.timestep).toFixed(2) : 'N/A'
    const seatRate = displayData.totalArrived > 0 ? ((displayData.seatedCount / displayData.totalArrived) * 100).toFixed(1) : 'N/A'
    const openWindows = displayData.windowStates.filter(w => w.is_open).length
    const avgSpeed = displayData.windowStates.length > 0
      ? (displayData.windowStates.reduce((s, w) => s + w.current_service_speed, 0) / displayData.windowStates.length).toFixed(2)
      : 'N/A'

    // Seat type rows
    let seatTypeRows = ''
    if (displayData.layout) {
      const nameMap: Record<string, string> = { two_person: '双人桌', four_person: '四人桌', six_person: '六人桌', bar: '吧台', sofa: '沙发' }
      const typeData: { type: string; label: string; capacity: number }[] = []
      for (const t of displayData.layout.tables) {
        const existing = typeData.find(d => d.type === t.type)
        if (existing) { existing.capacity += t.capacity }
        else { typeData.push({ type: t.type, label: nameMap[t.type] ?? t.type, capacity: t.capacity }) }
      }
      typeData.push({ type: 'bar', label: '吧台', capacity: totalBarSeats })
      typeData.push({ type: 'sofa', label: '沙发', capacity: totalSofaSeats })
      seatTypeRows = typeData.map(d => `
        <tr><td>${d.label}</td><td>${d.capacity} 座</td><td>${d.type === 'bar' ? '1人/座 · 靠墙吧台' : d.type === 'sofa' ? '3人/座 · L型沙发' : '标准餐桌'}</td></tr>
      `).join('')
    }

    const reportHTML = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>食堂仿真报告 - ${displayData.simId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: SimSun, 'Microsoft YaHei', Arial, sans-serif; background: white; color: #333; padding: 40px 30px; }
          h1 { text-align: center; color: #8B4513; margin-bottom: 5px; font-size: 28px; }
          .subtitle { text-align: center; color: #A0826D; margin-bottom: 30px; font-size: 13px; }
          h2 { color: #8B4513; font-size: 16px; border-bottom: 2px solid #D4AF37; padding-bottom: 8px; margin: 30px 0 15px; }
          .card { background: #FFF8E7; border: 1px solid #D4AF37; border-radius: 8px; padding: 18px 20px; margin-bottom: 15px; }
          .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E8D5B7; }
          .stat-row:last-child { border-bottom: none; }
          .label { color: #8B6914; font-size: 14px; font-weight: 500; }
          .value { color: #B8860B; font-weight: bold; font-size: 15px; }
          .highlight { color: #D4AF37; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; background: white; }
          th { text-align: left; color: #8B4513; font-size: 13px; padding: 10px 12px; border-bottom: 2px solid #D4AF37; background: #FFF8E7; font-weight: bold; }
          td { color: #333; font-size: 13px; padding: 10px 12px; border-bottom: 1px solid #E8D5B7; }
          tr:nth-child(even) { background: #FFFAF0; }
          .summary-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .summary-item { text-align: center; background: #FFF8E7; border: 1px solid #D4AF37; border-radius: 8px; padding: 15px 10px; }
          .summary-num { font-size: 32px; font-weight: bold; color: #D4AF37; }
          .summary-label { font-size: 12px; color: #8B6914; margin-top: 4px; }
          .footer { text-align: center; color: #999; margin-top: 50px; font-size: 11px; border-top: 1px solid #E8D5B7; padding-top: 20px; }
          .section { page-break-inside: avoid; }
          .config-table td:first-child { font-weight: 500; color: #8B6914; width: 160px; }
          @media print {
            body { padding: 20px; }
            .card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>食堂仿真报告</h1>
        <p class="subtitle">Cozy Cafeteria Simulator · ${displayData.timestep} 分钟仿真 · 导出时间: ${new Date().toLocaleString('zh-CN')}</p>

        <!-- Summary boxes -->
        <div class="summary-box">
          <div class="summary-item">
            <div class="summary-num">${displayData.totalArrived}</div>
            <div class="summary-label">到达总人数</div>
          </div>
          <div class="summary-item">
            <div class="summary-num">${displayData.totalLeft}</div>
            <div class="summary-label">已离场人数</div>
          </div>
          <div class="summary-item">
            <div class="summary-num">${departureRate}%</div>
            <div class="summary-label">离场率</div>
          </div>
        </div>

        <div class="section">
          <h2>一、人员统计</h2>
          <div class="card">
            <div class="stat-row"><span class="label">到达总人数</span><span class="value">${displayData.totalArrived} 人</span></div>
            <div class="stat-row"><span class="label">已离场人数</span><span class="value">${displayData.totalLeft} 人</span></div>
            <div class="stat-row"><span class="label">当前排队中</span><span class="value">${currentQueuing} 人</span></div>
            <div class="stat-row"><span class="label">当前就餐中</span><span class="value">${displayData.seatedCount} 人</span></div>
            <div class="stat-row"><span class="label">仍在场内</span><span class="value">${displayData.totalArrived - displayData.totalLeft} 人</span></div>
            <div class="stat-row"><span class="label">平均等待时间</span><span class="value highlight">${displayData.avgWaitTime.toFixed(1)} 分钟</span></div>
            <div class="stat-row"><span class="label">入场速率</span><span class="value">${arrivalRate} 人/分钟</span></div>
            <div class="stat-row"><span class="label">离场率</span><span class="value">${departureRate}%</span></div>
            <div class="stat-row"><span class="label">就座率</span><span class="value">${seatRate}%</span></div>
          </div>
        </div>

        <div class="section">
          <h2>二、窗口统计 · 总计服务 ${totalServed} 人</h2>
          <div class="card">
            <div class="stat-row"><span class="label">窗口总数</span><span class="value">${displayData.windowStates.length} 个</span></div>
            <div class="stat-row"><span class="label">开启窗口</span><span class="value">${openWindows} 个</span></div>
            <div class="stat-row"><span class="label">平均服务速度</span><span class="value">${avgSpeed} 分钟/人</span></div>
            <div class="stat-row"><span class="label">累计总服务</span><span class="value">${totalServed} 人</span></div>
          </div>
          <div class="card">
            <table>
              <thead><tr><th>窗口名</th><th>ID</th><th>排队</th><th>累计服务</th><th>状态</th><th>速度</th><th>效率</th></tr></thead>
              <tbody>${windowRows}</tbody>
              <tfoot><tr style="font-weight:bold;background:#FFF8E7"><td>合计</td><td></td><td></td><td>${totalServed}</td><td></td><td>${avgSpeed}</td><td></td></tr></tfoot>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>三、座位占用 · 共 ${totalSeats} 座</h2>
          <div class="card">
            <div class="stat-row"><span class="label">总座位数</span><span class="value">${totalSeats} 座</span></div>
            <div class="stat-row"><span class="label">餐桌座位</span><span class="value">${totalTableSeats} 座</span></div>
            <div class="stat-row"><span class="label">吧台座位</span><span class="value">${totalBarSeats} 座</span></div>
            <div class="stat-row"><span class="label">沙发座位</span><span class="value">${totalSofaSeats} 座</span></div>
            <div class="stat-row"><span class="label">当前占用</span><span class="value">${displayData.seatedCount} 座</span></div>
            <div class="stat-row"><span class="label">占用率</span><span class="value highlight">${occupancyRate}%</span></div>
            <div class="stat-row"><span class="label">空余座位</span><span class="value">${totalSeats - displayData.seatedCount} 座</span></div>
          </div>
          <div class="card">
            <table>
              <thead><tr><th>座位类型</th><th>容量</th><th>说明</th></tr></thead>
              <tbody>${seatTypeRows}</tbody>
            </table>
          </div>
        </div>

        <div class="section">
          <h2>四、仿真配置参数</h2>
          <div class="card">
            <table class="config-table">
              <tr><td>仿真场景</td><td>午餐 (Lunch) — 双峰高斯分布</td></tr>
              <tr><td>仿真时长</td><td>${displayData.timestep} 分钟</td></tr>
              <tr><td>仿真步骤</td><td>${state.timestep} 步</td></tr>
              <tr><td>初始窗口数</td><td>${displayData.windowStates.filter(w => w.id < 4).length || 4} 个</td></tr>
              <tr><td>动态新增窗口</td><td>${Math.max(0, displayData.windowStates.length - 4)} 个</td></tr>
              <tr><td>平均用餐时长</td><td>25 分钟</td></tr>
              <tr><td>最短用餐时间</td><td>5 分钟</td></tr>
              <tr><td>窗口打饭速度</td><td>1.0 分钟/人 (基准)</td></tr>
              <tr><td>全局人数上限</td><td>120 人 (硬限制)</td></tr>
            </table>
          </div>
        </div>

        <p class="footer">
          Cozy Cafeteria Simulator · 仿真编号: ${displayData.simId?.slice(0, 8) ?? 'N/A'}...<br/>
          导出时间: ${new Date().toLocaleString('zh-CN')} · 北京交通大学食堂仿真系统
        </p>
      </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(reportHTML)
      w.document.close()
      setTimeout(() => w.print(), 500)
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-900/70 backdrop-blur-sm">
      <div className="glass-panel p-8 max-w-sm w-full mx-4 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl text-amber-100 font-semibold">仿真结束</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400/50 hover:text-amber-200 hover:bg-amber-700/20 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-amber-400/60">运行时长</span>
            <span className="text-amber-200">{displayData.timestep} 分钟</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-400/60">到达人数</span>
            <span className="text-amber-200">{displayData.totalArrived} 人</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-400/60">离场人数</span>
            <span className="text-amber-200">{displayData.totalLeft} 人</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-400/60">平均等待</span>
            <span className="text-amber-200">{displayData.avgWaitTime.toFixed(1)} 分钟</span>
          </div>
        </div>

        {/* Export buttons */}
        <div className="space-y-3 mb-4">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full py-2.5 rounded-lg bg-amber-700/30 hover:bg-amber-600/40 border border-amber-600/30
                       text-amber-200 text-sm transition-all disabled:opacity-50"
          >
            {exporting ? (exportStatus || '导出中...') : '导出 CSV'}
          </button>
          <button
            onClick={handleExportPDF}
            className="w-full py-2.5 rounded-lg bg-amber-700/20 hover:bg-amber-600/30 border border-amber-600/20
                       text-amber-300 text-sm transition-all"
          >
            导出 PDF 报告
          </button>
        </div>

        {exportStatus && !exporting && (
          <div className="text-center text-xs text-amber-300 mb-3">{exportStatus}</div>
        )}

        {/* Back to home */}
        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600/30
                     text-amber-400/70 text-sm transition-all mt-2"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
