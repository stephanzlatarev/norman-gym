import React from "react";
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

    return (
      <SampleBoard sample={ this.props.sample } />
    );
  }
}
