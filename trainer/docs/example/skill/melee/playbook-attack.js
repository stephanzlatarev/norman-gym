
export default function() {
  const ex = Math.random() * 300;
  const ey = Math.random() * 300;
  const wx = Math.random() * 300;
  const wy = Math.random() * 300;

  return {
    observe: {
      enemies: [
        ["Zealot", 150, 1, 0.1, ex, ey]
      ],
      warriors: [
        ["Zealot", 150, 1, 0.1, wx, wy, "None", 0, 0]
      ]
    },
    act: {
      warriors: [
        ["Attack", ex, ey]
      ]
    }
  };
}
