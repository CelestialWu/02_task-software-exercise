import { useEffect, useRef } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import { connectWS, sendStep } from '../lib/wsManager'

export function useSimulationWebSocket(simId: string | null) {
  const applyBackendState = useSimulationStore(s => s.applyBackendState)
  const setWsConnected = useSimulationStore(s => s.setWsConnected)
  const isPlaying = useSimulationStore(s => s.isPlaying)
  const intervalRef = useRef<number | null>(null)

  const handleFinished = () => {
    const store = useSimulationStore.getState()
    store.setIsPlaying(false)
    store.setShowEndDialog(true)
  }

  useEffect(() => {
    if (!simId || simId.startsWith('dev-')) return

    const cleanup = connectWS(
      simId,
      (state) => applyBackendState(state),
      (connected) => setWsConnected(connected),
      handleFinished,
    )

    return () => {
      cleanup()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [simId, applyBackendState, setWsConnected])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isPlaying) return

    // Steady 600ms per step — single steps so the frontend sees every state transition
    const STEP_INTERVAL = 600

    intervalRef.current = window.setInterval(() => {
      sendStep()
    }, STEP_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying])
}
