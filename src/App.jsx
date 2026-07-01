import { useState, useEffect } from 'react'
import { useSimulation } from './useSimulation'
import { SimulationField } from './SimulationField'
import './App.css'

function App() {
  const [selectedId, setSelectedId] = useState(null) 
  
  const [simConfig, setSimConfig] = useState({
    numAgents: 100,
    numBillboards: 4,
    greenLeaders: 5,
    redLeaders: 5
  })

  const { 
    agents, 
    billboards, 
    roads, 
    isSimulating, 
    setIsSimulating, 
    initSimulation, 
    toggleBillboardOpinion,
    addBillboard, 
    changeBillboardRadius, 
    removeBillboard 
  } = useSimulation()

  useEffect(() => {
    initSimulation(simConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfigChange = (field, value) => {
    const val = value === '' ? '' : Number(value);
    const newConfig = { ...simConfig, [field]: val };
    setSimConfig(newConfig);
    initSimulation(newConfig); 
    setSelectedId(null);
  };

  const handleConfigBlur = (field, min, max) => {
    let val = Number(simConfig[field]);
    if (isNaN(val) || val < min) val = min;
    if (val > max) val = max;

    const newConfig = { ...simConfig, [field]: val };
    setSimConfig(newConfig);
    initSimulation(newConfig);
  };

  const totalAgents = agents.length
  const greenAgents = agents.filter(a => a.opinion > 0.5).length
  const greenPercent = totalAgents > 0 ? Math.round((greenAgents / totalAgents) * 100) : 50
  const redPercent = totalAgents > 0 ? 100 - greenPercent : 50
  const stubbornAgents = agents.filter(a => a.isStubborn)
  const greenLeaders = stubbornAgents.filter(a => a.opinion > 0.5).length
  const redLeaders = stubbornAgents.length - greenLeaders
  const avgOpinion = totalAgents > 0 ? (agents.reduce((sum, a) => sum + a.opinion, 0) / totalAgents).toFixed(2) : '0.00'

  const selectedBillboard = billboards.find(b => b.id === selectedId)

  const panelStyle = {
    backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px',
    padding: '10px', width: '250px', color: '#fff', fontFamily: 'monospace',
    textAlign: 'left', boxSizing: 'border-box'
  }

  const inputStyle = {
    width: '50px', padding: '2px', backgroundColor: '#222', color: '#fff', 
    border: '1px solid #555', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace'
  }

 return (
    <div className="simulation-container" style={{ maxWidth: '1050px', margin: '0 auto', paddingTop: '10px' }}>
      <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Симуляция распространения информации</h1>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '15px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <SimulationField 
            agents={agents} 
            billboards={billboards} 
            roads={roads} 
            isSimulating={isSimulating}
            selectedId={selectedId} 
            onBillboardClick={(id) => setSelectedId(id === selectedId ? null : id)} 
            onMapDoubleClick={(x, y) => { addBillboard(x, y, 50); setSelectedId(null); }} 
            onBillboardRightClick={(id) => { 
              removeBillboard(id); 
              if (selectedId === id) setSelectedId(null); 
            }}
          />

          <div style={{ 
            backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px', 
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <h3 style={{ margin: 0, textAlign: 'center', color: '#aaa', fontSize: '14px', fontFamily: 'monospace' }}>ГЕНЕРАЦИЯ</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', color: '#ccc', fontFamily: 'monospace', fontSize: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Обычные (40-170)</span>
                <input 
                  type="number" min="40" max="170" value={simConfig.numAgents} 
                  onChange={(e) => handleConfigChange('numAgents', e.target.value)} 
                  onBlur={() => handleConfigBlur('numAgents', 40, 170)}
                  style={inputStyle} 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Билборды (0-10)</span>
                <input 
                  type="number" min="0" max="10" value={simConfig.numBillboards} 
                  onChange={(e) => handleConfigChange('numBillboards', e.target.value)} 
                  onBlur={() => handleConfigBlur('numBillboards', 0, 10)}
                  style={inputStyle} 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#4caf50', whiteSpace: 'nowrap' }}>Лидеры Зел. (2-15)</span>
                <input 
                  type="number" min="2" max="15" value={simConfig.greenLeaders} 
                  onChange={(e) => handleConfigChange('greenLeaders', e.target.value)} 
                  onBlur={() => handleConfigBlur('greenLeaders', 2, 15)}
                  style={inputStyle} 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#f44336', whiteSpace: 'nowrap' }}>Лидеры Крас. (2-15)</span>
                <input 
                  type="number" min="2" max="15" value={simConfig.redLeaders} 
                  onChange={(e) => handleConfigChange('redLeaders', e.target.value)} 
                  onBlur={() => handleConfigBlur('redLeaders', 2, 15)}
                  style={inputStyle} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                onClick={() => { initSimulation(simConfig); setSelectedId(null); }}
                style={{ padding: '6px 20px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}
              >
                Генерация
              </button>
              <button 
                onClick={() => setIsSimulating(!isSimulating)} 
                disabled={agents.length === 0}
                style={{ 
                  padding: '6px 20px', 
                  backgroundColor: isSimulating ? '#552222' : '#225522', 
                  color: 'white', border: '1px solid #555', borderRadius: '4px', 
                  cursor: agents.length === 0 ? 'not-allowed' : 'pointer', 
                  fontFamily: 'monospace', fontWeight: 'bold',
                  opacity: agents.length === 0 ? 0.5 : 1 
                }}
              >
                {isSimulating ? 'Пауза' : 'Старт'}
              </button>
            </div>
          </div>
        </div>

        {totalAgents > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            
            <div style={panelStyle}>
              <h3 style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#aaa', fontSize: '15px' }}>АНАЛИТИКА</h3>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                  <span style={{ color: '#4caf50' }}>Зел: {greenPercent}%</span>
                  <span style={{ color: '#f44336' }}>Крас: {redPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${greenPercent}%`, backgroundColor: '#4caf50', transition: 'width 0.1s linear' }} />
                  <div style={{ width: `${redPercent}%`, backgroundColor: '#f44336', transition: 'width 0.1s linear' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                <p style={{ margin: 0 }}>Всего жителей: <strong style={{ color: '#00bcd4' }}>{totalAgents}</strong></p>
                <p style={{ margin: 0 }}>Среднее мнение: <strong style={{ color: '#ffeb3b' }}>{avgOpinion}</strong></p>
                <div style={{ borderTop: '1px solid #333', margin: '2px 0' }}></div>
                <p style={{ margin: 0, color: '#4caf50' }}>Лидеров (Зел): <strong>{greenLeaders}</strong></p>
                <p style={{ margin: 0, color: '#f44336' }}>Лидеров (Крас): <strong>{redLeaders}</strong></p>
              </div>
              
              <div style={{ fontSize: '10px', color: '#888', marginTop: '10px', textAlign: 'left', lineHeight: '1.2' }}>
                * <strong>ЛКМ</strong> по билборду выделит его.<br/>
                * <strong>Двойной клик</strong> по карте ставит новый билборд.<br/>
                * <strong>ПКМ</strong> по билборду удаляет его.
              </div>
            </div>

            {selectedBillboard && (
              <div style={{ ...panelStyle, border: '1px solid #fff' }}>
                <h3 style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#fff', fontSize: '13px' }}>НАСТРОЙКА БИЛБОРДА</h3>
                
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    Радиус: <strong style={{ color: '#00bcd4' }}>{selectedBillboard.radius}px</strong>
                  </label>
                  <input
                    type="range" min="20" max="100" step="5"
                    value={selectedBillboard.radius}
                    onChange={(e) => changeBillboardRadius(selectedBillboard.id, Number(e.target.value))}
                    style={{ width: '100px', cursor: 'pointer', margin: 0 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toggleBillboardOpinion(selectedBillboard.id)}
                    style={{ flex: 1, padding: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >Сменить цвет</button>
                  
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{ flex: 1, padding: '4px', backgroundColor: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >Закрыть</button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

export default App