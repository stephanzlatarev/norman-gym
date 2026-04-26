import React from "react";
import IconButton from "@mui/material/IconButton";
import IconRestartAlt from "@mui/icons-material/RestartAlt";
import Api from "./Api";

const CENTER = { textAlign: "center", padding: "8px" };
const LEFT = { textAlign: "left", padding: "8px" };
const TABLE = { borderCollapse: "collapse", width: "100%", marginBottom: "2rem" };
const HEADER = { borderBottom: "2px solid #ccc" };

export default class Doctor extends React.Component {

  constructor() {
    super();

    this.state = {
      brains: [],
      resetting: null,
    };
  }

  async componentDidMount() {
    Api.listen(this, "brains");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  render() {
    return (
      <div style={{ margin: "1rem" }}>
        { renderBrains(this) }
      </div>
    );
  }
}

async function resetBrain(component, brain) {
  component.setState({ resetting: brain });

  await Api.post({}, "brains", brain, "reset");

  component.setState({ resetting: null });
}

function renderBrains(component) {
  const brains = [...component.state.brains]
    .sort((a, b) => a.brain.localeCompare(b.brain));
  const rows = brains.map(one => (
    <tr key={ one.brain }>
      <td style={ LEFT }>{ one.brain }</td>
      <td style={ CENTER }>{ new Date(one.time).toLocaleString() }</td>
      <td style={ LEFT }>{ one.skill }</td>
      <td style={ CENTER }>{ one.loss }</td>
      <td style={ CENTER }>
        <IconButton
          size="small"
          color="error"
          disabled={ component.state.resetting === one.brain }
          onClick={ () => resetBrain(component, one.brain) }
        >
          <IconRestartAlt />
        </IconButton>
      </td>
    </tr>
  ));

  return (
    <table style={ TABLE }>
      <thead>
        <tr style={ HEADER }>
          <th style={ LEFT }>Brain</th>
          <th style={ CENTER }>Time</th>
          <th style={ LEFT }>Skill</th>
          <th style={ CENTER }>Loss</th>
          <th style={ CENTER }>Actions</th>
        </tr>
      </thead>
      <tbody>
        { rows }
      </tbody>
    </table>
  );
}
