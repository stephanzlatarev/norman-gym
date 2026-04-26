import { distance } from "./math.js";

export function nearestEnemyTo(wx, wy, enemies) {
  let nearest = enemies[0];
  let nearestDist = distance(wx, wy, nearest[4], nearest[5]);
  for (let i = 1; i < enemies.length; i += 1) {
    const e = enemies[i];
    const d = distance(wx, wy, e[4], e[5]);
    if (d < nearestDist) {
      nearest = e;
      nearestDist = d;
    }
  }
  return { enemy: nearest, dist: nearestDist };
}

export function weakestInRange(wx, wy, range, enemies) {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = distance(wx, wy, e[4], e[5]);
    if (d <= range + e[2]) {
      if (!best || e[1] < best[1] || (e[1] === best[1] && d < bestDist)) {
        best = e;
        bestDist = d;
      }
    }
  }
  return best;
}

export function lowestHealthEnemy(enemies) {
  let best = enemies[0];
  for (let i = 1; i < enemies.length; i += 1) {
    if (enemies[i][1] < best[1]) {
      best = enemies[i];
    }
  }
  return best;
}
