import { useState, useEffect, useRef } from 'react'

export function useSimulation() {
  const [agents, setAgents] = useState([])
  const [billboards, setBillboards] = useState([])
  const [roads, setRoads] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const requestRef = useRef()

  const MAP_W = 500;
  const MAP_H = 400;

  const initSimulation = () => {
    const newRoads = []
    for (let x = 60; x < MAP_W - 40; x += 100 + Math.random() * 40) {
      newRoads.push({ type: 'vertical', pos: x, width: 24 })
    }
    for (let y = 60; y < MAP_H - 40; y += 80 + Math.random() * 30) {
      newRoads.push({ type: 'horizontal', pos: y, width: 24 })
    }
    
    const vRoads = newRoads.filter(r => r.type === 'vertical')
    const hRoads = newRoads.filter(r => r.type === 'horizontal')

    const newBillboards = []
    vRoads.forEach(vRoad => {
      hRoads.forEach(hRoad => {
        if (Math.random() > 0.5) {
          const isGreen = Math.random() > 0.5;
          newBillboards.push({
            id: crypto.randomUUID(),
            x: vRoad.pos + 15,
            y: hRoad.pos - 15,
            radius: 50,
            opinion: isGreen ? 0.9 : 0.1,
            power: 0.05
          })
        }
      })
    })

    const randomCount = Math.floor(100 + Math.random() * 50)
    const newAgents = []
    for (let i = 0; i < randomCount; i++) {
      const isVert = Math.random() > 0.5
      let ax, ay, vx, vy
      const speed = 0.5 + Math.random() * 0.5 

      if (isVert && vRoads.length > 0) {
        ax = vRoads[Math.floor(Math.random() * vRoads.length)].pos
        ay = Math.random() * MAP_H
        vx = 0
        vy = (Math.random() > 0.5 ? 1 : -1) * speed
      } else if (hRoads.length > 0) {
        ax = Math.random() * MAP_W
        ay = hRoads[Math.floor(Math.random() * hRoads.length)].pos
        vx = (Math.random() > 0.5 ? 1 : -1) * speed
        vy = 0
      }

      newAgents.push({
        id: crypto.randomUUID(),
        opinion: Math.random(),
        susceptibility: Math.random(),
        x: ax,
        y: ay,
        vx: vx,
        vy: vy,
        inIntersection: false,
        friendIds: []
      })
    }

    for (let agentA of newAgents) {
      for (let agentB of newAgents) {
        if (agentA.id !== agentB.id) {
          const opinionDiff = Math.abs(agentA.opinion - agentB.opinion)
          if (Math.random() < (0.2 - opinionDiff * 0.1)) {
            agentA.friendIds.push(agentB.id)
          }
        }
      }
    }

    setRoads(newRoads)
    setBillboards(newBillboards)
    setAgents(newAgents)
  }

  const doStep = () => {
    setAgents(currentAgents => {
      let updated = currentAgents.map(a => ({ ...a }))
      const vRoads = roads.filter(r => r.type === 'vertical')
      const hRoads = roads.filter(r => r.type === 'horizontal')

      for (let a of updated) {
        a.x += a.vx
        a.y += a.vy

        if (a.x <= 0) { a.x = 0; a.vx = Math.abs(a.vx); }
        if (a.x >= MAP_W) { a.x = MAP_W; a.vx = -Math.abs(a.vx); }
        if (a.y <= 0) { a.y = 0; a.vy = Math.abs(a.vy); }
        if (a.y >= MAP_H) { a.y = MAP_H; a.vy = -Math.abs(a.vy); }

        const onVRoad = vRoads.find(r => Math.abs(a.x - r.pos) < 2)
        const onHRoad = hRoads.find(r => Math.abs(a.y - r.pos) < 2)

        if (onVRoad && onHRoad) {
          if (!a.inIntersection) {
            a.inIntersection = true
            const speed = Math.abs(a.vx || a.vy)
            let turned = false;

            let nearestB = null;
            let minDistance = Infinity;
            for (let b of billboards) {
              let dist = Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
              if (dist < minDistance) {
                minDistance = dist;
                nearestB = b;
              }
            }

            if (nearestB) {
              const opinionDiff = Math.abs(a.opinion - nearestB.opinion);
              const dx = nearestB.x - a.x;
              const dy = nearestB.y - a.y;

              if (a.susceptibility > 0.7) {
                if (Math.abs(dx) > Math.abs(dy)) {
                  a.vy = 0; a.vx = (dx > 0 ? 1 : -1) * speed; a.y = onHRoad.pos;
                } else {
                  a.vx = 0; a.vy = (dy > 0 ? 1 : -1) * speed; a.x = onVRoad.pos;
                }
                turned = true;
              }
              else if (a.susceptibility < 0.4 && opinionDiff > 0.5 && minDistance < 120) {
                if (Math.abs(dx) > Math.abs(dy)) {
                  a.vy = 0; a.vx = (dx > 0 ? -1 : 1) * speed; a.y = onHRoad.pos;
                } else {
                  a.vx = 0; a.vy = (dy > 0 ? -1 : 1) * speed; a.x = onVRoad.pos;
                }
                turned = true;
              }
            }

            if (!turned) {
              if (Math.random() < 0.5) { 
                if (a.vx === 0) { 
                  a.vy = 0; a.vx = (Math.random() > 0.5 ? 1 : -1) * speed; a.y = onHRoad.pos;
                } else { 
                  a.vx = 0; a.vy = (Math.random() > 0.5 ? 1 : -1) * speed; a.x = onVRoad.pos;
                }
              }
            }
          }
        } else {
          a.inIntersection = false 
        }

        for (let b of billboards) {
          let dx = a.x - b.x
          let dy = a.y - b.y
          if (dx * dx + dy * dy < b.radius * b.radius) {
            a.opinion += (b.opinion - a.opinion) * b.power * a.susceptibility
          }
        }
      }

      for (let i = 0; i < updated.length; i++) {
        for (let j = i + 1; j < updated.length; j++) {
          let a = updated[i]
          let b = updated[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 5 && distance > 0) { 
            let diff = b.opinion - a.opinion
            a.opinion += diff * 0.5 * a.susceptibility
            b.opinion -= diff * 0.5 * b.susceptibility
          }
        }
      }

      for (let a of updated) {
        const friends = updated.filter(other => a.friendIds.includes(other.id))
        if (friends.length > 0) {
          const sumOfFriendsOpinions = friends.reduce((sum, f) => sum + f.opinion, 0)
          const averageFriendOpinion = sumOfFriendsOpinions / friends.length
          a.opinion += (averageFriendOpinion - a.opinion) * 0.01 * a.susceptibility
        }
        a.opinion = Math.max(0, Math.min(1, a.opinion))
      }

      return updated
    })
  }

  useEffect(() => {
    const tick = () => {
      doStep()
      requestRef.current = requestAnimationFrame(tick)
    }

    if (isSimulating) {
      requestRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(requestRef.current)
    }
    return () => cancelAnimationFrame(requestRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating])

  return { agents, billboards, roads, isSimulating, setIsSimulating, initSimulation, doStep }
}