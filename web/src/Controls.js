import React from "react";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Api from "./Api";

export default class Controls extends React.Component {

  async toggleLock() {
    if (this.props.brain) {
      await Api.post({}, "brains", this.props.brain.brain, this.props.brain.locked ? "unlock" : "lock");
      await this.props.refresh();
    }
  }

  async releaseBrain() {
    if (this.props.brain) {
      await Api.post({}, "brains", this.props.brain.brain, "release");
      await this.props.refresh();
    }
  }

  render() {
    if (!this.props.session || !this.props.brain) return null;

    const playbooks = [];
    for (const playbook in this.props.session.playbooks) {
      playbooks.push(
        <div key={ playbook } style={{ color: this.props.session.playbooks[playbook].color }}>{ playbook }</div>
      );
    }

    return (
      <Stack direction="column">

        <div>SKILL</div>
        <div>{ this.props.session.skill }</div>

        <hr style={{ width: "100%" }} />

        <div>PLAYBOOKS</div>
        { playbooks }

        <hr style={{ width: "100%" }} />

        <div>BRAIN</div>
        <div>{ this.props.brain.brain }</div>
        <Link sx={{ cursor: "pointer" }} onClick={ this.toggleLock.bind(this) }>{ this.props.brain.locked ? "Unlock" : "Lock" } shape</Link>
        <Link href={ Api.url("brains", this.props.brain.brain, "download") } target="_blank">Download</Link>
        {
          !this.props.brain.locked
          ? (<Link sx={{ cursor: "pointer" }} onClick={ this.releaseBrain.bind(this) }>Release</Link>)
          : null
        }

        <hr style={{ width: "100%" }} />

        <div>{ this.props.free } free brains</div>

      </Stack>
    );
  }
}
