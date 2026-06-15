import type { BackendState } from './types'

let wsInstance: WebSocket | null = null
let onStateCallback: ((state: BackendState) => void) | null = null
let onStatusCallback: ((connected: boolean) => void) | null = null
let onFinishedCallback: (() => void) | null = null

export function connectWS(
  simId: string,
  onState: (state: BackendState) => void,
  onStatus: (connected: boolean) => void,
  onFinished?: () => void,
): () => void {
  onStateCallback = onState
  onStatusCallback = onStatus
  onFinishedCallback = onFinished ?? null

  // Close any existing connection before creating a new one
  if (wsInstance && wsInstance.readyState !== WebSocket.CLOSED) {
    wsInstance.close()
    wsInstance = null
  }

  const url = `ws://localhost:8000/ws/simulation/${simId}`
  const ws = new WebSocket(url)
  wsInstance = ws

  ws.onopen = () => {
    onStatus(true)
    ws.send(JSON.stringify({ action: 'get_state' }))
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (
        data.type === 'step_complete' ||
        data.type === 'steps_complete' ||
        data.type === 'state'
      ) {
        if (data.state) onStateCallback?.(data.state)
      } else if (data.type === 'finished') {

        if (data.state) onStateCallback?.(data.state)  // ← 先更新状态
        onFinishedCallback?.()                         // ← 再触发结束
      }
    } catch {
      // ignore parse errors
    }
  }

  ws.onclose = () => onStatus(false)
  ws.onerror = () => onStatus(false)

  return () => {
    // Only close if this is still the active connection
    if (wsInstance === ws) {
      wsInstance = null
    }
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
    onStateCallback = null
    onStatusCallback = null
    onFinishedCallback = null
  }
}

export function sendStep() {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ action: 'step' }))
  }
}

export function sendSteps(count: number) {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ action: 'steps', num_steps: count }))
  }
}
