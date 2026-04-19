import React from "react";
import Button from "@mui/material/Button";
import IconRefresh from "@mui/icons-material/Refresh";
import Api from "./Api";

const EVENT_REF_ID = String(Math.random());

export default class Samples extends React.Component {

  async playSample() {
    await Api.post({ ref: EVENT_REF_ID, brain: this.props.brain, type: "simulation-step" }, "events");
  }

  render() {
    return (
      <Button size="small" onClick={ this.playSample.bind(this) }>
        <IconRefresh />
      </Button>
    );
  }
}