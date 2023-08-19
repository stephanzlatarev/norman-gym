import React from "react";
import Stack from "@mui/material/Stack";

export default class Controls extends React.Component {

  render() {
    return (
      <Stack direction="column">
        <div>Skill:</div>
        <div>Playbooks:</div>
        <div>Hidden layers:</div>
      </Stack>
    );
  }
}
