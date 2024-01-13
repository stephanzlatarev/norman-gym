import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.progress || !this.props.indicator) return null;

    let y = pery;
    let tick = pert;

    if (this.props.type === "log") {
      const e = exponent(this.props.progress, this.props.indicator);

      y = (y) => logy(y, e);
      tick = (y) => logt(e - y);
    }

    const xstep = WIDTH / (this.props.progress.length - 1);
    const primary = [];
    const secondary = [];

    let x = 0;
    for (const point of this.props.progress) {
      if (point[this.props.indicator] >= 0) {
        primary.push(x + "," + y(point[this.props.indicator]));
      }

      if (this.props.record && (this.props.record[this.props.indicator] >= 0)) {
        secondary.push(x + "," + y(this.props.record[this.props.indicator]));
      } else if (this.props.secondary && (point[this.props.secondary] >= 0)) {
        secondary.push(x + "," + y(point[this.props.secondary]));
      }

      x += xstep;
    }

    const grid = [];
    for (let y = 0; y <= HEIGHT; y++) {
      grid.push(<line key={ "gl" + y } x1="0" y1={ y } x2={ WIDTH } y2={ y } />);
      grid.push(<text key={ "gt" + y } x="0" y={ y + 0.6 }>{ tick(y) }</text>);
    }

    return (
      <svg width="500" height="300" viewBox={ "0 0 " + WIDTH + " " + HEIGHT } preserveAspectRatio="none">
        <g style={{ stroke: "gray", strokeWidth: 0.01, fontSize: 0.3 }}>
          { grid }
        </g>

        <g style={{ fill: "none", stroke: "black", strokeWidth: 0.1 }}>
          <polyline points={ primary.join(" ")} />
        </g>

        <g style={{ fill: "none", stroke: "black", strokeWidth: 0.05, strokeDasharray: 0.1 }}>
          <polyline points={ secondary.join(" ")} />
        </g>
      </svg>
    );
  }
}

function exponent(progress, indicator) {
  let min = Infinity;
  let max = -Infinity;

  for (const point of progress) {
    const p = point[indicator];

    if (p >= 0) {
      min = Math.min(min, );
      max = Math.max(max, point[indicator]);
    }
  }

  min = Math.ceil(Math.log10(min) + 3);
  max = Math.floor(Math.log10(max));

  return Math.min(min, max);
}

function logy(value, e) {
  const y = e - Math.log10(value) + 1;

  if (y < 0) return 0;
  if (y > 5) return 5;
  return y;
}

function logt(e) {
  if (e < 0) {
    let tick = "0.";
    for (let z = 0; z < -1-e; z++) tick += "0";
    return tick + "X";
  } else if (e >= 0) {
    let tick = "X";
    for (let z = 0; z < e; z++) tick += "0";
    return tick;
  }

  return "-";
}

function pery(value) {
  return (value >= 0) ? 5 - Math.min(value * 5, 5) : 0;
}

function pert(y) {
  return (y >= 0) ? Math.floor(100 - y * 20) + "%" : "-";
}
