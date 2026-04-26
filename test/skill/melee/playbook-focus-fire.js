import { distance, pointNear, rand, randInt } from "./math.js";
import { lowestHealthEnemy } from "./tactics.js";

export default function() {
  const cx = rand(40, 260);
  const cy = rand(40, 260);
  const radius = 20;

  const enemyCount = randInt(1, 5);
  const warriorCount = randInt(1, 5);

  // Signature for this playbook: warriors are Stalkers, enemies are Zealots.
  const enemies = [];
  for (let i = 0; i < enemyCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    enemies.push(["Zealot", randInt(70, 180), 1, 0.1, p.x, p.y]);
  }

  const warriors = [];
  for (let i = 0; i < warriorCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    warriors.push(["Stalker", randInt(80, 180), 0.75, 4, p.x, p.y, "None", 0, 0]);
  }

  const focus = lowestHealthEnemy(enemies);

  const actions = warriors.map((w) => {
    const d = distance(w[4], w[5], focus[4], focus[5]);
    const inRange = d <= w[3] + focus[2];
    if (inRange) {
      return ["Attack", focus[4], focus[5]];
    }
    return ["Move", focus[4], focus[5]];
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
