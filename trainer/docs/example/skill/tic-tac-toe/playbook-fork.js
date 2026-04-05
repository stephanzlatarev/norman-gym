// A fork:
//
// | | | |    | | | |
// |X|X|O| -> |X|X|O|
// | |O| |    | |O|O|

export default function() {
  return {
    observe: [
      [2, 1, "X"],
      [2, 2, "X"],
      [2, 3, "O"],
      [3, 2, "O"],
    ],
    act: [3, 3, "O"]
  };
}
