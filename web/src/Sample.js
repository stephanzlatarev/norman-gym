import React from "react";
import SampleBattle from "./SampleBattle";
import SampleBoard from "./SampleBoard";
import SampleChart from "./SampleChart";

export default class Sample extends React.Component {

  render() {
    if (!this.props.visible) return null;
    if (!this.props.sample || !this.props.sample.input || !this.props.sample.output || !this.props.sample.prediction) return null;

    if (this.props.sample.playbook === "forecast") {
      return (
        <SampleChart sample={ this.props.sample } />
      );
    }

    if (this.props.sample.playbook.startsWith("loaded-") || this.props.sample.playbook.startsWith("focus-") || this.props.sample.playbook.startsWith("solo-")) {
      return (
        <SampleBattle sample={ this.props.sample } />
      );
    }

    return (
      <SampleBoard sample={ this.props.sample } />
    );
  }
}
