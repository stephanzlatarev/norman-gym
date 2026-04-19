import React from "react";

export default class Board extends React.Component {

  render() {
    const { observation, expected, action } = this.props.simulation;
    const objects = [];
    for (let index = 1; index < 3; index++) {
      objects.push(
        <line
          key={ "vertical-" + index }
          x1={ index * 30 }
          y1="0"
          x2={ index * 30 }
          y2="90"
          stroke="black"
          strokeWidth="1.5"
        />
      );
      objects.push(
        <line
          key={ "horizontal-" + index }
          x1="0"
          y1={ index * 30 }
          x2="90"
          y2={ index * 30 }
          stroke="black"
          strokeWidth="1.5"
        />
      );
    }

    addMarks(objects, observation?.marks, "black", "observation");
    addMarks(objects, expected?.marks, "#c0c0c0", "expected");
    addMarks(objects, action?.marks, "green", "action");

    return (
      <svg width="300" height="300" viewBox="0 0 90 90">
        { objects }
      </svg>
    );
  }
}

function addMarks(objects, marks, color, layer) {
  if (!Array.isArray(marks)) {
    return;
  }

  for (const [row, column, player] of marks) {
    if (!Number.isInteger(row) || !Number.isInteger(column) || !player) {
      continue;
    }

    objects.push(
      <text
        key={ layer + ":" + row + ":" + column + ":" + player }
        x={ (column - 1) * 30 + 15 }
        y={ (row - 1) * 30 + 15 }
        fill={ color }
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 16, fontWeight: 700, fontFamily: "sans-serif" }}
      >
        { player }
      </text>
    );
  }
}
