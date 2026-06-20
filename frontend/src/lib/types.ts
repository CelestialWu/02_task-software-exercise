// Backend state types matching GET /api/simulation/{sim_id}/state

//定义后端发来的json格式拆解
export interface BackendState {
  timestep: number
  windows: WindowState[]
  activating_windows: ActivatingWindowState[]
  tables: TableState[]
  all_persons: PersonData[]
  queuing_count: number
  seated_count: number
  total_arrived: number
  total_left: number
  avg_wait_time: number
}

export interface WindowState {
  id: number
  queue_length: number
  cumulative_served: number
  is_open: boolean
  current_service_speed: number
}

export interface ActivatingWindowState {
  id: number
  ready_at: number
}

export interface TableState {
  id: number
  type: SeatType
  capacity: number
  occupied: number
  seats: SeatState[]
}

export interface SeatState {
  position: number
  occupied_by: number | null
}

export interface PersonData {
  id: number
  state: string
  group_id: number
  window_id: number | null
  table_id: number | null
  table_type?: string | null
  seat_index: number
  queue_index: number
}

export type SeatType = 'two_person' | 'four_person' | 'six_person' | 'bar' | 'sofa'

export interface SimulationConfig {
  scenario: 'breakfast' | 'lunch' | 'dinner'
  total_duration: number
  initial_window_count: number
  min_windows: number
  max_windows: number
  window_open_threshold: number
  window_close_threshold: number
  window_base_speed: number
  window_speed_variance: number
  two_person_table_count: number
  four_person_table_count: number
  six_person_table_count: number
  bar_seat_count: number
  sofa_seat_count: number
  avg_service_time: number
  avg_meal_duration: number
  meal_duration_variance: number
  arrival_rate_base: number
  solo_ratio: number
  pair_ratio: number
  group_ratio: number
  avg_group_size: number
  seat_type_preference: Record<string, number>
  window_popularity: number[] | null
  random_seed: number
  enable_logging: boolean
  dynamic_windows_enabled: boolean
}

export type SimulationPreset = 'breakfast' | 'lunch' | 'dinner' | 'custom'

export type PersonState = 'arrived' | 'queuing' | 'serving' | 'seated' | 'left' | 'leaving'

export const PERSON_STATE_COLORS: Record<PersonState, string> = {
  arrived: '#5B9BD5',  // 蓝 - 刚进入食堂
  queuing: '#F4A460',  // 橙 - 排队等候
  serving: '#FFD700',  // 金 - 正在打饭
  seated: '#5CB85C',   // 绿 - 已入座
  left: '#999999',     // 灰 - 已离开
  leaving: '#999999',  // 灰 - 正在离开
}
