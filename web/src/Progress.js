import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.playbooks || !this.props.progress || !this.props.indicator) return null;

    const y = (this.props.type === "log") ? logy : pery;
    const tick = (this.props.type === "log") ? logt : pert;
    const xstep = WIDTH / (this.props.progress.length - 1);
    let key = 1;

    const series = {};
    let x = 0;
    for (const point of this.props.progress) {
      for (const playbook in this.props.playbooks) {
        if (!series[playbook]) {
          series[playbook] = { color: color(this.props.playbooks[playbook]), study: [], control: [], record: [] };
        }

        if (point.study[playbook]) {
          series[playbook].study.push(x + "," + y(point.study[playbook][this.props.indicator]));
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
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.1, strokeDasharray: "0.1,0.1" }}>
          <polyline points={ data.study.join(" ")} />
        </g>
      );
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.1 }}>
          <polyline points={ data.control.join(" ")} />
        </g>
      );
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.05 }}>
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

function logy(value) {
  return (value >= 0) ? Math.min(Math.abs(Math.log10(value)), 5) : 0;
}

function logt(y) {
  return (y >= 0) ? "0." + ("00000".substring(5 - y)) + "X" : "-";
}

function pery(value) {
  return (value >= 0) ? 5 - Math.min(value * 5, 5) : 0;
}

function pert(y) {
  return (y >= 0) ? Math.floor(100 - y * 20) + "%" : "-";
}
