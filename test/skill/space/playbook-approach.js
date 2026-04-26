
export default function() {
  const actor = getRandomPosition();

  let a = getRandomPosition();
  let b = getRandomPosition();

  const ad = distance(actor, a);
  while (Math.abs(distance(actor, b) - ad) < 4) {
    b = getRandomPosition();
  }

  const c = (ad < distance(actor, b)) ? a : b;

  return {
    observe: {
      actors: [ [actor.x, actor.y, 0, 0] ],
      targets: [ [a.x, a.y], [b.x, b.y] ],
    },
    act: {
      actors: [ [c.x, c.y] ],
    }
  };
}

function getRandomPosition() {
  return {
    x: Math.random() * 100,
    y: Math.random() * 100,
  };
}

function distance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
