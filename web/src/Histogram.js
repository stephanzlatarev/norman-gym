import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;
const BUCKETS = 20;

export default class Histogram extends React.Component {

  render() {
    if (!this.props.visible) return null;

    const data = this.props.data;
    if (!data || !data.length) return null;

    const max = Math.max(...data);
    const e = max > 0 ? Math.ceil(Math.log10(max)) : 0;
    const scale = Math.pow(10, e);

    const barWidth = WIDTH / BUCKETS;
    const bars = [];

    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      const barHeight = scale > 0 ? (value / scale) * HEIGHT : 0;
      const x = i * barWidth;
      const y = HEIGHT - barHeight;

      bars.push(
        <rect key={ "bar" + i } x={ x } y={ y } width={ barWidth * 0.85 } height={ barHeight }
          style={{ fill: "steelblue" }} />
      );
    }

    const grid = [];
    for (let y = 0; y <= HEIGHT; y++) {
      grid.push(<line key={ "gl" + y } x1="0" y1={ y } x2={ WIDTH } y2={ y } />);
      const tick = scale > 0 ? ((HEIGHT - y) / HEIGHT * scale).toPrecision(2) : "0";
      grid.push(<text key={ "gt" + y } x="0" y={ y + 0.6 }>{ tick }</text>);
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
      <svg width="500" height="300" viewBox={ "0 -0.5 " + WIDTH + " " + (HEIGHT + 1) } preserveAspectRatio="none">
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
