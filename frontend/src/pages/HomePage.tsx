import { SimulationSetup } from '@/components/SimulationSetup'

interface Props {
  onStartSimulation: (simId: string, config: {
    windowCount: number
    twoPersonTables: number
    fourPersonTables: number
    sixPersonTables: number
    barSeats: number
    sofaSeats: number
  }) => void
}

export function HomePage({ onStartSimulation }: Props) {
  return <SimulationSetup onStartSimulation={onStartSimulation} />
}
