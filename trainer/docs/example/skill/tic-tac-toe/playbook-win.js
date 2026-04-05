// A win:
//
// |X| | |    |X| | |
// | |X| | -> | |X| |
// |O|O| |    |O|O|X|

export default function() {
  return {
    observe: [
      [1, 1, "X"],
      [2, 2, "X"],
      [3, 1, "O"],
      [3, 2, "O"],
    ],
    act: [3, 3, "X"]
  };
}
