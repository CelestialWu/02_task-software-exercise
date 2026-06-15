import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const simulationAPI = {
  // 创建仿真
  createSimulation: (config: any, userId: number) =>
    api.post('/api/simulation/create', config, { params: { user_id: userId } }),

  // 获取仿真状态
  getSimulationState: (simId: string) =>
    api.get(`/api/simulation/${simId}/state`),

  // 获取仿真统计数据
  getStatistics: (simId: string) =>
    api.get(`/api/simulation/${simId}/statistics`),

  // 导出仿真数据
  exportSimulation: (simId: string, format: string = 'csv') =>
    api.post(`/api/simulation/${simId}/export`, { format }),

  // 健康检查
  healthCheck: () =>
    api.get('/health'),
}

export default api
