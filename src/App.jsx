import { useSimulation } from './useSimulation'
import { SimulationField } from './SimulationField'
import './App.css'

function App() {
  const { agents, billboards, roads, isSimulating, setIsSimulating, initSimulation, doStep } = useSimulation()

  //вычислене статистики в реальном времени
  const totalAgents = agents.length
  
  // Разделение обычных агентов по мнениям
  const greenAgents = agents.filter(a => a.opinion > 0.5).length

  // Проценты для графика
  const greenPercent = totalAgents > 0 ? Math.round((greenAgents / totalAgents) * 100) : 50
  const redPercent = totalAgents > 0 ? 100 - greenPercent : 50

  // Статистика по лидерам мнений 
  const stubbornAgents = agents.filter(a => a.isStubborn)
  const greenLeaders = stubbornAgents.filter(a => a.opinion > 0.5).length
  const redLeaders = stubbornAgents.length - greenLeaders

  // Среднее мнение города 
  const avgOpinion = totalAgents > 0 
    ? (agents.reduce((sum, a) => sum + a.opinion, 0) / totalAgents).toFixed(2) 
    : '0.00'

 return (
    <div className="simulation-container" style={{ maxWidth: '1050px', margin: '0 auto' }}>
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