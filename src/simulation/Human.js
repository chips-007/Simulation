import { MAP_W, MAP_H } from './Base';

// Главная функция расчета физики и логики поведения агентов
export function processAgentsStep(currentAgents, context, setters) {
  const { roads, obstacles, buildings, billboards } = context;
  const { setBillboards, setObstacles } = setters;

  let newlyFixed = []; // Список отремонтированных участков дорог в кадре 
  let updated = currentAgents.map(a => ({ ...a })) 
  
  const vRoads = roads.filter(r => r.type === 'vertical')
  const hRoads = roads.filter(r => r.type === 'horizontal')

  // Сбор общей статистики города
  const greenAgentsCount = updated.filter(a => a.opinion > 0.5 && !a.isRepairman).length;
  const validTotalAgents = updated.filter(a => !a.isRepairman).length;
  
  const greenPowerRatio = validTotalAgents > 0 ? greenAgentsCount / validTotalAgents : 0.5;
  const redPowerRatio = validTotalAgents > 0 ? 1 - greenPowerRatio : 0.5;

  const EXTREME_GREEN = 0.80; const EXTREME_RED = 0.20;   
  let currentGreenLeaders = updated.filter(agent => agent.isStubborn && agent.opinion > 0.5 && !agent.isPromoter && !agent.isRepairman).length;
  let currentRedLeaders = updated.filter(agent => agent.isStubborn && agent.opinion <= 0.5 && !agent.isPromoter && !agent.isRepairman).length;
  const MAX_LEADERS_PER_SIDE = 15;

  // Сбор ID всех ям, к которым уже идут ремонтники, чтобы все не бежали к одной яме
  let claimedObstacles = new Set();
  for (let ag of updated) {
    if (ag.isRepairman && ag.targetObsId) {
      if (obstacles.some(o => o.id === ag.targetObsId)) {
        claimedObstacles.add(ag.targetObsId);
      } else {
        ag.targetObsId = null; // Яма удалена, сброс цели
      }
    }
  }

  // Главный цикл обработки каждого агента 
  for (let a of updated) {
    
    // Логика ремонтника 
    if (a.isRepairman) {
      // Если он уже чинит дорогу
      if (a.repairTimer > 0) {
        a.repairTimer--;
        if (a.repairTimer <= 0) {
          // Время вышло, дорога отремонтирована 
          if (a.targetObsId) newlyFixed.push(a.targetObsId);
          a.targetObsId = null;
          
          // Возвращение ему скорости 
          const speed = 0.8;
          if (Math.abs(a.savedVx) > 0.1) {
            a.vx = (Math.random() > 0.5 ? 1 : -1) * speed; a.vy = 0;
          } else {
            a.vx = 0; a.vy = (Math.random() > 0.5 ? 1 : -1) * speed;
          }
        }
        continue; //
      }
      
      // Проверка, дошел ли он до своей цели
      let reachedObs = null;
      for (let obs of obstacles) {
        if (Math.abs(a.x - obs.x) < 15 && Math.abs(a.y - obs.y) < 15) {
          reachedObs = obs; break;
        }
      }
      if (reachedObs) {
        // Еслм дошел, его остановка и запуск таймера ремонта (15 кадров)
        if (Math.abs(a.vx) > 0 || Math.abs(a.vy) > 0) {
          a.savedVx = a.vx;
          a.savedVy = a.vy;
        }
        a.vx = 0; a.vy = 0;
        a.repairTimer = 15; 
        a.targetObsId = reachedObs.id;
        claimedObstacles.add(reachedObs.id);
        continue; 
      }
    }

    // Логика нахождения в здании
    if (a.inBuildingId) {
      a.buildingTimer--;
      if (a.buildingTimer <= 0) {
        a.inBuildingId = null;
        a.x = a.savedX; a.y = a.savedY;
        a.vx = a.savedVx; a.vy = a.savedVy;
      } else {
        a.x += (Math.random() - 0.5) * 0.5;
        a.y += (Math.random() - 0.5) * 0.5;
      }
    } else {
      // Логика движения на улице
      // Если обычный житель - отталкивание от ямы
      if (!a.isRepairman) {
        let hitObstacle = false;
        if (a.bounceCooldown > 0) {
          a.bounceCooldown--; 
        } else {
          for (let obs of obstacles) {
            if (newlyFixed.includes(obs.id)) continue; 
            let dx = a.x - obs.x; let dy = a.y - obs.y;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
              let movingTowardsX = (dx >= 0 && a.vx < 0) || (dx <= 0 && a.vx > 0);
              let movingTowardsY = (dy >= 0 && a.vy < 0) || (dy <= 0 && a.vy > 0);
              if (movingTowardsX || movingTowardsY) hitObstacle = true;
            }
          }
        }
        if (hitObstacle) {
          a.vx *= -1; a.vy *= -1; a.bounceCooldown = 40; // Разворот на 180 градусов
        }
      }

      // Применение скорости к координатам
      a.x += a.vx;
      a.y += a.vy;

      // Если агент ушел за край экрана, он появляется с другой стороны
      if (a.x < 0) { a.x = MAP_W; a.inIntersection = false; } else if (a.x > MAP_W) { a.x = 0; a.inIntersection = false; }
      if (a.y < 0) { a.y = MAP_H; a.inIntersection = false; } else if (a.y > MAP_H) { a.y = 0; a.inIntersection = false; }

      // Логика перекрестков 
      const onVRoad = vRoads.find(r => Math.abs(a.x - r.pos) < 2)
      const onHRoad = hRoads.find(r => Math.abs(a.y - r.pos) < 2)

      if (onVRoad && onHRoad) {
        // Агент зашел на перекресток
        if (!a.inIntersection) {
          a.inIntersection = true
          
          // Навигация ремонтника: ищет ближайшую свободную яму и поворачивает к ней
          if (a.isRepairman && obstacles.length > 0) {
            let nearestObs = null; let minDistance = Infinity;
            for (let obs of obstacles) {
              if (claimedObstacles.has(obs.id) && a.targetObsId !== obs.id) continue;
              
              let dist = Math.abs(a.x - obs.x) + Math.abs(a.y - obs.y); 
              if (dist < minDistance) { minDistance = dist; nearestObs = obs; }
            }
            
            if (nearestObs) {
              a.targetObsId = nearestObs.id;
              claimedObstacles.add(nearestObs.id);
              
              const speed = 0.8;
              // Поворот в сторону ямы
              if (Math.abs(nearestObs.x - a.x) < 14) { 
                a.vy = (nearestObs.y > a.y ? 1 : -1) * speed; a.vx = 0; a.x = onVRoad.pos;
              } else if (Math.abs(nearestObs.y - a.y) < 14) { 
                a.vx = (nearestObs.x > a.x ? 1 : -1) * speed; a.vy = 0; a.y = onHRoad.pos;
              } else { 
                const dx = nearestObs.x - a.x; const dy = nearestObs.y - a.y;
                if (Math.abs(dx) > Math.abs(dy)) { 
                  a.vy = 0; a.vx = (dx > 0 ? 1 : -1) * speed; a.y = onHRoad.pos; 
                } else { 
                  a.vx = 0; a.vy = (dy > 0 ? 1 : -1) * speed; a.x = onVRoad.pos; 
                }
              }
            } else {
              // Если ям нет, ремонтник сворачивает случайно, как обычный житель
              a.targetObsId = null;
              const speed = 0.8;
              if (Math.random() < 0.5) { 
                if (a.vx === 0) { a.vy = 0; a.vx = (Math.random() > 0.5 ? 1 : -1) * speed; a.y = onHRoad.pos; } 
                else { a.vx = 0; a.vy = (Math.random() > 0.5 ? 1 : -1) * speed; a.x = onVRoad.pos; }
              }
            }
          } 
          // Навигация обычного жителя
          else if (a.bounceCooldown <= 0 || a.isRepairman) {
            const speed = Math.abs(a.vx || a.vy)
            let turned = false;

            let nearestB = null; let minDistance = Infinity;
            if (!a.isRepairman) {
              for (let b of billboards) {
                let dist = Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
                if (dist < minDistance) { minDistance = dist; nearestB = b; }
              }
            }

           // Умный поиск пути на основе мнений
           if (nearestB) {
              const opinionDiff = Math.abs(a.opinion - nearestB.opinion);
              const dx = nearestB.x - a.x; const dy = nearestB.y - a.y;

              // Если агент легко внушаем, он может свернуть в сторону билборда, чтобы посмотреть на него
              if (!a.isStubborn && a.susceptibility > 0.7 && minDistance > nearestB.radius && Math.random() < 0.25) {
                if (Math.abs(dx) > Math.abs(dy)) { a.vy = 0; a.vx = (dx > 0 ? 1 : -1) * speed; a.y = onHRoad.pos; } 
                else { a.vx = 0; a.vy = (dy > 0 ? 1 : -1) * speed; a.x = onVRoad.pos; }
                turned = true;
              }
              // Если агент упертый, он может свернуть в другую сторону, чтобы избежать билборда
              else if (!a.isStubborn && a.susceptibility < 0.4 && opinionDiff > 0.5 && minDistance < (nearestB.radius + 70) && Math.random() < 0.25) {
                if (Math.abs(dx) > Math.abs(dy)) { a.vy = 0; a.vx = (dx > 0 ? -1 : 1) * speed; a.y = onHRoad.pos; } 
                else { a.vx = 0; a.vy = (dy > 0 ? -1 : 1) * speed; a.x = onVRoad.pos; }
                turned = true;
              }
            }

            // Обычный случайный поворот
            if (!turned) {
              if (Math.random() < 0.5) { 
                if (a.vx === 0) { a.vy = 0; a.vx = (Math.random() > 0.5 ? 1 : -1) * speed; a.y = onHRoad.pos; } 
                else { a.vx = 0; a.vy = (Math.random() > 0.5 ? 1 : -1) * speed; a.x = onVRoad.pos; }
              }
            }
          }
        }
      } else {
        a.inIntersection = false;
        
        // Корректировка маршрута ремонтника, если яму удалили, пока он шел
        if (a.isRepairman && obstacles.length > 0) {
          let nearestObs = null; let minDistance = Infinity;
          for (let obs of obstacles) {
            if (claimedObstacles.has(obs.id) && a.targetObsId !== obs.id) continue;

            let dist = Math.abs(a.x - obs.x) + Math.abs(a.y - obs.y);
            if (dist < minDistance) { minDistance = dist; nearestObs = obs; }
          }
          if (nearestObs) {
            a.targetObsId = nearestObs.id;
            claimedObstacles.add(nearestObs.id);

            const speed = 0.8;
            const sameVRoad = onVRoad && Math.abs(nearestObs.x - a.x) < 14;
            const sameHRoad = onHRoad && Math.abs(nearestObs.y - a.y) < 14;

            if (sameVRoad) {
              let dirY = nearestObs.y > a.y ? 1 : -1;
              if (Math.sign(a.vy) !== dirY && a.vy !== 0) {
                a.vy = dirY * speed; a.vx = 0;
              }
            } else if (sameHRoad) {
              let dirX = nearestObs.x > a.x ? 1 : -1;
              if (Math.sign(a.vx) !== dirX && a.vx !== 0) {
                a.vx = dirX * speed; a.vy = 0;
              }
            }
          }
        }
      }

      // Заход в здание
      if (!a.isRepairman && Math.random() < 0.015) { 
        let nearestBuild = null; 
        let minBuildDist = Infinity;
        for (let b of buildings) {
          let dist = Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
          if (dist < minBuildDist) { minBuildDist = dist; nearestBuild = b; }
        }
        if (nearestBuild && minBuildDist < 35) {
          a.inBuildingId = nearestBuild.id;
          a.buildingTimer = 200 + Math.random() * 300; 
          a.savedX = a.x; a.savedY = a.y; 
          a.savedVx = a.vx; a.savedVy = a.vy;
          a.x = nearestBuild.x + (Math.random() - 0.5) * 14; 
          a.y = nearestBuild.y + (Math.random() - 0.5) * 14;
          a.vx = 0; a.vy = 0;
        }
      }

      // Влияние билбордов
      if (!a.inBuildingId && !a.isRepairman) {
        for (let b of billboards) {
          let dx = a.x - b.x; let dy = a.y - b.y;
          if (dx * dx + dy * dy < b.radius * b.radius) a.opinion += (b.opinion - a.opinion) * b.power * a.susceptibility;
        }
      }
    } 

    // Радиус влияния лидеров
    if (!a.isStubborn && !a.isRepairman) {
      for (let other of updated) {
        let isLeader = other.isStubborn && !other.isPromoter && !other.isRepairman;
        if (isLeader) {
          let isSameBuilding = a.inBuildingId && a.inBuildingId === other.inBuildingId;
          let dx = a.x - other.x; let dy = a.y - other.y;
          
          if (isSameBuilding || (!a.inBuildingId && !other.inBuildingId && (dx * dx + dy * dy < 40 * 40))) {
            a.opinion += (other.opinion - a.opinion) * 0.04 * a.susceptibility; 
          }
        }
      }
    }

    // Логика сторон и сражений за главенство 
    if (!a.isStubborn && !a.isRepairman) {
      // Если сторона проигрывает (<30%), случайные обыватели могут стать ее новыми лидерами 
      if (greenPowerRatio < 0.30 && currentGreenLeaders < 5 && a.susceptibility < 0.5 && Math.random() < 0.005) {
        a.isStubborn = true; a.susceptibility = 0; a.opinion = 0.95; a.extremeTicks = 0; a.leaderAge = 0; currentGreenLeaders++;
      }
      else if (redPowerRatio < 0.30 && currentRedLeaders < 5 && a.susceptibility < 0.5 && Math.random() < 0.005) {
        a.isStubborn = true; a.susceptibility = 0; a.opinion = 0.05; a.extremeTicks = 0; a.leaderAge = 0; currentRedLeaders++;
      }
      // Если агент долго имеет крайнее мнение, он становится лидером
      else if (a.opinion > EXTREME_GREEN || a.opinion < EXTREME_RED) {
        if (a.susceptibility < 0.4) {
          a.extremeTicks = (a.extremeTicks || 0) + 1;
          if (a.extremeTicks > 100) {
            const isPotentialGreen = a.opinion > 0.5;
            if (isPotentialGreen && currentGreenLeaders < MAX_LEADERS_PER_SIDE) {
              a.isStubborn = true; a.susceptibility = 0; a.opinion = 0.95; a.extremeTicks = 0; a.leaderAge = 0; currentGreenLeaders++; 
            } 
            else if (!isPotentialGreen && currentRedLeaders < MAX_LEADERS_PER_SIDE) {
              a.isStubborn = true; a.susceptibility = 0; a.opinion = 0.05; a.extremeTicks = 0; a.leaderAge = 0; currentRedLeaders++; 
            }
          }
        }
      } else {
        a.extremeTicks = Math.max(0, (a.extremeTicks || 0) - 2); 
      }
    } 
    // Поведение лидеров 
    else if (!a.isPromoter && !a.isRepairman) {
      a.leaderAge = (a.leaderAge || 0) + 1;
      const isGreen = a.opinion > 0.5;
      const mySideRatio = isGreen ? greenPowerRatio : redPowerRatio;

      // Если сторона лидера проигрывает, он может поставить временный билборд
      if (mySideRatio < 0.35 && !a.inBuildingId && Math.random() < 0.008) {
        let dropX = null; let dropY = null;
        const searchRadius = 40; const angles = [45, 135, 225, 315, 0, 90, 180, 270]; 

        // Поиск свободного места вокруг лидера
        for (let angle of angles) {
          const rad = angle * Math.PI / 180;
          const testX = a.x + Math.cos(rad) * searchRadius; const testY = a.y + Math.sin(rad) * searchRadius;

          if (testX < 20 || testX > MAP_W - 20 || testY < 20 || testY > MAP_H - 20) continue;
          const isOnRoad = roads.some(road => {
            const margin = 14; 
            if (road.type === 'vertical') return Math.abs(testX - road.pos) < (road.width / 2 + margin);
            return Math.abs(testY - road.pos) < (road.width / 2 + margin);
          });
          if (isOnRoad) continue;

          const isOverlapping = billboards.some(b => Math.sqrt((b.x - testX)**2 + (b.y - testY)**2) < (b.radius + 60));
          if (isOverlapping) continue;

          const isOverlappingBld = buildings.some(b => Math.sqrt((b.x - testX)**2 + (b.y - testY)**2) < 30);
          if (isOverlappingBld) continue;

          dropX = testX; dropY = testY; break; 
        }

        // Если место найдено, ставится билборд, который исчезнет через 25 секунд
        if (dropX !== null && dropY !== null) {
          a.leaderAge += 100; // Установка билборда сильно утомляет лидера
          const boardId = crypto.randomUUID();
          const newBoard = { id: boardId, x: dropX, y: dropY, radius: 70, opinion: isGreen ? 0.9 : 0.1, power: 0.1 };

          setBillboards(curr => {
            if (curr.length >= 15) return curr; // Защита от спама
            const hasOverlap = curr.some(b => Math.sqrt((b.x - newBoard.x)**2 + (b.y - newBoard.y)**2) < (b.radius + newBoard.radius));
            if (hasOverlap) return curr;

            setTimeout(() => {
              setBillboards(current => current.filter(b => b.id !== boardId));
            }, 25000);

            return [...curr, newBoard];
          });
        }
      }
      else {
        // Усталость и выгорание лидеров: если их сторона побеждает, они теряют азарт быстрее 
        const maxAge = mySideRatio > 0.70 ? 1000 : 3000;
        if (a.leaderAge > maxAge) {
          a.isStubborn = false; a.susceptibility = 0.2 + Math.random() * 0.2; 
          if (isGreen) currentGreenLeaders--; else currentRedLeaders--;
          a.leaderAge = 0; a.extremeTicks = 0;
        }
      }
    }
  }

  // Социальные взаимодействия 
  // Проверка всех агентов друг с другом 
  for (let i = 0; i < updated.length; i++) {
    for (let j = i + 1; j < updated.length; j++) {
      let a = updated[i]; let b = updated[j];
      if (a.isRepairman || b.isRepairman) continue; // Кроме ремонтников

      let aIsLeader = a.isStubborn && !a.isPromoter;
      let bIsLeader = b.isStubborn && !b.isPromoter;
      let aIsNormal = !a.isStubborn;
      let bIsNormal = !b.isStubborn;

      // Лидеры общаются 1 на 1 только с другими лидерами 
      if ((aIsLeader && bIsNormal) || (bIsLeader && aIsNormal)) continue;
      // Лидеры не переубеждают промоутеров (и наоборот)
      if ((aIsLeader && b.isPromoter) || (bIsLeader && a.isPromoter)) continue;
      if (a.isPromoter && b.isPromoter) continue; // Промоутеры не спорят друг с другом

      let isSameBuilding = a.inBuildingId && a.inBuildingId === b.inBuildingId;
      let dx = b.x - a.x; let dy = b.y - a.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      // Общение происходит при столкновении на улице или со случайными людьми в здании 
      if ((!a.inBuildingId && !b.inBuildingId && distance < 5 && distance > 0) || (isSameBuilding && Math.random() < 0.03)) { 
        if (aIsLeader && bIsLeader) {
          // Дебаты двух лидеров из разных сторон
          if ((a.opinion > 0.5) !== (b.opinion > 0.5)) {
            if (Math.random() < 0.1) {
              const aIsGreen = a.opinion > 0.5;
              // Чем популярнее цвет в городе, тем больше у него шансов переключить на свою сторону
              const chanceForAToWin = aIsGreen ? greenPowerRatio : redPowerRatio;
              if (Math.random() < chanceForAToWin) b.opinion = aIsGreen ? 0.9 : 0.1;
              else a.opinion = b.opinion > 0.5 ? 0.9 : 0.1;
            }
          }
        } 
        else {
          let diff = b.opinion - a.opinion;
          a.opinion += diff * 0.5 * a.susceptibility; 
          b.opinion -= diff * 0.5 * b.susceptibility; 
        }
      }
    }
  }

  // Влияние друзей через соц. сети
  for (let a of updated) {
    if (a.isPromoter || a.isRepairman) continue;
    
    // Поиск друзей этого агента в актуальном массиве
    const friends = updated.filter(other => a.friendIds.includes(other.id))
    if (friends.length > 0) {
      // Подсчет среднего мнения по группе друзей
      const sumOfFriendsOpinions = friends.reduce((sum, f) => sum + f.opinion, 0)
      const averageFriendOpinion = sumOfFriendsOpinions / friends.length
      // Агент постоянно немного тянется к мнению своих друзей даже на расстоянии
      a.opinion += (averageFriendOpinion - a.opinion) * 0.01 * a.susceptibility
    }
    // Защита от выхода за пределы цветов
    a.opinion = Math.max(0, Math.min(1, a.opinion))
  }

  // Очистка карты от ям, которые починили в этом кадре
  if (newlyFixed.length > 0) {
    setTimeout(() => {
      setObstacles(curr => curr.filter(o => !newlyFixed.includes(o.id)));
    }, 0);
  }
  return updated;
}