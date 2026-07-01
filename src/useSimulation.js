import { useState, useEffect, useRef } from 'react'

export function useSimulation() {
  const [agents, setAgents] = useState([])
  const [billboards, setBillboards] = useState([])
  const [roads, setRoads] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const requestRef = useRef()

  const MAP_W = 500;
  const MAP_H = 400;

  const initSimulation = (config = { radius: 50, numAgents: 100, numBillboards: 4, greenLeaders: 5, redLeaders: 5 }) => {
    const targetBillboards = Math.max(0, Math.min(10, config.numBillboards));
    const targetAgents = Math.max(40, Math.min(170, config.numAgents));
    const targetGreen = Math.max(2, Math.min(15, config.greenLeaders));
    const targetRed = Math.max(2, Math.min(15, config.redLeaders));
    const customRadius = config.radius || 50;

    const newRoads = []
    for (let x = 60; x < MAP_W - 40; x += 100 + Math.random() * 40) {
      newRoads.push({ type: 'vertical', pos: x, width: 24 })
    }
    for (let y = 60; y < MAP_H - 40; y += 80 + Math.random() * 30) {
      newRoads.push({ type: 'horizontal', pos: y, width: 24 })
    }
    
    const vRoads = newRoads.filter(r => r.type === 'vertical')
    const hRoads = newRoads.filter(r => r.type === 'horizontal')

    const newBillboards = [];
    let possibleSpots = [];
    vRoads.forEach(vRoad => {
      hRoads.forEach(hRoad => {
         possibleSpots.push({ bx: vRoad.pos + 25, by: hRoad.pos - 25 });
      });
    });
    possibleSpots.sort(() => Math.random() - 0.5);

    for (let spot of possibleSpots) {
      if (newBillboards.length >= targetBillboards) break;
      
      const isOverlapping = newBillboards.some(b => {
        const dx = b.x - spot.bx;
        const dy = b.y - spot.by;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < b.radius + customRadius; 
      });

      if (!isOverlapping) {
        newBillboards.push({
          id: crypto.randomUUID(),
          x: spot.bx,
          y: spot.by,
          radius: customRadius,
          opinion: Math.random() > 0.5 ? 0.9 : 0.1,
          power: 0.05
        });
      }
    }

    const newAgents = [];
    let agentsConfig = [];
    
    for (let i = 0; i < targetGreen; i++) {
      agentsConfig.push({ opinion: 0.9, isStubborn: true, susceptibility: 0 });
    }
    for (let i = 0; i < targetRed; i++) {
      agentsConfig.push({ opinion: 0.1, isStubborn: true, susceptibility: 0 });
    }

    const regularCount = targetAgents;
    
    for (let i = 0; i < regularCount; i++) {
      const psychRand = Math.random();
      let susceptibility;
      if (psychRand < 0.2) susceptibility = 0.7 + Math.random() * 0.3; 
      else if (psychRand < 0.8) susceptibility = 0.3 + Math.random() * 0.4; 
      else susceptibility = Math.random() * 0.3; 
      
      agentsConfig.push({ opinion: Math.random(), isStubborn: false, susceptibility });
    }

    agentsConfig.sort(() => Math.random() - 0.5);

    agentsConfig.forEach(agentConf => {
      const isVert = Math.random() > 0.5;
      let ax, ay, vx, vy;
      const speed = 0.5 + Math.random() * 0.5; 

      if (isVert && vRoads.length > 0) {
        ax = vRoads[Math.floor(Math.random() * vRoads.length)].pos;
        ay = Math.random() * MAP_H;
        vx = 0;
        vy = (Math.random() > 0.5 ? 1 : -1) * speed;
      } else if (hRoads.length > 0) {
        ax = Math.random() * MAP_W;
        ay = hRoads[Math.floor(Math.random() * hRoads.length)].pos;
        vx = (Math.random() > 0.5 ? 1 : -1) * speed;
        vy = 0;
      }

      newAgents.push({
        id: crypto.randomUUID(),
        opinion: agentConf.opinion, 
        susceptibility: agentConf.susceptibility,
        isStubborn: agentConf.isStubborn, 
        x: ax, y: ay, vx: vx, vy: vy,
        inIntersection: false, friendIds: []
      });
    });

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

       if (a.x < 0) { a.x = MAP_W; a.inIntersection = false; }
        else if (a.x > MAP_W) { a.x = 0; a.inIntersection = false; }
      if (a.y < 0) { a.y = MAP_H; a.inIntersection = false; }
        else if (a.y > MAP_H) { a.y = 0; a.inIntersection = false; }

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

              if (!a.isStubborn && a.susceptibility > 0.7 && minDistance > nearestB.radius && Math.random() < 0.25) {
                if (Math.abs(dx) > Math.abs(dy)) {
                  a.vy = 0; a.vx = (dx > 0 ? 1 : -1) * speed; a.y = onHRoad.pos;
                } else {
                  a.vx = 0; a.vy = (dy > 0 ? 1 : -1) * speed; a.x = onVRoad.pos;
                }
                turned = true;
              }
              else if (!a.isStubborn && a.susceptibility < 0.4 && opinionDiff > 0.5 && minDistance < (nearestB.radius + 70) && Math.random() < 0.25) {
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

      const totalAgents = updated.length;
      const greenAgentsCount = updated.filter(a => a.opinion > 0.5).length;
      
      const greenPowerRatio = totalAgents > 0 ? greenAgentsCount / totalAgents : 0.5;
      const redPowerRatio = totalAgents > 0 ? 1 - greenPowerRatio : 0.5;

      for (let i = 0; i < updated.length; i++) {
        for (let j = i + 1; j < updated.length; j++) {
          let a = updated[i]
          let b = updated[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 5 && distance > 0) { 
            if (a.isStubborn && b.isStubborn) {
              if ((a.opinion > 0.5) !== (b.opinion > 0.5)) {
                if (Math.random() < 0.1) {
                  const aIsGreen = a.opinion > 0.5;
                  const chanceForAToWin = aIsGreen ? greenPowerRatio : redPowerRatio;

                  if (Math.random() < chanceForAToWin) {
                    b.opinion = aIsGreen ? 0.9 : 0.1;
                  } else {
                    a.opinion = b.opinion > 0.5 ? 0.9 : 0.1;
                  }
                }
              }
            } 
            else {
              let diff = b.opinion - a.opinion
              a.opinion += diff * 0.5 * a.susceptibility 
              b.opinion -= diff * 0.5 * b.susceptibility 
            }
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

  const toggleBillboardOpinion = (id) => {
    setBillboards(current =>
      current.map(b => {
        if (b.id === id) {
          return { ...b, opinion: b.opinion > 0.5 ? 0.1 : 0.9 }
        }
        return b
      })
    )
  }

const addBillboard = (x, y, newRadius = 50) => {
    setBillboards(current => {
      const isOnRoad = roads.some(road => {
        const margin = 12; 
        if (road.type === 'vertical') {
          return Math.abs(x - road.pos) < (road.width / 2 + margin);
        } else {
          return Math.abs(y - road.pos) < (road.width / 2 + margin);
        }
      });

      if (isOnRoad) return current;

      const isOverlapping = current.some(b => {
        const dx = b.x - x;
        const dy = b.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < b.radius + newRadius; 
      });

      if (isOverlapping) return current;

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          x: x,
          y: y,
          radius: newRadius,
          opinion: Math.random() > 0.5 ? 0.9 : 0.1,
          power: 0.05
        }
      ];
    });
  }

  const changeBillboardRadius = (id, newRadius) => {
    setBillboards(current => {
      const target = current.find(b => b.id === id);
      if (!target) return current;

      const isOverlapping = current.some(b => {
        if (b.id === id) return false; 
        const dx = b.x - target.x;
        const dy = b.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < b.radius + newRadius;
      });

      if (isOverlapping) return current;

      return current.map(b => b.id === id ? { ...b, radius: newRadius } : b);
    });
  }

  const removeBillboard = (id) => {
    setBillboards(current => current.filter(b => b.id !== id))
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
  }, [isSimulating, billboards])

  return { agents, billboards, roads, isSimulating, setIsSimulating, initSimulation, doStep, toggleBillboardOpinion, addBillboard, changeBillboardRadius, removeBillboard }
}