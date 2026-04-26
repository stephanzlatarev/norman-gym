import { clamp, pointNear, rand, randInt } from "./math.js";
import { nearestEnemyTo, weakestInRange } from "./tactics.js";

export default function() {
  const cx = rand(40, 260);
  const cy = rand(40, 260);
  const radius = 20;

  const enemyCount = randInt(1, 5);
  const warriorCount = randInt(2, 5);

  // Signature for this playbook: enemies are Immortals, warriors mix Stalker+Zealot.
  const enemies = [];
  for (let i = 0; i < enemyCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    enemies.push(["Immortal", randInt(120, 280), 1, 4, p.x, p.y]);
  }

  const warriors = [];
  for (let i = 0; i < warriorCount; i += 1) {
    const p = pointNear(cx, cy, radius);
    const isRanged = i % 2 === 0;
    if (isRanged) {
      warriors.push(["Stalker", randInt(90, 180), 0.75, 4, p.x, p.y, "None", 0, 0]);
    } else {
      warriors.push(["Zealot", randInt(90, 180), 1, 0.1, p.x, p.y, "None", 0, 0]);
    }
  }

  const actions = warriors.map((w) => {
    const wx = w[4];
    const wy = w[5];
    const unitType = w[0];

    const nearest = nearestEnemyTo(wx, wy, enemies);

    if (unitType === "Stalker") {
      const kiteDistance = 3;
      if (nearest.dist < kiteDistance) {
        const dx = wx - nearest.enemy[4];
        const dy = wy - nearest.enemy[5];
        const len = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
        const step = 6;
        const tx = clamp(wx + (dx / len) * step, 0, 300);
        const ty = clamp(wy + (dy / len) * step, 0, 300);
        return ["Move", tx, ty];
      }

      const target = weakestInRange(wx, wy, w[3], enemies);
      if (target) {
        return ["Attack", target[4], target[5]];
      }

      return ["Move", nearest.enemy[4], nearest.enemy[5]];
    }

    if (nearest.dist <= w[3] + nearest.enemy[2]) {
      return ["Attack", nearest.enemy[4], nearest.enemy[5]];
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
