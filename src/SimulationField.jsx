import { useState, useEffect, useRef } from 'react'

const getAgentColor = (opinion) => {
  const hue = opinion * 120 
  return `hsl(${hue}, 100%, 50%)`
}

export function SimulationField({ agents, billboards, roads = [], isSimulating }) {
  const SIZE_W = 500;
  const SIZE_H = 400;

  const [zoom, setZoom] = useState(1) 
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  const clampPan = (x, y, currentZoom) => {
    const scaledW = SIZE_W * currentZoom
    const scaledH = SIZE_H * currentZoom
    if (scaledW <= SIZE_W && scaledH <= SIZE_H) return { x: 0, y: 0 }
    const maxX = Math.max(0, (scaledW - SIZE_W) / 2)
    const maxY = Math.max(0, (scaledH - SIZE_H) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleNativeWheel = (e) => {
      e.preventDefault() 
      let zoomSpeed = e.ctrlKey ? 0.02 : 0.005 
      setZoom(prevZoom => {
        const newZoom = Math.max(1, Math.min(prevZoom - e.deltaY * zoomSpeed, 10))
        setPan(prevPan => clampPan(prevPan.x, prevPan.y, newZoom))
        return newZoom
      })
    }
    container.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleNativeWheel)
  }, [])

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan(clampPan(e.clientX - startDrag.x, e.clientY - startDrag.y, zoom))
  }
  const handleMouseUp = () => setIsDragging(false)

  return (
    // Рамка-окно
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: `${SIZE_W}px`,   
        height: `${SIZE_H}px`,  
        backgroundColor: '#1a2419', //зеленый фон
        border: '1px solid #333',
        borderRadius: '8px',
        overflow: 'hidden', 
        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        position: 'relative',
        touchAction: 'none' 
      }}
    >
      {/*Город*/}
      <div 
        style={{
          width: `${SIZE_W}px`,
          height: `${SIZE_H}px`,
          position: 'absolute',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform'
        }}
      >
        {/*Дороги*/}
        {roads.map((road, index) => (
          <div key={`road-${index}`} style={{
            position: 'absolute',
            backgroundColor: '#3b3b3b', 
            ...(road.type === 'vertical' ? {
              left: `${road.pos - road.width / 2}px`, top: 0, width: `${road.width}px`, height: '100%'
            } : {
              top: `${road.pos - road.width / 2}px`, left: 0, width: '100%', height: `${road.width}px`
            })
          }} />
        ))}

        {/*Билборды*/}
        {billboards && billboards.map((b) => (
          <div 
            key={`billboard-${b.id}`} 
            style={{
              position: 'absolute', left: `${b.x}px`, top: `${b.y}px`,
              transform: 'translate(-50%, -50%)', 
              zIndex: 5,
              cursor: 'pointer' 
            }}
            onClick={(e) => {
              e.stopPropagation(); 
              if (onBillboardClick) onBillboardClick(b.id);
            }}
          >
            <div style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              width: `${b.radius * 2}px`, height: `${b.radius * 2}px`, borderRadius: '50%',
              backgroundColor: getAgentColor(b.opinion), opacity: 0.15,
              border: `2px dashed ${getAgentColor(b.opinion)}`,
              pointerEvents: 'none' 
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              width: '18px', height: '10px', backgroundColor: getAgentColor(b.opinion),
              border: '1px solid white', boxShadow: `0 0 12px 2px ${getAgentColor(b.opinion)}`, borderRadius: '2px'
            }} />
          </div>
        ))}

        {/*Агенты*/}
        {agents.map((agent) => (
          <div
            key={agent.id}
            style={{
              position: 'absolute',
              left: `${agent.x}px`,
              top: `${agent.y}px`,
              width: agent.isStubborn ? '6px' : '4px',
              height: agent.isStubborn ? '6px' : '4px',
              borderRadius: agent.isStubborn ? '2px' : '50%',
              backgroundColor: getAgentColor(agent.opinion),
              border: agent.isStubborn ? '1px solid rgba(255, 255, 255, 0.8)' : 'none',
              transform: 'translate(-50%, -50%)',
              transition: isSimulating ? 'none' : 'all 0.1s linear',
              zIndex: 10
            }}
          />
        ))}
      </div>
    </div>
  )
}