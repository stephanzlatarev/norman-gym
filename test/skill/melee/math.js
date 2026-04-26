export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function pointNear(cx, cy, radius) {
  return {
    x: clamp(cx + rand(-radius, radius), 0, 300),
    y: clamp(cy + rand(-radius, radius), 0, 300)
  };
}

export function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
