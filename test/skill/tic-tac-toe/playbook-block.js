// A block:
//
// |X| | |    |X| | |
// | |X| | -> | |X| |
// |O| | |    |O| |O|

export default function() {
  return {
    observe: {
      marks: [
        [1, 1, "X"],
        [2, 2, "X"],
        [3, 1, "O"],
      ]
    },
    act: {
      marks: [
        [3, 3, "O"]
      ]
    }
  };
}
