import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;
const BUCKETS = 20;

export default class Histogram extends React.Component {

  render() {
    if (!this.props.visible) return null;

    const data = this.props.data;
    if (!data || !data.mean || !data.mean.length) return null;

    const last = data.mean[data.mean.length - 1];
    const e = last > 0 ? Math.floor(Math.log10(last)) : 0;

    const allValues = [...data.mean, ...data.max];
    const fitsIn = (lo, hi) => allValues.every(v => v <= 0 || (Math.log10(v) >= lo && Math.log10(v) <= hi));

    let exponents;
    if (fitsIn(e, e + 1)) exponents = [e + 1, e];
    else if (fitsIn(e - 1, e + 1)) exponents = [e + 1, e, e - 1];
    else exponents = [e + 2, e + 1, e, e - 1];

    const top = exponents[0], bottom = exponents[exponents.length - 1];
    const mapY = (v) => clampY((top - Math.log10(v)) / (top - bottom) * HEIGHT);

    const barWidth = WIDTH / BUCKETS;
    const bars = [];

    for (let i = 0; i < data.max.length; i++) {
      const y = mapY(data.max[i]);
      const barHeight = HEIGHT - y;
      if (barHeight > 0) {
        bars.push(
          <rect key={ "max" + i } x={ i * barWidth } y={ y } width={ barWidth * 0.85 } height={ barHeight }
            style={{ fill: "lightsteelblue" }} />
        );
      }
    }

    for (let i = 0; i < data.mean.length; i++) {
      const y = mapY(data.mean[i]);
      const barHeight = HEIGHT - y;
      if (barHeight > 0) {
        bars.push(
          <rect key={ "mean" + i } x={ i * barWidth } y={ y } width={ barWidth * 0.85 } height={ barHeight }
            style={{ fill: "steelblue" }} />
        );
      }
    }

    const grid = [];
    for (let i = 0; i < exponents.length; i++) {
      const gy = i * HEIGHT / (exponents.length - 1);
      grid.push(<line key={ "gl" + i } x1="0" y1={ gy } x2={ WIDTH } y2={ gy } />);
      grid.push(<text key={ "gt" + i } x="0" y={ gy + 0.6 }>{ logt(exponents[i]) }</text>);
    }

    // X-axis labels: percentile boundaries
    const xlabels = [];
    for (let i = 0; i < BUCKETS; i += 4) {
      const pct = (i + 1) * 5;
      xlabels.push(
        <text key={ "xl" + i } x={ i * barWidth + barWidth * 0.4 } y={ HEIGHT + 0.5 }
          style={{ textAnchor: "middle" }}>{ pct }%</text>
      );
    }

    return (
      <svg width="400" height="150" viewBox={ "0 -0.5 " + WIDTH + " " + (HEIGHT + 1) } preserveAspectRatio="none">
        <g style={{ stroke: "gray", strokeWidth: 0.01, fontSize: 0.3 }}>
          { grid }
        </g>

        <g>
          { bars }
        </g>

        <g style={{ fontSize: 0.3, fill: "gray" }}>
          { xlabels }
        </g>
      </svg>
    );
  }
}

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
