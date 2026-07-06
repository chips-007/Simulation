import { useState, useEffect } from 'react'
import { useSimulation } from './useSimulation'
import { SimulationField } from './components/SimulationField'
import './App.css'

function App() {
  // Локальные состояния интерфейса 
  const [theme, setTheme] = useState('dark') // Текущая тема
  const [selectedId, setSelectedId] = useState(null) // ID выделенного объекта 
  const [placementMode, setPlacementMode] = useState('billboard') // Текущий инструмент в режиме строительства
  
  // Значения из инпутов
  const [simConfig, setSimConfig] = useState({
    numAgents: 100, numBillboards: 4, greenLeaders: 5, redLeaders: 5,
    numPromoters: 4, numRepairmen: 3, numObstacles: 3, numBuildings: 20
  })

  const { 
    agents, billboards, roads, obstacles, buildings, isSimulating, setIsSimulating, initSimulation, 
    toggleBillboardOpinion, addBillboard, changeBillboardRadius, removeBillboard,
    addObstacle, removeObstacle, addPromoter, removeAgent, addBuilding, removeBuilding, addRepairman
  } = useSimulation()

  // При первом запуске сайта генерируется карта по умолчанию
  useEffect(() => {
    initSimulation(simConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isDark = theme === 'dark'

  // Обработчики событий 
  // Обработка ввода в инпуты 
  const handleConfigChange = (field, value) => {
    const val = value === '' ? '' : Number(value);
    const newConfig = { ...simConfig, [field]: val };
    setSimConfig(newConfig); 
    initSimulation(newConfig); 
    setSelectedId(null);       
  };

  // Валидация инпутов 
  const handleConfigBlur = (field, min, max) => {
    let val = Number(simConfig[field]);
    if (isNaN(val) || val < min) 
      val = min; 
    if (val > max) 
      val = max;
    
    const newConfig = { ...simConfig, [field]: val };
    setSimConfig(newConfig); 
    initSimulation(newConfig);
  };

  // Обработчик двойного клика по карте
  const handleMapDoubleClick = (x, y) => {
    if (placementMode === 'billboard') addBillboard(x, y, 50);
    else if (placementMode === 'obstacle') addObstacle(x, y);
    else if (placementMode === 'promoter_green') addPromoter(x, y, true);
    else if (placementMode === 'promoter_red') addPromoter(x, y, false);
    else if (placementMode === 'building') addBuilding(x, y);
    else if (placementMode === 'repairman') addRepairman(x, y);
    setSelectedId(null);
  };

  // Вычисления для панели аналитики
  const totalAgents = agents.length;
  const validTotalAgents = agents.filter(a => !a.isRepairman).length; // Жители без учета ремонтников
  
  const greenAgents = agents.filter(a => a.opinion > 0.5 && !a.isRepairman).length;
  const greenPercent = validTotalAgents > 0 ? Math.round((greenAgents / validTotalAgents) * 100) : 50;
  const redPercent = validTotalAgents > 0 ? 100 - greenPercent : 50;
  
  // Среднее мнение по городу
  const avgOpinion = validTotalAgents > 0 ? (agents.filter(a => !a.isRepairman).reduce((sum, a) => sum + a.opinion, 0) / validTotalAgents).toFixed(2) : '0.00';

  const stubbornAgents = agents.filter(a => a.isStubborn && !a.isPromoter && !a.isRepairman);
  const greenLeaders = stubbornAgents.filter(a => a.opinion > 0.5).length;
  const redLeaders = stubbornAgents.length - greenLeaders;
  const greenPromoters = agents.filter(a => a.isPromoter && a.opinion > 0.5).length;
  const redPromoters = agents.filter(a => a.isPromoter && a.opinion <= 0.5).length;
  
  const activeObstacles = obstacles.length;
  const activeRepairmen = agents.filter(a => a.isRepairman).length;
  const greenBillboards = billboards.filter(b => b.opinion > 0.5).length;
  const redBillboards = billboards.filter(b => b.opinion <= 0.5).length;
  
  // Поиск данных о выделенном билборде, чтобы показать его в панели настроек
  const selectedBillboard = billboards.find(b => b.id === selectedId)

  // Палитра цветов для подстраивания под тему сайта 
  const c = {
    bg: isDark ? '#111' : '#f8f9fa',
    border: isDark ? '#333' : '#d1d5db',
    text: isDark ? '#fff' : '#111',
    muted: isDark ? '#aaa' : '#6b7280',
    inputBg: isDark ? '#222' : '#fff',
    inputBorder: isDark ? '#555' : '#9ca3af',
    val: isDark ? '#fff' : '#111',
    green: isDark ? '#4caf50' : '#16a34a',
    red: isDark ? '#f44336' : '#dc2626',
    blue: isDark ? '#00bcd4' : '#0891b2',
    cyan: isDark ? '#00e5ff' : '#0284c7',
    orange: isDark ? '#ff9800' : '#ea580c',
    yellow: isDark ? '#ffeb3b' : '#ca8a04',
    purple: isDark ? '#a78bfa' : '#7c3aed',
    btnActiveBg: isDark ? '#333' : '#e5e7eb',
    btnHover: isDark ? '#444' : '#f3f4f6'
  }

  // Общие стили для панелей и инпутов
  const panelStyle = { backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '12px', width: '320px', color: c.text, fontFamily: 'monospace', textAlign: 'left', boxSizing: 'border-box' }
  const inputStyle = { width: '60px', padding: '4px', backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.inputBorder}`, borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }

 return (
    // Гланвый контейнер для переключения фона сайта 
    <div style={{
      backgroundColor: isDark ? '#242424' : '#ffffff',
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      overflowY: 'auto',
      color: c.text,
      transition: 'background-color 0.3s ease'
    }}>
      <div className="simulation-container" style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '20px', paddingBottom: '40px' }}>
        
        {/* === ШАПКА === */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', position: 'relative', padding: '0 40px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '2px', color: c.text, textAlign: 'center' }}>Симуляция динамики мнений</h1>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={{ position: 'absolute', right: '40px', padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', border: `1px solid ${c.border}`, backgroundColor: c.bg, color: c.text, fontFamily: 'monospace', fontWeight: 'bold' }}>
            {isDark ? 'Светлая' : 'Темная'}
          </button>
        </div>

        {/*Основная сетка интерфейса (две колонки)*/}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '15px' }}>
          
          {/*Левая колонка - карта и генерация*/}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '500px' }}>
            
            {/*Окно самой симуляции*/}
            <SimulationField 
              agents={agents} billboards={billboards} roads={roads} obstacles={obstacles} buildings={buildings}
              isSimulating={isSimulating} selectedId={selectedId} isDark={isDark}
              onBillboardClick={(id) => setSelectedId(id === selectedId ? null : id)} 
              onMapDoubleClick={handleMapDoubleClick} 
              onBillboardRightClick={(id) => { removeBillboard(id); if (selectedId === id) setSelectedId(null); }}
              onObstacleRightClick={removeObstacle} onAgentRightClick={removeAgent} onBuildingRightClick={removeBuilding}
            />

            {/*Панель генерации*/}
            <div style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', boxSizing: 'border-box' }}>
              <h3 style={{ margin: 0, textAlign: 'center', color: c.muted, fontSize: '14px', fontFamily: 'monospace' }}>ГЕНЕРАЦИЯ</h3>
              
              {/*Сетка инпутов настройки*/}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', color: c.muted, fontFamily: 'monospace', fontSize: '11px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ textAlign: 'center', lineHeight: '1.2' }}>Жители<br/>(40-170)</span>
                  <input type="number" min="40" max="170" value={simConfig.numAgents} onChange={(e) => handleConfigChange('numAgents', e.target.value)} onBlur={() => handleConfigBlur('numAgents', 40, 170)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ textAlign: 'center', lineHeight: '1.2' }}>Билборды<br/>(0-10)</span>
                  <input type="number" min="0" max="10" value={simConfig.numBillboards} onChange={(e) => handleConfigChange('numBillboards', e.target.value)} onBlur={() => handleConfigBlur('numBillboards', 0, 10)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.orange, textAlign: 'center', lineHeight: '1.2' }}>Ямы на дорогах<br/>(0-10)</span>
                  <input type="number" min="0" max="10" value={simConfig.numObstacles} onChange={(e) => handleConfigChange('numObstacles', e.target.value)} onBlur={() => handleConfigBlur('numObstacles', 0, 10)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.purple, textAlign: 'center', lineHeight: '1.2' }}>Здания<br/>(0-40)</span>
                  <input type="number" min="0" max="40" value={simConfig.numBuildings} onChange={(e) => handleConfigChange('numBuildings', e.target.value)} onBlur={() => handleConfigBlur('numBuildings', 0, 40)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.green, textAlign: 'center', lineHeight: '1.2' }}>Зеленые Лидеры<br/>(2-15)</span>
                  <input type="number" min="2" max="15" value={simConfig.greenLeaders} onChange={(e) => handleConfigChange('greenLeaders', e.target.value)} onBlur={() => handleConfigBlur('greenLeaders', 2, 15)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.red, textAlign: 'center', lineHeight: '1.2' }}>Красные Лидеры<br/>(2-15)</span>
                  <input type="number" min="2" max="15" value={simConfig.redLeaders} onChange={(e) => handleConfigChange('redLeaders', e.target.value)} onBlur={() => handleConfigBlur('redLeaders', 2, 15)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.cyan, textAlign: 'center', lineHeight: '1.2' }}>Промоутеры<br/>(0-10)</span>
                  <input type="number" min="0" max="10" value={simConfig.numPromoters} onChange={(e) => handleConfigChange('numPromoters', e.target.value)} onBlur={() => handleConfigBlur('numPromoters', 0, 10)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: c.blue, textAlign: 'center', lineHeight: '1.2' }}>Ремонтники<br/>(1-10)</span>
                  <input type="number" min="1" max="10" value={simConfig.numRepairmen} onChange={(e) => handleConfigChange('numRepairmen', e.target.value)} onBlur={() => handleConfigBlur('numRepairmen', 1, 10)} style={inputStyle} />
                </div>
              </div>

              {/*Кнопки управления*/}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <button onClick={() => { initSimulation(simConfig); setSelectedId(null); }} style={{ padding: '8px 25px', backgroundColor: c.btnActiveBg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>Генерация</button>
                <button onClick={() => setIsSimulating(!isSimulating)} disabled={agents.length === 0} style={{ padding: '8px 25px', backgroundColor: isSimulating ? c.red : c.green, color: '#fff', border: 'none', borderRadius: '4px', cursor: agents.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 'bold', opacity: agents.length === 0 ? 0.5 : 1 }}>
                  {isSimulating ? 'Пауза' : 'Старт'}
                </button>
              </div>
            </div>
          </div>

          {/*Правая колонка - панели*/}
          {totalAgents > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
              
              {/*Панель аналитики*/}
              <div style={panelStyle}>
                <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', color: c.muted, fontSize: '15px' }}>АНАЛИТИКА</h3>
                
                {/*Полоска соотношения мнений*/}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ color: c.green, fontWeight: 'bold' }}>Зеленые: {greenPercent}%</span>
                    <span style={{ color: c.red, fontWeight: 'bold' }}>Красные: {redPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: c.border, borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${greenPercent}%`, backgroundColor: c.green, transition: 'width 0.1s linear' }} />
                    <div style={{ width: `${redPercent}%`, backgroundColor: c.red, transition: 'width 0.1s linear' }} />
                  </div>
                </div>

                {/*Общая статистика*/}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', marginBottom: '10px', color: c.muted }}>
                  <div>Жителей: <strong style={{ color: c.val }}>{validTotalAgents}</strong></div>
                  <div>Мнение: <strong style={{ color: c.yellow }}>{avgOpinion}</strong></div>
                  <div>Ям на дорогах: <strong style={{ color: c.orange }}>{activeObstacles}</strong></div>
                  <div>Ремонтников: <strong style={{ color: c.cyan }}>{activeRepairmen}</strong></div>
                </div>

                <div style={{ borderTop: `1px solid ${c.border}`, margin: '10px 0' }}></div>

                {/*Статистика по сторонам мнений*/}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div style={{ color: c.green, borderBottom: `1px solid ${c.border}`, paddingBottom: '4px' }}><strong>ЗЕЛЕНЫЕ</strong></div>
                  <div style={{ color: c.red, borderBottom: `1px solid ${c.border}`, paddingBottom: '4px' }}><strong>КРАСНЫЕ</strong></div>

                  <div style={{ color: c.green }}>Лидеры: <strong style={{ color: c.val }}>{greenLeaders}</strong></div>
                  <div style={{ color: c.red }}>Лидеры: <strong style={{ color: c.val }}>{redLeaders}</strong></div>

                  <div style={{ color: c.green }}>Промоутеры: <strong style={{ color: c.val }}>{greenPromoters}</strong></div>
                  <div style={{ color: c.red }}>Промоутеры: <strong style={{ color: c.val }}>{redPromoters}</strong></div>

                  <div style={{ color: c.green }}>Билборды: <strong style={{ color: c.val }}>{greenBillboards}</strong></div>
                  <div style={{ color: c.red }}>Билборды: <strong style={{ color: c.val }}>{redBillboards}</strong></div>
                </div>

                {/*Подсказки управления*/}
                <div style={{ fontSize: '10px', color: c.muted, marginTop: '15px', textAlign: 'left', lineHeight: '1.3' }}>
                  * <strong>ЛКМ</strong> по билборду выделит его для настройки.<br/>
                  * <strong>Двойной клик</strong> ставит выбранный объект.<br/>
                  * <strong>ПКМ</strong> удаляет кликнутый объект.
                </div>
              </div>

              {/*Панель режима строительства*/}
              <div style={panelStyle}>
                <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', color: c.text, fontSize: '13px' }}>РЕЖИМ СТРОИТЕЛЬСТВА</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPlacementMode('billboard')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'billboard' ? c.btnActiveBg : 'transparent', color: placementMode === 'billboard' ? c.text : c.muted, border: `1px solid ${placementMode === 'billboard' ? c.text : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Билборд</button>
                    <button onClick={() => setPlacementMode('building')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'building' ? (isDark ? '#1e1b4b' : '#ede9fe') : 'transparent', color: c.purple, border: `1px solid ${placementMode === 'building' ? c.purple : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Здание</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPlacementMode('obstacle')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'obstacle' ? (isDark ? '#4a3311' : '#ffedd5') : 'transparent', color: c.orange, border: `1px solid ${placementMode === 'obstacle' ? c.orange : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Яма на дороге</button>
                    <button onClick={() => setPlacementMode('repairman')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'repairman' ? (isDark ? '#003333' : '#cffafe') : 'transparent', color: c.cyan, border: `1px solid ${placementMode === 'repairman' ? c.cyan : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Ремонтник</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPlacementMode('promoter_green')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'promoter_green' ? (isDark ? '#1a331a' : '#dcfce7') : 'transparent', color: c.green, border: `1px solid ${placementMode === 'promoter_green' ? c.green : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Зеленый Промоутер</button>
                    <button onClick={() => setPlacementMode('promoter_red')} style={{ flex: 1, padding: '8px', backgroundColor: placementMode === 'promoter_red' ? (isDark ? '#331a1a' : '#fee2e2') : 'transparent', color: c.red, border: `1px solid ${placementMode === 'promoter_red' ? c.red : c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Красный Промоутер</button>
                  </div>
                </div>
              </div>

              {/*Панель настройки билборда*/}
              {selectedBillboard && (
                <div style={{ ...panelStyle, border: `1px solid ${c.text}` }}>
                  <h3 style={{ margin: '0 0 8px 0', textAlign: 'center', color: c.text, fontSize: '13px' }}>НАСТРОЙКА БИЛБОРДА</h3>
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Радиус: <strong style={{ color: c.cyan }}>{selectedBillboard.radius}px</strong></label>
                    {/*Ползунок изменения радиуса*/}
                    <input type="range" min="20" max="100" step="5" value={selectedBillboard.radius} onChange={(e) => changeBillboardRadius(selectedBillboard.id, Number(e.target.value))} style={{ width: '130px', cursor: 'pointer', margin: 0 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleBillboardOpinion(selectedBillboard.id)} style={{ flex: 1, padding: '6px', backgroundColor: c.btnActiveBg, color: c.text, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Сменить цвет</button>
                    <button onClick={() => setSelectedId(null)} style={{ flex: 1, padding: '6px', backgroundColor: 'transparent', color: c.muted, border: `1px solid ${c.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Закрыть</button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App