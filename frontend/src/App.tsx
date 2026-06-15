import { useState, useEffect } from 'react'
import { HomePage } from '@/pages/HomePage'
import { Simulation3DPage } from '@/pages/Simulation3DPage'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useSimulationStore } from '@/store/simulationStore'
import '@/index.css'

type View = 'home' | 'loading' | 'simulation'

function App() {
  const [view, setView] = useState<View>('home')
  const buildLayout = useSimulationStore(s => s.buildLayout)
  const setStoreSimId = useSimulationStore(s => s.setSimId)

  // Toggle body overflow based on view
  useEffect(() => {
    document.body.style.overflow = view === 'simulation' ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [view])

  const handleStartSimulation = (id: string, config: {
    windowCount: number
    twoPersonTables: number
    fourPersonTables: number
    sixPersonTables: number
    barSeats: number
    sofaSeats: number
  }) => {
    buildLayout(
      config.windowCount,
      config.twoPersonTables,
      config.fourPersonTables,
      config.sixPersonTables,
      config.barSeats,
      config.sofaSeats
    )
    setStoreSimId(id)
    setView('loading')

    // Minimum 800ms loading screen for visual effect
    setTimeout(() => {
      setView('simulation')
    }, 800)
  }

  const handleBack = () => {
    setView('home')
    useSimulationStore.getState().reset()
  }

  if (view === 'loading') {
    return <LoadingScreen />
  }

  if (view === 'simulation') {
    return <Simulation3DPage onBack={handleBack} />
  }

  return <HomePage onStartSimulation={handleStartSimulation} />
}

export default App
