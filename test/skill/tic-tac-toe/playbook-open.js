
const OPENINGS = [
  {
    observe: { marks: [] },              // When this is the start of the game
    act: { marks: [ [2, 2, "X"] ] }      // Then take the center
  },
  {
    observe: { marks: [ [2, 2, "X"] ] }, // When opponent opened by taking the center
    act: { marks: [ [1, 1, "O"] ] }      // Then respond by taking the top-left corner
  },
  {
    observe: { marks: [ [2, 2, "O"] ] }, // When opponent opened by taking the center
    act: { marks: [ [1, 1, "X"] ] }      // Then respond by taking the top-left corner
  },
];

const CORNERS = [[1, 1], [1, 3], [3, 1], [3, 3]];
const SIDES = [[1, 2], [2, 1], [2, 3], [3, 2]];

// When opponent opened by taking a side or a corner
// Then respond by taking the center
for (const place of [...CORNERS, ...SIDES]) {
  OPENINGS.push(
    {
      observe: { marks: [ [...place, "O"] ] },
      act: { marks: [ [2, 2, "X"] ] }
    },
    {
      observe: { marks: [ [...place, "X"] ] },
      act: { marks: [ [2, 2, "O"] ] }
    },
  );
}

export default function() {
  return OPENINGS[Math.floor(OPENINGS.length * Math.random())];
}
