// Базовые размеры карты симуляции
export const MAP_W = 500;
export const MAP_H = 400;

// Основная функция генерации стартового состояния карты
export function generateMapConfig(config) {
  // Защита от некорректных значений
  const targetBillboards = Math.max(0, Math.min(10, config.numBillboards));
  const targetAgents = Math.max(40, Math.min(170, config.numAgents));
  const targetGreen = Math.max(2, Math.min(15, config.greenLeaders));
  const targetRed = Math.max(2, Math.min(15, config.redLeaders));
  const targetPromoters = Math.max(0, Math.min(10, config.numPromoters));
  const targetRepairmen = Math.max(1, Math.min(10, config.numRepairmen ?? 3));
  const targetObstacles = Math.max(0, Math.min(10, config.numObstacles));
  const targetBuildings = Math.max(0, Math.min(40, config.numBuildings ?? 20));
  const customRadius = config.radius || 50;

  // Генерация дорог
  const newRoads = []
  // Вертикальные дороги
  for (let x = 60; x < MAP_W - 40; x += 110 + Math.random() * 50) {
    newRoads.push({ type: 'vertical', pos: x, width: 24 })
  }
  // Горизонтальные дороги
  for (let y = 60; y < MAP_H - 40; y += 100 + Math.random() * 40) {
    newRoads.push({ type: 'horizontal', pos: y, width: 24 })
  }
  
  // Разделение дорог по типам для поиска пересечений
  const vRoads = newRoads.filter(r => r.type === 'vertical')
  const hRoads = newRoads.filter(r => r.type === 'horizontal')

  // Генерация зданий 
  const newBuildings = [];
  let bAttempts = 0;
  while (newBuildings.length < targetBuildings && bAttempts < 500) {
    bAttempts++;
    let bx = 0, by = 0;
    let attachedToVert;
    
    // Случайный выбор, к какой дороге привязать здание (вертикальной или горизонтальной)
    if (Math.random() > 0.5 && vRoads.length > 0) {
      let r = vRoads[Math.floor(Math.random() * vRoads.length)];
      bx = r.pos + (Math.random() > 0.5 ? 29 : -29); 
      by = 40 + Math.random() * (MAP_H - 80);
      attachedToVert = true;
    } else if (hRoads.length > 0) {
      let r = hRoads[Math.floor(Math.random() * hRoads.length)];
      bx = 40 + Math.random() * (MAP_W - 80);
      by = r.pos + (Math.random() > 0.5 ? 29 : -29); // Сдвигаем вверх или вниз от дороги
      attachedToVert = false;
    } else {
      continue;
    }
    
    // Здание не должно вылезать за пределы карты
    if (bx < 20 || bx > MAP_W - 20 || by < 20 || by > MAP_H - 20) continue;
    // Здания не должны накладываться друг на друга
    const bOverlaps = newBuildings.some(b => Math.abs(b.x - bx) < 45 && Math.abs(b.y - by) < 45);
    if (bOverlaps) continue;
    // Здания не должны стоять прямо на перекрестках
    const nearIntersection = attachedToVert 
      ? hRoads.some(hr => Math.abs(hr.pos - by) < 32)
      : vRoads.some(vr => Math.abs(vr.pos - bx) < 32);
    if (nearIntersection) continue;
    // Если все проверки пройдены, здание добавляется
    newBuildings.push({ id: crypto.randomUUID(), x: bx, y: by, w: 30, h: 30 });
  }

  // Генерация билбордов 
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
    // Проверка наложения радиусов влияния билбордов друг на друга
    const isOverlapping = newBillboards.some(b => {
      return Math.sqrt((b.x - spot.bx)**2 + (b.y - spot.by)**2) < b.radius + customRadius; 
    });
    
    // Проверка наложения билборда на здание
    const isOverlappingBld = newBuildings.some(bld => {
      return Math.sqrt((bld.x - spot.bx)**2 + (bld.y - spot.by)**2) < 30; 
    });

    if (!isOverlapping && !isOverlappingBld) {
      newBillboards.push({
        id: crypto.randomUUID(), x: spot.bx, y: spot.by,
        radius: customRadius, opinion: Math.random() > 0.5 ? 0.9 : 0.1, power: 0.05
      });
    }
  }

  // Генерация ям на дорогах
  const newObstacles = [];
  const allRoads = [...newRoads];
  allRoads.sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(targetObstacles, allRoads.length); i++) {
    const road = allRoads[i];
    if (road.type === 'vertical') {
      newObstacles.push({ id: crypto.randomUUID(), x: road.pos, y: 80 + Math.random() * (MAP_H - 160), size: 14 });
    } else {
      newObstacles.push({ id: crypto.randomUUID(), x: 80 + Math.random() * (MAP_W - 160), y: road.pos, size: 14 });
    }
  }

  // Создание конфигурации агентов (распределение ролей)
  const newAgents = [];
  let agentsConfig = [];
  
  // Лидеры 
  for (let i = 0; i < targetGreen; i++) agentsConfig.push({ opinion: 0.9, isStubborn: true, susceptibility: 0, isPromoter: false, isRepairman: false });
  for (let i = 0; i < targetRed; i++) agentsConfig.push({ opinion: 0.1, isStubborn: true, susceptibility: 0, isPromoter: false, isRepairman: false });

  // Промоутеры 
  for (let i = 0; i < targetPromoters; i++) {
    agentsConfig.push({ opinion: i % 2 === 0 ? 0.95 : 0.05, isStubborn: true, susceptibility: 0, isPromoter: true, isRepairman: false });
  }

  // Ремонтники дорог 
  for (let i = 0; i < targetRepairmen; i++) {
    agentsConfig.push({ opinion: 0.5, isStubborn: true, susceptibility: 0, isPromoter: false, isRepairman: true });
  }

  // Обычные жители со случайной податливостью 
  for (let i = 0; i < targetAgents; i++) {
    const psychRand = Math.random();
    let susceptibility;
    if (psychRand < 0.2) susceptibility = 0.7 + Math.random() * 0.3; // 20% легко внушаемые
    else if (psychRand < 0.8) susceptibility = 0.3 + Math.random() * 0.4; // 60% средние
    else susceptibility = Math.random() * 0.3; // 20% упертые
    agentsConfig.push({ opinion: Math.random(), isStubborn: false, susceptibility, isPromoter: false, isRepairman: false });
  }

  agentsConfig.sort(() => Math.random() - 0.5);

  // Спавн агетов на карте 
  agentsConfig.forEach(agentConf => {
    const isVert = Math.random() > 0.5;
    let ax, ay, vx, vy;
    // Назначение скорости 
    const speed = agentConf.isPromoter ? 0.4 : (agentConf.isRepairman ? 0.8 : (0.5 + Math.random() * 0.5)); 

    // Спавн агента на случайной дороге
    if (isVert && vRoads.length > 0) {
      ax = vRoads[Math.floor(Math.random() * vRoads.length)].pos; ay = Math.random() * MAP_H;
      vx = 0; vy = (Math.random() > 0.5 ? 1 : -1) * speed;
    } else if (hRoads.length > 0) {
      ax = Math.random() * MAP_W; ay = hRoads[Math.floor(Math.random() * hRoads.length)].pos;
      vx = (Math.random() > 0.5 ? 1 : -1) * speed; vy = 0;
    }

    // Итоговый объект агента со всеми параметрами 
    newAgents.push({
      id: crypto.randomUUID(), opinion: agentConf.opinion, susceptibility: agentConf.susceptibility,
      isStubborn: agentConf.isStubborn, isPromoter: agentConf.isPromoter, isRepairman: agentConf.isRepairman,               
      x: ax, y: ay, vx: vx, vy: vy, inIntersection: false, friendIds: [], extremeTicks: 0,
      leaderAge: agentConf.isStubborn ? Math.floor(Math.random() * 800) : 0, bounceCooldown: 0,
      inBuildingId: null, buildingTimer: 0, savedX: 0, savedY: 0, savedVx: 0, savedVy: 0,
      repairTimer: 0, targetObsId: null
    });
  });

  // Социальные связи
  // Жители со схожими мнениями имеют шанс стать друзьями и влиять друг на друга на расстоянии
  for (let agentA of newAgents) {
    for (let agentB of newAgents) {
      if (agentA.id !== agentB.id && !agentA.isPromoter && !agentB.isPromoter && !agentA.isRepairman && !agentB.isRepairman) {
        const opinionDiff = Math.abs(agentA.opinion - agentB.opinion)
        if (Math.random() < (0.2 - opinionDiff * 0.1)) agentA.friendIds.push(agentB.id)
      }
    }
  }

  return { newRoads, newBillboards, newObstacles, newBuildings, newAgents };
}

// Спонтанное появления новых ям на дорогах
export function trySpawnRandomObstacle(roads, obstacles, setObstacles) {
  // Шанс 1,5 % каждый кадр, максимум 8 активных ям одновременно
  if (Math.random() < 0.015 && obstacles.length < 8) {
    const vRoads = roads.filter(r => r.type === 'vertical');
    const hRoads = roads.filter(r => r.type === 'horizontal');
    let bx = null, by = null;

    // Выбор случайной точки на дороге
    if (Math.random() > 0.5 && vRoads.length > 0) {
      bx = vRoads[Math.floor(Math.random() * vRoads.length)].pos;
      by = 60 + Math.random() * (MAP_H - 120);
    } else if (hRoads.length > 0) {
      bx = 60 + Math.random() * (MAP_W - 120);
      by = hRoads[Math.floor(Math.random() * hRoads.length)].pos;
    }

    if (bx !== null && by !== null) {
      // Проверка, не находится ли точка слишком близко к перекрестку
      const isNearInt = vRoads.some(vr => Math.abs(vr.pos - bx) < 5)
        ? hRoads.some(hr => Math.abs(hr.pos - by) < 30)
        : vRoads.some(vr => Math.abs(vr.pos - bx) < 30);

      // Если место подходит и там еще нет ремонта — спавнится яма
      if (!isNearInt) {
        const isOverlapping = obstacles.some(o => Math.abs(o.x - bx) < 30 && Math.abs(o.y - by) < 30);
        if (!isOverlapping) {
          setObstacles(curr => [...curr, { id: crypto.randomUUID(), x: bx, y: by, size: 14 }]);
        }
      }
    }
  }
}