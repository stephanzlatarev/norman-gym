import React from "react";
import IconButton from "@mui/material/IconButton";
import IconClose from "@mui/icons-material/Close";
import IconContentCopy from "@mui/icons-material/ContentCopy";
import IconEdit from "@mui/icons-material/Edit";
import IconRestartAlt from "@mui/icons-material/RestartAlt";
import IconSave from "@mui/icons-material/Save";
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
      editing: null,
      editJson: "",
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

function editBrain(component, brain) {
  const entry = component.state.brains.find(b => b.brain === brain);
  const config = entry?.config || {};

  component.setState({ editing: brain, editJson: JSON.stringify(config, null, 2) });
}

function cancelEdit(component) {
  component.setState({ editing: null, editJson: "" });
}

async function saveConfig(component, brain) {
  let config;
  try {
    config = JSON.parse(component.state.editJson);
  } catch {
    return;
  }

  component.setState(state => ({ busy: state.busy + 1, editing: null, editJson: "" }));

  await Api.post({ config }, "brains", brain, "config");

  component.setState(state => ({ busy: state.busy - 1 }));
}

function renderBrains(component) {
  const brains = [...component.state.brains]
    .sort((a, b) => a.brain.localeCompare(b.brain));
  const editing = component.state.editing;
  const rows = [];

  for (const one of brains) {
    rows.push(
      <tr key={ one.brain }>
        <td style={ LEFT }>{ one.brain }</td>
        <td style={ CENTER }>{ new Date(one.time).toLocaleString() }</td>
        <td style={ LEFT }>{ one.skill }</td>
        <td style={ CENTER }>{ one.loss }</td>
        <td style={ CENTER }>
          <IconButton
            size="small"
            disabled={ component.state.busy > 0 || !!editing }
            onClick={ () => editBrain(component, one.brain) }
          >
            <IconEdit />
          </IconButton>
          <IconButton
            size="small"
            disabled={ component.state.busy > 0 || !!editing }
            onClick={ () => cloneBrain(component, one.brain) }
          >
            <IconContentCopy />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            disabled={ component.state.busy > 0 || !!editing }
            onClick={ () => resetBrain(component, one.brain) }
          >
            <IconRestartAlt />
          </IconButton>
        </td>
      </tr>
    );

    if (editing === one.brain) {
      let jsonValid = true;
      try { JSON.parse(component.state.editJson); } catch { jsonValid = false; }

      rows.push(
        <tr key={ one.brain + "-edit" }>
          <td colSpan={ 5 } style={ LEFT }>
            <textarea
              rows={ 10 }
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
              value={ component.state.editJson }
              onChange={ e => component.setState({ editJson: e.target.value }) }
            />
            <div>
              <IconButton size="small" color="primary" disabled={ !jsonValid } onClick={ () => saveConfig(component, one.brain) }>
                <IconSave />
              </IconButton>
              <IconButton size="small" onClick={ () => cancelEdit(component) }>
                <IconClose />
              </IconButton>
            </div>
          </td>
        </tr>
      );
    }
  }

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
