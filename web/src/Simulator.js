import React from "react";
import Button from "@mui/material/Button";
import IconSkipNext from "@mui/icons-material/SkipNext";
import IconTrendingDown from "@mui/icons-material/TrendingDown";
import LinearProgress from "@mui/material/LinearProgress";
import Api from "./Api";
import Board from "./Board";

export default class Simulator extends React.Component {

  constructor() {
    super();

    this.state = {
      events: [],
      skills: [],
      skill: null,
      step: null,
      merged: null,
      simulation: null,
    };
  }

  async componentDidMount() {
    Api.listen(this, "events");
    Api.listen(this, "skills");
  }

  componentWillUnmount() {
    Api.listen(this);
    if (this.state.step) Api.delete("events", this.state.step);
  }

  updateObservation(event) {
    this.setState({ observation: event.target.value });
  }

  render() {
    const simulation = this.state.events.find(event => ((event.type === "simulation-display") && (event.ref === this.state.step)));
    const progressing = this.state.step && !simulation;

    if (simulation && (this.state.merged !== this.state.step)) {
      this.state.skill = this.state.skills.find(one => (one.skill === simulation.skill));
      this.state.simulation = simulation;
      this.state.merged = this.state.step;
    }

    return (
      <div>
        <h3>Simulator</h3>

        Brain: space
        <br/>

        <Button size="small" onClick={ step.bind(this) } disabled={ progressing }>
          <IconSkipNext /> Step
        </Button>

        <Button size="small" onClick={ worst.bind(this) } disabled={ progressing }>
          <IconTrendingDown /> Worst
        </Button>

        { progressing && <LinearProgress /> }

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", marginTop: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 20rem", minWidth: "18rem" }}>
            <textarea
              value={ pretty(this.state.simulation?.observation) }
              onChange={ this.updateObservation.bind(this) }
              style={{ width: "100%", minHeight: "20rem", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.95rem" }}
            />
          </div>

          <div style={{ flex: "1 1 20rem", minWidth: "18rem" }}>
            { this.state.skill && this.state.simulation && <Board skill={ this.state.skill } simulation={ this.state.simulation } /> }
          </div>

          <div style={{ flex: "1 1 20rem", minWidth: "18rem" }}>
            <textarea
              value={ pretty(this.state.simulation?.action) }
              readOnly
              style={{ width: "100%", minHeight: "20rem", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.95rem" }}
            />
          </div>
        </div>
      </div>
    );
  }
}

async function step() {
  if (this.state.step) {
    await Api.delete("events", this.state.step);
  }

  const step = String(Math.random());
  const observation = merge(this.state.simulation.observation, this.state.simulation.observation);

  await Api.post({ ref: step, brain: "tic-tac-toe", type: "simulation-step", observation }, "events");

  this.setState({ step });
}

async function worst() {
  if (this.state.step) {
    await Api.delete("events", this.state.step);
  }

  const step = String(Math.random());

  await Api.post({ ref: step, brain: "space", type: "simulation-step", preference: "worst" }, "events");

  this.setState({ step });
}

function merge(observation, action) {
  try {
    const simulation = { ...observation };

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

function pretty(object) {
  let text = JSON.stringify(object || {}, null, 2);

  // Only inline arrays of primitives (no nested objects or arrays)
  text = text.replace(/\[\s*\n(\s*)([^\[\{]*?)\n\s*\]/gs, (match, indent, content) => {
    if (!content.includes('{') && !content.includes('[')) {
      return "[" + content.trim().replace(/,\s*\n\s*/g, ", ") + "]";
    }
    return match;
  });

  return text;
}
