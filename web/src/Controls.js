import React from "react";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Api from "./Api";

export default class Controls extends React.Component {

  render() {
    if (!this.props.session) return null;

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

        <div>TRAINER</div>
        <div>{ this.props.brain }</div>
        <Link href={ Api.url("download", this.props.brain) } target="_blank">Download</Link>

      </Stack>
    );
  }
}
