import React from "react";

const HEIGHT = 5;
const WIDTH = HEIGHT * HEIGHT;

export default class Progress extends React.Component {

  render() {
    if (!this.props.playbooks || !this.props.progress) return null;

    const xstep = WIDTH / (this.props.progress.length - 1);
    let key = 1;

    const series = {};
    let x = 0;
    for (const point of this.props.progress) {
      for (const playbook in point.study) {
        if (!series[playbook]) {
          series[playbook] = { color: this.props.playbooks[playbook].color, study: [], control: [] };
        }

        series[playbook].study.push(x + "," + y(point.study[playbook].error));
        series[playbook].control.push(x + "," + y(point.control[playbook].error));
      }

      x += xstep;
    }

    const lines = [];
    for (const playbook in series) {
      const data = series[playbook];
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.1 }}>
          <polyline points={ data.study.join(" ")} />
        </g>
      );
      lines.push(
        <g key={ key++ } style={{ fill: "none", stroke: data.color, strokeWidth: 0.1, strokeDasharray: "0.1,0.1" }}>
          <polyline points={ data.control.join(" ")} />
        </g>
      );
    }

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
