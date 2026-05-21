import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.progress || !this.props.indicator) return null;

    // Collect all valid primary values and find last
    const values = [];
    let lastValue = null;
    for (const point of this.props.progress) {
      const v = point[this.props.indicator];
      if (v >= 0) { values.push(v); lastValue = v; }
    }

    let y, ticks;

    if (this.props.type === "log") {
      const e = lastValue > 0 ? Math.floor(Math.log10(lastValue)) : 0;
      const fitsIn = (lo, hi) => values.every(v => v <= 0 || (Math.log10(v) >= lo && Math.log10(v) <= hi));

      let exponents;
      if (fitsIn(e, e + 1)) exponents = [e + 1, e];
      else if (fitsIn(e - 1, e + 1)) exponents = [e + 1, e, e - 1];
      else exponents = [e + 2, e + 1, e, e - 1];

      const top = exponents[0], bottom = exponents[exponents.length - 1];
      y = (v) => clampY((top - Math.log10(v)) / (top - bottom) * HEIGHT);
      ticks = exponents.map(exp => logt(exp));
    } else {
      const center = lastValue != null ? lastValue : 0.5;
      const fitsIn = (lo, hi) => values.every(v => v >= lo && v <= hi);

      let gridValues;
      if (fitsIn(center - 0.5 * PER_STEP, center + 0.5 * PER_STEP)) {
        gridValues = [center + 0.5 * PER_STEP, center - 0.5 * PER_STEP];
      } else if (fitsIn(center - PER_STEP, center + PER_STEP)) {
        gridValues = [center + PER_STEP, center, center - PER_STEP];
      } else {
        gridValues = [center + 1.5 * PER_STEP, center + 0.5 * PER_STEP, center - 0.5 * PER_STEP, center - 1.5 * PER_STEP];
      }

      const top = gridValues[0], bottom = gridValues[gridValues.length - 1];
      y = (v) => clampY((top - v) / (top - bottom) * HEIGHT);
      ticks = gridValues.map(v => Math.round(v * 100) + "%");
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
    for (let i = 0; i < ticks.length; i++) {
      const gy = i * HEIGHT / (ticks.length - 1);
      grid.push(<line key={ "gl" + i } x1="0" y1={ gy } x2={ WIDTH } y2={ gy } />);
      grid.push(<text key={ "gt" + i } x="0" y={ gy + 0.6 }>{ ticks[i] }</text>);
    }

    return (
      <svg width="400" height="150" viewBox={ "0 0 " + WIDTH + " " + HEIGHT } preserveAspectRatio="none">
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

const PER_STEP = 0.1;

function clampY(y) {
  if (y < 0) return 0;
  if (y > HEIGHT) return HEIGHT;
  return y;
}

function logt(e) {
  if (e > 10) return "∞";
  if (e < -10) return "0";

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
