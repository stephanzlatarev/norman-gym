import React from "react";
import IconButton from "@mui/material/IconButton";
import IconContentCopy from "@mui/icons-material/ContentCopy";
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
      busy: 0,
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
  component.setState(state => ({ busy: state.busy + 1 }));

  await Api.post({}, "brains", brain, "reset");

  component.setState(state => ({ busy: state.busy - 1 }));
}

function cloneName(brain, existingBrains) {
  const match = brain.match(/^(.*?)-(\d+)$/);
  const base = match ? match[1] : brain;
  let num = match ? Number(match[2]) + 1 : 1;

  const names = new Set(existingBrains.map(b => b.brain));
  while (names.has(base + "-" + num)) num++;

  return base + "-" + num;
}

async function cloneBrain(component, brain) {
  const target = cloneName(brain, component.state.brains);

  component.setState(state => ({ busy: state.busy + 1 }));

  await Api.post({ target }, "brains", brain, "clone");

  component.setState(state => ({ busy: state.busy - 1 }));
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
          disabled={ component.state.busy > 0 }
          onClick={ () => cloneBrain(component, one.brain) }
        >
          <IconContentCopy />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          disabled={ component.state.busy > 0 }
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
