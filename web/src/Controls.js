import React from "react";
import Stack from "@mui/material/Stack";

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

      </Stack>
    );
  }
}
