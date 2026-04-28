
export default function() {
  const actor = getRandomPosition();

  let a = getRandomPosition();
  let b = getRandomPosition();

  const ad = distance(actor, a);
  let bd = distance(actor, b);

  while (Math.abs(ad - bd) < 4) {
    b = getRandomPosition();
    bd = distance(actor, b);
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
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
