
export default function() {
  const actor = getRandomPosition(50, 50, 50);

  let a = getRandomPosition(actor.x, actor.y, 20);
  let b = getRandomPosition(actor.x, actor.y, 20);

  const ad = distance(actor, a);
  let bd = distance(actor, b);

  while (Math.abs(ad - bd) <= 1) {
    b = getRandomPosition(actor.x, actor.y, 20);
    bd = distance(actor, b);
  }

  const c = (ad < distance(actor, b)) ? a : b;

  return {
    observe: {
      actors: [ [actor.x, actor.y, random(50, 50), random(50, 50)] ],
      targets: [ [a.x, a.y], [b.x, b.y] ],
    },
    act: {
      actors: [ [c.x, c.y] ],
    }
  };
}

function random(value, delta) {
  let min = value - delta;
  let max = value + delta;

  if (min < 0) {
    min = 0;
    max = delta + delta;
  } else if (max > 100) {
    min = 100 - delta - delta;
    max = 100;
  }

  const result = min + (Math.random() * (max - min));
  return Number(result.toFixed(2));
}

function getRandomPosition(x, y, d) {
  return {
    x: random(x, d),
    y: random(y, d),
  };
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
