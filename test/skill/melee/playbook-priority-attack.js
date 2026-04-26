import { pointNear, rand, randInt } from "./math.js";
import { nearestEnemyTo, weakestInRange } from "./tactics.js";

export default function() {
  const cx = rand(40, 260);
  const cy = rand(40, 260);
  const radius = 20;

  const enemyCount = randInt(1, 5);
  const warriorCount = randInt(1, 5);

  // Signature for this playbook: warriors are Zealots, enemies are Stalkers.
  const enemies = [];
  for (let i = 0; i < enemyCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    enemies.push(["Stalker", randInt(50, 200), 0.75, 4, p.x, p.y]);
  }

  const warriors = [];
  for (let i = 0; i < warriorCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    warriors.push(["Zealot", randInt(80, 180), 1, 0.1, p.x, p.y, "None", 0, 0]);
  }

  const actions = warriors.map((w) => {
    const wx = w[4];
    const wy = w[5];
    const wRange = w[3];

    const nearest = nearestEnemyTo(wx, wy, enemies);
    const bestInRange = weakestInRange(wx, wy, wRange, enemies);

    if (bestInRange) {
      return ["Attack", bestInRange[4], bestInRange[5]];
    }

    return ["Move", nearest.enemy[4], nearest.enemy[5]];
  });

  return {
    observe: {
      enemies,
      warriors
    },
    act: {
      warriors: actions
    }
  };
}
