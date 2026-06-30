import { useSimulation } from './useSimulation'
import { SimulationField } from './SimulationField'
import './App.css'

function App() {
  const { agents, billboards, roads, isSimulating, setIsSimulating, initSimulation, doStep } = useSimulation()

  return (
    <div className="simulation-container">
      <h1>Симуляция распространения информации</h1>
      
      <div className="controls">
        <button onClick={initSimulation}>Инициализировать</button>
        <button onClick={() => setIsSimulating(!isSimulating)} disabled={agents.length === 0}>
          {isSimulating ? 'Пауза' : 'Запустить симуляцию'}
        </button>
        <button onClick={doStep} disabled={agents.length === 0 || isSimulating}>
          Сделать один шаг (Tick)
        </button>
      </div>

      <p>Агентов на поле: {agents.length}</p>
      <SimulationField agents={agents} billboards={billboards} roads={roads} isSimulating={isSimulating} />
    </div>
  )
}

export default App