import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.playbooks || !this.props.progress || !this.props.indicator) return null;

    let y = pery;
    let tick = pert;

    if (this.props.type === "log") {
      const e = exponent(this.props.progress, this.props.playbooks, this.props.indicator);

      y = (y) => logy(y, e);
      tick = (y) => logt(e - y);
    }

    const xstep = WIDTH / (this.props.progress.length - 1);
    let key = 1;

    const series = {};
    let x = 0;
    for (const point of this.props.progress) {
      for (const playbook in this.props.playbooks) {
        if (!series[playbook]) {
          series[playbook] = { color: color(this.props.playbooks[playbook]), control: [], record: [], dash: this.props.playbooks[playbook].dash };
        }

        if (point.control[playbook]) {
          series[playbook].control.push(x + "," + y(point.control[playbook][this.props.indicator]));
        }

        if (point.record[playbook]) {
          series[playbook].record.push(x + "," + y(point.record[playbook][this.props.indicator]));
        }
      }

      x += xstep;
    }

    const lines = [];
    for (const playbook in series) {
      const data = series[playbook];
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.1, strokeDasharray: data.dash ? "0.1" : null }}>
          <polyline points={ data.control.join(" ")} />
        </g>
      );
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.05, strokeDasharray: data.dash ? "0.1" : null }}>
          <polyline points={ data.record.join(" ")} />
        </g>
      );
    }

    const grid = [];
    for (let y = 0; y <= HEIGHT; y++) {
      grid.push(<line key={ key++ } x1="0" y1={ y } x2={ WIDTH } y2={ y } />);
      grid.push(<text key={ key++ } x="0" y={ y + 0.6 }>{ tick(y) }</text>);
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

function color(playbook) {
  return (playbook && playbook.color) ? playbook.color : "black";
}

function exponent(progress, playbooks, indicator) {
  let min = Infinity;
  let max = -Infinity;

  for (const point of progress) {
    for (const playbook in playbooks) {
      if (point.control[playbook]) {
        min = Math.min(min, point.control[playbook][indicator]);
        max = Math.max(max, point.control[playbook][indicator]);
      }

      if (point.record[playbook]) {
        min = Math.min(min, point.record[playbook][indicator]);
        max = Math.max(max, point.record[playbook][indicator]);
      }
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
