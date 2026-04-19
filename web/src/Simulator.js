import React from "react";
import Button from "@mui/material/Button";
import IconRefresh from "@mui/icons-material/Refresh";
import LinearProgress from "@mui/material/LinearProgress";
import Api from "./Api";
import Board from "./Board";

export default class Simulator extends React.Component {

  constructor() {
    super();

    this.state = {
      events: [],
      step: null,
      merged: null,
      observation: JSON.stringify({}, null, 2),
    };
  }

  async componentDidMount() {
    Api.listen(this, "events");
  }

  componentWillUnmount() {
    Api.listen(this);
  }

  updateObservation(event) {
    this.setState({ observation: event.target.value });
  }

  render() {
    const simulation = this.state.events.find(event => event.ref === this.state.step);
    const progressing = this.state.step && !simulation;

    if (simulation && (this.state.merged !== this.state.step)) {
      this.state.observation = JSON.stringify(merge(this.state.observation, simulation.action), null, 2);
      this.state.merged = this.state.step;
    }

    return (
      <div>
        <h3>Simulator</h3>

        Brain: tic-tac-toe
        <br/>

        <Button size="small" onClick={ step.bind(this) } disabled={ progressing }>
          <IconRefresh />
        </Button>

        { progressing && <LinearProgress /> }

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginTop: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 20rem", minWidth: "18rem" }}>
            <textarea
              value={ this.state.observation }
              onChange={ this.updateObservation.bind(this) }
              style={{ width: "100%", minHeight: "20rem", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.95rem" }}
            />
          </div>

          <div style={{ flex: "1 1 20rem", minWidth: "18rem" }}>
            { simulation && <Board simulation={ simulation } /> }
          </div>
        </div>
      </div>
    );
  }
}

async function step() {
  const step = String(Math.random());
  const observation = merge(this.state.observation);

  await Api.post({ ref: step, brain: "tic-tac-toe", type: "simulation-step", observation }, "events");

  this.setState({ step });
}

function merge(observation, action) {
  try {
    const simulation = JSON.parse(observation);

    if (action) {
      for (const [type, objects] of Object.entries(action)) {
        if (!simulation[type]) {
          simulation[type] = [];
        }

        simulation[type].push(...objects);
      }
    }

    return simulation;
  } catch {
  }
}
