// When opponent opens by marking a corner or a side
// Then take the center

const MARK = ["X", "O"];

export default function() {
  const player = Math.floor(Math.random() * 2);
  const opponent = (1 - player);

  // Choose a random corner or side place
  let place = Math.floor(Math.random() * 8);
  // Translate to index in the game board by skipping the center
  if (place >= 4) place++;

  const row = (place / 3) + 1;
  const col = (place % 3) + 1;

  return { observe: [ [row, col, MARK[opponent]] ], act: [2, 2, MARK[player]] };
}
