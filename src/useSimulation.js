import { useState, useEffect, useRef } from 'react'
import { generateMapConfig, trySpawnRandomObstacle, MAP_W, MAP_H } from './simulation/Base'
import { processAgentsStep } from './simulation/Human'

export function useSimulation() {
  // Состояния
  const [agents, setAgents] = useState([])           // Все жители, лидеры, промоутеры и ремонтники
  const [billboards, setBillboards] = useState([])   // Билборды
  const [roads, setRoads] = useState([])             // Дороги
  const [obstacles, setObstacles] = useState([])     // Ямы на дорогах
  const [buildings, setBuildings] = useState([])     // Здания
  const [isSimulating, setIsSimulating] = useState(false) // Статус (Пауза/Старт)
  // Ссылка на текущий кадр анимации 
  const requestRef = useRef()

  // Инициализация новой карты
  const initSimulation = (config) => {
    const data = generateMapConfig(config);
    setRoads(data.newRoads); 
    setBillboards(data.newBillboards); 
    setObstacles(data.newObstacles); 
    setBuildings(data.newBuildings); 
    setAgents(data.newAgents);
  }

  // Один (кадр) симуляции.
  const doStep = () => {
    setAgents(currentAgents => {
      // Передача текущего состояния в физическую часть 
      return processAgentsStep(currentAgents, { roads, obstacles, buildings, billboards }, { setBillboards, setObstacles });
    });
    // Попытка создать новую поломку дороги
    trySpawnRandomObstacle(roads, obstacles, setObstacles);
  }

  // Функции удаления и изменения 
  const toggleBillboardOpinion = (id) => { setBillboards(current => current.map(b => b.id === id ? { ...b, opinion: b.opinion > 0.5 ? 0.1 : 0.9 } : b)) }
  const removeBillboard = (id) => { setBillboards(current => current.filter(b => b.id !== id)) }
  const removeObstacle = (id) => { setObstacles(curr => curr.filter(o => o.id !== id)); }
  const removeAgent = (id) => { setAgents(curr => curr.filter(a => a.id !== id)); }

  // Функции режима строительства 
  // Установка нового билборда 
  const addBillboard = (x, y, newRadius = 50) => {
    setBillboards(current => {
      // Нельзя ставить на дорогу 
      const isOnRoad = roads.some(road => {
        const margin = 12; 
        if (road.type === 'vertical') 
          return Math.abs(x - road.pos) < (road.width / 2 + margin);
        return Math.abs(y - road.pos) < (road.width / 2 + margin);
      });
      if (isOnRoad) 
        return current;

      // Радиусы влияния билбордов не должны пересекаться
      const isOverlapping = current.some(b => Math.sqrt((b.x - x)**2 + (b.y - y)**2) < b.radius + newRadius);
      if (isOverlapping) 
        return current;

      // Билборд нельзя поставить на самом здании
      const isOverlappingBld = buildings.some(bld => Math.sqrt((bld.x - x)**2 + (bld.y - y)**2) < 30);
      if (isOverlappingBld) 
        return current;

      // Если проверки пройдены, добавляется новый
      return [...current, { id: crypto.randomUUID(), x, y, radius: newRadius, opinion: Math.random() > 0.5 ? 0.9 : 0.1, power: 0.05 }];
    });
  }

  //Изменение радиуса билборда через ползунок 
  const changeBillboardRadius = (id, newRadius) => {
    setBillboards(current => {
      const target = current.find(b => b.id === id);
      if (!target) 
        return current;
      // Проверка, не пересекутся ли радиусы влияния с соседними билбордами
      const isOverlapping = current.some(b => b.id !== id && Math.sqrt((b.x - target.x)**2 + (b.y - target.y)**2) < b.radius + newRadius);
      if (isOverlapping) 
        return current; // Блокировка увеличения, если нет места
      return current.map(b => b.id === id ? { ...b, radius: newRadius } : b);
    });
  }

  // Создание ямы на дороге 
  const addObstacle = (x, y) => {
    setObstacles(curr => {
      const margin = 20; let snapX, snapY;
      // Поиск самой близкой дороги к месту клика
      let vRoad = roads.find(r => r.type === 'vertical' && Math.abs(r.pos - x) < margin);
      let hRoad = roads.find(r => r.type === 'horizontal' && Math.abs(r.pos - y) < margin);

      // Примагничивание ямы ровно к центру дороги или перекрестку
      if (vRoad && hRoad) 
        { snapX = vRoad.pos; snapY = hRoad.pos; } 
      else if (vRoad) 
        { snapX = vRoad.pos; snapY = y; } 
      else if (hRoad) 
        { snapX = x; snapY = hRoad.pos; } 
      else 
        { return curr; } // Клик был слишком далеко от дороги

      // Проверка, чтобы не ставить яму поверх другой ямы
      const isOverlappingObs = curr.some(obs => Math.abs(obs.x - snapX) < 16 && Math.abs(obs.y - snapY) < 16);
      if (isOverlappingObs) 
        return curr;

      return [...curr, { id: crypto.randomUUID(), x: snapX, y: snapY, size: 14 }];
    });
  }

  // Спавн промоутера
  const addPromoter = (x, y, isGreen) => {
    setAgents(curr => {
      const margin = 20; let snapX, snapY; let vx = 0, vy = 0;
      let vRoad = roads.find(r => r.type === 'vertical' && Math.abs(r.pos - x) < margin);
      let hRoad = roads.find(r => r.type === 'horizontal' && Math.abs(r.pos - y) < margin);

      // Спавн на дороге и задание начального направления движения
      if (vRoad) 
        { snapX = vRoad.pos; snapY = y; vy = (Math.random() > 0.5 ? 1 : -1) * 0.4; } 
      else if (hRoad) 
        { snapX = x; snapY = hRoad.pos; vx = (Math.random() > 0.5 ? 1 : -1) * 0.4; } 
      else 
        { return curr; } 

      return [...curr, {
        id: crypto.randomUUID(), opinion: isGreen ? 0.95 : 0.05, susceptibility: 0, isStubborn: true, isPromoter: true, isRepairman: false,
        x: snapX, y: snapY, vx, vy, inIntersection: false, friendIds: [], extremeTicks: 0, leaderAge: 0, bounceCooldown: 0,
        inBuildingId: null, buildingTimer: 0, savedX: 0, savedY: 0, savedVx: 0, savedVy: 0, repairTimer: 0, targetObsId: null
      }];
    });
  }

  // Спавн ремонтника 
  const addRepairman = (x, y) => {
    setAgents(curr => {
      const margin = 20; let snapX, snapY; let vx = 0, vy = 0;
      let vRoad = roads.find(r => r.type === 'vertical' && Math.abs(r.pos - x) < margin);
      let hRoad = roads.find(r => r.type === 'horizontal' && Math.abs(r.pos - y) < margin);

      const speed = 0.8; 
      if (vRoad) 
        { snapX = vRoad.pos; snapY = y; vy = (Math.random() > 0.5 ? 1 : -1) * speed; } 
      else if (hRoad) 
        { snapX = x; snapY = hRoad.pos; vx = (Math.random() > 0.5 ? 1 : -1) * speed; } 
      else 
        { return curr; } 

      return [...curr, {
        id: crypto.randomUUID(), opinion: 0.5, susceptibility: 0, isStubborn: true, isPromoter: false, isRepairman: true,
        x: snapX, y: snapY, vx, vy, inIntersection: false, friendIds: [], extremeTicks: 0, leaderAge: 0, bounceCooldown: 0,
        inBuildingId: null, buildingTimer: 0, savedX: 0, savedY: 0, savedVx: 0, savedVy: 0, repairTimer: 0, targetObsId: null
      }];
    });
  }

  // Спавн здания
  const addBuilding = (x, y) => {
    setBuildings(curr => {
      const margin = 40; 
      let snapX = null, snapY = null;
      
      let vRoad = roads.find(r => r.type === 'vertical' && Math.abs(r.pos - x) < margin);
      let hRoad = roads.find(r => r.type === 'horizontal' && Math.abs(r.pos - y) < margin);

      if (!vRoad && !hRoad) return curr;

      // Здание ставится вплотную к дороге 
      if (vRoad && hRoad) {
        if (Math.abs(vRoad.pos - x) < Math.abs(hRoad.pos - y)) {
          snapX = vRoad.pos + (x > vRoad.pos ? 29 : -29); snapY = y;
        } 
        else {
          snapX = x; snapY = hRoad.pos + (y > hRoad.pos ? 29 : -29);
        }
      } 
      else if (vRoad) {
        snapX = vRoad.pos + (x > vRoad.pos ? 29 : -29); snapY = y;
      } 
      else if (hRoad) {
        snapX = x; snapY = hRoad.pos + (y > hRoad.pos ? 29 : -29);
      }

      // Не строятся за границами карты, на перекрестках или поверх билбордов/других зданий
      if (snapX < 20 || snapX > MAP_W - 20 || snapY < 20 || snapY > MAP_H - 20) 
        return curr;
      const isOnRoad = roads.some(road => {
        if (road.type === 'vertical') 
          return Math.abs(snapX - road.pos) < 28;
        return Math.abs(snapY - road.pos) < 28;
      });
      if (isOnRoad) 
        return curr;
      const isOverlappingBB = billboards.some(b => Math.sqrt((b.x - snapX)**2 + (b.y - snapY)**2) < 30);
      if (isOverlappingBB) 
        return curr;
      const isOverlappingBld = curr.some(b => Math.abs(b.x - snapX) < 32 && Math.abs(b.y - snapY) < 32);
      if (isOverlappingBld) 
        return curr;

      return [...curr, { id: crypto.randomUUID(), x: snapX, y: snapY, w: 30, h: 30 }];
    });
  }

  // Удаление здания с обработкой агентов в нем 
  const removeBuilding = (id) => {
    setBuildings(curr => curr.filter(b => b.id !== id));
    // Если здание убрано, нужно выгнать всех агентов обратно на улицу
    setAgents(curr => curr.map(a => {
      if (a.inBuildingId === id) {
        return { ...a, inBuildingId: null, x: a.savedX, y: a.savedY, vx: a.savedVx, vy: a.savedVy, bounceCooldown: 15 };
      }
      return a;
    }));
  }

  // Цикл работы симуляции
  useEffect(() => {
    const tick = () => { 
      doStep(); 
      requestRef.current = requestAnimationFrame(tick); 
    }
    
    // Если снято с паузы - запуск цикла
    if (isSimulating) 
      requestRef.current = requestAnimationFrame(tick)
    // Если пауза - отмена следующего кадра
    else cancelAnimationFrame(requestRef.current)
    
    // Очистка при перезапуске
    return () => cancelAnimationFrame(requestRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating, billboards, obstacles, buildings])

  return { 
    agents, billboards, roads, obstacles, buildings, 
    isSimulating, setIsSimulating, initSimulation, doStep, 
    toggleBillboardOpinion, addBillboard, changeBillboardRadius, removeBillboard, 
    addObstacle, removeObstacle, addPromoter, removeAgent, addBuilding, removeBuilding, addRepairman 
  }
}