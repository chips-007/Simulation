import { useState, useEffect, useRef } from 'react'

// Функция для определения цвета по мнению
const getAgentColor = (opinion) => {
  const hue = opinion * 120 
  return `hsl(${hue}, 100%, 50%)`
}

export function SimulationField({ agents, billboards, roads = [], obstacles = [], buildings = [], isSimulating, onBillboardClick, onMapDoubleClick, onBillboardRightClick, onObstacleRightClick, onAgentRightClick, onBuildingRightClick, selectedId, isDark }) {
  // Базовые внутренние размеры карты
  const SIZE_W = 500;
  const SIZE_H = 400;

  // Состояние камеры 
  const [zoom, setZoom] = useState(1) // Текущее приближение
  const [pan, setPan] = useState({ x: 0, y: 0 }) // Сдвиг камеры
  const [isDragging, setIsDragging] = useState(false) // Зажат ли клик для перетаскивания карты
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 }) // Начальная точка при перетаскивании
  
  const containerRef = useRef(null) // Ссылка на внешний контейнер-обертку
  const innerMapRef = useRef(null)  // Ссылка на саму масштабируемую карту

  // Функция-ограничитель
  const clampPan = (x, y, currentZoom) => {
    const scaledW = SIZE_W * currentZoom
    const scaledH = SIZE_H * currentZoom
    if (scaledW <= SIZE_W && scaledH <= SIZE_H) 
      return { x: 0, y: 0 }
    
    // Вычисление максимально допустимого сдвига
    const maxX = Math.max(0, (scaledW - SIZE_W) / 2)
    const maxY = Math.max(0, (scaledH - SIZE_H) / 2)
    
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    }
  }

  // Обработка зума 
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleNativeWheel = (e) => {
      e.preventDefault() 
      let zoomSpeed = e.ctrlKey ? 0.02 : 0.005 
      setZoom(prevZoom => {
        // Ограничение зума: минимум 1x, максимум 10x
        const newZoom = Math.max(1, Math.min(prevZoom - e.deltaY * zoomSpeed, 10))
        setPan(prevPan => clampPan(prevPan.x, prevPan.y, newZoom))
        return newZoom
      })
    }
    container.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleNativeWheel)
  }, [])

  // Обработка перетаскивания мышью
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan(clampPan(e.clientX - startDrag.x, e.clientY - startDrag.y, zoom))
  }
  
  const handleMouseUp = () => setIsDragging(false)

  // Обработка двойного клика для постройки объектов.
  const handleDoubleClick = (e) => {
    if (!innerMapRef.current || !onMapDoubleClick) return;
    const rect = innerMapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    onMapDoubleClick(x, y);
  }

  return (
    // Внешний контейнер (окно видимости симуляции)
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} 
      style={{
        width: `${SIZE_W}px`,   
        height: `${SIZE_H}px`,  
        backgroundColor: '#1a2419', 
        border: `1px solid ${isDark ? '#333' : '#d1d5db'}`, 
        borderRadius: '8px',
        overflow: 'hidden', 
        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default', 
        position: 'relative',
        touchAction: 'none' // Блокировка зума жестами на мобильных устройствах
      }}
    >
      {/*Внутренний контейнер (сама карта симуляции) */}
      <div 
        ref={innerMapRef} 
        onDoubleClick={handleDoubleClick} 
        style={{
          width: `${SIZE_W}px`,
          height: `${SIZE_H}px`,
          position: 'absolute',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform' 
        }}
      >
        {/*Отрисовка зданий */}
        {buildings.map(b => (
          <div key={b.id}
            onContextMenu={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if(onBuildingRightClick) onBuildingRightClick(b.id); 
            }}
            style={{
              position: 'absolute', left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
              backgroundColor: '#1f2937', border: '2px solid #374151', transform: 'translate(-50%, -50%)', zIndex: 1,
              borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', padding: '4px',
              cursor: 'pointer', boxSizing: 'border-box', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)'
            }}>
            {/* Отрисовка 4-х светящихся "окон" внутри каждого здания */}
            {[...Array(4)].map((_, i) => <div key={i} style={{ width: '100%', height: '100%', backgroundColor: '#fef08a', opacity: 0.2, borderRadius: '1px' }}/>)}
          </div>
        ))}

        {/*Отрисовка дорог*/}
        {roads.map((road, index) => (
          <div key={`road-${index}`} style={{
            position: 'absolute',
            backgroundColor: '#3b3b3b', 
            zIndex: 2, 
            ...(road.type === 'vertical' ? {
              left: `${road.pos - road.width / 2}px`, top: 0, width: `${road.width}px`, height: '100%'
            } : {
              top: `${road.pos - road.width / 2}px`, left: 0, width: '100%', height: `${road.width}px`
            })
          }} />
        ))}

        {/*Отрисовка ремонтов дорог*/}
        {obstacles.map((obs) => (
          <div key={obs.id} 
            onContextMenu={(e) => {
              e.preventDefault(); 
              e.stopPropagation();
              if (onObstacleRightClick) onObstacleRightClick(obs.id);
            }}
            style={{
              position: 'absolute', left: `${obs.x}px`, top: `${obs.y}px`, width: `${obs.size}px`, height: `${obs.size}px`,
              backgroundColor: '#ff9800', border: '2px solid #000', transform: 'translate(-50%, -50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '10px',
              fontWeight: 'bold', zIndex: 6, boxShadow: '0 0 8px #ff9800', borderRadius: '2px',
              pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none'
            }}>✖</div>
        ))}

        {/*Отрисовка билбордов*/}
        {billboards && billboards.map((b) => (
          <div key={`billboard-${b.id}`} 
            style={{ position: 'absolute', left: `${b.x}px`, top: `${b.y}px`, transform: 'translate(-50%, -50%)', zIndex: 5, cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); if (onBillboardClick) onBillboardClick(b.id); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (onBillboardRightClick) onBillboardRightClick(b.id); }}
          >
            {/*Радиус влияния билборда*/}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: `${b.radius * 2}px`, height: `${b.radius * 2}px`, borderRadius: '50%', backgroundColor: getAgentColor(b.opinion), opacity: selectedId === b.id ? 0.4 : 0.15, border: selectedId === b.id ? `2px solid white` : `2px dashed ${getAgentColor(b.opinion)}`, boxShadow: selectedId === b.id ? `0 0 15px ${getAgentColor(b.opinion)}` : 'none', pointerEvents: 'none', transition: 'all 0.1s linear' }} />
            {/*Физическая конструкция билборда*/}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '18px', height: '10px', backgroundColor: getAgentColor(b.opinion), border: '1px solid white', boxShadow: `0 0 12px 2px ${getAgentColor(b.opinion)}`, borderRadius: '2px' }} />
          </div>
        ))}

        {/*Отрисовка агентов*/}
        {agents.map((agent) => {
          
          // Рендер ремонтника 
          if (agent.isRepairman) {
            return (
              <div key={agent.id} 
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (onAgentRightClick) onAgentRightClick(agent.id); }}
                style={{
                  position: 'absolute', left: `${agent.x}px`, top: `${agent.y}px`, transform: 'translate(-50%, -50%)',
                  zIndex: 12, cursor: 'pointer', pointerEvents: 'auto', width: '10px', height: '10px',
                  backgroundColor: '#00bcd4', border: '1px solid #fff', borderRadius: '3px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px #00bcd4'
                }}>
                <div style={{ width: '4px', height: '4px', backgroundColor: '#fff', borderRadius: '50%' }} />
              </div>
            )
          }

          // Рендер промоутера 
          if (agent.isPromoter) {
            return (
              <div key={agent.id} 
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (onAgentRightClick) onAgentRightClick(agent.id); }}
                style={{ position: 'absolute', left: `${agent.x}px`, top: `${agent.y}px`, transform: 'translate(-50%, -50%)', zIndex: agent.inBuildingId ? 3 : 11, cursor: 'pointer', pointerEvents: 'auto' }}>
                <div style={{
                  width: '5px', height: '5px', backgroundColor: getAgentColor(agent.opinion),
                  border: '1px solid #fff', transform: 'rotate(45deg)', boxShadow: `0 0 6px ${getAgentColor(agent.opinion)}`
                }} />
              </div>
            )
          }

          // Обычные жители и лидеры
          const isLeader = agent.isStubborn && !agent.isPromoter && !agent.isRepairman;

          return (
            <div
              key={agent.id}
              style={{ position: 'absolute', left: `${agent.x}px`, top: `${agent.y}px`, transform: 'translate(-50%, -50%)', transition: isSimulating ? 'none' : 'all 0.1s linear', zIndex: agent.inBuildingId ? 3 : 10 }}
            >
              <div style={{
                position: 'relative',
                width: isLeader ? '8px' : '4px', height: isLeader ? '8px' : '4px',
                borderRadius: isLeader ? '2px' : '50%', backgroundColor: getAgentColor(agent.opinion),
                border: isLeader ? '1px solid rgba(255, 255, 255, 0.8)' : 'none'
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}