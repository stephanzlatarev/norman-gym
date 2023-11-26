import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Resource extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.progress || !this.props.indicator) return null;

    const xstep = WIDTH / (this.props.progress.length - 1);

    const primary = [];
    const secondary = [];
    let x = 0;
    for (const point of this.props.progress) {
      if (point.resources) {
        primary.push(x + "," + y(point.resources[this.props.indicator]));

        if (this.props.secondary && point.resources[this.props.secondary]) {
          secondary.push(x + "," + y(point.resources[this.props.secondary]));
        }
      }
      x += xstep;
    }

    const grid = [];
    let key = 1;
    for (let y = 0; y <= HEIGHT; y++) {
      grid.push(<line key={ key++ } x1="0" y1={ y } x2={ WIDTH } y2={ y } />);
      grid.push(<text key={ key++ } x="0" y={ y + 0.6 }>{ tick(y) }</text>);
    }

    return (
      <svg width="500" height="300" viewBox={ "0 0 " + WIDTH + " " + HEIGHT } preserveAspectRatio="none">
        <g style={{ stroke: "gray", strokeWidth: 0.01, fontSize: 0.3 }}>
          { grid }
        </g>

        <g style={{ fill: "none", stroke: "black", strokeWidth: 0.1 }}>
          <polyline points={ primary.join(" ")} />
        </g>

        <g style={{ fill: "none", stroke: "black", strokeWidth: 0.05, strokeDasharray: WIDTH / 200 }}>
          <polyline points={ secondary.join(" ")} />
        </g>
      </svg>
    );
  }
}

function y(value) {
  return (value >= 0) ? 5 - Math.min(value * 5, 5) : 0;
}

function tick(y) {
  return (y >= 0) ? Math.floor(100 - y * 20) + "%" : "-";
}
