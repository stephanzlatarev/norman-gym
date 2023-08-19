import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.data) return null;

    const xstep = WIDTH / (this.props.data.length - 1);
    let key = 1;

    const studyPoints = [];
    const controlPoints = [];
    let x = 0;
    for (const point of this.props.data) {
      studyPoints.push(x + "," + y(point.studyError));
      controlPoints.push(x + "," + y(point.controlError));
      x += xstep;
    }

    const lines = [];
    lines.push(
      <g key={ key++ } style={{ fill: "none", stroke: "black", strokeWidth: 0.1 }}>
        <polyline points={ studyPoints.join(" ")} />
      </g>
    );
    lines.push(
      <g key={ key++ } style={{ fill: "none", stroke: "black", strokeWidth: 0.1, strokeDasharray: "0.1,0.1" }}>
        <polyline points={ controlPoints.join(" ")} />
      </g>
    );

    const grid = [];
    let zeroes = "";
    for (let y = 0; y <= HEIGHT; y++) {
      grid.push(<line key={ key++ } x1="0" y1={ y } x2={ WIDTH } y2={ y } />);
      grid.push(<text key={ key++ } x="0" y={ y + 0.6 }>0.{ zeroes }X</text>);
      zeroes += "0";
    }

    return (
      <svg width="500" height="300" viewBox={ "0 0 " + WIDTH + " " + HEIGHT } preserveAspectRatio="none">
        <g style={{ stroke: "gray", strokeWidth: 0.01, fontSize: 0.3 }}>
          { grid }
        </g>

        { lines }
      </svg>
    );
  }
}

function y(value) {
  return Math.min(Math.abs(Math.log10(value)), 5);
}
