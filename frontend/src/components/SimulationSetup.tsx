import { useState } from 'react'
import { simulationAPI } from '@/lib/api'
import type { SimulationPreset, SimulationConfig } from '@/lib/types'

interface Preset {
  key: SimulationPreset
  label: string
  description: string
  config: Partial<SimulationConfig>
  layout: {
    windowCount: number
    twoPersonTables: number
    fourPersonTables: number
    sixPersonTables: number
    barSeats: number
    sofaSeats: number
  }
}

const PRESETS: Preset[] = [
  {
    key: 'breakfast',
    label: '早餐',
    description: '均匀客流',
    config: {
      scenario: 'breakfast',
      total_duration: 90,
      initial_window_count: 3,
      window_base_speed: 1.5,
      arrival_rate_base: 4.0,
      solo_ratio: 0.7,
      pair_ratio: 0.25,
      group_ratio: 0.05,
    },
    layout: { windowCount: 3, twoPersonTables: 6, fourPersonTables: 10, sixPersonTables: 6, barSeats: 6, sofaSeats: 4 },
  },
  {
    key: 'lunch',
    label: '午餐',
    description: '高峰体验',
    config: {
      scenario: 'lunch',
      total_duration: 120,
      initial_window_count: 4,
      window_base_speed: 1.8,
      arrival_rate_base: 8.0,
      solo_ratio: 0.4,
      pair_ratio: 0.35,
      group_ratio: 0.25,
    },
    layout: { windowCount: 4, twoPersonTables: 6, fourPersonTables: 10, sixPersonTables: 6, barSeats: 6, sofaSeats: 4 },
  },
  {
    key: 'dinner',
    label: '晚餐',
    description: '缓慢递减',
    config: {
      scenario: 'dinner',
      total_duration: 120,
      initial_window_count: 3,
      window_base_speed: 1.6,
      arrival_rate_base: 6.0,
      solo_ratio: 0.5,
      pair_ratio: 0.3,
      group_ratio: 0.2,
    },
    layout: { windowCount: 3, twoPersonTables: 6, fourPersonTables: 10, sixPersonTables: 6, barSeats: 6, sofaSeats: 4 },
  },
]

const DEFAULT_LAYOUT = { windowCount: 4, twoPersonTables: 6, fourPersonTables: 10, sixPersonTables: 6, barSeats: 6, sofaSeats: 4 }
const DEFAULT_DURATION = 120

const inputStyle: React.CSSProperties = {
  width: '52px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(245,158,11,0.25)',
  borderRadius: '0.375rem',
  color: '#fde68a',
  textAlign: 'center',
  fontSize: '0.875rem',
  padding: '0.2rem 0',
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgba(245, 158, 11, 0.6)',
}

const unitStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(245, 158, 11, 0.4)',
}

interface Props {
  onStartSimulation: (simId: string, config: typeof DEFAULT_LAYOUT) => void
}

export function SimulationSetup({ onStartSimulation }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset>('lunch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dynamicWindows, setDynamicWindows] = useState(true)

  const [customLayout, setCustomLayout] = useState(DEFAULT_LAYOUT)
  const [customDuration, setCustomDuration] = useState(DEFAULT_DURATION)

  const handlePresetSelect = (key: SimulationPreset) => {
    setSelectedPreset(key)
    const preset = PRESETS.find(p => p.key === key)
    if (preset) {
      setCustomLayout(preset.layout)
      setCustomDuration(preset.config.total_duration ?? DEFAULT_DURATION)
    }
  }

  const handleStart = async () => {
    try {
      setLoading(true)
      setError(null)

      const preset = PRESETS.find(p => p.key === selectedPreset)
      const simConfig = {
        ...(preset ? preset.config : { scenario: 'lunch' as const }),
        total_duration: customDuration,
        dynamic_windows_enabled: dynamicWindows,
      }

      const response = await simulationAPI.createSimulation(simConfig, 1)
      const { sim_id } = response.data
      onStartSimulation(sim_id, customLayout)
    } catch {
      const mockId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      onStartSimulation(mockId, customLayout)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2a2418 0%, #1f1b12 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Georgia', 'SimSun', 'Times New Roman', serif",
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '720px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 标题区块 */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            color: '#fde68a',
            fontWeight: 'bold',
            letterSpacing: '0.03em',
            lineHeight: '1.2',
            marginBottom: '0.75rem',
          }}>食堂就餐仿真</h1>
          <div style={{
            fontSize: '0.875rem',
            color: 'rgba(245, 158, 11, 0.4)',
            letterSpacing: '0.08em',
            marginBottom: '0.5rem',
          }}>Canteen Simulation</div>
        </div>

        {/* 配置卡片 */}
        <div style={{
          background: 'rgba(41, 37, 36, 0.6)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginTop: '1rem',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          flex: 1,
        }}>
          {/* 预设卡片 */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
          }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePresetSelect(p.key)}
                style={{
                  background: selectedPreset === p.key ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                  border: selectedPreset === p.key ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.5rem',
                  flex: 1,
                  minWidth: '100px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ color: '#fde68a', fontWeight: 'bold', marginBottom: '0.25rem' }}>{p.label}</div>
                <div style={{ color: 'rgba(245, 158, 11, 0.5)', fontSize: '0.75rem' }}>{p.description}</div>
              </button>
            ))}
          </div>

          {/* 窗口 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={labelStyle}>窗口</span>
            <span>
              <input
                type="number" min={1} max={8}
                value={customLayout.windowCount}
                onChange={e => setCustomLayout(prev => ({ ...prev, windowCount: parseInt(e.target.value) || 1 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 个</span>
            </span>
          </div>

          {/* 桌型 row 1 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={labelStyle}>桌型</span>
            <span>
              <span style={{ ...unitStyle, marginRight: '0.25rem' }}>六人桌</span>
              <input
                type="number" min={0} max={15}
                value={customLayout.sixPersonTables}
                onChange={e => setCustomLayout(prev => ({ ...prev, sixPersonTables: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 张</span>
              <span style={{ margin: '0 0.5rem' }} />
              <span style={{ ...unitStyle, marginRight: '0.25rem' }}>四人桌</span>
              <input
                type="number" min={0} max={20}
                value={customLayout.fourPersonTables}
                onChange={e => setCustomLayout(prev => ({ ...prev, fourPersonTables: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 张</span>
              <span style={{ margin: '0 0.5rem' }} />
              <span style={{ ...unitStyle, marginRight: '0.25rem' }}>双人桌</span>
              <input
                type="number" min={0} max={20}
                value={customLayout.twoPersonTables}
                onChange={e => setCustomLayout(prev => ({ ...prev, twoPersonTables: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 张</span>
              <span style={{ margin: '0 0.5rem' }} />
            </span>
          </div>

          {/* 桌型 row 2 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span /> {/* spacer for alignment */}
            <span>
              <span style={{ ...unitStyle, marginRight: '0.25rem' }}>吧台</span>
              <input
                type="number" min={0} max={15}
                value={customLayout.barSeats}
                onChange={e => setCustomLayout(prev => ({ ...prev, barSeats: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 座</span>
              <span style={{ margin: '0 0.5rem' }} />
              <span style={{ ...unitStyle, marginRight: '0.25rem' }}>沙发</span>
              <input
                type="number" min={0} max={10}
                value={customLayout.sofaSeats}
                onChange={e => setCustomLayout(prev => ({ ...prev, sofaSeats: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <span style={unitStyle}> 座</span>
            </span>
          </div>

          <hr style={{ borderColor: 'rgba(245, 158, 11, 0.2)', margin: '1rem 0' }} />

          {/* 仿真时长 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={labelStyle}>仿真时长</span>
            <span>
              <input
                type="number" min={30} max={300} step={10}
                value={customDuration}
                onChange={e => setCustomDuration(parseInt(e.target.value) || 120)}
                style={inputStyle}
              />
              <span style={unitStyle}> 分钟</span>
            </span>
          </div>

          {/* Dynamic windows toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '0.5rem',
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#fde68a', fontWeight: 500, textAlign: 'left' }}>动态窗口管理</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(245,158,11,0.4)', marginTop: '0.125rem', textAlign: 'left' }}>
                单窗口排队超过15人时自动开启新窗口
              </div>
            </div>
            <button
              onClick={() => setDynamicWindows(!dynamicWindows)}
              style={{
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: dynamicWindows ? '#16a34a' : '#57534e',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '2px',
                left: dynamicWindows ? '26px' : '2px',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(185, 28, 28, 0.15)',
            border: '1px solid rgba(185, 28, 28, 0.3)',
            borderRadius: '0.5rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            background: loading ? 'rgba(180, 83, 9, 0.3)' : 'rgba(180, 83, 9, 0.6)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '9999px',
            padding: '0.75rem 2rem',
            width: '100%',
            color: '#fde68a',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem',
            marginTop: '1rem',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(180, 83, 9, 0.8)'
              e.currentTarget.style.borderColor = '#f59e0b'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(180, 83, 9, 0.6)'
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'
            }
          }}
        >
          {loading ? '创建中...' : '开始仿真'}
        </button>
        <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.75rem', color: 'rgba(245,158,11,0.3)' }}>
          * 点击开始仿真将进入 3D 模拟场景
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '2rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(180, 83, 9, 0.3)',
          letterSpacing: '0.08em',
        }}>
          北京交通大学 · 软件综合实训
        </div>
      </div>
    </div>
  )
}
